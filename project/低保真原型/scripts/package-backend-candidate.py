"""Read-only source baseline + checked rebase. Never reads keys/env/user databases."""
import concurrent.futures
import difflib
import hashlib
import io
import json
import pathlib
import subprocess
import tarfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'checks'/'后端闭环_20261029'
BASE=OUT/'source-baseline'
MERGED=OUT/'candidate-runtime'
existing=['server/auth-server.mjs','server/business-store.mjs','src/main.jsx','src/TaskEditing.jsx','src/AlignmentDialogs.jsx','src/CatalogData.jsx','src/auth-contract.js','src/auth-client.js','src/workspace-sync.js','src/useServerWorkspace.js','src/alignment-model.js','src/completion-model.js','src/i18n/agent-en.json']
new=['server/business-commands.mjs','server/business-error.mjs','server/planning-report.mjs','server/BUSINESS_ARCHITECTURE.md','src/reference-contract.js']
old_archive=ROOT/'checks/AI业务闭环_20261028/agent-workflow-trial-20261029.tar.gz'
sha=lambda b:hashlib.sha256(b).hexdigest()
normalize=lambda b:b.decode('utf-8-sig').replace('\r\n','\n')
OUT.mkdir(parents=True,exist_ok=True)
if (OUT/'release-manifest.json').is_file():
    assert not json.loads((OUT/'release-manifest.json').read_text(encoding='utf-8')).get('deployed'),'Release already deployed; create a new release id for future changes.'
assert json.loads((OUT/'acceptance-summary.json').read_text())['passed']

def fetch(name):
    dest=BASE/name;dest.parent.mkdir(parents=True,exist_ok=True)
    subprocess.run(['scp','-i',str(ROOT/'.deploy-auth/server_ed25519'),'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','root@47.250.133.180:/srv/career-growth/source/'+name,str(dest)],check=True,capture_output=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(fetch,existing))

def rebase(original,desired,current,name):
    # Each full context must match once. No fuzzy patch and no whole-file overwrite.
    before=original.splitlines(keepends=True);after=desired.splitlines(keepends=True)
    for group in difflib.SequenceMatcher(a=before,b=after,autojunk=False).get_grouped_opcodes(3):
        first,last=group[0],group[-1]
        old=''.join(before[first[1]:last[2]]);updated=''.join(after[first[3]:last[4]])
        if old and current.count(old)!=1 and updated and current.count(updated)==1:
            continue  # An identical production change is already present.
        if not old or current.count(old)!=1:
            (OUT/'rebase-conflict.json').write_text(json.dumps({'path':name,'old':old,'updated':updated,'opcodes':group},ensure_ascii=False,indent=2),encoding='utf-8')
            raise AssertionError('REBASE_CONTEXT_CONFLICT: '+name)
        current=current.replace(old,updated,1)
    return current

with tarfile.open(old_archive) as prior:
    rows=[]
    for name in existing:
        current_bytes=(BASE/name).read_bytes();current=normalize(current_bytes);desired=normalize((ROOT/name).read_bytes())
        if name.endswith('agent-en.json'):
            old=json.loads(prior.extractfile(name).read());delta={k:v for k,v in json.loads(desired).items() if old.get(k)!=v};merged=json.loads(current);merged.update(delta);result=json.dumps(merged,ensure_ascii=False,indent=2)+'\n'
        elif name=='src/CatalogData.jsx':
            old="await sync.flush();const result=await apiRequest('/api/services/report',{data:{baseVersion:sync.current().revision,language:getLanguage()}});download(result.filename,result.text);"
            changed="const receipt=await sync.command('report.compile',{language:getLanguage(),confirmation:'COMPILE_REPORT'});const record=sync.current().state.reports.find(row=>row.id===receipt.refs.reportId);if(!record)throw Error('NOT_FOUND');download('career-preparation.md',record.body);"
            assert current.count(old)==1;result=current.replace(old,changed,1)
        elif name=='src/alignment-model.js':
            old="  return !r||s.adminSource.status==='已撤回'||[...new Set([...(r.claimIds||[]),...(r.claimRefs||[]).map(ref=>ref.id)])].some(id=>!confirmed(s).some(c=>c.id===id));"
            changed="  return !r||s.adminSource.status==='已撤回'||claimSnapshotsUnavailable(s,r);"
            assert current.count(old)==1;result=current.replace(old,changed,1)
            first="import {fresh,makeTask,confirmed,uid,cname} from './model.js';"
            assert result.count(first)==1;result=result.replace(first,first+"\nimport {claimSnapshotsUnavailable} from './reference-contract.js';",1)
        elif name=='src/completion-model.js':
            old="export function resumeUnavailable(s,r){return profileSnapshotUnavailable(s,r.profileSnapshot)||(r.claimIds||[]).some(id=>!confirmed(s).some(c=>c.id===id))||(r.educationFacts||[]).some(e=>!educationFacts(s).some(x=>x.id===e.id&&e.version>(x.withdrawnThrough||0)));}"
            changed=next(line for line in desired.splitlines() if line.startswith('export function resumeUnavailable('));assert current.count(old)==1;result=current.replace(old,changed,1)
            first="import {profileSnapshotUnavailable} from './resume-content-model.js';"
            assert result.count(first)==1;result=result.replace(first,first+"\nimport {claimSnapshotsUnavailable} from './reference-contract.js';",1)
        else:
            original=normalize(prior.extractfile(name).read());result=rebase(original,desired,current,name)
        dest=MERGED/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(result,encoding='utf-8',newline='')
        rows.append({'path':name,'baselineSha256':sha(current_bytes),'candidateSha256':sha(dest.read_bytes()),'localSha256':sha((ROOT/name).read_bytes()),'method':'checked-context-rebase' if not name.endswith('agent-en.json') else 'translation-key-merge'})
    for name in new:
        dest=MERGED/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes((ROOT/name).read_bytes());rows.append({'path':name,'baselineSha256':None,'candidateSha256':sha(dest.read_bytes()),'method':'new-module'})

# All current production CSS imports must remain present. Styles/assets aren't packaged.
import re
current=normalize((BASE/'src/main.jsx').read_bytes());merged=normalize((MERGED/'src/main.jsx').read_bytes())
for match in re.finditer(r'^import\s+[\'\"]([^\'\"]+\.css)[\'\"];',current,re.M):assert match.group(0) in merged,'CSS_IMPORT_LOST'
manifest={'releaseId':'backend-commands-20261029-02','approvedForProduction':True,'approval':'User explicitly approved deployment with AI off in this conversation on 2026-10-29','deployed':False,'aiEnabled':False,'realProviderCalls':0,'newTables':['business_command_receipts'],'files':rows,'preservesProductionSourceOutsidePatches':True,'includesPrivateConfiguration':False,'includesUserData':False,'includesStaticBuild':False}
(MERGED/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
archive=OUT/'backend-commands-20261029-02.tar.gz'
with tarfile.open(archive,'w:gz') as output:
    for row in rows:output.add(MERGED/row['path'],arcname=row['path'],recursive=False)
    output.add(MERGED/'manifest.json',arcname='manifest.json',recursive=False)
manifest['archive']={'filename':archive.name,'sha256':sha(archive.read_bytes()),'bytes':archive.stat().st_size}
(OUT/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'candidateFiles':len(rows),'archiveBytes':archive.stat().st_size,'archiveSha256':manifest['archive']['sha256'],'productionChanged':False}))
