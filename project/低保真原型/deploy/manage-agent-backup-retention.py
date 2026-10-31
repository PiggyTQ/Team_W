"""Move verified deployment DB snapshots into the existing 14-day managed namespace."""
import hashlib,json,pathlib,shutil,sqlite3
from contextlib import closing
work=pathlib.Path('/srv/career-growth/agent-workflow-20261029-01');before=work/'before';managed=pathlib.Path('/var/backups/career-growth')
assert before.resolve()==pathlib.Path('/srv/career-growth/agent-workflow-20261029-01/before')
assert managed.is_dir() and not managed.is_symlink()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files={}
for name in ('auth','knowledge','budget'):
 source=before/(name+'.sqlite');target=managed/f'before-business-agent-workflow-20261029-01-{name}.sqlite'
 if source.exists():
  if target.exists():assert sha(target)==sha(source),'BACKUP_NAME_CONFLICT'
  else:shutil.copy2(source,target)
  target.chmod(0o600);assert sha(target)==sha(source),'BACKUP_COPY_MISMATCH'
  with closing(sqlite3.connect(target.as_uri()+'?mode=ro',uri=True)) as db:assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
  source.unlink() # Only the verified duplicate; live databases are never touched.
 assert target.is_file();files[name]=str(target)
report=json.loads((work/'deployment-result.json').read_text());report.update({'databaseBackupFiles':files,'backupRetentionDays':14,'databaseBackupDirectory':str(managed),'sourceSnapshotDirectory':str(before)})
(work/'deployment-result.json').write_text(json.dumps(report,indent=2)+'\n')
(before/'database-backups-managed.txt').write_text(json.dumps({'files':files,'retentionDays':14},indent=2)+'\n')
print(json.dumps({'databaseSnapshotsManaged':len(files),'retentionDays':14,'liveDatabasesChanged':False}))
