import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {KEY,scenarioState,usedHours} from '../src/model.js';
const dir='检查记录/工作区空间_v44/链路验收',base='http://127.0.0.1:5184';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await browser.newPage({viewport:{width:1440,height:1000}}),results=[],errors=[];
p.setDefaultTimeout(6000);p.on('pageerror',e=>errors.push(e.message));
const state=()=>p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
const modal=()=>p.locator('dialog[open]');
async function load(route,s='PT01',lang='zh'){
 await p.goto(base);await p.evaluate(({KEY,s,lang})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);},{KEY,s:typeof s==='string'?scenarioState(s):s,lang});await p.goto(base+route);await p.locator('.page-surface').waitFor();
}
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,500));await p.screenshot({path:dir+'/fail-'+results.length+'.png'});}}
const jump=async route=>{await p.goto(base+route);await p.locator('.page-surface').waitFor();};
try{
 await check('资料库筛选、收藏与预览在刷新和返回后保留，不自动创建任务',async()=>{
  await load('/learning');const before=await state();
  await p.getByLabel('预计投入',{exact:true}).selectOption('2 小时以内');await p.getByLabel('资源成本 / 语言',{exact:true}).selectOption('免费 · 中文原创');
  await p.locator('.learning-card').first().getByRole('button',{name:'预览范围与成果',exact:true}).click();
  await p.getByLabel('数据质量小项目的实践范围',{exact:true}).selectOption('标准范围');const url=p.url();assert.equal(new URL(url).searchParams.get('unit'),'quality');
  await p.reload();assert.equal(await p.getByLabel('预计投入',{exact:true}).inputValue(),'2 小时以内');assert.ok(await p.locator('.project-preview').isVisible());assert.equal(await p.getByLabel('数据质量小项目的实践范围',{exact:true}).inputValue(),'标准范围');
  await p.getByRole('button',{name:'收藏数据质量小项目',exact:true}).click();
  await p.locator('.learning-collections').getByRole('link',{name:/^收藏/}).click();assert.equal(await p.locator('.learning-card').count(),1);assert.equal(await p.getByLabel('预计投入',{exact:true}).inputValue(),'2 小时以内');
  await p.locator('.learning-collections').getByRole('link',{name:'我的学习',exact:true}).click();assert.equal(await p.locator('.learning-card').count(),0);
  await jump(new URL(url).pathname+new URL(url).search);assert.ok(await p.locator('.project-preview').isVisible());assert.equal((await state()).tasks.length,before.tasks.length);
  await p.screenshot({path:dir+'/桌面-资料库预览.png'});
 });
 await check('学习资源→预算预检→实践→自检→成果确认→原资源，同一任务完整闭环',async()=>{
  const s=scenarioState('PT01');s.budget=6;s.stage='S2';await load('/learning?hours=2+小时以内&unit=quality',s);
  await p.getByRole('button',{name:'选择范围并开始预检',exact:true}).click();assert.ok(await modal().isVisible());
  await modal().getByRole('button',{name:'确认预算并创建任务',exact:true}).click();
  let saved=await state();assert.equal(saved.tasks.length,1);const t=saved.tasks[0];assert.equal(t.template,'quality');assert.equal(new URL(t.source,base).searchParams.get('unit'),'quality');assert.equal(new URL(t.source,base).searchParams.get('hours'),'2 小时以内');
  await p.getByRole('button',{name:'填写尝试产物',exact:true}).click();
  await p.getByLabel('产物文本（每次提交形成独立版本）',{exact:true}).fill('合成验收：记录了缺失、重复与限制说明，未实际运行 SQL。');await p.getByLabel('本人贡献',{exact:true}).fill('本人整理合成问题清单与处理理由。');
  await p.getByRole('button',{name:'提交为 v1',exact:true}).click();assert.equal((await state()).tasks[0].completed,false);
  await p.getByRole('button',{name:'记录本人自检（非实核）',exact:true}).click();
  await p.locator('.page-surface>.tabs').getByRole('link',{name:'完成回执',exact:true}).click();
  await p.getByRole('checkbox',{name:'我已逐项核对交付物，确认本次仅为本人自检范围。',exact:true}).check();await p.getByRole('button',{name:'记录有限范围完成',exact:true}).click();
  assert.equal((await state()).tasks[0].completed,true);assert.equal((await state()).claims.length,0);
  await p.getByRole('link',{name:'返回原疑问 / 来源',exact:true}).click();assert.equal(new URL(p.url()).searchParams.get('unit'),'quality');assert.equal(await p.getByLabel('预计投入',{exact:true}).inputValue(),'2 小时以内');assert.ok(await p.locator('.project-preview').isVisible());
  await p.locator('.learning-card').first().getByRole('button',{name:'查看任务成果',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/work/'+t.id);assert.equal((await state()).tasks.length,1);
  await p.locator('.page-surface>.tabs').getByRole('link',{name:'完成回执',exact:true}).click();await p.getByRole('button',{name:'选择成果版本 → 本人确认',exact:true}).click();await p.getByLabel('支持范围 1',{exact:true}).fill('仅支持合成示例的问题清单整理');await p.getByRole('button',{name:'生成候选并去本人逐项确认',exact:true}).click();assert.equal((await state()).claims[0].status,'待确认');await p.getByRole('button',{name:'修正 / 确认此项',exact:true}).click();await p.getByRole('button',{name:'确认这一项并查看回执',exact:true}).click();assert.equal((await state()).claims[0].status,'已确认');assert.equal((await state()).tasks.length,1);
 });
 await check('超预算保持预检与原有任务，允许存草稿返回',async()=>{
  const s=scenarioState('PT01');s.budget=1;await load('/learning?unit=quality',s);await p.getByRole('button',{name:'选择范围并开始预检',exact:true}).click();
  await modal().getByRole('button',{name:'确认预算并创建任务',exact:true}).click();assert.equal((await state()).tasks.length,0);assert.ok(await modal().getByRole('alert').isVisible());
  await modal().getByRole('button',{name:'仅存草稿',exact:true}).click();assert.equal((await state()).taskDraft.template,'quality');assert.equal(new URL(p.url()).pathname,'/learning');
 });
 await check('日程改期取消不写入，保存与未排期保留同一任务及预算',async()=>{
  await load('/plan?tab=执行&view=calendar','PT04');const before=await state();
  await p.locator('.schedule-aside .schedule-task').first().click();await p.getByLabel('任务计划日期',{exact:true}).fill('2026-10-22');await p.getByRole('button',{name:'取消改期',exact:true}).click();assert.deepEqual((await state()).tasks,before.tasks);
  await p.locator('.schedule-aside .schedule-task').first().click();await p.getByLabel('任务计划日期',{exact:true}).fill('2026-10-22');await p.getByRole('button',{name:'保存日期变更',exact:true}).click();let after=await state();assert.equal(after.tasks[0].due,'2026-10-22');assert.equal(after.tasks[0].id,before.tasks[0].id);assert.equal(usedHours(after),usedHours(before));
  await p.reload();await p.getByRole('button',{name:'日',exact:true}).click();assert.equal(await p.locator('.week-grid>section').count(),1);await p.reload();assert.equal(await p.locator('.week-grid>section').count(),1);
 });
 await check('报告正文草稿刷新保留，另存建立新版本，原文与引用继续可访问',async()=>{
  await load('/reports/report-demo','PT07');const before=await state(),old=before.reports[0];await p.getByRole('button',{name:'编辑报告正文',exact:true}).click();
  const field=p.getByLabel('章节正文 / 人工编辑草稿（自动保留）',{exact:true});await field.fill(old.body+'\n本人补充：本次仅为合成流程验收。');await p.reload();await p.getByRole('button',{name:'编辑报告正文',exact:true}).click();assert.match(await field.inputValue(),/本人补充/);
  await p.getByRole('button',{name:'人工编辑另存新版本',exact:true}).click();const after=await state();assert.equal(after.reports.length,before.reports.length+1);assert.equal(after.reports.find(r=>r.id===old.id).body,old.body);assert.match(after.reports.at(-1).body,/本人补充/);assert.ok(await p.getByRole('link',{name:'回事实源修改 →',exact:true}).isVisible());await p.screenshot({path:dir+'/桌面-报告阅读台.png'});
 });
 await check('手机资料筛选可展开，预览与预检可键盘操作，面板不溢出',async()=>{
  await p.setViewportSize({width:390,height:844});await load('/learning?unit=quality');const toggle=p.getByRole('button',{name:'筛选内容',exact:true});await toggle.focus();await toggle.press('Enter');assert.ok(await p.getByLabel('预计投入',{exact:true}).isVisible());
  await p.getByLabel('资源成本 / 语言',{exact:true}).selectOption('付费资源（暂无）');assert.equal(await p.locator('.learning-card').count(),0);await p.getByRole('button',{name:'切换自主探索与免费内容',exact:true}).click();assert.equal(await p.locator('.learning-card').count(),4);
  await p.getByRole('button',{name:'收起内容筛选',exact:true}).click();await p.locator('.project-preview').scrollIntoViewIfNeeded();await p.screenshot({path:dir+'/手机-资源范围.png'});await p.getByRole('button',{name:'选择范围并开始预检',exact:true}).click();assert.ok(await modal().isVisible());assert.ok(await modal().evaluate(el=>el.scrollWidth<=el.clientWidth+1));
 });
 await check('全部工作页在窄屏和中屏容器内无横向截断',async()=>{
  const routes=['/app','/careers','/careers?tab=比较','/careers?tab=企业与岗位','/careers?tab=我的机会','/assessment','/assessment?tab=原文确认','/assessment?tab=四维与差距','/assessment?tab=成果档案','/plan','/plan?tab=执行&view=calendar','/learning?unit=quality','/work/task-demo?tab=尝试与反馈','/reports','/reports/report-demo','/reports?tab=岗位简历','/settings','/assistant'];
  const measures=[];
  for(const width of [360,768,1280]){await p.setViewportSize({width,height:900});for(const route of routes){await load(route,'PT07');const m=await p.locator('main').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));assert.ok(m.scroll<=m.width+1,width+route+JSON.stringify(m));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));measures.push({width,route,...m});}}
  await fs.writeFile(dir+'/容器测量.json',JSON.stringify(measures,null,2));
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
 await fs.writeFile(dir+'/结果.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
