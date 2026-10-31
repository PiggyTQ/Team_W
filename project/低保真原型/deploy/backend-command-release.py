"""User-approved additive release, with AI forced off. Run only on the target host."""
import argparse,hashlib,json,os,pathlib,pwd,shutil,sqlite3,subprocess,tarfile,time,urllib.request
from contextlib import closing
BASE=pathlib.Path('/srv/career-growth');SOURCE=BASE/'source';WORK=BASE/'backend-commands-20261029-02';STAGE=WORK/'stage';RELEASE=BASE/'releases/backend-commands-20261029-02'
DROPIN=pathlib.Path('/etc/systemd/system/career-auth.service.d/30-agent-trial-disabled.conf')
DBS={'auth':pathlib.Path('/var/lib/career-growth/auth.sqlite'),'knowledge':SOURCE/'server/data/knowledge.sqlite','budget':pathlib.Path('/var/lib/career-growth/ai-budget.sqlite')}
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def run(args,cwd=None):return subprocess.run(args,cwd=cwd,check=True,text=True,capture_output=True).stdout
def record(name,value):(WORK/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def inventory():
 files=[]
 for folder in ('src','scripts','knowledge'):
  files.extend(p for p in (SOURCE/folder).rglob('*') if p.is_file() and not p.is_symlink())
 files.extend(p for p in (SOURCE/'server').rglob('*') if p.is_file() and not p.is_symlink() and p.suffix in ('.mjs','.py','.md') and 'data' not in p.relative_to(SOURCE).parts)
 files.extend(SOURCE/p for p in ('package.json','package-lock.json','vite.config.js','index.html','server/data/public-content-en.json') if (SOURCE/p).is_file())
 return {p.relative_to(SOURCE).as_posix():sha(p) for p in files}
def atomic_copy(src,dest):
 dest.parent.mkdir(parents=True,exist_ok=True);pending=dest.with_name(dest.name+'.backend-pending');assert not pending.exists();shutil.copyfile(src,pending);pending.chmod(0o644);os.replace(pending,dest)
def forced_off():assert DROPIN.is_file() and '/usr/bin/env AI_ENABLED=0 /usr/local/bin/node server/auth-server.mjs' in DROPIN.read_text(),'AI_OFF_DROPIN_REQUIRED'
def budget_summary():
 with closing(sqlite3.connect(DBS['budget'].as_uri()+'?mode=ro',uri=True)) as ledger:
  count,total=ledger.execute('SELECT count(*),coalesce(sum(reserved_micro_cny),0) FROM ai_budget_reservations').fetchone();return {'reservations':count,'reservedMicroCny':total}
def prepare(expected):
 forced_off();archive=WORK/'candidate.tar.gz';assert sha(archive)==expected;assert not STAGE.exists(),'STAGE_ALREADY_EXISTS'
 assert not RELEASE.exists(),'RELEASE_ALREADY_EXISTS'
 overlay=WORK/'overlay';overlay.mkdir(mode=0o750)
 with tarfile.open(archive) as packed:
  manifest=json.load(packed.extractfile('manifest.json'));allowed={r['path'] for r in manifest['files']}|{'manifest.json'}
  assert set(packed.getnames())==allowed and manifest['approvedForProduction'] is True
  for member in packed.getmembers():
   rel=pathlib.PurePosixPath(member.name);assert member.isfile() and not rel.is_absolute() and '..' not in rel.parts and member.size<2*1024*1024
   dest=overlay/member.name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(packed.extractfile(member).read())
 for row in manifest['files']:
  assert sha(overlay/row['path'])==row['candidateSha256']
  if row['baselineSha256'] is None:assert not (SOURCE/row['path']).exists(),'NEW_PATH_ALREADY_EXISTS'
  else:assert sha(SOURCE/row['path'])==row['baselineSha256'],'BASELINE_CHANGED: '+row['path']
 before=WORK/'before';before.mkdir(mode=0o700);before.chmod(0o700)
 baseline=inventory();current=str((BASE/'current').resolve());record('baseline.json',{'files':baseline,'previousRelease':current,'budget':budget_summary()})
 with tarfile.open(before/'changed-source.tar.gz','w:gz') as saved:
  for row in manifest['files']:
   if row['baselineSha256'] is not None:saved.add(SOURCE/row['path'],arcname=row['path'],recursive=False)
 (before/'changed-source.tar.gz').chmod(0o600)
 backups={}
 for label,source in DBS.items():
  target=pathlib.Path('/var/backups/career-growth')/('before-business-backend-commands-20261029-02-'+label+'.sqlite');assert source.is_file() and not target.exists()
  with closing(sqlite3.connect(source.as_uri()+'?mode=ro',uri=True)) as live,closing(sqlite3.connect(target)) as copy:
   live.backup(copy);assert copy.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
  target.chmod(0o600);backups[label]=str(target)
 record('before/database-backups.json',backups)
 STAGE.mkdir(mode=0o750)
 for name in baseline:
  dest=STAGE/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(SOURCE/name,dest)
 for row in manifest['files']:atomic_copy(overlay/row['path'],STAGE/row['path'])
 (STAGE/'public').symlink_to(SOURCE/'public',target_is_directory=True)
 (STAGE/'server/data').mkdir(parents=True,exist_ok=True);(STAGE/'server/data/knowledge.sqlite').symlink_to(DBS['knowledge'])
 (STAGE/'.env.server').write_text('VITE_AUTH_MODE=server\n')
 modules=STAGE/'node_modules';modules.mkdir()
 for package in (SOURCE/'node_modules').iterdir():
  if package.name not in ('.vite','.vite-temp'):(modules/package.name).symlink_to(package,target_is_directory=package.is_dir())
 account=pwd.getpwnam('career');os.chown(WORK,0,account.pw_gid);WORK.chmod(0o750)
 for folder in (STAGE,WORK/'smoke'):
  folder.mkdir(exist_ok=True,mode=0o700)
  for p in [folder,*folder.rglob('*')]:
   if not p.is_symlink():os.chown(p,account.pw_uid,account.pw_gid)
 for args in (['/usr/local/bin/node','scripts/prepare-bilingual.mjs','--check'],['/usr/local/bin/node','node_modules/vite/bin/vite.js','build','--mode','server']):
  output=run(['runuser','-u','career','--','env','AI_ENABLED=0',*args],cwd=STAGE);record('build-'+('bilingual' if 'prepare-bilingual.mjs' in ' '.join(args) else 'vite')+'.json',{'output':output[-5000:]})
 assert inventory()==baseline and str((BASE/'current').resolve())==current,'PRODUCTION_CHANGED_DURING_PREPARE'
 record('prepared.json',{'prepared':True,'aiEnabled':False,'archiveSha256':expected,'files':manifest['files'],'previousRelease':current,'productionRuntimeChanged':False,'backups':backups})
 print(json.dumps({'prepared':True,'aiEnabled':False,'files':len(manifest['files']),'productionRuntimeChanged':False}))
def activate():
 forced_off();prepared=json.loads((WORK/'prepared.json').read_text());baseline=json.loads((WORK/'baseline.json').read_text());rows=prepared['files']
 assert json.loads((WORK/'smoke/stage-smoke.json').read_text())['passed'],'STAGE_SMOKE_REQUIRED'
 assert inventory()==baseline['files'] and str((BASE/'current').resolve())==baseline['previousRelease'],'PRODUCTION_CHANGED'
 assert not RELEASE.exists();shutil.copytree(STAGE/'dist',RELEASE)
 for p in (pathlib.Path(baseline['previousRelease'])/'assets').iterdir():
  if p.is_file() and not p.is_symlink():
   dest=RELEASE/'assets'/p.name
   if dest.exists():assert sha(dest)==sha(p),'STATIC_ASSET_COLLISION'
   else:shutil.copyfile(p,dest)
 for p in [RELEASE,*RELEASE.rglob('*')]:p.chmod(0o755 if p.is_dir() else 0o644)
 installed=[]
 try:
  for row in rows:atomic_copy(STAGE/row['path'],SOURCE/row['path']);installed.append(row)
  run(['systemctl','restart','career-auth'])
  healthy=False
  for _ in range(20):
   try:
    with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=2) as reply:healthy=json.load(reply).get('status')=='ok'
    if healthy:break
   except Exception:time.sleep(.25)
  assert healthy,'BACKEND_HEALTH_FAILED'
  run(['/usr/local/bin/node',str(WORK/'backend-command-smoke.mjs'),'production'],cwd=WORK)
  assert json.loads((WORK/'production-smoke.json').read_text())['passed']
  assert str((BASE/'current').resolve())==baseline['previousRelease'],'STATIC_RELEASE_CHANGED'
  pending=BASE/'current.backend-pending';assert not pending.exists();pending.symlink_to(RELEASE,target_is_directory=True);os.replace(pending,BASE/'current')
 except Exception:
  # Restore only exact files installed by this attempt. Never restore any database.
  restore=WORK/'rollback-source';restore.mkdir(mode=0o700,exist_ok=True)
  with tarfile.open(WORK/'before/changed-source.tar.gz') as old:
   for member in old.getmembers():
    assert member.isfile() and member.name in {r['path'] for r in rows};dest=restore/member.name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(old.extractfile(member).read())
  for row in installed:
   dest=SOURCE/row['path'];assert sha(dest)==row['candidateSha256'],'CONCURRENT_SOURCE_CHANGE_DURING_ROLLBACK'
   if row['baselineSha256'] is None:dest.unlink()
   else:atomic_copy(restore/row['path'],dest)
  run(['systemctl','restart','career-auth']);raise
 after=inventory()
 assert budget_summary()==baseline['budget'],'BUDGET_CHANGED_DURING_DEPLOYMENT'
 assert all(after.get(name)==value for name,value in baseline['files'].items() if name not in {r['path'] for r in rows}),'UNRELATED_SOURCE_CHANGED'
 report={'deployed':True,'aiEnabled':False,'staticRelease':str(RELEASE),'previousRelease':baseline['previousRelease'],'files':{r['path']:sha(SOURCE/r['path']) for r in rows},'servicePid':run(['systemctl','show','career-auth','-p','MainPID','--value']).strip(),'accountDatabaseReplaced':False,'budgetDatabaseReplaced':False,'budget':budget_summary(),'newTables':['business_command_receipts'],'unrelatedSourcePreserved':True,'productionUserRowsInspected':False}
 record('deployment-result.json',report);print(json.dumps({k:report[k] for k in ('deployed','aiEnabled','staticRelease','servicePid','unrelatedSourcePreserved')}))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['prepare','activate']);parser.add_argument('--sha');parser.add_argument('--approved-ai-off',action='store_true');args=parser.parse_args();assert os.geteuid()==0 and args.approved_ai_off,'USER_APPROVAL_REQUIRED'
 if args.mode=='prepare':prepare(args.sha)
 else:activate()
