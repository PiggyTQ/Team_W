import hashlib,json,pathlib,shutil
WORK=pathlib.Path('/srv/career-growth/backend-platform-20261030-04');SOURCE=pathlib.Path('/srv/career-growth/source');DOCS=WORK/'documentation'
result=json.loads((WORK/'deployment-result.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert all(sha(SOURCE/name)==value for name,value in result['files'].items())
prefix=(DOCS/'PRODUCT-prefix.md').read_text();product=SOURCE/'PRODUCT.md';existing=product.read_text();
if not existing.startswith('# 后端平台补全已上线（2026-10-30）'):product.write_text(prefix+existing)
for name in ('后端平台补全与验收_20261030.md','server/PLATFORM_CONTRACT.md'):
 dest=SOURCE/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(DOCS/name,dest);dest.chmod(0o644)
assert all(sha(SOURCE/name)==value for name,value in result['files'].items())
report={'documentationSynced':True,'runtimeUnchanged':True,'productionHistoryPreserved':True};(WORK/'documentation-result.json').write_text(json.dumps(report));print(json.dumps(report))
