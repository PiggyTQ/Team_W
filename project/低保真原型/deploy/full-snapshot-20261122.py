#!/usr/bin/env python3
"""Publish the complete authorized source snapshot. No test or page-audit suite."""
import datetime,fcntl,hashlib,json,os,shutil,sqlite3,stat,subprocess,sys,tarfile,time,urllib.request
from pathlib import Path,PurePosixPath
BASE=Path('/srv/career-growth');SOURCE=BASE/'source';CURRENT=BASE/'current'
ARCHIVE=Path('/root/full-snapshot-20261122-source.tar.gz')
ARCHIVE_SHA='2eaec41b6381ecc9d935c5456e3c907b7ce5ad2175ddefdefd43d03b3ea628eb';PREFIX='full-snapshot-20261122/'
ROOT_FILES={'index.html','package.json','package-lock.json','vite.config.js','vercel.json'}
ENV_FILES=['.env','.env.local','.env.server','.env.server.local']
def require(ok,message):
 if not ok:raise RuntimeError(message)
def emit(event,**data):print(json.dumps({'event':event,**data}),flush=True)
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def allowed(rel):
 p=PurePosixPath(rel)
 return not p.is_absolute() and '..' not in p.parts and (rel in ROOT_FILES or rel.startswith(('src/','public/','scripts/','server/','course-packs/','knowledge/'))) and (not rel.startswith('server/data/') or rel=='server/data/public-content-en.json')
def run(args,cwd,log):
 with log.open('wb') as output:r=subprocess.run(args,cwd=cwd,stdin=subprocess.DEVNULL,stdout=output,stderr=subprocess.STDOUT)
 if r.returncode:
  print(log.read_text(errors='replace')[-5000:],flush=True);raise RuntimeError('Build/dependency command failed: '+str(log))
def link(target):
 temp=BASE/('.snapshot-link-'+str(os.getpid()));require(not temp.exists() and not temp.is_symlink(),'Temporary link already exists');temp.symlink_to(target,target_is_directory=True);os.replace(temp,CURRENT)
def replace_file(source,target,mode=0o644,owner=None):
 target.parent.mkdir(parents=True,exist_ok=True)
 temp=target.with_name('.'+target.name+'.snapshot-'+str(os.getpid()));require(not temp.exists(),'Temporary source file exists')
 with source.open('rb') as src,temp.open('xb') as dst:shutil.copyfileobj(src,dst,1024*1024);dst.flush();os.fsync(dst.fileno())
 os.chmod(temp,mode)
 if owner:os.chown(temp,*owner)
 os.replace(temp,target)
def pid():return subprocess.check_output(['systemctl','show','career-auth','--property=MainPID','--value'],text=True).strip()
def wait_service():
 for attempt in range(35):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=2) as r:
    if json.load(r).get('status')=='ok':return
  except Exception:pass
  time.sleep(.4)
 raise RuntimeError('Backend did not become ready after restart')
def publish():
 require(os.geteuid()==0 and SOURCE.is_dir() and not SOURCE.is_symlink(),'Unexpected source directory or account')
 require(CURRENT.is_symlink(),'Current release must be a symlink')
 previous=CURRENT.resolve(strict=True);require(previous.parent==BASE/'releases','Unexpected release location')
 require(sha(ARCHIVE)==ARCHIVE_SHA,'Upload integrity mismatch')
 stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ');name='full-snapshot-20261122-'+stamp
 backup=BASE/'backups'/name;backup.mkdir(parents=True,mode=0o700);stage=backup/'build-source';stage.mkdir(mode=0o700)
 release=BASE/'releases'/name;require(not release.exists(),'Release already exists')
 with tarfile.open(ARCHIVE,'r:gz') as tar:
  manifest=json.load(tar.extractfile(PREFIX+'manifest.json'));require(manifest['release']=='full-snapshot-20261122','Wrong package')
  names=set()
  for item in manifest['files']:
   rel=item['path'];require(allowed(rel) and rel not in names,'Unsafe or duplicate source path');names.add(rel)
   member=tar.getmember(PREFIX+'files/'+rel);require(member.isfile() and member.size==item['bytes'],'Invalid source member')
   target=stage/rel;target.parent.mkdir(parents=True,exist_ok=True)
   with tar.extractfile(member) as src,target.open('wb') as dst:shutil.copyfileobj(src,dst,1024*1024)
   require(sha(target)==item['sha256'],'Source transfer mismatch: '+rel)
 for name in ENV_FILES:
  if (SOURCE/name).is_file():shutil.copy2(SOURCE/name,stage/name)
 node=shutil.which('node');require(node is not None,'Node missing')
 same_lock=False
 try:same_lock=json.loads((SOURCE/'package-lock.json').read_text(encoding='utf-8-sig'))==json.loads((stage/'package-lock.json').read_text(encoding='utf-8-sig'))
 except Exception:pass
 dependencies_changed=not (same_lock and (SOURCE/'node_modules/vite/bin/vite.js').is_file())
 if dependencies_changed:run(['npm','ci','--ignore-scripts'],stage,backup/'dependencies.log')
 else:(stage/'node_modules').symlink_to(SOURCE/'node_modules',target_is_directory=True)
 emit('BUILDING_FULL_SNAPSHOT',files=len(names),previous=str(previous),testsRun=False,pageAuditRun=False)
 run([node,'node_modules/vite/bin/vite.js','build','--mode','server','--outDir',str(release)],stage,backup/'build.log')
 require((release/'index.html').is_file(),'Build produced no index')
 for p in release.rglob('*'):os.chmod(p,0o755 if p.is_dir() else 0o644)
 os.chmod(release,0o755)
 database=Path('/var/lib/career-growth/auth.sqlite');require(database.is_file(),'Account database missing')
 with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as source_db,sqlite3.connect(backup/'auth-before.sqlite') as saved_db:source_db.backup(saved_db)
 os.chmod(backup/'auth-before.sqlite',0o600)
 metadata={};obsolete=[]
 for directory in ['src','public','scripts','server','course-packs','knowledge']:
  for target in (SOURCE/directory).rglob('*'):
   if not target.is_file() or target.is_symlink():continue
   rel=target.relative_to(SOURCE).as_posix()
   if rel.startswith('server/data/') or target.name=='.env' or target.name.startswith('.env.') or target.suffix in ['.sqlite','.sqlite-wal','.sqlite-shm','.db','.log']:continue
   if rel not in names:obsolete.append(rel)
 for rel in sorted(names):
  target=SOURCE/rel;require(not target.is_symlink(),'Refuse replacing a source symlink: '+rel)
  if target.exists():
   st=target.stat();saved=backup/'original'/rel;saved.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,saved)
   metadata[rel]={'existed':True,'mode':stat.S_IMODE(st.st_mode),'owner':(st.st_uid,st.st_gid)}
  else:metadata[rel]={'existed':False,'mode':0o644,'owner':None}
 (backup/'source-manifest.json').write_text(json.dumps(manifest,indent=2))
 (backup/'original-metadata.json').write_text(json.dumps(metadata,indent=2))
 applied=[];obsolete_moved=[];activated=False;deps_swapped=False
 receipt={'release':str(release),'previous':str(previous),'archiveSha256':ARCHIVE_SHA,'files':len(names),'fullSourceSnapshot':True,'databaseBackup':str(backup/'auth-before.sqlite'),'testsRun':False,'pageAuditRun':False,'serviceConfigurationPreserved':True,'dependenciesChanged':dependencies_changed,'accountDataRewrittenByPublisher':False,'obsoleteCodeFilesArchived':len(obsolete)}
 try:
  for rel in sorted(names):
   m=metadata[rel];replace_file(stage/rel,SOURCE/rel,m['mode'],m['owner']);applied.append(rel)
  for rel in obsolete:
   saved=backup/'obsolete'/rel;saved.parent.mkdir(parents=True,exist_ok=True);os.replace(SOURCE/rel,saved);obsolete_moved.append(rel)
  if dependencies_changed:
   require((SOURCE/'node_modules').exists(),'Existing dependency directory missing')
   os.replace(SOURCE/'node_modules',backup/'original-node_modules');deps_swapped=True;os.replace(stage/'node_modules',SOURCE/'node_modules')
  subprocess.run(['systemctl','restart','career-auth'],check=True,timeout=40);wait_service()
  link(release);activated=True
  receipt.update(status='DEPLOY_OK',backendPid=pid(),receipt=str(backup/'receipt.json'))
  (backup/'receipt.json').write_text(json.dumps(receipt,indent=2));emit('DEPLOY_OK',**receipt)
 except BaseException as error:
  if activated and CURRENT.resolve()==release:link(previous)
  if deps_swapped:
   if (SOURCE/'node_modules').exists():os.replace(SOURCE/'node_modules',backup/'reverted-new-node_modules')
   os.replace(backup/'original-node_modules',SOURCE/'node_modules')
  for rel in reversed(obsolete_moved):os.replace(backup/'obsolete'/rel,SOURCE/rel)
  for rel in reversed(applied):
   m=metadata[rel];target=SOURCE/rel
   if m['existed']:replace_file(backup/'original'/rel,target,m['mode'],m['owner'])
   else:
    saved=backup/'reverted-new'/rel;saved.parent.mkdir(parents=True,exist_ok=True);os.replace(target,saved)
  subprocess.run(['systemctl','restart','career-auth'],check=True,timeout=40)
  receipt.update(status='ROLLED_BACK',reason=str(error));(backup/'receipt.json').write_text(json.dumps(receipt,indent=2));emit('ROLLED_BACK',**receipt);raise
if __name__=='__main__':
 try:
  with open('/run/lock/career-growth-tree-deploy.lock','w') as lock:
   fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);publish()
 except BaseException as error:emit('DEPLOY_STOPPED',reason=str(error));sys.exit(1)
