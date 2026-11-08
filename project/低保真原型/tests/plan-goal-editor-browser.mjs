import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
import {blankGoal,emptyStageRecords,goalEditorUrl,savePeriodGoal,stageStorageKey} from '../src/plan-stage-model.js';

const origin=process.env.CAREER_PREVIEW_ORIGIN||'http://127.0.0.1:5184',output=process.env.PLAN_GOAL_OUTPUT||'../设计参考与同步/目标推荐与新增弹窗_20261108',periods=['week','month','year'];
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Singapore'}).format(new Date()),key=stageStorageKey('local');
const browser=await chromium.launch({channel:process.env.CAREER_BROWSER_CHANNEL||'msedge',headless:true}),results=[],errors=[];await mkdir(output+'/实际截图',{recursive:true});
const detail=(page,id)=>page.locator(`[data-stage-detail="${id}"]`),stage=(page,id)=>page.locator(`.plan-stage[data-stage-view="${id}"][data-stage-phase="idle"]`).waitFor();
const manager=(page,period='week')=>page.locator(`.goal-manager-periods a[aria-current="page"][href="${goalEditorUrl(period)}"]`).waitFor();
const read=page=>page.evaluate(key=>localStorage.getItem(key),key),records=async page=>JSON.parse(await read(page));
const capture=(page,name)=>page.screenshot({path:output+'/实际截图/'+name+'.png',fullPage:true,animations:'disabled'});
async function choose(page,period){await page.locator(`.goal-manager-periods a[href="${goalEditorUrl(period)}"]`).click();await manager(page,period);}
async function enter(page,period){await page.locator(`[data-plan-card="${period}"] button`).click();await stage(page,period);}
async function setup({width=1440,language='zh',filled=false,storageFailure=false,corrupt=false}={}){
 const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));await page.goto(origin,{waitUntil:'networkidle'});
 const s=scenarioState('PT04');let data=emptyStageRecords();
 for(const period of periods){data=savePeriodGoal(data,period,'2000-01-12',{...blankGoal(period,'2000-01-12'),title:'历史目标-'+period});if(filled)for(let i=0;i<2;i++)data=savePeriodGoal(data,period,today,{...blankGoal(period,today),title:'已制定目标-'+period+'-'+i,progress:i?100:35,priority:i?'中':'高',notes:'已保存的说明，仅展示当前周期。',milestoneText:period==='year'?'第一阶段\n第二阶段':''});}
 data.goals=data.goals.map(g=>g.title.startsWith('已制定目标-')?{...g,progress:g.title.endsWith('-1')?100:35}:g);
 data.goals=data.goals.map(g=>g.period==='year'&&g.periodStart.startsWith(today.slice(0,4))?{...g,milestones:g.milestones.map((m,i)=>({...m,done:!i}))}:g);data.drafts['week-goal']={...blankGoal('week',today),title:'未提交的周目标草稿'};
 if(filled){const id=data.goals.find(g=>g.period==='week'&&g.periodStart!=='2000-01-10').id;data.taskMeta[s.tasks[0].id]={goalId:id,time:'14:30',review:{decision:'通过'}};data.drafts['actions:'+s.tasks[0].id]={goalId:id,text:'未提交的行动记录'};}
 await page.evaluate(({KEY,s,key,data,language,corrupt})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem(key,corrupt?'broken original record':JSON.stringify(data));localStorage.setItem('career-prototype-language',language);localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));},{KEY,s,key,data,language,corrupt});
 if(storageFailure)await context.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('career-plan-stage-v1:'))throw new DOMException('Quota','QuotaExceededError');return original.call(this,key,value);};});
 await page.goto(origin+'/plan');await stage(page,'overview');await page.evaluate(()=>document.fonts.ready);return{context,page};
}
async function readonly(view){assert.equal(await view.locator('form,input,textarea,select').count(),0);assert.equal(await view.getByRole('button',{name:/新增目标|编辑|标记完成|删除/}).count(),0);}
async function openNew(page){await page.locator('.goal-manager-list-panel').getByRole('button',{name:'新增目标',exact:true}).click();await page.locator('.goal-manager-dialog[open]').waitFor();assert.equal(await page.getByLabel('目标名称',{exact:true}).evaluate(el=>document.activeElement===el),true);assert.equal(await page.locator('.goal-manager-form').getByLabel('目标完成进度',{exact:true}).count(),0);}
async function closeEditor(page){await page.keyboard.press('Escape');await page.locator('.goal-manager-dialog[open]').waitFor({state:'hidden'});}
async function save(page,title,{progress='40',notes='本人制定的目标说明',milestones=false}={}){if(!await page.locator('.goal-manager-dialog[open]').count())await openNew(page);const form=page.locator('.goal-manager-form');await form.getByLabel('目标名称',{exact:true}).fill(title);const progressInput=form.getByLabel('目标完成进度',{exact:true});if(await progressInput.count())await progressInput.fill(progress);await form.getByLabel('目标说明',{exact:true}).fill(notes);if(milestones)await form.getByLabel('关键里程碑',{exact:true}).fill('完成初稿\n完成复盘');await form.locator('button[type=submit]').click();await page.locator('.goal-manager-message').waitFor();await page.locator('.goal-manager-dialog[open]').waitFor({state:'hidden'});}
async function check(name,options,run){if(process.env.PLAN_GOAL_CASE&&!new RegExp(process.env.PLAN_GOAL_CASE).test(name))return;const{context,page}=await setup(options);try{await run(page);results.push({name,status:'pass'});console.log('PASS '+name);}catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL '+name,error.message);await capture(page,'失败-'+name);}finally{await context.close();await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));}}
try{
 await check('五个入口统一跳转与二级页导航',{},async page=>{
  const raw=await read(page);for(const selector of ['.plan-context-actions a','.plan-context-illustration-goal']){assert.equal(await page.locator(selector).getAttribute('href'),'/plan/goals');await page.locator(selector).focus();await page.keyboard.press('Enter');await manager(page);assert.equal(await page.locator('.screen-heading h1').innerText(),'目标编辑');assert.equal(await page.title(),'目标编辑 · Avemly');assert.equal(await page.locator('#workspace-sidebar [aria-current="page"]').getAttribute('href'),'/plan');assert.equal(await page.locator('.breadcrumbs a[href="/plan"]').count(),1);assert.equal(await page.locator('.task-schedule').count(),0);assert.equal(await page.locator('.goal-manager-dialog[open]').count(),0);assert.equal(await page.locator('.goal-manager-form:visible').count(),0);assert.ok(await page.locator('[data-recommended-goal]').count()>0);await page.locator('.goal-manager-back').click();await stage(page,'overview');}
  for(const period of periods){await enter(page,period);const view=detail(page,period);await readonly(view);assert.equal(await view.getByRole('link').getAttribute('href'),goalEditorUrl(period));await view.getByRole('link').click();await manager(page,period);await page.locator('.goal-manager-back').click();await stage(page,'overview');}assert.equal(await read(page),raw);await capture(page,'统一入口');await page.locator('.plan-context-actions a').click();await manager(page);await capture(page,'1440-默认空列表与推荐目标');
 });
 await check('三个周期增改删取消与查看同步',{},async page=>{
  const original=await page.evaluate(KEY=>localStorage.getItem(KEY),KEY);await page.locator('.plan-context-actions a').click();await manager(page);
  for(const period of periods){await choose(page,period);await save(page,'目标一-'+period,{milestones:period==='year'});assert.equal((await records(page)).goals.find(g=>g.title==='目标一-'+period).progress,0);await save(page,'目标二-'+period);assert.equal(await page.locator('[data-managed-goal]').count(),2);let item=page.locator('[data-managed-goal]').filter({hasText:'目标一-'+period});await item.getByRole('button',{name:'编辑',exact:true}).click();assert.equal(await page.getByLabel('目标名称',{exact:true}).evaluate(el=>document.activeElement===el),true);await save(page,'已编辑目标-'+period,{progress:'75',milestones:period==='year'});item=page.locator('[data-managed-goal]').filter({hasText:'已编辑目标-'+period});assert.ok((await item.innerText()).includes('75%'));const before=await read(page);await item.getByRole('button',{name:'删除',exact:true}).click();await item.getByRole('button',{name:'取消删除',exact:true}).click();assert.equal(await read(page),before);assert.equal(await item.getByRole('button',{name:'删除',exact:true}).evaluate(el=>document.activeElement===el),true);await item.getByRole('button',{name:'删除',exact:true}).click();await capture(page,period+'-删除确认');await item.getByRole('button',{name:'确认删除',exact:true}).click();assert.equal(await page.locator('[data-managed-goal]').count(),1);await page.reload();await manager(page,period);assert.equal(await page.locator('[data-managed-goal]').count(),1);await page.locator('.goal-manager-preview').click();await stage(page,period);await readonly(detail(page,period));assert.equal(await detail(page,period).locator('[data-period-goal]').count(),1);await detail(page,period).locator('.plan-detail-back').click();await stage(page,'overview');assert.equal(await page.locator(`[data-plan-card="${period}"] strong`).innerText(),'1');await page.locator('.plan-context-illustration-goal').click();await manager(page);await choose(page,period);item=page.locator('[data-managed-goal]').first();await item.getByRole('button',{name:'删除',exact:true}).click();await item.getByRole('button',{name:'确认删除',exact:true}).click();assert.equal(await page.locator('.goal-manager-empty h3').innerText(),'您当前没有指定目标');await page.locator('.goal-manager-preview').click();await stage(page,period);assert.equal(await detail(page,period).locator('.plan-detail-empty h3').innerText(),'您当前没有指定目标');await detail(page,period).getByRole('link').click();await manager(page,period);}
  assert.equal(await page.evaluate(KEY=>localStorage.getItem(KEY),KEY),original);
 });
 await check('周期草稿独立恢复与键盘切换',{},async page=>{
  await page.locator('.plan-context-actions a').click();await manager(page);
  assert.equal(await page.locator('.goal-manager-dialog[open]').count(),0);await openNew(page);
  assert.equal(await page.getByLabel('目标名称',{exact:true}).inputValue(),'未提交的周目标草稿');
  await page.getByLabel('目标说明',{exact:true}).fill('周目标草稿内容');await page.getByRole('button',{name:'关闭目标窗口',exact:true}).click();await page.locator('.goal-manager-dialog[open]').waitFor({state:'hidden'});
  assert.equal(await page.locator('.goal-manager-list-panel').getByRole('button',{name:'新增目标',exact:true}).evaluate(el=>document.activeElement===el),true);
  await page.locator('.goal-manager-periods a[aria-current="page"]').focus();await page.keyboard.press('ArrowRight');await manager(page,'month');
  assert.equal(await page.locator('.goal-manager-periods a[aria-current="page"]').evaluate(el=>document.activeElement===el),true);
  await page.keyboard.press('ArrowRight');await manager(page,'year');await page.keyboard.press('Home');await manager(page,'week');
  assert.equal(await page.locator('.goal-manager-dialog[open]').count(),0);await openNew(page);assert.equal(await page.getByLabel('目标说明',{exact:true}).inputValue(),'周目标草稿内容');await closeEditor(page);
  await choose(page,'month');await openNew(page);await page.getByLabel('目标名称',{exact:true}).fill('月目标草稿');await page.reload();await manager(page,'month');
  assert.equal(await page.locator('.goal-manager-dialog[open]').count(),0);await openNew(page);assert.equal(await page.getByLabel('目标名称',{exact:true}).inputValue(),'月目标草稿');await closeEditor(page);
  await choose(page,'week');await openNew(page);assert.equal(await page.getByLabel('目标说明',{exact:true}).inputValue(),'周目标草稿内容');
  await page.locator('.goal-manager-form').getByRole('button',{name:'取消编辑',exact:true}).click();await page.locator('.goal-manager-dialog[open]').waitFor({state:'hidden'});assert.equal((await records(page)).drafts['week-goal'],null);
  await openNew(page);assert.equal(await page.getByLabel('目标名称',{exact:true}).inputValue(),'');await closeEditor(page);
  await page.locator('.goal-manager-preview').click();await stage(page,'week');await readonly(detail(page,'week'));assert.equal(await detail(page,'week').locator('[data-period-goal]').count(),0);
 });
 await check('弹窗焦点循环与取消不创建',{},async page=>{
  await page.goto(origin+goalEditorUrl('week'));await manager(page);const before=(await records(page)).goals.length;
  await openNew(page);const dialog=page.locator('.goal-manager-dialog[open]');
  for(const key of ['Tab','Shift+Tab'])for(let index=0;index<12;index++){await page.keyboard.press(key);assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);}
  await page.getByLabel('目标名称',{exact:true}).fill('放弃的新目标');await dialog.getByRole('button',{name:'取消编辑',exact:true}).click();
  assert.equal((await records(page)).goals.length,before);assert.equal(await page.locator('.goal-manager-dialog[open]').count(),0);
  assert.equal(await page.locator('.goal-manager-list-panel').getByRole('button',{name:'新增目标',exact:true}).evaluate(el=>document.activeElement===el),true);
 });
 await check('推荐目标一键加入防重与持久化',{},async page=>{
  const main=await page.evaluate(KEY=>localStorage.getItem(KEY),KEY);await page.goto(origin+goalEditorUrl('week'));await manager(page);
  for(const period of periods){
   await choose(page,period);const card=page.locator('[data-recommended-goal]').first(),id=await card.getAttribute('data-recommended-goal'),title=await card.locator('h3').innerText();
   const before=(await records(page)).goals.length;await card.getByRole('button',{name:'一键加入',exact:true}).click();
   assert.equal(await page.locator('.goal-manager-dialog[open]').count(),0);assert.equal((await records(page)).goals.length,before+1);
   const goal=(await records(page)).goals.find(g=>g.period===period&&g.title===title);assert.ok(goal);assert.equal(goal.progress,0);
   assert.equal(await card.getByRole('button',{name:'已加入',exact:true}).isDisabled(),true);
   await card.getByRole('button',{name:'已加入',exact:true}).evaluate(el=>{el.click();el.click();});assert.equal((await records(page)).goals.length,before+1);
   await page.reload();await manager(page,period);assert.equal(await page.locator(`[data-recommended-goal="${id}"]`).getByRole('button',{name:'已加入',exact:true}).isDisabled(),true);
   assert.equal(await page.locator('[data-managed-goal]').count(),1);await capture(page,period+'-一键加入');
  }
  assert.equal(await page.evaluate(KEY=>localStorage.getItem(KEY),KEY),main);
 });
 await check('新建与推荐目标进入待排期并安排日期',{},async page=>{
  const original=await page.evaluate(KEY=>localStorage.getItem(KEY),KEY);await page.goto(origin+goalEditorUrl('week'));await manager(page);
  const created=[];
  for(const period of periods){await choose(page,period);await save(page,'待排期目标-'+period);created.push((await records(page)).goals.find(g=>g.title==='待排期目标-'+period));}
  const card=page.locator('[data-recommended-goal]').first(),title=await card.locator('h3').innerText();await card.getByRole('button',{name:'一键加入',exact:true}).click();
  created.push((await records(page)).goals.find(g=>g.period==='year'&&g.title===title));await page.locator('.goal-manager-pending-link').click();await page.locator('.plan-scheduler').waitFor();
  for(const goal of created){assert.ok(goal.due);assert.equal(goal.schedule,undefined);assert.equal(await page.locator(`[data-schedule-goal="${goal.id}"]`).count(),1);}
  await capture(page,'新建与推荐目标-待排期');
  const goal=created[0],row=page.locator(`[data-schedule-goal="${goal.id}"]`);await row.getByRole('link').click();
  const form=page.getByRole('form',{name:'计划排期表单',exact:true});assert.equal(await form.getByLabel('执行日期',{exact:true}).inputValue(),'');assert.equal(await form.getByLabel('执行时间',{exact:true}).inputValue(),'');
  await form.getByLabel('执行日期',{exact:true}).fill(today);await form.getByLabel('执行时间',{exact:true}).fill('15:30');await capture(page,'目标排期-编辑');await form.getByRole('button',{name:'确认排期',exact:true}).click();
  await page.locator('.scheduler-success').waitFor();assert.deepEqual((await records(page)).goals.find(g=>g.id===goal.id).schedule,{date:today,time:'15:30'});assert.equal((await records(page)).goals.find(g=>g.id===goal.id).due,goal.due);
  await page.locator('.scheduler-success').getByRole('link',{name:'查看日历 →',exact:true}).click();await stage(page,'overview');await page.locator(`[data-calendar-goal="${goal.id}"]:visible`).first().waitFor();await capture(page,'目标排期-日程同步');await page.locator(`[data-calendar-goal="${goal.id}"]:visible`).first().scrollIntoViewIfNeeded();await page.locator('.calendar-area').screenshot({path:output+'/实际截图/目标排期-日历条目.png',animations:'disabled'});
  await page.reload();await stage(page,'overview');assert.ok(await page.locator(`[data-calendar-goal="${goal.id}"]`).count()>0);
  await page.locator(`[data-calendar-goal="${goal.id}"]:visible`).first().click();const calendarEditor=page.getByRole('region',{name:'目标日期调整',exact:true});
  assert.equal(await calendarEditor.getByLabel('日历目标计划日期',{exact:true}).inputValue(),today);assert.equal(await calendarEditor.getByLabel('日历目标计划时间',{exact:true}).inputValue(),'15:30');
  await calendarEditor.getByRole('button',{name:'移回未排期',exact:true}).click();await calendarEditor.getByRole('button',{name:'保存目标安排',exact:true}).click();
  await page.locator('.schedule-editor[aria-label="目标日期调整"]').waitFor({state:'hidden'});assert.equal(await page.locator(`.calendar-day-content [data-calendar-goal="${goal.id}"],#schedule-selected-day [data-calendar-goal="${goal.id}"]`).count(),0);assert.equal((await records(page)).goals.find(g=>g.id===goal.id).due,goal.due);await page.goto(origin+'/plan/schedule');await page.locator('.plan-scheduler').waitFor();await page.locator(`[data-schedule-goal="${goal.id}"]`).waitFor();
  const {scheduleView:originalView,...originalState}=JSON.parse(original),{scheduleView:currentView,...currentState}=JSON.parse(await page.evaluate(KEY=>localStorage.getItem(KEY),KEY));assert.deepEqual(currentState,originalState);
 });
 await check('删除版本冲突与关联计划保留',{filled:true},async page=>{
  const main=await page.evaluate(KEY=>localStorage.getItem(KEY),KEY);await page.locator('.plan-context-actions a').click();await manager(page);const item=page.locator('[data-managed-goal]').first();await item.getByRole('button',{name:'删除',exact:true}).click();await page.evaluate(key=>{const next=JSON.parse(localStorage.getItem(key));const goal=next.goals.find(g=>g.period==='week'&&g.title==='已制定目标-week-0');goal.version++;localStorage.setItem(key,JSON.stringify(next));dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify(next)}));},key);const current=await read(page);await item.getByRole('button',{name:'确认删除',exact:true}).click();assert.ok((await page.locator('.goal-manager-error').innerText()).includes('目标已变化'));assert.equal(await read(page),current);await item.getByRole('button',{name:'删除',exact:true}).click();await item.getByRole('button',{name:'确认删除',exact:true}).click();const state=JSON.parse(main),meta=(await records(page)).taskMeta[state.tasks[0].id];assert.deepEqual(meta,{goalId:'',time:'14:30',review:{decision:'通过'}});assert.deepEqual((await records(page)).drafts['actions:'+state.tasks[0].id],{goalId:'',text:'未提交的行动记录'});assert.equal(await page.evaluate(KEY=>localStorage.getItem(KEY),KEY),main);
 });
 for(const width of [1024,1440,1920])await check('桌面周期编辑布局-'+width,{width,filled:true},async page=>{
  await page.locator('.plan-context-illustration-goal').click();await manager(page);for(const period of periods){await choose(page,period);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await page.locator('.goal-manager-form:visible').count(),0);await capture(page,width+'-'+period+'-推荐目标');await openNew(page);const bounds=await page.locator('.goal-manager-form').evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,overflow:el.scrollWidth>el.clientWidth+1};});assert.equal(bounds.overflow,false);for(const control of await page.locator('.goal-manager-form input,.goal-manager-form textarea,.goal-manager-form select,.goal-manager-form button').all()){const r=await control.boundingBox();assert.ok(r.width>0&&r.x>=bounds.left-1&&r.x+r.width<=bounds.right+1);}assert.equal(await page.locator('.goal-manager-dialog').evaluate(el=>el.getBoundingClientRect().right<=innerWidth&&el.getBoundingClientRect().bottom<=innerHeight),true);await capture(page,width+'-'+period+'-目标编辑');await closeEditor(page);}
  await page.locator('.goal-manager-career summary').click();await page.locator('.goal-manager-career button').click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await manager(page,'year');
 });
 await check('英文页面与原生链接直达',{width:1024,language:'en'},async page=>{
  await page.goto(origin+goalEditorUrl('year'));await manager(page,'year');assert.equal(await page.locator('.screen-heading h1').innerText(),'Edit goals');assert.equal(await page.title(),'Edit goals · Avemly');assert.ok(!/[\u3400-\u9fff]/.test(await page.locator('.goal-manager').innerText()));await page.locator('.goal-manager-list-panel').getByRole('button',{name:'Add goal',exact:true}).click();await page.locator('.goal-manager-dialog[open]').waitFor();assert.equal(await page.getByLabel('Goal progress',{exact:true}).count(),0);assert.ok(!/[\u3400-\u9fff]/.test(await page.locator('.goal-manager-form').innerText()));await page.getByLabel('Goal name',{exact:true}).fill('Annual result');await page.getByRole('button',{name:'Save to unscheduled',exact:true}).click();await page.reload();await manager(page,'year');assert.equal(await page.locator('[data-managed-goal]').count(),1);await capture(page,'en-1024-目标编辑');
 });
 for(const[mode,options]of[['不可写',{storageFailure:true}],['损坏记录',{corrupt:true}]])await check('存储'+mode+'与跨页面暂存',options,async page=>{
  const raw=await read(page);await enter(page,'month');await detail(page,'month').getByRole('link').click();await manager(page,'month');await save(page,'本次临时目标');assert.ok((await page.locator('.goal-manager').innerText()).includes('仅在当前页面保留'));await page.locator('.goal-manager-preview').click();await stage(page,'month');assert.equal(await detail(page,'month').locator('[data-period-goal]').count(),1);assert.equal(await read(page),raw);await detail(page,'month').locator('.plan-detail-back').click();await stage(page,'overview');await page.locator('.plan-context-actions a').click();await manager(page);await choose(page,'month');const item=page.locator('[data-managed-goal]').first();await item.getByRole('button',{name:'删除',exact:true}).click();await item.getByRole('button',{name:'确认删除',exact:true}).click();await page.locator('.goal-manager-preview').click();await stage(page,'month');assert.equal(await detail(page,'month').locator('[data-period-goal]').count(),0);assert.equal(await read(page),raw);
 });
 await check('查看页当前周期过滤与只读记录保持',{filled:true},async page=>{
  const raw=await read(page);for(const period of periods){await enter(page,period);const view=detail(page,period);await readonly(view);assert.equal(await view.locator('[data-period-goal]').count(),2);await view.locator('.plan-detail-item-toggle').first().click();assert.ok(!(await view.innerText()).includes('历史目标'));assert.ok(!(await view.innerText()).includes('未提交的周目标草稿'));if(period==='year')assert.deepEqual(await view.locator('.plan-goal-milestones-readonly .plan-detail-pill').allTextContents(),['已完成','未完成']);await view.locator('.plan-detail-back').click();await stage(page,'overview');}assert.equal(await read(page),raw);
 });
 await check('旧制定地址兼容与无效周期恢复',{},async page=>{
  await page.goto(origin+'/plan?goalForm=month');await manager(page,'month');assert.equal(new URL(page.url()).pathname,'/plan/goals');assert.equal(new URL(page.url()).searchParams.has('goalForm'),false);await page.goto(origin+'/plan/goals?period=unknown');await manager(page,'week');assert.equal(new URL(page.url()).searchParams.get('period'),'week');
 });
}finally{await browser.close();await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));}
assert.deepEqual(errors,[]);assert.ok(results.length>0);assert.ok(results.every(r=>r.status==='pass'),'Goal editor checks failed');
