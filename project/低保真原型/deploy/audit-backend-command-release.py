"""Read only: hashes, modes, public course counts and global budget aggregates."""
import hashlib,json,pathlib,sqlite3,stat,subprocess
from contextlib import closing
WORK=pathlib.Path('/srv/career-growth/backend-commands-20261029-02');SOURCE=pathlib.Path('/srv/career-growth/source')
result=json.loads((WORK/'deployment-result.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert all(sha(SOURCE/name)==digest for name,digest in result['files'].items())
assert str(pathlib.Path('/srv/career-growth/current').resolve())==result['staticRelease']
assert sha(pathlib.Path(result['staticRelease'])/'index.html')==sha(WORK/'stage/dist/index.html')
assert subprocess.run(['systemctl','is-active','career-auth'],check=True,capture_output=True,text=True).stdout.strip()=='active'
dropin=pathlib.Path('/etc/systemd/system/career-auth.service.d/30-agent-trial-disabled.conf');assert 'ExecStart=/usr/bin/env AI_ENABLED=0 /usr/local/bin/node server/auth-server.mjs' in dropin.read_text()
with closing(sqlite3.connect('file:/var/lib/career-growth/auth.sqlite?mode=ro',uri=True)) as db:
 assert db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='business_command_receipts'").fetchone()
 courses=db.execute("SELECT count(*) FROM courses WHERE status='published'").fetchone()[0];assert courses==4
with closing(sqlite3.connect('file:/var/lib/career-growth/ai-budget.sqlite?mode=ro',uri=True)) as db:
 count,total=db.execute('SELECT count(*),coalesce(sum(reserved_micro_cny),0) FROM ai_budget_reservations').fetchone()
budget={'reservations':count,'reservedMicroCny':total};assert budget==result['budget']
backups=json.loads((WORK/'before/database-backups.json').read_text());assert len(backups)==3
assert stat.S_IMODE((WORK/'before').stat().st_mode)==0o700
for value in backups.values():
 info=pathlib.Path(value).stat();assert info.st_uid==0 and stat.S_IMODE(info.st_mode)==0o600
for name in ('auth.sqlite','ai-budget.sqlite'):
 info=(pathlib.Path('/var/lib/career-growth')/name).stat();assert stat.S_IMODE(info.st_mode)==0o600
report={'passed':True,'serviceActive':True,'aiEnabled':False,'sourceHashesMatched':len(result['files']),'staticReleaseMatched':True,'staticIndexMatched':True,'publishedCourses':courses,'newReceiptTablePresent':True,'privateBackupModesVerified':True,'budget':budget,'budgetUnchanged':True,'productionUserRowsInspected':False}
(WORK/'final-audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
