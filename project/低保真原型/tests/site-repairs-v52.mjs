import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const root='检查记录/板块对齐与全链路_v52';
await fs.mkdir(root,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']}),p=await browser.newPage({viewport:{width:1440,height:1000}}),results=[],errors=[];
p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(6500);const base='http://127.0.0.1:5184';
await p.addInitScript(()=>{localStorage.setItem('career-prototype-operation-guide-v1','{"enabled":false,"active":null,"seen":[]}');localStorage.setItem('career-prototype-guidance-v1','{"auto":false}');});
async function load(route,scene='PT05',lang='zh'){if(!p.url().startsWith(base))await p.goto(base);await p.evaluate(({KEY,s,lang})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);},{KEY,s:typeof scene==='string'?scenarioState(scene):scene,lang});await p.goto(base+route);await p.locator('.page-surface').waitFor();}
const state=()=>p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,800));await p.screenshot({path:root+'/修复失败-'+results.length+'.png'});}}
try{
 await check('英文全局搜索与全部结果一致，大小写和空格均能找到原职业',async()=>{
  await load('/careers','PT01','en');await p.locator('.workspace-search input[role=combobox]').fill(' DATA ');
  await p.locator('.workspace-search-results [role=option]').first().waitFor();const dropdown=await p.locator('.workspace-search-results [role=option]').count();assert.ok(dropdown>0);
  await p.locator('.workspace-search .search-submit').click();assert.equal(new URL(p.url()).searchParams.get('q'),'DATA');assert.equal(await p.locator('.occupation-grid>article').count(),dropdown);
 });
 await check('可见页签别名、日程及未知页签恢复，刷新与返回不会产生空白',async()=>{
  for(const[route,expected,target]of [['/assessment?tab=职业评估','四维与差距','.surface-U04>.panel'],['/assessment?tab=提取与确认','原文确认','.record'],['/plan?tab=日程','执行','.schedule-layout'],['/careers?tab=不存在','', '.occupation-grid'],['/learning?tab=不存在','', '.library-layout']]){
   await load(route);assert.equal(new URL(p.url()).searchParams.get('tab')||'',expected);await p.locator(target).first().waitFor();if(route.includes('不存在'))await p.getByRole('status').filter({hasText:'已返回本页默认内容'}).waitFor();await p.reload();await p.locator(target).first().waitFor();
  }
 });
 await check('第二岗位建准备任务后可回同一岗位，预算和主目标不重复改写',async()=>{
  const s=scenarioState('PT05');s.jobs[1].taskId=null;s.budget=8;await load('/careers?tab=我的机会&job=job-b',s);
  await p.getByRole('button',{name:'准备清单预检',exact:true}).click();await p.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();
  const current=await state(),task=current.tasks.at(-1);assert.equal(new URL(task.source,base).searchParams.get('job'),'job-b');assert.equal(current.goal,s.goal);assert.equal(current.tasks.length,s.tasks.length+1);
  await p.getByRole('link',{name:'查看计划中的同一任务',exact:true}).click();await p.getByRole('link',{name:'回来源问题 / 节点',exact:true}).last().click();assert.equal(new URL(p.url()).searchParams.get('job'),'job-b');assert.match(await p.locator('.opportunity-detail>header').innerText(),/运维/);
 });
 await check('报告空行与自定义章节目录均有落点，编辑中点击目录先恢复阅读',async()=>{
  const s=scenarioState('PT07');s.reports[0].body='目标与理由：示例一\n\n复盘与调整：示例二\n\n本人补充：未知';await load('/reports/report-demo',s);
  assert.equal(await p.locator('.report-outline>a').count(),3);for(const a of await p.locator('.report-outline>a').all()){const href=await a.getAttribute('href');assert.equal(await p.locator(href).count(),1);await a.click();}
  await p.getByRole('button',{name:'编辑报告正文',exact:true}).click();await p.locator('.report-outline>a').nth(1).click();assert.equal(await p.locator('.report-paper textarea').count(),0);assert.equal(await p.locator('#report-section-1').count(),1);assert.equal((await state()).reports.length,1);
 });
 await check('地图共用外壳和普通页面对齐，评估页页签在上下文前，计划主列没有预算空洞',async()=>{
  const measurements=[];
  for(const route of ['/careers','/assessment','/plan','/reports','/assistant','/career-map']){await load(route);measurements.push(await p.evaluate(route=>{const x=s=>document.querySelector(s).getBoundingClientRect();const h=x('main h1');return {route,content:x('.page-surface').x,search:x('.global-search').x,heading:h.y};},route));}
  for(const m of measurements){assert.ok(Math.abs(m.content-measurements[0].content)<1,JSON.stringify(measurements));assert.ok(Math.abs(m.search-measurements[0].search)<1,JSON.stringify(measurements));assert.ok(Math.abs(m.heading-measurements[0].heading)<2,JSON.stringify(measurements));}
  await load('/assessment');assert.ok(await p.evaluate(()=>document.querySelector('.surface-U04>.tabs').getBoundingClientRect().bottom<document.querySelector('.assessment-context').getBoundingClientRect().top));
  await load('/plan');assert.ok(await p.evaluate(()=>{const goal=document.querySelector('.goal-statement').getBoundingClientRect(),phase=document.querySelector('.phased-plan').getBoundingClientRect();return phase.y-goal.bottom<=25;}));
  await fs.writeFile(root+'/共用边线测量.json',JSON.stringify(measurements,null,2));
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
 await fs.writeFile(root+'/断点修复验证.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
