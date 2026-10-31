"""Install local monitoring only after explicit release approval. Never print secrets."""
import argparse,hashlib,json,os,pathlib,secrets,subprocess
ROOT=pathlib.Path('/srv/career-growth/source');WORK=pathlib.Path('/srv/career-growth/backend-platform-20261030-04');PRIVATE=pathlib.Path('/etc/career-growth/ops.env')
def run(args):return subprocess.run(args,check=True,capture_output=True,text=True).stdout
def setup():
 assert (WORK/'smoke/stage-smoke.json').is_file() and json.loads((WORK/'smoke/stage-smoke.json').read_text())['passed']
 if PRIVATE.exists():
  assert PRIVATE.is_file() and not PRIVATE.is_symlink() and PRIVATE.stat().st_uid==0 and PRIVATE.stat().st_mode&0o777==0o600
  lines=[x for x in PRIVATE.read_text().splitlines() if x.strip() and not x.startswith('#')]
  assert len(lines)==1 and lines[0].startswith('OPS_READ_TOKEN=') and len(lines[0].split('=',1)[1])>=32,'UNEXPECTED_EXISTING_OPS_CONFIGURATION'
 else:
  PRIVATE.parent.mkdir(mode=0o700,exist_ok=True)
  with PRIVATE.open('x') as f:os.chmod(PRIVATE,0o600);f.write('OPS_READ_TOKEN='+secrets.token_hex(32)+'\n')
 drop=pathlib.Path('/etc/systemd/system/career-auth.service.d/40-platform-ops.conf');content='[Service]\nEnvironmentFile=/etc/career-growth/ops.env\n'
 assert not drop.exists() or drop.read_text()==content,'EXISTING_DROPIN_CONFLICT';drop.write_text(content);drop.chmod(0o644)
 for name in ('career-ops-probe.service','career-ops-probe.timer'):
  dest=pathlib.Path('/etc/systemd/system')/name;body=(WORK/'stage/deploy'/name).read_text();assert not dest.exists() or dest.read_text()==body,'EXISTING_UNIT_CONFLICT';dest.write_text(body);dest.chmod(0o644)
 run(['systemctl','daemon-reload']);print(json.dumps({'localMonitoringPrepared':True,'serviceRestarted':False,'externalAlertsConfigured':False,'mailEnabled':False}))
def finish():
 result=json.loads((WORK/'deployment-result.json').read_text());assert result['deployed'] and result['aiEnabled'] is False
 assert all(hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==value for name,value in result['files'].items())
 run(['systemctl','start','career-backup.service']);assert json.loads(pathlib.Path('/var/backups/career-growth/last-success.json').read_text())['restoreCheck'] is True
 run(['systemctl','start','career-ops-probe.service']);run(['systemctl','enable','--now','career-ops-probe.timer'])
 assert run(['systemctl','is-active','career-ops-probe.timer']).strip()=='active'
 receipt={'localMonitoringActive':True,'externalAlertsConfigured':False,'mailEnabled':False,'backupRestoreCheck':True,'privateOpsMode':oct(PRIVATE.stat().st_mode&0o777)}
 (WORK/'operations-result.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['setup','finish']);parser.add_argument('--approved-ai-off',action='store_true');args=parser.parse_args();assert os.geteuid()==0 and args.approved_ai_off,'USER_APPROVAL_REQUIRED'
 setup() if args.mode=='setup' else finish()
