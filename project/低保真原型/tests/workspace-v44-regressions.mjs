import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const suites=[
 ['quality','workspace-quality-check.mjs','工作区改进_v39'],
 ['continuity','continuity-check.mjs','全链路复盘'],
 ['jobs','job-separation-check.mjs','岗位与机会分离'],
 ['practice','practice-chain-check.mjs','实践链路修正'],
 ['editing','task-editability-check.mjs','行动编辑与出口'],
 ['assistant','workspace-assistant-guide-check.mjs','工作区改进_v39'],
 ['atlas','atlas-interactions-v43.mjs','地图交互复核_v43'],
 ['atlas-flow','atlas-flow-check.mjs','地图支线_v42'],
 ['atlas-final','atlas-final-check.mjs','地图支线_v42'],
 ['navigation','flow-navigation-check.mjs','统一流程导航'],
];
let failed=false;
for(const [key,file,oldDir] of suites.filter(([key])=>!process.argv[2]||process.argv[2]===key)){
 const temp=new URL(`.v44-run-${file}`,import.meta.url),dir=`${process.env.WORKSPACE_CHECK_ROOT||'检查记录/工作区空间_v44/回归'}/${key}`;
 await fs.mkdir(dir,{recursive:true});
 let source=(await fs.readFile(new URL(file,import.meta.url),'utf8')).replaceAll('127.0.0.1:5174','127.0.0.1:5184').replaceAll('检查记录/'+oldDir,dir).replaceAll('headless:true}','headless:true,args:["--no-proxy-server"]}').replaceAll('先带缺项复盘','先整理已有探索记录').replaceAll('main h1,main h2','main h1:visible,main h2:visible').replaceAll('指定的本人机会不可用','找不到这条岗位记录').replaceAll('指定报告不可用','找不到这份报告').replaceAll('添加本人岗位输入','手动添加岗位').replaceAll('这份报告不可用','找不到这份报告');
 if(key==='continuity')source=source.replaceAll("await p.getByLabel('姓名（示例用途，不参与分析）').fill", "await p.getByRole('button',{name:'编辑内容与目标',exact:true}).click();await p.getByLabel('姓名（示例用途，不参与分析）').fill");
 if(key==='jobs')source=source.replaceAll('../设计参考与同步/实现截图/U05_企业与岗位_v1_20261017.png',dir+'/发现实际截图.png').replaceAll('../设计参考与同步/实现截图/U05_我的机会_v1_20261017.png',dir+'/机会实际截图.png');
 // Older manual-practice checks used a removed navigation decoration; assert
 // the current destination and content instead of relying on that decoration.
 if(key==='practice')source=source.replaceAll('/实践验证/','/记录站外学习与实践/').replace(/assert\.(?:equal|match)\(await p\.locator\('\.workflow-step\[aria-current=step\]'\)[\s\S]*?;/g,'').replace(/await p\.locator\('\.workflow-step'\)\.nth\(3\)\.click\(\);/g,"await next();");
 await fs.writeFile(temp,source);
 try{let log='';const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[fileURLToPath(temp)]);child.stdout.on('data',d=>{log+=d;process.stdout.write(d);});child.stderr.on('data',d=>{log+=d;process.stderr.write(d);});child.on('error',reject);child.on('exit',resolve);});await fs.writeFile(dir+'/执行记录.txt',log);if(code!==0)failed=true;}finally{await fs.unlink(temp);}
}
if(failed)process.exitCode=1;
