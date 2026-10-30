import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const suites=[
 ['contracts','browser-check.mjs','检查记录','page'],
 ['spec','spec-alignment-check.mjs','检查记录/规格对齐','p'],
 ['growth','growth-schedule-check.mjs','检查记录/可视化与日程','p'],
 ['documents','document-regression-v51.mjs','检查记录/功能按键逐步引导_v51/文档回归','p'],
 ['resume','resume-modules-v49.mjs','检查记录/报告重组与完整简历_v49','p'],
 ['guides','operation-guide-v51.mjs','检查记录/功能按键逐步引导_v51','p']
];
let failed=false;
for(const[key,file,oldRoot,page]of suites.filter(([key])=>!process.argv[2]||process.argv[2]===key)){
 const dir='检查记录/板块空间重组_v54/回归/'+key,temp=new URL('.v54-spec-'+file,import.meta.url);
 await fs.mkdir(dir,{recursive:true});
 let source=(await fs.readFile(new URL(file,import.meta.url),'utf8')).replaceAll('127.0.0.1:5174','127.0.0.1:5184').replaceAll(oldRoot,dir).replaceAll('headless:true}','headless:true,args:["--no-proxy-server"]}').replaceAll('main h1,main h2','main h1:visible,main h2:visible').replaceAll('添加本人岗位输入','手动添加岗位').replaceAll('指定的本人机会不可用','找不到这条岗位记录').replaceAll('指定报告不可用','找不到这份报告').replaceAll('选择 / 拒绝资料范围','选择本次可用资料').replaceAll('/没有结果/','/没有找到符合条件的内容/').replaceAll('查看原创摘要','查看职业介绍').replaceAll('/暂无可比较的上一版本/','/还没有可比较的历史记录/');
 if(key!=='guides'){
  const at=source.indexOf('await check(')>=0?source.indexOf('await check('):source.indexOf('try{await fs.mkdir'),init=`await ${page}.addInitScript(()=>{localStorage.setItem('career-prototype-operation-guide-v1','{"enabled":false,"active":null,"seen":[]}');localStorage.setItem('career-prototype-guidance-v1','{"auto":false}');});\n`;
  if(at<0)throw Error('No checks in '+file);source=source.slice(0,at)+init+source.slice(at);
 }
 // The editor now opens deliberately from its paper toolbar.
 if(key==='contracts')source=source.replace("await page.getByRole('button',{name:'查看职业介绍'}).first().click();","await page.getByRole('button',{name:'暂停自动播放工作方向'}).click();await page.getByRole('button',{name:'查看职业介绍'}).first().click();").replace("await page.getByRole('button',{name:'AI 侧栏',exact:true}).click();","await page.locator('.workspace-utilities>summary').click();await page.getByRole('button',{name:'AI 侧栏',exact:true}).click();").replace("await page.getByRole('button',{name:'预览原文与措辞差异'}).click();","await page.getByRole('button',{name:'编辑内容与目标',exact:true}).click();await page.getByRole('button',{name:'预览原文与措辞差异'}).click();");
 if(key==='growth')source=source.replace("assert.equal(await p.getByRole('region',{name:'当前成长记录概览'}).count(),1);","assert.equal(await p.locator('.home-hub').count(),1);").replace("await p.getByRole('link',{name:'查看周日程与未排期任务 →',exact:true}).click();","await p.goto('http://127.0.0.1:5184/plan?tab=执行&view=calendar');");
 await fs.writeFile(temp,source);
 try{
  let log='';const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[fileURLToPath(temp)]);child.stdout.on('data',d=>{log+=d;process.stdout.write(d);});child.stderr.on('data',d=>{log+=d;process.stderr.write(d);});child.on('error',reject);child.on('exit',resolve);});
  await fs.writeFile(dir+'/执行记录.txt',log);if(code!==0)failed=true;
 }finally{await fs.unlink(temp);}
}
if(failed)process.exitCode=1;
