import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const checks=[
 ['flow-navigation-check.mjs','统一流程导航'],
 ['task-editability-check.mjs','行动编辑与出口'],
 ['home-light-scroll-check.mjs','竖向轻滚切换_v37'],
 ['home-gallery-drag-check.mjs','职业循环卡片鼠标拖动_v35'],
 ['home-text-reveal-check.mjs','首页文字入场全检_v38']
];
let failed=false;
for(const [name,originalDir]of checks.filter(([name])=>!process.argv[2]||name.includes(process.argv[2]))){
 const temp=new URL(`.workspace-regression-${name}`,import.meta.url);
 let source=await fs.readFile(new URL(name,import.meta.url),'utf8');
 source=source.replaceAll('127.0.0.1:5174','127.0.0.1:5184').replaceAll('检查记录/'+originalDir,'检查记录/工作区改进_v39/回归/'+originalDir);
 source=source.replaceAll('headless:true','headless:true,args:["--no-proxy-server"]');
 source=source.replaceAll("main h1,main h2,main h3","main h1:visible,main h2:visible,main h3:visible").replaceAll('先带缺项复盘','先整理已有探索记录');
 // Check interruption by observed displacement within a bounded response window,
 // rather than requiring a headless browser to land on a particular 70ms frame.
 source=source.replace('await wait(70);assert.ok(await y()<before-40);','await p.waitForFunction(before=>scrollY<before-40,before,{timeout:300});');
 await fs.writeFile(temp,source);
 try{
  console.log('CHECK',name);
  const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[fileURLToPath(temp)],{stdio:'inherit'});child.on('error',reject);child.on('exit',resolve);});
  if(code!==0)failed=true;
 }finally{await fs.unlink(temp);}
}
if(failed)process.exitCode=1;
