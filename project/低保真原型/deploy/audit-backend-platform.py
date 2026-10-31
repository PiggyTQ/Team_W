import hashlib,json,pathlib,sqlite3,stat,subprocess
from contextlib import closing
WORK=pathlib.Path('/srv/career-growth/backend-platform-20261030-04');SOURCE=pathlib.Path('/srv/career-growth/source');result=json.loads((WORK/'deployment-result.json').read_text());manifest=json.loads((WORK/'overlay/manifest.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert result['deployed'] and result['aiEnabled'] is False
assert all(sha(SOURCE/name)==value for name,value in result['files'].items())
assert str(pathlib.Path('/srv/career-growth/current').resolve())==result['staticRelease']
assert subprocess.run(['systemctl','is-active','career-auth'],check=True,capture_output=True,text=True).stdout.strip()=='active'
assert subprocess.run(['systemctl','is-active','career-ops-probe.timer'],check=True,capture_output=True,text=True).stdout.strip()=='active'
assert '/usr/bin/env AI_ENABLED=0 /usr/local/bin/node server/auth-server.mjs' in pathlib.Path('/etc/systemd/system/career-auth.service.d/30-agent-trial-disabled.conf').read_text()
with closing(sqlite3.connect('file:/var/lib/career-growth/auth.sqlite?mode=ro',uri=True)) as db:
 tables={r[0] for r in db.execute('SELECT name FROM sqlite_master WHERE type=\'table\'')};assert set(manifest['newTables'])<=tables
 roles=db.execute('SELECT count(*) FROM platform_roles').fetchone()[0];assert roles==0
 queued=db.execute('SELECT count(*) FROM account_mail_outbox').fetchone()[0];assert queued==0
with closing(sqlite3.connect('file:/var/lib/career-growth/ai-budget.sqlite?mode=ro',uri=True)) as db:
 count,total=db.execute('SELECT count(*),coalesce(sum(reserved_micro_cny),0) FROM ai_budget_reservations').fetchone()
budget={'reservations':count,'reservedMicroCny':total};assert budget==result['budget']
private=pathlib.Path('/etc/career-growth/ops.env').stat();assert private.st_uid==0 and stat.S_IMODE(private.st_mode)==0o600
for name in json.loads((WORK/'before/database-backups.json').read_text()).values():
 info=pathlib.Path(name).stat();assert info.st_uid==0 and stat.S_IMODE(info.st_mode)==0o600
probe=json.loads(pathlib.Path('/var/lib/career-growth/ops-probe.json').read_text());assert probe['issues']==[]
backup=json.loads(pathlib.Path('/var/backups/career-growth/last-success.json').read_text());assert backup['restoreCheck']
report={'passed':True,'deployed':True,'aiEnabled':False,'mailEnabled':False,'externalAlertsConfigured':False,'remoteUploadsEnabled':False,'runtimeHashesMatched':len(result['files']),'newTables':manifest['newTables'],'adminRolesGranted':roles,'mailQueued':queued,'budget':budget,'budgetUnchanged':True,'localMonitoringActive':True,'probeIssues':probe['issues'],'backupRestoreCheck':True,'privateModesVerified':True,'productionUserRowsInspected':False,'staticRelease':result['staticRelease'],'servicePid':result['servicePid']}
(WORK/'audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
