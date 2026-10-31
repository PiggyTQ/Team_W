"""Documentation only. Preserve production PRODUCT history and all runtime hashes."""
import hashlib,json,pathlib,shutil,subprocess
WORK=pathlib.Path('/srv/career-growth/backend-commands-20261029-02');SOURCE=pathlib.Path('/srv/career-growth/source');docs=WORK/'documentation'
release=json.loads((WORK/'deployment-result.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def runtime_ok():assert all(sha(SOURCE/name)==digest for name,digest in release['files'].items())
runtime_ok();prefix=(docs/'PRODUCT-prefix.md').read_text();target=SOURCE/'PRODUCT.md';current=target.read_text()
marker='# 关键业务命令与后端闭环已部署（2026-10-29 最新）'
if not current.startswith(marker):
 shutil.copyfile(target,WORK/'before/PRODUCT-before-delivery.md')
 current=current.replace('# AI 业务闭环已部署，AI保持关闭（2026-10-29 最新）','# AI 业务闭环首轮部署（2026-10-29 历史）',1)
 target.write_text(prefix.rstrip()+'\n\n'+current);target.chmod(0o644)
names=['PRODUCT.md','后端闭环审计与实施_20261029.md','后端闭环上线验收_20261029.md']
for name in names[1:]:shutil.copyfile(docs/name,SOURCE/name);(SOURCE/name).chmod(0o644)
runtime_ok()
properties=subprocess.run(['systemctl','show','career-backup.service','-p','Result','-p','ExecMainStatus','-p','ExecMainExitTimestamp'],check=True,capture_output=True,text=True).stdout
assert 'Result=success' in properties and 'ExecMainStatus=0' in properties
report={'documentationOnly':True,'runtimeFilesStillMatch':True,'files':{name:sha(SOURCE/name) for name in names},'postDeploymentBackup':properties.strip().splitlines()}
(WORK/'documentation-result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'documentationOnly':True,'runtimeFilesStillMatch':True,'postDeploymentBackupSucceeded':True}))
