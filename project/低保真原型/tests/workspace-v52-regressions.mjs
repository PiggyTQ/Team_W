import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const suites=[
 ['quality','workspace-quality-check.mjs','工作区改进_v39'],
 ['continuity','continuity-check.mjs','全链路复盘'],
 ['jobs','job-separation-check.mjs','岗位与机会分离'],
 ['practice','practice-chain-check.mjs','实践链路修正'],
 ['editing','task-editability-check.mjs','行动编辑与出口'],
 ['assistant','operation-access-v51.mjs','功能按键逐步引导_v51'],
 ['atlas','atlas-interactions-v43.mjs','地图交互复核_v43'],
 ['atlas-flow','atlas-flow-check.mjs','地图支线_v42'],
 ['atlas-final','atlas-final-check.mjs','地图支线_v42'],
 ['navigation','flow-navigation-check.mjs','统一流程导航'],
];
let failed=false;
for(const [key,file,oldDir] of suites.filter(([key])=>!process.argv[2]||process.argv[2]===key)){
 const temp=new URL(`.v52-run-${file}`,import.meta.url),dir=`${process.env.WORKSPACE_CHECK_ROOT||'检查记录/板块对齐与全链路_v52/回归'}/${key}`;
 await fs.mkdir(dir,{recursive:true});
 let source=(await fs.readFile(new URL(file,import.meta.url),'utf8')).replaceAll('127.0.0.1:5174','127.0.0.1:5184').replaceAll('检查记录/'+oldDir,dir).replaceAll('headless:true}','headless:true,args:["--no-proxy-server"]}').replaceAll('先带缺项复盘','先整理已有探索记录').replaceAll('main h1,main h2','main h1:visible,main h2:visible').replaceAll('指定的本人机会不可用','找不到这条岗位记录').replaceAll('指定报告不可用','找不到这份报告').replaceAll('添加本人岗位输入','手动添加岗位').replaceAll('这份报告不可用','找不到这份报告');
 if(key==='continuity')source=source.replaceAll("await p.getByLabel('姓名（示例用途，不参与分析）').fill", "await p.getByRole('button',{name:'编辑内容与目标',exact:true}).click();await p.getByLabel('姓名（示例用途，不参与分析）').fill");
 if(key==='jobs')source=source.replaceAll('../设计参考与同步/实现截图/U05_企业与岗位_v1_20261017.png',dir+'/发现实际截图.png').replaceAll('../设计参考与同步/实现截图/U05_我的机会_v1_20261017.png',dir+'/机会实际截图.png');
 // Older manual-practice checks used a removed navigation decoration; assert
 // the current destination and content instead of relying on that decoration.
 if(key==='practice')source=source.replaceAll('/实践验证/','/记录站外学习与实践/').replace(/assert\.(?:equal|match)\(await p\.locator\('\.workflow-step\[aria-current=step\]'\)[\s\S]*?;/g,'').replace(/await p\.locator\('\.workflow-step'\)\.nth\(3\)\.click\(\);/g,"await next();");

 const disable="await __PAGE__.addInitScript(()=>{localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false}));localStorage.setItem('career-prototype-guidance-v1',JSON.stringify({auto:false,seen:[]}));});";
 if(key==='continuity')source=source.replace('const state=()=>',disable.replace('__PAGE__','p')+'\nconst state=()=>');
 if(key==='quality'){
  source=source.replace('const snapshot=()=>',disable.replace('__PAGE__','page')+'\nconst snapshot=()=>');
  source=source.replaceAll('.workspace-guide>summary','.workspace-guide>.workspace-guide-trigger');
  source=source.replace("await page.locator('.home-hub-heading>a').click();assert.equal(await page.locator('#workspace-help').getAttribute('open'),'');await page.locator('#workspace-help>summary').press('Enter');assert.equal(await page.locator('#workspace-help').getAttribute('open'),null);", "await page.locator('.home-hub-heading .workspace-guide-trigger').click();await page.locator('.operation-guide').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('.operation-guide').count(),0);");
  const first=source.indexOf(" await check('本页指南键盘"),last=source.indexOf(" await check('空状态动作",first);
  source=source.slice(0,first)+` await check('按键引导可键盘开启和暂停，不修改材料状态',async()=>{await visit('/assessment?tab=原文确认','PT03');const before=await snapshot();const trigger=page.locator('.workspace-guide>.workspace-guide-trigger');await trigger.focus();await trigger.press('Enter');await page.locator('.operation-guide[data-step="materials.review"]').waitFor();assert.deepEqual(await snapshot(),before);await page.keyboard.press('Escape');assert.equal(await page.locator('.operation-guide').count(),0);});\n`+source.slice(last);
  source=source.replace("assert.equal(await empty.locator('details').getAttribute('open'),null);", "assert.equal(await page.locator('.guidance-bubble:popover-open').count(),0);");
  source=source.replace("assert.equal(await empty.locator('ol li').count(),3);", "assert.equal(await page.locator('.guidance-bubble:popover-open ol li').count(),3);await page.keyboard.press('Escape');");
  source=source.replace("'.home-hub':'.workspace-guide'", "'.home-hub':'.operation-guide'");
 }
 await fs.writeFile(temp,source);
 try{let log='';const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[fileURLToPath(temp)]);child.stdout.on('data',d=>{log+=d;process.stdout.write(d);});child.stderr.on('data',d=>{log+=d;process.stderr.write(d);});child.on('error',reject);child.on('exit',resolve);});await fs.writeFile(dir+'/执行记录.txt',log);if(code!==0)failed=true;}finally{await fs.unlink(temp);}
}
if(failed)process.exitCode=1;
