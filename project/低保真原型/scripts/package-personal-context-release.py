import concurrent.futures,difflib,hashlib,json,pathlib,subprocess,tarfile
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'checks/personal-context-20261029';BASE=OUT/'baseline';PAYLOAD=OUT/'payload';OUT.mkdir(parents=True,exist_ok=True)
if (OUT/'manifest.json').is_file():assert not json.loads((OUT/'manifest.json').read_text()).get('deployed'),'Already deployed; use a new release id.'
files=['server/auth-server.mjs','server/business-store.mjs','server/agent/service.mjs','server/agent/workflow.mjs'];new=['server/agent/personal-context.mjs']
sha=lambda b:hashlib.sha256(b).hexdigest();norm=lambda b:b.decode('utf-8-sig').replace('\r\n','\n')
assert 'ℹ fail 0' in (ROOT/'checks/personal-context-tests-20261029.log').read_text(encoding='utf-8-sig')
def fetch(name):
 p=BASE/name;p.parent.mkdir(parents=True,exist_ok=True);subprocess.run(['scp','-i',str(ROOT/'.deploy-auth/server_ed25519'),'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','root@47.250.133.180:/srv/career-growth/source/'+name,str(p)],check=True,capture_output=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(fetch,files))
rows=[]
with tarfile.open(ROOT/'checks/AI业务闭环_20261028/agent-workflow-trial-20261029.tar.gz') as archive:
 for name in files:
  original=(ROOT/'checks/后端闭环_20261029/candidate-runtime'/name)
  before=norm(original.read_bytes() if original.is_file() else archive.extractfile(name).read()).splitlines(keepends=True);after=norm((ROOT/name).read_bytes()).splitlines(keepends=True);current=norm((BASE/name).read_bytes())
  for group in difflib.SequenceMatcher(a=before,b=after,autojunk=False).get_grouped_opcodes(3):
   first,last=group[0],group[-1];old=''.join(before[first[1]:last[2]]);updated=''.join(after[first[3]:last[4]]);assert old and current.count(old)==1,'CONTEXT_CONFLICT '+name;current=current.replace(old,updated,1)
  assert current==''.join(after),'Production changes require explicit merge review: '+name
  p=PAYLOAD/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(current,encoding='utf-8',newline='');rows.append({'path':name,'baselineSha256':sha((BASE/name).read_bytes()),'candidateSha256':sha(p.read_bytes())})
for name in new:
 p=PAYLOAD/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/name).read_bytes());rows.append({'path':name,'baselineSha256':None,'candidateSha256':sha(p.read_bytes())})
manifest={'approvedForProduction':True,'releaseId':'personal-context-20261029-03','aiEnabled':False,'newTables':['personal_context_heads','personal_context_events','personal_suggestion_feedback'],'files':rows,'frontendChanged':False}
(PAYLOAD/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
archive=OUT/'candidate.tar.gz'
with tarfile.open(archive,'w:gz') as packed:
 for row in rows:packed.add(PAYLOAD/row['path'],arcname=row['path'],recursive=False)
 packed.add(PAYLOAD/'manifest.json',arcname='manifest.json')
manifest['archiveSha256']=sha(archive.read_bytes());(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8');print(json.dumps({'files':len(rows),'archiveSha256':manifest['archiveSha256']}))
