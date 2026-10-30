import hashlib,json,pathlib,shutil,subprocess
WORK=pathlib.Path('/srv/career-growth/personal-context-20261029-03');SOURCE=pathlib.Path('/srv/career-growth/source');result=json.loads((WORK/'deployment-result.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def verify():assert all(sha(SOURCE/p)==v for p,v in result['files'].items())
verify();prefix=(WORK/'documentation/PRODUCT-prefix.md').read_text();product=SOURCE/'PRODUCT.md';original=product.read_text()
if not original.startswith(prefix.splitlines()[0]):
 shutil.copyfile(product,WORK/'before/PRODUCT-before-context.md');product.write_text(prefix.rstrip()+'\n\n'+original);product.chmod(0o644)
name='个人上下文与事件建议_20261029.md';shutil.copyfile(WORK/'documentation'/name,SOURCE/name);(SOURCE/name).chmod(0o644);verify()
status=subprocess.run(['systemctl','show','career-backup.service','-p','Result','-p','ExecMainStatus','-p','ExecMainExitTimestamp'],check=True,capture_output=True,text=True).stdout;assert 'Result=success' in status and 'ExecMainStatus=0' in status
report={'documentationOnly':True,'runtimeFilesStillMatch':True,'postDeploymentBackup':status.strip().splitlines(),'files':{'PRODUCT.md':sha(product),name:sha(SOURCE/name)}}
(WORK/'documentation-result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'documentationOnly':True,'runtimeFilesStillMatch':True,'backupSucceeded':True}))
