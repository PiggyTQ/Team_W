import hashlib,json,pathlib,sqlite3,stat,subprocess
from contextlib import closing
WORK=pathlib.Path('/srv/career-growth/personal-context-20261029-03');SOURCE=pathlib.Path('/srv/career-growth/source');result=json.loads((WORK/'deployment-result.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert all(sha(SOURCE/p)==v for p,v in result['files'].items())
assert str(pathlib.Path('/srv/career-growth/current').resolve())==result['staticRelease'] and result['frontendChanged'] is False
assert subprocess.run(['systemctl','is-active','career-auth'],check=True,capture_output=True,text=True).stdout.strip()=='active'
assert 'ExecStart=/usr/bin/env AI_ENABLED=0 /usr/local/bin/node server/auth-server.mjs' in pathlib.Path('/etc/systemd/system/career-auth.service.d/30-agent-trial-disabled.conf').read_text()
with closing(sqlite3.connect('file:/var/lib/career-growth/auth.sqlite?mode=ro',uri=True)) as db:
 tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE name IN ('personal_context_heads','personal_context_events','personal_suggestion_feedback')")];assert len(tables)==3
with closing(sqlite3.connect('file:/var/lib/career-growth/ai-budget.sqlite?mode=ro',uri=True)) as db:count,total=db.execute('SELECT count(*),coalesce(sum(reserved_micro_cny),0) FROM ai_budget_reservations').fetchone()
budget={'reservations':count,'reservedMicroCny':total};assert budget==result['budget']
for name in json.loads((WORK/'before/database-backups.json').read_text()).values():
 info=pathlib.Path(name).stat();assert info.st_uid==0 and stat.S_IMODE(info.st_mode)==0o600
report={'passed':True,'aiEnabled':False,'frontendChanged':False,'serviceActive':True,'runtimeHashesMatched':len(result['files']),'tables':tables,'budget':budget,'budgetUnchanged':True,'privateBackupModesVerified':True,'productionUserRowsInspected':False}
(WORK/'audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
