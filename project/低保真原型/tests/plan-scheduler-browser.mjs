import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {KEY,makeTask,scenarioState} from '../src/model.js';
import {blankGoal,emptyStageRecords,savePeriodGoal,stageStorageKey} from '../src/plan-stage-model.js';

const origin=process.env.CAREER_PREVIEW_ORIGIN||'http://127.0.0.1:5184',output='../设计参考与同步/计划排期独立页面_20261108';
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Singapore'}).format(new Date()),key=stageStorageKey('local');
const nextDate=new Date(today+'T12:00:00');nextDate.setDate(nextDate.getDate()+1);const tomorrow=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Singapore'}).format(nextDate);
const browser=await chromium.launch({channel:process.env.CAREER_BROWSER_CHANNEL||'msedge',headless:true}),results=[],errors=[];
await mkdir(output+'/实际截图',{recursive:true});
const records=p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),state=p=>p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
const scheduler=p=>p.locator('.plan-scheduler').waitFor(),form=p=>p.getByRole('form',{name:'计划排期表单',exact:true});
const capture=(p,name)=>p.screenshot({path:output+'/实际截图/'+name+'.png',fullPage:true,animations:'disabled'});
const stage=(p,id)=>p.locator(`.plan-stage[data-stage-view="${id}"][data-stage-phase="idle"]`).waitFor();
const route=(kind,id)=>'/plan/schedule'+(id?`?${kind}=${encodeURIComponent(id)}`:'');
function fixture(language='zh',empty=false){
 const s=scenarioState('PT04');s.budget=20;
 const make=(id,extra={})=>({...makeTask(s,{title:language==='en'?'Review a career option':'梳理一个职业方向',purpose:language==='en'?'Write down one question.':'记录一个需要验证的问题。',hours:1,template:'external'}),id,priority:'中',...extra});
 s.tasks=empty?[]:[make('schedule-pending'),make('schedule-dated',{due:today}),make('schedule-done',{due:today,status:'完成',completed:true})];
 let data=emptyStageRecords();if(!empty)for(const period of ['week','month','year'])data=savePeriodGoal(data,period,today,{...blankGoal(period,today),title:language==='en'?`${period} goal`:`待排期目标-${period}`,notes:language==='en'?'A goal for this period.':'独立记录截止日期和执行安排。'});
 return{s,data};
}
async function setup({width=1440,language='zh',empty=false,storageFailure=false,corrupt=false}={}){
 const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin,{waitUntil:'networkidle'});const {s,data}=fixture(language,empty);
 await page.evaluate(({KEY,s,key,data,language,corrupt})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem(key,corrupt?'broken original record':JSON.stringify(data));localStorage.setItem('career-prototype-language',language);localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));},{KEY,s,key,data,language,corrupt});
 if(storageFailure)await context.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('career-plan-stage-v1:'))throw new DOMException('Quota','QuotaExceededError');return original.call(this,key,value);};});
 await page.goto(origin+'/plan');await stage(page,'overview');return{context,page,data};
}
async function submit(page,date=today,time='15:30'){
 await form(page).getByLabel('执行日期',{exact:true}).fill(date);await form(page).getByLabel('执行时间',{exact:true}).fill(time);await form(page).getByRole('button',{name:'确认排期',exact:true}).click();
 await page.locator('.plan-scheduler').getByRole('link',{name:/查看待行动/}).waitFor();
}
async function check(name,options,run){
 if(process.env.PLAN_SCHEDULER_CASE&&!new RegExp(process.env.PLAN_SCHEDULER_CASE).test(name))return;
 const {context,page,data}=await setup(options);
 try{await run(page,data);results.push({name,status:'pass'});console.log('PASS '+name);}
 catch(e){results.push({name,status:'fail',error:e.stack});console.error('FAIL '+name,e.message);await capture(page,'失败-'+name);}
 finally{await context.close();await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));}
}
try{
 await check('我的计划与三周期目标进入独立排期',{},async(page,data)=>{
  const before=await records(page),main=await state(page);await page.locator('[data-plan-card="undated"] .plan-wave-card').click();await scheduler(page);assert.equal(new URL(page.url()).pathname,'/plan/schedule');assert.equal(await page.locator('.plan-stage').count(),0);assert.equal(await page.locator('.task-schedule').count(),0);assert.equal(await page.locator('[data-schedule-goal]').count(),3);await page.getByRole('button',{name:/^已排期/}).click();assert.equal(await page.locator('[data-schedule-goal]').count(),0);assert.equal(await page.locator('[data-schedule-task="schedule-dated"]').count(),1);await page.getByRole('button',{name:/^待排期/}).click();await page.getByLabel('搜索计划',{exact:true}).fill('不存在的计划名称');assert.equal(await page.locator('[data-schedule-goal],[data-schedule-task]').count(),0);assert.ok((await page.locator('.scheduler-empty-list').innerText()).includes('没有匹配'));await page.getByLabel('搜索计划',{exact:true}).fill('');
  for(const goal of data.goals){await page.goto(origin+`/plan?goalView=${goal.period}`);await stage(page,goal.period);const row=page.locator(`[data-period-goal="${goal.id}"]`);await row.locator('a[href^="/plan/schedule"]').click();await scheduler(page);assert.equal(new URL(page.url()).searchParams.get('goal'),goal.id);assert.equal(await form(page).getByLabel('执行日期',{exact:true}).inputValue(),'');assert.equal(await form(page).getByLabel('执行时间',{exact:true}).inputValue(),'');}
  assert.deepEqual((await records(page)).goals,before.goals);assert.deepEqual(await state(page),main);await capture(page,'年度目标直达独立排期');
 });
 await check('三个周期排期同步待行动与日历',{},async(page,data)=>{
  const main=await state(page);
  for(const goal of data.goals){await page.goto(origin+route('goal',goal.id));await scheduler(page);await submit(page,today,goal.period==='month'?'':'15:30');const saved=(await records(page)).goals.find(g=>g.id===goal.id);assert.equal(saved.due,goal.due);assert.equal(saved.progress,0);assert.deepEqual(saved.schedule,{date:today,time:goal.period==='month'?'':'15:30'});await page.locator('.plan-scheduler').getByRole('link',{name:/查看待行动/}).click();await stage(page,'actions');assert.equal(await page.locator(`[data-action-goal="${goal.id}"]`).count(),1);assert.ok(await page.locator(`[data-calendar-goal="${goal.id}"]`).count()>0);}
  await capture(page,'已排期目标-待行动');assert.deepEqual((await state(page)).tasks,main.tasks);
  await page.locator('.task-schedule').scrollIntoViewIfNeeded();await page.locator('.calendar-area').screenshot({path:output+'/实际截图/已排期目标-日历.png',animations:'disabled'});
  await page.goto(origin+'/plan');await stage(page,'overview');assert.equal(await page.locator('[data-plan-card="undated"] strong').innerText(),'1');assert.equal(await page.locator('[data-plan-card="actions"] strong').innerText(),'5');
 });
 await check('已排期目标改期刷新与进度记录',{},async(page,data)=>{
  const goal=data.goals[0];await page.goto(origin+route('goal',goal.id));await scheduler(page);await submit(page);await page.reload();await scheduler(page);assert.equal(await form(page).getByLabel('执行日期',{exact:true}).inputValue(),today);assert.equal(await form(page).getByLabel('执行时间',{exact:true}).inputValue(),'15:30');
  await submit(page,tomorrow,'09:00');assert.deepEqual((await records(page)).goals.find(g=>g.id===goal.id).schedule,{date:tomorrow,time:'09:00'});assert.equal((await records(page)).goals.find(g=>g.id===goal.id).due,goal.due);
  await page.locator('.plan-scheduler').getByRole('link',{name:/查看待行动/}).click();await stage(page,'actions');const item=page.locator(`[data-action-goal="${goal.id}"]`);await item.getByRole('button',{name:'记录目标进度',exact:true}).click();await item.getByLabel('本人目标进度',{exact:true}).fill('45');await item.getByRole('button',{name:'保存目标进度',exact:true}).click();assert.equal((await records(page)).goals.find(g=>g.id===goal.id).progress,45);await item.getByRole('link',{name:'调整排期',exact:true}).click();await scheduler(page);assert.equal(new URL(page.url()).searchParams.get('goal'),goal.id);await capture(page,'已排期目标-调整日期');await submit(page,tomorrow,'09:00');await page.locator('.scheduler-success').getByRole('link',{name:'查看日历 →',exact:true}).click();await stage(page,'overview');assert.equal(new URL(page.url()).searchParams.get('calendarDate'),tomorrow);assert.equal(await page.locator('.calendar-scroll').getAttribute('data-mode'),'day');assert.equal(await page.locator('.calendar-stage>[data-date]:visible').count(),1);assert.equal(await page.locator('.calendar-stage>[data-date]:visible').getAttribute('data-date'),tomorrow);assert.ok(await page.locator(`[data-calendar-goal="${goal.id}"]:visible`).count()>0);await page.locator('.calendar-area').screenshot({path:output+'/实际截图/查看日历-指定执行日.png',animations:'disabled'});
 });
 await check('目标与任务排期草稿独立并刷新恢复',{},async(page,data)=>{
  const [first,second]=data.goals;await page.goto(origin+route('goal',first.id));await scheduler(page);await form(page).getByLabel('执行日期',{exact:true}).fill(today);await form(page).getByLabel('执行时间',{exact:true}).fill('08:30');
  await page.locator(`[data-schedule-goal="${second.id}"]`).click();assert.equal(await form(page).getByLabel('执行日期',{exact:true}).inputValue(),'');await form(page).getByLabel('执行日期',{exact:true}).fill(tomorrow);await page.locator('[data-schedule-task="schedule-pending"]').click();assert.equal(await form(page).getByLabel('执行日期',{exact:true}).inputValue(),'');await form(page).getByLabel('执行日期',{exact:true}).fill(tomorrow);
  await page.goto(origin+route('goal',first.id));await scheduler(page);assert.equal(await form(page).getByLabel('执行日期',{exact:true}).inputValue(),today);assert.equal(await form(page).getByLabel('执行时间',{exact:true}).inputValue(),'08:30');await page.reload();await scheduler(page);assert.equal(await form(page).getByLabel('执行时间',{exact:true}).inputValue(),'08:30');assert.ok((await records(page)).goals.every(g=>!g.schedule));assert.equal((await state(page)).tasks.find(t=>t.id==='schedule-pending').due,'');
 });
 await check('无效选中标识与旧排期地址恢复',{},async(page)=>{
  const before=await records(page);for(const path of ['/plan/schedule?goal=missing-goal','/plan/schedule?task=missing-task','/plan?goalView=undated']){await page.goto(origin+path);await scheduler(page);assert.equal(new URL(page.url()).pathname,'/plan/schedule');assert.ok(await page.locator('[data-schedule-goal],[data-schedule-task]').count()>0);assert.equal(await page.locator('.plan-stage').count(),0);}assert.deepEqual((await records(page)).goals,before.goals);await capture(page,'无效标识恢复');await page.goto(origin+'/plan/schedule?goal=&task=schedule-pending');await scheduler(page);assert.equal(await page.locator('.scheduler-list a[aria-current="true"]').evaluate(el=>el.closest('li').dataset.scheduleTask),'schedule-pending');await page.goto(origin+'/plan?calendarDate=2026-02-31#weekly-actions');await stage(page,'overview');assert.ok(await page.locator('.calendar-stage>[data-date]:visible').count()>0);assert.ok(!(await page.locator('.calendar-date-nav').innerText()).includes('02/31'));
 });
 await check('原任务排期兼容且不改预算与任务内容',{},async(page)=>{
  const original=await state(page),task=original.tasks.find(t=>t.id==='schedule-pending');await page.goto(origin+route('task',task.id));await scheduler(page);await submit(page,today,'10:00');const current=await state(page),saved=current.tasks.find(t=>t.id===task.id);assert.equal(saved.due,today);assert.equal(saved.title,task.title);assert.equal(saved.purpose,task.purpose);assert.equal(saved.hours,task.hours);assert.equal(saved.completed,task.completed);assert.equal(current.tasks.length,original.tasks.length);assert.equal(current.budget,original.budget);assert.equal((await records(page)).taskMeta[task.id].time,'10:00');await page.reload();await scheduler(page);assert.equal(await form(page).getByLabel('执行时间',{exact:true}).inputValue(),'10:00');await capture(page,'原任务独立排期');
 });
 await check('目标版本冲突保留输入与原记录',{},async(page,data)=>{
  const goal=data.goals[0];await page.goto(origin+route('goal',goal.id));await scheduler(page);await form(page).getByLabel('执行日期',{exact:true}).fill(today);
  await page.evaluate(({key,id})=>{const next=JSON.parse(localStorage.getItem(key));next.goals.find(g=>g.id===id).version++;localStorage.setItem(key,JSON.stringify(next));dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify(next)}));},{key,id:goal.id});const before=await records(page);await form(page).getByRole('button',{name:'确认排期',exact:true}).click();assert.ok((await page.locator('.plan-scheduler').getByRole('alert').innerText()).includes('变化'));assert.deepEqual((await records(page)).goals,before.goals);assert.equal(await form(page).getByLabel('执行日期',{exact:true}).inputValue(),today);
 });
 await check('存储不可写时保留本次排期',{storageFailure:true},async(page,data)=>{
  const raw=await page.evaluate(key=>localStorage.getItem(key),key),goal=data.goals[0];await page.goto(origin+route('goal',goal.id));await scheduler(page);await submit(page);assert.ok((await page.locator('.plan-scheduler').innerText()).includes('仅在当前页面保留'));await page.locator('.plan-scheduler').getByRole('link',{name:/查看待行动/}).click();await stage(page,'actions');assert.equal(await page.locator(`[data-action-goal="${goal.id}"]`).count(),1);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw);
 });
 await check('损坏存储不覆盖且临时目标可排期',{corrupt:true},async(page)=>{
  await page.goto(origin+'/plan/goals');await page.locator('.goal-manager').waitFor();await page.locator('.goal-manager-list-panel').getByRole('button',{name:'新增目标',exact:true}).click();await page.getByLabel('目标名称',{exact:true}).fill('本次临时目标');await page.getByRole('button',{name:'保存并加入待排期',exact:true}).click();await page.locator('.goal-manager-pending-link').click();await scheduler(page);await page.locator('[data-schedule-goal]').first().click();await submit(page);await page.locator('.plan-scheduler').getByRole('link',{name:/查看待行动/}).click();await stage(page,'actions');assert.ok((await page.locator('[data-action-goal]').innerText()).includes('本次临时目标'));assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),'broken original record');
 });
 await check('无计划时空状态与明确返回',{empty:true},async(page)=>{await page.goto(origin+'/plan/schedule');await scheduler(page);assert.equal(await page.locator('[data-schedule-goal],[data-schedule-task]').count(),0);assert.equal(await form(page).count(),0);assert.ok(await page.locator('.plan-scheduler a[href="/plan"]').count()>0);await capture(page,'计划排期-空状态');});
 for(const width of [1024,1440,1920])await check('桌面布局-'+width,{width},async(page,data)=>{
  await page.goto(origin+route('goal',data.goals[0].id));await scheduler(page);await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const bounds=await form(page).boundingBox();for(const field of await form(page).locator('input,button').all()){const r=await field.boundingBox();assert.ok(r.width>0&&r.x>=bounds.x-1&&r.x+r.width<=bounds.x+bounds.width+1);}await capture(page,width+'-计划排期');await submit(page);await capture(page,width+'-排期成功');
 });
 await check('英文页面与直接选中目标',{width:1024,language:'en'},async(page,data)=>{
  await page.goto(origin+route('goal',data.goals[0].id));await scheduler(page);assert.ok(!/[\u3400-\u9fff]/.test(await page.locator('.plan-scheduler').innerText()));const editor=page.locator('.plan-scheduler form');await editor.locator('input[type=date]').fill(today);await editor.locator('input[type=time]').fill('13:00');await editor.locator('button[type=submit]').click();assert.ok(!/[\u3400-\u9fff]/.test(await page.locator('.plan-scheduler').innerText()));assert.deepEqual((await records(page)).goals[0].schedule,{date:today,time:'13:00'});await capture(page,'en-1024-计划排期');
 });
}finally{await browser.close();await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));}
assert.deepEqual(errors,[]);assert.ok(results.length>0);assert.ok(results.every(r=>r.status==='pass'),'Scheduler checks failed');
