"""Runnable transport envelopes; frozen project material bytes stay unchanged."""
from pathlib import Path
import hashlib,json,stat,subprocess,tempfile,zipfile

ROOT=Path(__file__).resolve().parents[1]
PACK=ROOT/'course-packs/growth'
catalog=json.loads((PACK/'catalog.json').read_text(encoding='utf-8'))
tool=ROOT/'public/practice-tools/instance-runner-1.mjs'
sha=lambda data:hashlib.sha256(data).hexdigest()
records=[]
for project in catalog['projects']:
    if project['legacy']: continue
    folder=PACK/project['id']/str(project['version'])
    manifest_bytes=(folder/'manifest.json').read_bytes()
    manifest=json.loads(manifest_bytes)
    files={'manifest.json':manifest_bytes,'instance-runner-1.mjs':tool.read_bytes()}
    for item in manifest['files']:
        candidate=(folder/item['path']).resolve()
        if not candidate.is_relative_to(folder.resolve()):raise ValueError('Unsafe material path')
        data=candidate.read_bytes()
        if sha(data)!=item['sha256'] or len(data)!=item['bytes']:raise ValueError('Frozen material changed')
        files[item['path']]=data
    identity={'projectId':project['id'],'version':project['version'],'deliveryVersion':1,'materialManifestSha256':sha(manifest_bytes),'toolSha256':sha(tool.read_bytes()),'scope':'Complete local teaching delivery retaining immutable material files. No human review or independent learner mastery is implied.'}
    files['DELIVERY.json']=json.dumps(identity,ensure_ascii=False,indent=2).encode('utf-8')
    files['START-HERE.md']=(f"# {project['title']['en']}\n\nUse the extracted files in this directory. Read assignment.md (or assignment.en.md), input/dictionary.md and RUN.md.\n\nNode 24; no package installation, paid model or external cloud is required.\n\n- Public reference: `node verify.mjs --reference`.\n- Implement your source and run `node verify.mjs`.\n- SQL: `node run-sql.mjs --reference`, then edit query.sql and run `node run-sql.mjs`.\n- Configuration: edit rules.json and run `node instance-runner-1.mjs base` using the supplied evaluator. `--reference` reproduces the public configuration.\n- Variants: use the selected ID with `node instance-runner-1.mjs data-1 --reference --sql`, `api-1 --reference --http`, or `rules-1 --reference`. Remove `--reference` to check your source/configuration.\n\nThe included project.zip is a retained archive material file. Work with this directory's already extracted files. DELIVERY.json identifies this complete delivery envelope.\n\n本目录为完整解压工作目录。先读任务书、字段说明和运行步骤。参考复现为 `node verify.mjs --reference`；修订自己的程序后执行 `node verify.mjs`。规则项目可使用配套运行器核对自己编辑的 rules.json，无需重写评价器。变式使用本次选择的实例ID。project.zip 是保留的归档材料，请直接使用已经解压出的文件。本机执行、文件核对和本人复核均不等同独立能力证明。\n").encode('utf-8')
    destination=ROOT/'public/practice-bundles'/project['id']/str(project['version'])
    destination.mkdir(parents=True,exist_ok=True)
    archive=destination/'practice.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as output:
        for name,data in sorted(files.items()):
            info=zipfile.ZipInfo(name,date_time=(2026,11,26,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=3;info.external_attr=0o100644<<16
            output.writestr(info,data)
    with tempfile.TemporaryDirectory(prefix='avemly-delivery-check-') as temp:
        target=Path(temp).resolve()
        with zipfile.ZipFile(archive) as source:
            if source.testzip() is not None:raise ValueError('Archive CRC failure')
            if sum(i.file_size for i in source.infolist())>4*1024*1024:raise ValueError('Unexpected delivery expansion')
            for entry in source.infolist():
                path=(target/entry.filename).resolve()
                if '\\' in entry.filename or not path.is_relative_to(target) or stat.S_ISLNK(entry.external_attr>>16):raise ValueError('Unsafe archive entry')
                path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(source.read(entry))
        for item in manifest['files']:
            if sha((target/item['path']).read_bytes())!=item['sha256']:raise ValueError('Extracted material hash mismatch')
        run=subprocess.run(['node','verify.mjs','--reference'],cwd=target,capture_output=True,text=True,encoding='utf-8',timeout=15)
        if run.returncode!=0:raise RuntimeError(project['id']+' extracted reference failed: '+run.stderr)
        identity.update({'sha256':sha(archive.read_bytes()),'bytes':archive.stat().st_size,'files':len(files),'allExtractedMaterialHashesVerified':True,'actualExtractedReference':{'exit':run.returncode,'stdout':run.stdout},'originalMaterialVersionUnchanged':True})
        (destination/'delivery-receipt.json').write_text(json.dumps(identity,ensure_ascii=False,indent=2),encoding='utf-8')
        records.append(identity)
(ROOT/'checks/practice-growth-20261126/delivery-extractions.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'public/practice-bundles/manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(records)} complete deliveries extracted, all material hashes verified, all references executed.')
