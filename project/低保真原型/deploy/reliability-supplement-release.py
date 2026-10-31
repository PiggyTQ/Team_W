"""Source-only reliability patch; explicit user approval required. No DB rollback."""
import argparse,hashlib,json,os,pathlib,shutil,sqlite3,stat,subprocess,tarfile,time,urllib.request
from contextlib import closing
ROOT=pathlib.Path('/srv/career-growth/source');WORK=pathlib.Path('/srv/career-growth/reliability-supplement-20261030-05');UNIT=pathlib.Path('/etc/systemd/system/career-ops-probe.service')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(args):return subprocess.run(args,check=True,capture_output=True,text=True).stdout.strip()
def budget():
 with closing(sqlite3.connect('file:/var/lib/career-growth/ai-budget.sqlite?mode=ro',uri=True)) as db:
  n,total=db.execute('SELECT count(*),coalesce(sum(reserved_micro_cny),0) FROM ai_budget_reservations').fetchone();return {'reservations':n,'reservedMicroCny':total}
def schema():
 with closing(sqlite3.connect('file:/var/lib/career-growth/auth.sqlite?mode=ro',uri=True)) as db:return hashlib.sha256(json.dumps(db.execute("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()).encode()).hexdigest()
def install(src,dest):
 dest.parent.mkdir(parents=True,exist_ok=True);temp=dest.with_name(dest.name+'.reliability-pending');assert not temp.exists();shutil.copyfile(src,temp);temp.chmod(0o644);os.replace(temp,dest)
def activate(expected,unit_expected):
 assert not (WORK/'deployment-result.json').exists(),'ALREADY_DEPLOYED'
 assert sha(WORK/'candidate.tar.gz')==expected
 assert '/usr/bin/env AI_ENABLED=0 /usr/local/bin/node server/auth-server.mjs' in pathlib.Path('/etc/systemd/system/career-auth.service.d/30-agent-trial-disabled.conf').read_text()
 overlay=WORK/'overlay';overlay.mkdir(mode=0o700,exist_ok=True)
 with tarfile.open(WORK/'candidate.tar.gz') as archive:
  manifest=json.load(archive.extractfile('manifest.json'));assert manifest['releaseId']=='reliability-supplement-20261030-05';rows=manifest['files'];allowed={r['path'] for r in rows}|{'manifest.json'};assert set(archive.getnames())==allowed
  for item in archive.getmembers():
   p=pathlib.PurePosixPath(item.name);assert item.isfile() and not p.is_absolute() and '..' not in p.parts and item.size<1048576
   dest=overlay/item.name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(archive.extractfile(item).read())
 for row in rows:
  assert sha(overlay/row['path'])==row['candidateSha256']
  target=ROOT/row['path'];assert sha(target)==row['baselineSha256'] if row['baselineSha256'] else not target.exists(),'SOURCE_BASELINE_CHANGED'
 unitrow=next(r for r in rows if r['path']=='deploy/career-ops-probe.service');assert sha(UNIT)==unit_expected,'UNIT_BASELINE_CHANGED'
 assert UNIT.read_text()==(ROOT/unitrow['path']).read_text(),'UNIT_CONTENT_CHANGED'
 before=WORK/'before';before.mkdir(mode=0o700)
 for row in rows:
  if row['baselineSha256']:
   dest=before/row['path'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/row['path'],dest);dest.chmod(0o600)
 shutil.copyfile(UNIT,before/'installed-unit');(before/'installed-unit').chmod(0o600)
 oldbudget=budget();oldschema=schema();oldstatic=str(pathlib.Path('/srv/career-growth/current').resolve());timer_active=run(['systemctl','is-active','career-ops-probe.timer'])=='active'
 run(['systemctl','start','career-backup.service'])
 private=pathlib.Path('/var/lib/career-ops')
 if private.exists():assert private.is_dir() and not private.is_symlink() and private.stat().st_uid==0 and stat.S_IMODE(private.stat().st_mode)==0o700
 else:private.mkdir(mode=0o700)
 run(['systemctl','stop','career-ops-probe.timer']);run(['systemctl','stop','career-ops-probe.service']);installed=[]
 try:
  for row in rows:install(overlay/row['path'],ROOT/row['path']);installed.append(row)
  unit_template=WORK/'installed-unit.template';unit_template.write_text((overlay/'deploy/career-ops-probe.service').read_text());install(unit_template,UNIT);run(['systemctl','daemon-reload']);run(['systemctl','restart','career-auth'])
  healthy=False
  for _ in range(30):
   try:
    with urllib.request.urlopen('http://127.0.0.1:3001/api/ready',timeout=2) as response:healthy=json.load(response).get('status')=='ok'
    if healthy:break
   except Exception:time.sleep(.2)
  assert healthy,'SERVICE_NOT_READY'
  stage=WORK/'stage/src';stage.mkdir(parents=True);shutil.copyfile(ROOT/'src/auth-contract.js',stage/'auth-contract.js')
  run(['/usr/local/bin/node',str(WORK/'backend-command-smoke.mjs'),'production'])
  smoke=json.loads((WORK/'production-smoke.json').read_text());assert smoke['passed'] and smoke['syntheticAccountDeleted']
  run(['systemctl','start','career-ops-probe.service'])
  if timer_active:run(['systemctl','start','career-ops-probe.timer'])
  probe=json.loads(pathlib.Path('/var/lib/career-growth/ops-probe.json').read_text());assert probe['issues']==[]
  history=list((private/'history').glob('*.jsonl'));assert history
  assert all(p.is_file() and not p.is_symlink() and p.stat().st_uid==0 and stat.S_IMODE(p.stat().st_mode)==0o600 and p.stat().st_size<=2*1024*1024 for p in history)
  assert schema()==oldschema and budget()==oldbudget
 except Exception:
  for row in reversed(installed):
   target=ROOT/row['path'];assert sha(target)==row['candidateSha256'],'CONCURRENT_CHANGE_DURING_ROLLBACK'
   if row['baselineSha256']:install(before/row['path'],target)
   else:target.unlink()
  install(before/'installed-unit',UNIT);run(['systemctl','daemon-reload']);run(['systemctl','restart','career-auth'])
  if timer_active:run(['systemctl','start','career-ops-probe.timer'])
  raise
 result={'deployed':True,'releaseId':manifest['releaseId'],'aiEnabled':False,'externalServicesEnabled':False,'frontendChanged':False,'previousStaticRelease':oldstatic,'currentStaticRelease':str(pathlib.Path('/srv/career-growth/current').resolve()),'files':{r['path']:sha(ROOT/r['path']) for r in rows},'databaseSchemaUnchanged':True,'budget':oldbudget,'budgetUnchanged':True,'historyFiles':len(history),'historyPrivateModesVerified':True,'probeIssues':probe['issues'],'productionApiChecks':len(smoke['checks']),'syntheticAccountDeleted':True,'productionUserRowsInspected':False,'accountServicePid':run(['systemctl','show','career-auth','-p','MainPID','--value'])}
 (WORK/'deployment-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--sha',required=True);p.add_argument('--unit-sha',required=True);p.add_argument('--approved-ai-off',action='store_true');a=p.parse_args();assert os.geteuid()==0 and a.approved_ai_off,'USER_APPROVAL_REQUIRED';activate(a.sha,a.unit_sha)
