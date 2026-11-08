import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {KEY,makeTask,scenarioState} from '../src/model.js';

const origin=process.env.CAREER_PREVIEW_ORIGIN||'http://127.0.0.1:5184';
const output='../设计参考与同步/行动推进台今日任务_20261108';
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Singapore'}).format(new Date());
const shiftDay=delta=>{const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+delta);return date.toISOString().slice(0,10);};
const browser=await chromium.launch({channel:process.env.CAREER_BROWSER_CHANNEL||'msedge',headless:true});
const results=[],errors=[];
await mkdir(output+'/实际截图',{recursive:true});
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const daily=page=>page.locator('.daily-execution');
const row=(page,id)=>page.locator(`[data-daily-task="${id}"]`);
const focus=(page,id)=>page.locator(`[data-learning-task="${id}"]`);
const capture=(page,name)=>page.screenshot({path:output+'/实际截图/'+name+'.png',fullPage:true,animations:'disabled'});

function fixture({language='zh',long=false,empty=false}={}){
 const s=scenarioState('PT04');s.budget=30;
 const en=language==='en';
 const make=(id,extra={})=>({...makeTask(s,{title:en?'Practice task '+id:'实践任务 '+id,purpose:en?'Record the method, personal contribution, and limitations.':'记录方法、本人贡献与局限。',template:'quality',career:'data',hours:1,product:en?'A problem list and limitations.':'问题清单与限制说明'}),id,due:today,priority:'中',...extra});
 s.tasks=empty?[]:[
  make('same-second',{hours:2}),
  make('low-external',{template:'external',mode:'S1',priority:'低',hours:.5,purpose:en?'Explain one programming exercise.':'解释一次编程练习。'}),
  make('high-today',{template:'ai-eval',career:'ai',priority:'高',hours:1}),
  make('high-overdue',{priority:'高',due:shiftDay(-1),status:'进行中',hours:1.5}),
  make('unknown-time',{template:'external',mode:'S1',priority:'未排序',hours:null,purpose:en?'Clarify the learning objective.':'明确学习目标。'}),
  make('hidden-future',{due:shiftDay(1)}),make('hidden-undated',{due:''}),
  make('hidden-finished',{status:'完成',completed:true}),make('hidden-paused',{status:'延期'}),
  make('hidden-invalid',{due:'2026-02-31'})
 ];
 if(long)for(const task of s.tasks){task.title=(en?'A long task title for checking desktop wrapping and readable actions ':'桌面长任务标题用于检查换行与可读操作').repeat(6);task.purpose=(en?'Record the actual scope and expected learning outcome. ':'记录实际范围和预期学习收获。').repeat(8);}
 return s;
}

async function setup(options={}){
 const context=await browser.newContext({viewport:{width:options.width||1440,height:1000},timezoneId:'Asia/Singapore',reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',error=>errors.push(error.message));
 const s=fixture(options);
 await context.addInitScript(({KEY,s,language})=>{if(sessionStorage.getItem('daily-test-initialized'))return;sessionStorage.setItem('daily-test-initialized','1');localStorage.clear();localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',language);localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true,active:null,seen:[]}));},{KEY,s,language:options.language||'zh'});
 await page.goto(origin+'/plan?tab=执行');await daily(page).waitFor();await page.evaluate(()=>document.fonts.ready);
 return {context,page,s};
}

async function assertFocused(page,id){
 const target=focus(page,id);await target.waitFor();
 await page.waitForFunction(id=>document.activeElement?.dataset.learningTask===id,id);
 const title=await target.locator('h2').boundingBox();
 assert.ok(title.y>=0&&title.y<page.viewportSize().height,'Focused task heading must be in the viewport: '+JSON.stringify(title));
 assert.equal(await page.locator('[data-learning-task]').count(),1);
 assert.equal(await page.locator('.flow-progress').count(),0,'Selected learning tasks must not show navigation to another active task');
 return target;
}
async function assertDesktop(page){
 const geometry=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth,main:document.querySelector('#main').scrollWidth,mainWidth:document.querySelector('#main').clientWidth}));
 assert.ok(geometry.page<=geometry.viewport+1,'Page horizontal overflow: '+JSON.stringify(geometry));
 assert.ok(geometry.main<=geometry.mainWidth+1,'Main content horizontal overflow: '+JSON.stringify(geometry));
 const sizes=await page.locator('.daily-task-go').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {width:r.width,height:r.height};}));
 assert.ok(sizes.every(size=>size.width>=44&&size.height>=44),'Task actions must be at least 44px: '+JSON.stringify(sizes));
 return geometry;
}
async function check(name,options,run){
 if(process.env.DAILY_EXECUTION_CASE&&!new RegExp(process.env.DAILY_EXECUTION_CASE).test(name))return;
 const {context,page,s}=await setup(options);
 try{const details=await run(page,s);results.push({name,status:'pass',...details});console.log('PASS '+name);}
 catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL '+name+' '+error.message);await capture(page,'失败-'+name);}
 finally{await context.close();await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));}
}

try{
 await check('今日排序过滤与页面精简',{},async page=>{
  const before=await state(page);
  assert.deepEqual(await page.locator('[data-daily-task]').evaluateAll(elements=>elements.map(element=>element.dataset.dailyTask)),['high-overdue','high-today','same-second','low-external','unknown-time']);
  assert.deepEqual(await page.locator('.daily-summary strong').allTextContents(),['5','5']);
  assert.match(await page.locator('.daily-summary').innerText(),/部分任务用时待定/);
  assert.equal(await row(page,'high-overdue').locator('.daily-overdue').count(),1);
  assert.equal(await row(page,'high-today').locator('.daily-overdue').count(),0);
  assert.match(await row(page,'unknown-time').locator('.daily-task-time').innerText(),/待确定/);
  assert.match(await row(page,'same-second').locator('.daily-task-gain').innerText(),/SQL/);
  assert.equal(await page.locator('.task-view-switch,.action-capacity,.action-queue-filters,.action-focus-layout,.flow-progress').count(),0);
  assert.equal(await daily(page).locator('form,input,select,textarea').count(),0);
  assert.equal(await page.locator('.daily-task-time strong').first().evaluate(element=>getComputedStyle(element).fontSize),'24px');
  await assertDesktop(page);assert.deepEqual(await state(page),before);await capture(page,'1440-今日任务');
 });
 await check('同课程多任务精确跳转与返回只读',{},async page=>{
  const before=await state(page);
  for(const id of ['high-overdue','same-second']){
   await row(page,id).locator('.daily-task-go').click();await page.waitForURL(url=>url.pathname==='/learning'&&url.searchParams.get('task')===id);
   const target=await assertFocused(page,id);assert.equal(new URL(page.url()).searchParams.get('unit'),'quality');
   assert.match(await target.innerText(),new RegExp('实践任务 '+id));assert.equal(await target.getByRole('button',{name:'阅读任务资料',exact:true}).count(),1);
   assert.deepEqual(await state(page),before);
   if(id==='same-second')await capture(page,'1440-学习实践对应任务');
   await target.getByRole('link',{name:'返回今日任务',exact:true}).click();await daily(page).waitFor();assert.deepEqual(await state(page),before);
  }
 });
 await check('开始实践沿用选中任务且不新增副本',{},async page=>{
  const before=await state(page),id='same-second';await row(page,id).locator('.daily-task-go').click();const target=await assertFocused(page,id);
  await target.getByRole('button',{name:'开始实践',exact:true}).click();await page.waitForURL(url=>url.pathname==='/work/'+id);
  const after=await state(page);assert.equal(after.tasks.length,before.tasks.length);assert.equal(after.tasks.find(task=>task.id===id).status,'进行中');
  assert.deepEqual(after.tasks.filter(task=>task.id!==id),before.tasks.filter(task=>task.id!==id));assert.equal(after.budget,before.budget);
 });
 await check('外部任务保留自身记录入口与无效引用回退',{},async page=>{
  const before=await state(page);await row(page,'low-external').locator('.daily-task-go').click();const target=await assertFocused(page,'low-external');
  assert.equal(new URL(page.url()).searchParams.has('unit'),false);assert.equal(await target.getByRole('button',{name:'阅读任务资料',exact:true}).count(),0);
  assert.equal(await target.getByText('对应学习内容',{exact:true}).count(),0);assert.deepEqual(await state(page),before);
  await target.getByRole('button',{name:'开始实践',exact:true}).click();await page.waitForURL(url=>url.pathname==='/plan'&&url.searchParams.get('practice')==='low-external');
  assert.equal((await state(page)).tasks.find(task=>task.id==='low-external').status,'进行中');
  const started=await state(page);await page.goto(origin+'/learning?task=missing&unit=quality');const unavailable=page.locator('.learning-task-focus');await unavailable.waitFor();
  assert.match(await unavailable.innerText(),/已不可访问/);assert.equal(await page.locator('[data-learning-task]').count(),0);assert.equal(await unavailable.getByRole('button').count(),0);assert.equal(await page.locator('.flow-progress').count(),0);
  await unavailable.getByRole('link',{name:'返回行动推进台',exact:true}).click();await daily(page).waitFor();assert.deepEqual(await state(page),started);await capture(page,'1440-外部任务返回');
 });
 await check('完成暂停与依赖任务直链不绕过原保护',{},async page=>{
  const before=await state(page);await page.goto(origin+'/learning?task=hidden-finished');let target=await assertFocused(page,'hidden-finished');
  assert.equal(await target.getByRole('button',{name:'开始实践',exact:true}).count(),0);await target.getByRole('link',{name:'查看任务成果',exact:true}).click();await page.waitForURL(url=>url.pathname==='/work/hidden-finished'&&url.searchParams.get('tab')==='完成回执');assert.deepEqual(await state(page),before);
  await page.goto(origin+'/learning?task=hidden-paused');target=await assertFocused(page,'hidden-paused');await target.getByRole('button',{name:'核对并恢复这项任务',exact:true}).click();await page.locator('dialog[open]').waitFor();assert.deepEqual(await state(page),before);
  await page.goto(origin+'/plan?tab=执行');await daily(page).waitFor();await page.evaluate(KEY=>{const s=JSON.parse(localStorage.getItem(KEY));s.tasks.find(task=>task.id==='same-second').dependsOn=['hidden-future'];localStorage.setItem(KEY,JSON.stringify(s));},KEY);
  await page.goto(origin+'/learning?task=same-second');target=await assertFocused(page,'same-second');const blocked=await state(page);
  assert.match(await target.innerText(),/前置任务尚未完成/);assert.equal(await target.getByRole('button',{name:'开始实践',exact:true}).count(),0);assert.equal(await target.getByRole('link',{name:'查看前置任务',exact:true}).count(),1);assert.deepEqual(await state(page),blocked);await capture(page,'1440-依赖任务保护');
 });
 await check('空态可去排期且不造任务',{empty:true},async page=>{
  const before=await state(page);assert.equal(await page.locator('[data-daily-task]').count(),0);assert.match(await page.locator('.daily-empty').innerText(),/今天没有待完成/);
  assert.deepEqual(await page.locator('.daily-summary strong').allTextContents(),['0','0']);await capture(page,'1440-今日任务空态');
  await page.getByRole('link',{name:'安排今天的任务',exact:true}).click();await page.locator('.plan-scheduler').waitFor();assert.deepEqual(await state(page),before);
 });
 for(const width of [1024,1440,1920])for(const language of ['zh','en'])await check('桌面布局-'+width+'-'+language,{width,language,long:width===1024},async page=>{
  const geometry=await assertDesktop(page);if(language==='en')assert.doesNotMatch(await daily(page).innerText(),/[\u3400-\u9fff]/);
  if(width===1024)assert.ok((await page.locator('.daily-task').first().boundingBox()).height<400,'Long task text must keep the first task card compact');
  if(width===1440)assert.equal(await page.locator('.daily-task-time strong').first().evaluate(element=>getComputedStyle(element).fontSize),'24px');
  await capture(page,width+'-'+language+(width===1024?'-长标题':'-今日任务'));
  await row(page,'same-second').locator('.daily-task-go').click();await assertFocused(page,'same-second');await assertDesktop(page);
  return {geometry};
 });
 await check('1040英文长标题首卡紧凑',{width:1040,language:'en',long:true},async page=>{
  const geometry=await assertDesktop(page),firstCard=await page.locator('.daily-task').first().boundingBox();
  assert.ok(firstCard.height<400,'Long task text must keep the first task card compact');
  await capture(page,'1040-en-长标题');return {geometry,firstCardHeight:firstCard.height};
 });
}finally{await browser.close();await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));}
assert.deepEqual(errors,[]);assert.ok(results.length>0);assert.ok(results.every(result=>result.status==='pass'),'Daily execution browser checks failed');
