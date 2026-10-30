import hashlib,json,pathlib
work=pathlib.Path('/srv/career-growth/agent-workflow-20261029-01');source=pathlib.Path('/srv/career-growth/source');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
docs=json.loads((work/'documentation-hashes.json').read_text());assert set(docs)=={'server/agent/README.md','AI业务闭环_交付与上线评审_20261028.md'}
report=json.loads((work/'deployment-result.json').read_text())
for name,value in report['sourceHashes'].items():
 if name not in docs:assert sha(source/name)==value,'RUNTIME_CHANGED'
changes={}
for name,value in docs.items():
 assert sha(source/name)==value,'DOCUMENT_HASH_MISMATCH'
 changes[name]={'initialSha256':report['sourceHashes'].get(name),'currentSha256':value};report['sourceHashes'][name]=value
report['postDeploymentDocumentation']=changes
(work/'deployment-result.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'documentationFilesUpdated':len(changes),'runtimeCodeChanged':False}))
