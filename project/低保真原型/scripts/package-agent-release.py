"""Build and verify a local reviewable overlay. Never connects to a server."""
import hashlib
import io
import json
import pathlib
import tarfile
import re
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'checks'/'AI业务闭环_20261028'
existing_manifest=OUT/'release-manifest.json'
if existing_manifest.is_file() and json.loads(existing_manifest.read_text(encoding='utf-8-sig')).get('deployed'):
    raise SystemExit('This release is already deployed. Preserve its archive and create a new release id for subsequent changes.')
files=[
 'package.json','server/auth-server.mjs','server/business-store.mjs','server/course-library.mjs',
 'server/knowledge-store.mjs','server/report-copy.mjs','server/public-translations.mjs','server/backup-db.py',
 'src/model.js','src/storage-recovery-model.js','src/auth-contract.js','src/agent-contract.js','src/agent-knowledge-view.js',
 'src/i18n/site-complete-en.json','src/i18n/reviewed-en.json','src/i18n/agent-en.json',
 'src/AgentWorkflow.jsx','src/AgentMessage.jsx','src/AgentNotes.jsx','src/AssistantChat.jsx',
 'src/AlignmentDialogs.jsx','src/TaskEditing.jsx','src/auth-client.js','src/i18n/render.js',
 'src/useAgentSession.js','src/agent-session.js','src/workspace-sync.js','src/useServerWorkspace.js',
 'src/agent-workflow.css','src/agent-live.css','src/main.jsx','vite.config.js','scripts/prepare-bilingual.mjs',
 'knowledge/authored-guidance-v1.json','knowledge/review-manifest-v1.json',
 'knowledge/evaluation-cases-v1.json','knowledge/student-pilot-protocol.md',
 'AI业务闭环_交付与上线评审_20261028.md','server/agent/README.md','dist/index.html',
 'checks/AI业务闭环_20261028/production-baseline.json']
files += [p.relative_to(ROOT).as_posix() for p in sorted((ROOT/'server'/'agent').glob('*.mjs'))]
files += [p.relative_to(ROOT).as_posix() for p in sorted((ROOT/'dist'/'assets').glob('*')) if p.is_file()]
public_copy=ROOT/'server'/'data'/'public-content-en.json'
if public_copy.is_file():files.append(public_copy.relative_to(ROOT).as_posix())
files=sorted(set(files))
test_log=(ROOT/'checks'/'agent-workflow-tests.log').read_text(encoding='utf-8-sig')
assert 'ℹ fail 0' in test_log
test_counts={name:int(re.search(r'ℹ '+name+r' (\d+)',test_log).group(1)) for name in ('tests','pass','fail','skipped')}
browser=json.loads((ROOT/'checks'/'AI工作台接通_20261028'/'browser-report.json').read_text(encoding='utf-8-sig'))
assert browser['passed'] is True and not browser['pageErrors']
recovery=json.loads((OUT/'recovery-report.json').read_text(encoding='utf-8-sig'));assert recovery['passed']
baseline=json.loads((OUT/'production-baseline.json').read_text(encoding='utf-8-sig'))
for row in baseline['sharedFilesMatchedBetweenLocalAndProduction']:
 assert hashlib.sha256((ROOT/row['path']).read_bytes()).hexdigest()==row['sha256'],'Shared frontend changed; rebuild/review before packaging'
evaluation=[json.loads(l) for l in (OUT/'live-evaluation-final-v4.jsonl').read_text(encoding='utf-8-sig').splitlines() if l.strip()]
budget=next(r for r in evaluation if r['event']=='complete')['budgetAfter']
rows=[]
for name in files:
 p=ROOT/name
 assert not p.is_symlink() and p.is_file() and p.resolve().is_relative_to(ROOT)
 assert not any(x in name.lower() for x in ('.env','.sqlite','ed25519','.deploy-auth','ai-private'))
 data=p.read_bytes();rows.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
payload={'releaseId':'agent-workflow-trial-20261029','files':rows,'productionDeploymentApproved':False,'deployed':False,
 'sourceKnowledgeVersion':'authored-guidance-20261028-v1','promptVersion':'career-readonly-v4',
 'unitTests':{'total':test_counts['tests'],'passed':test_counts['pass'],'skipped':test_counts['skipped'],'failed':test_counts['fail']},'browserChecks':len(browser['checks']),
 'knowledgeRetrievalCases':24,'courseReferenceChecks':57,'backupRestoreVerified':True,
 'cumulativeBudgetCny':'8.00','cumulativeReservedCny':f"{budget['reservedMicroCny']/1000000:.6f}",'remainingReservationCny':f"{budget['remainingMicroCny']/1000000:.6f}",
 'productionBaseline':baseline,
 'deploymentPolicy':'Preserve current static base; overlay dist, preserve current databases and private env; back up first. AI disabled until explicit trial accounts are configured.',
 'publicReleaseReady':False,'remainingGates':['production approval','independent content review','real consenting student tasks','broader v4 personal-context evaluation']}
OUT.mkdir(parents=True,exist_ok=True)
archive=OUT/'agent-workflow-trial-20261029.tar.gz'
with tarfile.open(archive,'w:gz',compresslevel=9) as tar:
 for name in files:
  data=(ROOT/name).read_bytes();info=tarfile.TarInfo(name);info.size=len(data);info.mode=0o644;tar.addfile(info,io.BytesIO(data))
 data=(json.dumps(payload,ensure_ascii=False,indent=2)+'\n').encode();info=tarfile.TarInfo('payload-manifest.json');info.size=len(data);info.mode=0o644;tar.addfile(info,io.BytesIO(data))
with tarfile.open(archive,'r:gz') as tar:
 assert set(tar.getnames())==set(files+['payload-manifest.json'])
 for row in rows:assert hashlib.sha256(tar.extractfile(row['path']).read()).hexdigest()==row['sha256']
payload['archive']={'path':archive.relative_to(ROOT).as_posix(),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}
(OUT/'release-manifest.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'files':len(files),'archive':payload['archive'],'deployed':False},ensure_ascii=False))
