import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';
const base='http://127.0.0.1:5184',dir='检查记录/链路与布局聚焦_20261022/after';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await browser.newPage({reducedMotion:'reduce'}),results=[],errors=[];p.setDefaultTimeout(7000);p.on('pageerror',e=>errors.push(e.message));
async function load(route,scene='PT01',width=1440,lang='zh'){
 await p.setViewportSize({width,height:width<=390?844:900});await p.goto(base+'/plan');
 const s=scenarioState(scene);s.budget=5;
 await p.evaluate(({s,KEY,lang})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);localStorage.setItem('career-prototype-operation-guide-v1','{"enabled":false,"neverPrompt":true}');},{s,KEY,lang});
 await p.goto(base+route,{waitUntil:'domcontentloaded'});await p.locator('#main .page-surface').waitFor();
}
const stored=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
const visibleFields=async()=>{let total=0;for(const role of ['textbox','combobox','spinbutton','checkbox'])total+=await p.getByRole('dialog').getByRole(role).count();return total;};
const shot=name=>p.screenshot({path:dir+'/'+name+'.png'});
async function test(name,run){try{await run();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,550));await shot('失败-'+results.length);}}
try{
 await test('岗位录入：4个默认控件，必填校验、可选字段折叠保留、显式确认保存和重新编辑',async()=>{
  await load('/careers?tab=我的机会');await p.getByRole('button',{name:'手动添加岗位',exact:true}).click();assert.equal(await visibleFields(),4);
  await p.getByRole('button',{name:'保存本人研究卡',exact:true}).click();assert.equal((await stored()).jobs.length,0);assert.match(await p.getByRole('dialog').innerText(),/请填写标题/);
  await p.getByLabel('岗位研究标题',{exact:true}).fill('本人前端岗位研究（合成验收）');await p.getByLabel('本人允许处理的要求原文',{exact:true}).fill('熟悉HTML和CSS，相关经验优先（合成原文）');await p.getByLabel('对应职业方向',{exact:true}).selectOption('frontend');
  const source=p.locator('details').filter({has:p.locator('summary').getByText('企业、地点与来源',{exact:false})});await source.locator('summary').click();await p.getByLabel('企业 / 组织（未知可留空，不自动合并）',{exact:true}).fill('本人允许处理的合成组织');await source.locator('summary').click();
  await p.getByRole('checkbox',{name:'仅保存到本人本地研究卡，不进入公开库、AI 或薪酬聚合。',exact:true}).check();await shot('1440-岗位录入-收起后');await p.getByRole('button',{name:'保存本人研究卡',exact:true}).click();
  const s=await stored();assert.equal(s.jobs.length,1);assert.equal(s.jobs[0].company,'本人允许处理的合成组织');assert.equal(s.goal,null);assert.equal(s.events.length,0);assert.equal(s.tasks.length,0);
  await p.getByRole('button',{name:'编辑研究与笔记',exact:true}).click();await p.getByText('企业、地点与来源',{exact:false}).first().click();assert.equal(await p.getByLabel('企业 / 组织（未知可留空，不自动合并）',{exact:true}).inputValue(),'本人允许处理的合成组织');
 });
 await test('任务预检：核心4字段先显示，超预算阻断、展开设置保留、存草稿不创建、恢复后只建一个任务',async()=>{
  await load('/plan?precheck=1');assert.equal(await visibleFields(),4);await p.getByLabel('为什么做 / 要回答的问题',{exact:true}).fill('验证本人是否理解布局边界');await p.getByLabel('预计投入（本周期小时）',{exact:true}).fill('6');
  await p.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();assert.equal((await stored()).tasks.length,0);assert.match(await p.getByRole('dialog').innerText(),/超过每周预算/);
  await p.getByLabel('预计投入（本周期小时）',{exact:true}).fill('1');await p.getByText('归属、活动与实践方式',{exact:false}).first().click();await p.getByLabel('活动类型',{exact:true}).selectOption('自主学习');await p.getByText('归属、活动与实践方式',{exact:false}).first().click();
  await p.getByRole('button',{name:'仅存草稿',exact:true}).click();let s=await stored();assert.equal(s.tasks.length,0);assert.equal(s.taskDraft.kind,'自主学习');
  await p.goto(base+'/plan?tab=执行',{waitUntil:'domcontentloaded'});const resume=p.getByRole('button',{name:/恢复.*草稿|继续.*草稿/}).first();assert.ok(await resume.count());await resume.click();assert.equal(await p.getByLabel('为什么做 / 要回答的问题',{exact:true}).inputValue(),'验证本人是否理解布局边界');await shot('1440-任务预检-恢复');
  await p.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();s=await stored();assert.equal(s.tasks.length,1);assert.equal(s.tasks[0].kind,'自主学习');assert.equal(s.goal,null);assert.equal(s.taskDraft,null);
 });
 await test('手机岗位：列表先呈现、筛选切换、比较2项、打开同一来源，操作不依赖拖动',async()=>{
  await load('/careers?tab=企业与岗位','PT01',390);assert.equal(await p.locator('.discovery-filter').isVisible(),false);await shot('390-企业岗位-首屏');
  const b=await p.locator('.discovery-job-card h3').first().boundingBox();assert.ok(b.y<844,JSON.stringify(b));await p.getByRole('button',{name:'加入比较',exact:true}).nth(1).click();await p.getByRole('button',{name:'加入比较',exact:true}).first().click();
  await p.getByRole('button',{name:'筛选与岗位比较',exact:false}).click();await p.getByRole('button',{name:'比较所选岗位',exact:true}).click();assert.equal(await p.locator('.discovery-comparison').isVisible(),true);await p.getByRole('button',{name:'收起筛选与岗位比较',exact:false}).click();
  await p.getByRole('button',{name:'研究详情',exact:true}).nth(1).click();assert.match(await p.locator('.discovery-detail h2').innerText(),/运维/);
 });
 await test('手机我的机会：当前岗位先显示，切换后收起列表，顶部操作连接原任务、原简历与原事件',async()=>{
  await load('/careers?tab=我的机会','PT05',390);assert.equal(await p.locator('.opportunity-list').isVisible(),false);await shot('390-我的机会-首屏');const b=await p.locator('.opportunity-detail h2').boundingBox();assert.ok(b.y<844,JSON.stringify(b));
  const jobs=(await stored()).jobs;await p.getByRole('button',{name:'切换岗位与筛选',exact:false}).click();await p.locator('.opportunity-select').nth(1).click();assert.equal(await p.locator('.opportunity-list').isVisible(),false);assert.equal(new URL(p.url()).searchParams.get('job'),jobs[1].id);
  await p.locator('.opportunity-next-actions').getByRole('button',{name:'制作岗位简历',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/reports');assert.equal(new URL(p.url()).searchParams.get('tab'),'岗位简历');
  await p.goto(base+'/careers?tab=我的机会&job='+encodeURIComponent(jobs[0].id));await p.locator('.opportunity-next-actions').getByRole('button',{name:'记录本人申请 / 面试 / 结果',exact:true}).click();assert.equal(await p.getByRole('dialog').isVisible(),true);await p.getByRole('button',{name:'关闭面板',exact:true}).click();assert.equal((await stored()).events.length,0);
 });
 const matrix=[];
 for(const width of [1440,1024,390]){
  await load('/app','PT05',width);const task=(await stored()).tasks[0]?.id;
  const routes=['/app','/careers','/careers?tab=比较','/careers?tab=企业与岗位','/careers?tab=我的机会','/assessment','/assessment?tab=资料经历','/assessment?tab=原文确认','/assessment?tab=成果档案','/assessment?tab=当前简历','/career-map','/plan','/plan?tab=执行','/plan?tab=复盘','/learning','/learning?tab=短体验','/learning?tab=综合项目',...(task?['/work/'+task,'/work/'+task+'?tab=尝试与反馈','/work/'+task+'?tab=完成回执']:[]),'/reports','/reports?tab=岗位简历','/assistant','/assistant?tab=自然语言检索','/settings','/settings?tab=资料与隐私','/admin/quality'];
  for(const route of routes){await p.goto(base+route,{waitUntil:'domcontentloaded'});await p.locator('#main .page-surface').waitFor();const data=await p.locator('#main').evaluate(e=>({body:e.innerText.length,overflow:document.documentElement.scrollWidth>innerWidth}));matrix.push({width,route,...data});assert.ok(data.body>20,route);assert.equal(data.overflow,false,route+' '+width);
   if(width!==1024&&['/careers?tab=我的机会','/careers?tab=企业与岗位','/settings','/learning','/assessment','/plan?tab=执行','/reports'].includes(route))await shot(width+'-'+({'/careers?tab=我的机会':'我的机会','/careers?tab=企业与岗位':'企业岗位','/settings':'设置','/learning':'学习资源','/assessment':'评估总览','/plan?tab=执行':'任务执行','/reports':'职业报告'}[route])+'-首屏');
  }
 }
 results.push({name:'入口呈现与整页溢出矩阵',status:'pass',cases:matrix.length});await fs.writeFile(dir+'/入口布局矩阵.json',JSON.stringify(matrix,null,2));
 for(const lang of ['zh','en'])for(const width of [1440,390])for(const [route,name]of [['/careers?tab=我的机会','我的机会'],['/careers?tab=企业与岗位','企业岗位'],['/plan?precheck=1','任务预检']]){await load(route,'PT01',width,lang);if(route.includes('precheck'))await p.getByRole('dialog').waitFor();await shot(`${width}-${lang}-${name}`);}
 assert.deepEqual(errors,[]);results.push({name:'浏览器无致命脚本错误',status:'pass'});
}finally{await fs.writeFile(dir+'/专项与矩阵验收.json',JSON.stringify({results,errors},null,2));await browser.close();}
if(results.some(x=>x.status==='fail'))process.exitCode=1;
