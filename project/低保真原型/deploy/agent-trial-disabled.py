"""Deploy the approved trial overlay; AI is forced off. Run only on the target host."""
import argparse
import hashlib
import json
import os
import pathlib
import pwd
import re
import shutil
import sqlite3
import subprocess
import tarfile
import time
import urllib.request
from contextlib import closing

BASE=pathlib.Path('/srv/career-growth')
SOURCE=BASE/'source'
WORK=BASE/'agent-workflow-20261029-01'
STAGE=WORK/'stage'
EXPECTED_ARCHIVE='9a8337f472fb9c4aec8fc11b7bfaec190cb1eadbc0c340c22db142114be43041'
EXPECTED_AUTH='d76986db18e313e4fa60cf0cafff56a8bc08737c99ba9a18edc9144fd4b73d3c'
EXPECTED_RELEASE=BASE/'releases/liquiglass-20261028T172213Z'
RELEASE=BASE/'releases/agent-workflow-20261029-01'
DROPIN=pathlib.Path('/etc/systemd/system/career-auth.service.d/30-agent-trial-disabled.conf')
KEEP={'package.json','vite.config.js','src/i18n/site-complete-en.json','src/i18n/reviewed-en.json','server/public-translations.mjs','server/course-library.mjs','server/knowledge-store.mjs','server/report-copy.mjs'}
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def run(args,**kw):return subprocess.run(args,check=True,text=True,capture_output=True,**kw).stdout
def output(name,value):
 (WORK/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def inventory():
 files=[]
 for folder in ('src','scripts'):
  files += [p for p in (SOURCE/folder).rglob('*') if p.is_file() and not p.is_symlink()]
 files += [p for p in (SOURCE/'server').rglob('*') if p.is_file() and not p.is_symlink() and p.suffix in ('.mjs','.py') and 'data' not in p.relative_to(SOURCE).parts]
 files += [SOURCE/p for p in ('package.json','package-lock.json','vite.config.js','index.html') if (SOURCE/p).is_file()]
 files += [p for p in (SOURCE/'server/data').glob('*.json') if p.name=='public-content-en.json']
 return {p.relative_to(SOURCE).as_posix():sha(p) for p in sorted(set(files)) if not any(part.startswith('.') for part in p.relative_to(SOURCE).parts)}
def assert_base(expected=None):
 assert (BASE/'current').resolve()==EXPECTED_RELEASE,'STATIC_BASE_CHANGED'
 assert sha(SOURCE/'server/auth-server.mjs')==EXPECTED_AUTH,'AUTH_BASE_CHANGED'
 if expected is not None:assert inventory()==expected,'SOURCE_CHANGED_DURING_PREPARATION'
 status=json.loads(run(['python3','/etc/career-growth/set-ai-key.py','--status']))
 assert status['aiEnabled'] is False,'AI_MUST_REMAIN_DISABLED'
def atomic_copy(src,dest,mode=0o644):
 dest.parent.mkdir(parents=True,exist_ok=True)
 temp=dest.with_name(dest.name+'.agent-pending')
 assert not temp.exists()
 shutil.copyfile(src,temp);temp.chmod(mode);os.replace(temp,dest)
def db_backup(source,target):
 with closing(sqlite3.connect(source.as_uri()+'?mode=ro',uri=True)) as live:
  with closing(sqlite3.connect(target)) as saved:
   live.backup(saved);assert saved.execute('PRAGMA integrity_check').fetchone()[0]=='ok';assert not saved.execute('PRAGMA foreign_key_check').fetchall()
 target.chmod(0o600)
def safe_archive(archive,directory):
 with tarfile.open(archive,'r:gz') as tar:
  members=tar.getmembers()
  assert all(m.isfile() and not pathlib.PurePosixPath(m.name).is_absolute() and '..' not in pathlib.PurePosixPath(m.name).parts for m in members)
  for m in members:
   p=directory/m.name;assert p.resolve().is_relative_to(directory.resolve());p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(tar.extractfile(m).read());p.chmod(0o644)
def prepare():
 assert_base();assert not (WORK/'prepared.json').exists();assert not STAGE.exists()
 archive=WORK/'agent-workflow-trial-20261029.tar.gz';assert sha(archive)==EXPECTED_ARCHIVE,'ARCHIVE_HASH_MISMATCH'
 current=inventory();base={'staticRelease':str(EXPECTED_RELEASE),'staticIndexSha256':sha(EXPECTED_RELEASE/'index.html'),'authSha256':EXPECTED_AUTH,'runtimeInventory':current,'aiEnabled':False,'approval':'User explicitly approved deployment with AI disabled'}
 output('baseline.json',base)
 before=WORK/'before';before.mkdir(mode=0o700)
 for name,source in [('auth',pathlib.Path('/var/lib/career-growth/auth.sqlite')),('knowledge',SOURCE/'server/data/knowledge.sqlite'),('budget',pathlib.Path('/var/lib/career-growth/ai-budget.sqlite'))]:
  if source.exists():db_backup(source,before/(name+'.sqlite'))
 with tarfile.open(before/'source-runtime.tar.gz','w:gz') as tar:
  for relative in current:tar.add(SOURCE/relative,arcname=relative,recursive=False)
 (before/'source-runtime.tar.gz').chmod(0o600)
 (before/'previous-release.txt').write_text(str(EXPECTED_RELEASE)+'\n')
 overlay=WORK/'overlay';overlay.mkdir(mode=0o750);safe_archive(archive,overlay)
 manifest=json.loads((overlay/'payload-manifest.json').read_text())
 for row in manifest['files']:assert sha(overlay/row['path'])==row['sha256'],'PAYLOAD_HASH_MISMATCH'
 STAGE.mkdir(mode=0o750)
 for relative in current:
  dest=STAGE/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(SOURCE/relative,dest)
 (STAGE/'public').symlink_to(SOURCE/'public',target_is_directory=True)
 (STAGE/'node_modules').symlink_to(SOURCE/'node_modules',target_is_directory=True)
 # Explicit public build setting; never copy private environment files.
 (STAGE/'.env.server').write_text('VITE_AUTH_MODE=server\n')
 installed=[]
 for row in manifest['files']:
  name=row['path']
  if name in KEEP or name.startswith(('dist/','checks/')):continue
  atomic_copy(overlay/name,STAGE/name);installed.append(name)
 # Preserve later production CSS imports (including liquid-glass material).
 main=(STAGE/'src/main.jsx').read_text();production=(SOURCE/'src/main.jsx').read_text()
 css_pattern=r'^import\s+[\'\"](\.[^\'\"]+\.css)[\'\"];[^\S\n]*$'
 additions=[m.group(0) for m in re.finditer(css_pattern,production,re.M) if m.group(1) not in main]
 if additions:
  matches=list(re.finditer(css_pattern,main,re.M));assert matches,'CSS_MERGE_LOCATION_MISSING'
  index=matches[-1].end();main=main[:index]+'\n'+'\n'.join(additions)+main[index:];(STAGE/'src/main.jsx').write_text(main)
 for relative in ['src/liquiglass-material.css','src/CareerLoop.jsx','src/career-loop.css','src/reference-palette.css','src/i18n/reviewed-en.json','src/i18n/site-complete-en.json']:
  assert sha(STAGE/relative)==sha(SOURCE/relative),'SHARED_FEATURE_CHANGED'
 account=pwd.getpwnam('career')
 os.chown(WORK,0,account.pw_gid);WORK.chmod(0o750)
 for parent,dirs,files in os.walk(STAGE,followlinks=False):
  for p in [pathlib.Path(parent)]+[pathlib.Path(parent)/name for name in files]:
   if not p.is_symlink():os.chown(p,account.pw_uid,account.pw_gid)
 smoke=WORK/'smoke';smoke.mkdir(mode=0o700);os.chown(smoke,account.pw_uid,account.pw_gid)
 finish_prepare()
def finish_prepare():
 assert STAGE.is_dir() and (WORK/'before/auth.sqlite').is_file() and not (WORK/'prepared.json').exists()
 current=json.loads((WORK/'baseline.json').read_text())['runtimeInventory'];assert_base(current)
 manifest=json.loads((WORK/'overlay/payload-manifest.json').read_text())
 installed=[row['path'] for row in manifest['files'] if row['path'] not in KEEP and not row['path'].startswith(('dist/','checks/'))]
 production=(SOURCE/'src/main.jsx').read_text();original=(WORK/'overlay/src/main.jsx').read_text()
 additions=[m.group(0) for m in re.finditer(r'^import\s+[\'\"](\.[^\'\"]+\.css)[\'\"];[^\S\n]*$',production,re.M) if m.group(1) not in original]
 # Keep production dependencies read-only; Vite needs its own writable config cache.
 modules=STAGE/'node_modules'
 if modules.is_symlink():
  assert modules.resolve()==(SOURCE/'node_modules').resolve()
  modules.unlink();modules.mkdir(mode=0o750)
  for package in (SOURCE/'node_modules').iterdir():
   if package.name not in ('.vite','.vite-temp'):(modules/package.name).symlink_to(package,target_is_directory=package.is_dir())
  account=pwd.getpwnam('career');os.chown(modules,account.pw_uid,account.pw_gid)
 # Existing dependencies only. No npm install, external fetch or secret env.
 env={**os.environ,'AI_ENABLED':'0','NODE_ENV':'production'}
 for name in ['DEEPSEEK_API_KEY','AI_REVIEWED_KNOWLEDGE_FILE','CAREER_API_PROXY']:env.pop(name,None)
 merged=run(['runuser','-u','career','--','/usr/local/bin/node',str(WORK/'merge-agent-error-translations.mjs'),str(STAGE)],env=env)
 (WORK/'translation-merge.log').write_text(merged)
 check=run(['runuser','-u','career','--','/usr/local/bin/node','scripts/prepare-bilingual.mjs','--check'],cwd=STAGE,env=env)
 (WORK/'i18n-check.log').write_text(check)
 build=run(['runuser','-u','career','--','/usr/local/bin/node',str(SOURCE/'node_modules/vite/bin/vite.js'),'build','--mode','server'],cwd=STAGE,env=env)
 (WORK/'build.log').write_text(build)
 assert (STAGE/'dist/index.html').is_file()
 assert_base(current)
 report={'prepared':True,'aiEnabled':False,'backupCreated':True,'overlayFiles':installed,'cssImportsPreserved':additions,'stageIndexSha256':sha(STAGE/'dist/index.html'),'sharedMaterialSha256':sha(STAGE/'src/liquiglass-material.css'),'staticBase':str(EXPECTED_RELEASE),'sourceInventoryUnchanged':True}
 output('prepared.json',report);print(json.dumps({k:report[k] for k in ('prepared','aiEnabled','backupCreated','stageIndexSha256','sourceInventoryUnchanged')}))
def activate():
 prepared=json.loads((WORK/'prepared.json').read_text());base=json.loads((WORK/'baseline.json').read_text());assert_base(base['runtimeInventory'])
 smoke=json.loads((WORK/'smoke/stage-smoke-result.json').read_text());assert smoke['passed'] and smoke['aiEnabled'] is False,'STAGE_SMOKE_REQUIRED'
 assert not RELEASE.exists();assert not DROPIN.exists(),'UNEXPECTED_DROPIN'
 shutil.copytree(STAGE/'dist',RELEASE)
 preserve_assets()
 for p in RELEASE.rglob('*'):
  if p.is_file():p.chmod(0o644)
  elif p.is_dir():p.chmod(0o755)
 RELEASE.chmod(0o755)
 assert_base(base['runtimeInventory'])
 installed=[]
 try:
  for name in prepared['overlayFiles']:atomic_copy(STAGE/name,SOURCE/name);installed.append(name)
  DROPIN.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
  DROPIN.write_text('[Service]\nExecStart=\nExecStart=/usr/bin/env AI_ENABLED=0 /usr/local/bin/node server/auth-server.mjs\n');DROPIN.chmod(0o644)
  run(['systemctl','daemon-reload']);run(['systemctl','restart','career-auth'])
  healthy=False
  for attempt in range(20):
   try:
    with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=2) as r:healthy=json.load(r).get('status')=='ok'
    if healthy:break
   except Exception:time.sleep(.25)
  assert healthy,'BACKEND_HEALTH_FAILED'
 except Exception:
  # Before switching the UI: restore source, keep additive schema and all databases.
  restore=WORK/'rollback-source';restore.mkdir(mode=0o700,exist_ok=True);safe_archive(WORK/'before/source-runtime.tar.gz',restore)
  for name in installed:
   if (restore/name).is_file():atomic_copy(restore/name,SOURCE/name)
  if DROPIN.exists():DROPIN.unlink()
  run(['systemctl','daemon-reload']);run(['systemctl','restart','career-auth']);raise
 assert (BASE/'current').resolve()==EXPECTED_RELEASE,'FRONTEND_CHANGED_BEFORE_SWITCH'
 pending=BASE/'current.agent-pending';assert not pending.exists();pending.symlink_to(RELEASE,target_is_directory=True);os.replace(pending,BASE/'current')
 hashes={name:sha(SOURCE/name) for name in installed}
 report={'deployed':True,'aiEnabled':False,'staticRelease':str(RELEASE),'previousStaticRelease':str(EXPECTED_RELEASE),'servicePid':run(['systemctl','show','career-auth','-p','MainPID','--value']).strip(),'sourceHashes':hashes,'staticIndexSha256':sha(RELEASE/'index.html'),'backupDirectory':str(WORK/'before'),'budgetDatabaseReplaced':False,'accountDatabaseReplaced':False,'productionUserRowsInspected':False,'verificationPending':True}
 output('deployment-result.json',report);print(json.dumps({k:report[k] for k in ('deployed','aiEnabled','staticRelease','servicePid','budgetDatabaseReplaced','accountDatabaseReplaced')}))
def preserve_assets():
 assert RELEASE.is_dir() and RELEASE.resolve().is_relative_to((BASE/'releases').resolve())
 assert (BASE/'current').resolve() in (EXPECTED_RELEASE,RELEASE)
 target=RELEASE/'assets';target.mkdir(exist_ok=True);added=[]
 for source in (EXPECTED_RELEASE/'assets').iterdir():
  if not source.is_file() or source.is_symlink():continue
  dest=target/source.name
  if dest.exists():assert sha(dest)==sha(source),'ASSET_NAME_COLLISION'
  else:atomic_copy(source,dest);added.append(source.name)
 if added:output('preserved-assets.json',{'files':added,'reason':'Keep already-open pages working across the release switch'})
 return added
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['prepare','finish-prepare','activate','preserve-assets']);parser.add_argument('--approved-ai-disabled',action='store_true');args=parser.parse_args()
 assert os.geteuid()==0 and args.approved_ai_disabled,'EXPLICIT_APPROVAL_REQUIRED'
 {'prepare':prepare,'finish-prepare':finish_prepare,'activate':activate,'preserve-assets':preserve_assets}[args.mode]()
