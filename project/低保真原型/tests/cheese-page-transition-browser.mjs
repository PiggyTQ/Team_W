import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
import {blankGoal,emptyStageRecords,goalEditorUrl,savePeriodGoal,stageStorageKey} from '../src/plan-stage-model.js';

const origin=process.env.CAREER_PREVIEW_ORIGIN||'http://127.0.0.1:5184';
const output=process.env.CHEESE_TRANSITION_OUTPUT||'../设计参考与同步/芝士匀速连续转场_20261108';
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Singapore'}).format(new Date());
const browser=await chromium.launch({channel:process.env.CAREER_BROWSER_CHANNEL||'msedge',headless:true});
const results=[],errors=[];
await mkdir(output+'/实际截图',{recursive:true});

const path=page=>new URL(page.url()).pathname;
const phase=page=>page.locator('.cheese-page-transition').getAttribute('data-transition-phase');
const idle=page=>page.waitForFunction(()=>document.querySelector('.cheese-page-transition')?.dataset.transitionPhase==='idle'&&!document.getElementById('root').inert);
const manager=page=>page.locator('.goal-manager').waitFor();
const stage=(page,id='overview')=>page.locator(`.plan-stage[data-stage-view="${id}"][data-stage-phase="idle"]`).waitFor();
const capture=(page,name)=>page.screenshot({path:output+'/实际截图/'+name+'.png',animations:'allow',caret:'hide'});
const trace=page=>page.evaluate(()=>window.__cheeseTrace);
const freezeAt=(page,progress)=>page.evaluate(progress=>{
 const overlay=document.querySelector('.cheese-page-transition'),plane=overlay.querySelector('.cheese-page-plane');
 const animations=overlay.getAnimations({subtree:true}).filter(animation=>animation.effect.target.matches('.cheese-page-plane,.cheese-page-melt'));
 for(const animation of animations){animation.pause();animation.currentTime=Number(animation.effect.getTiming().duration)*progress;}
 const animation=animations.find(animation=>animation.effect.target===plane),matrix=new DOMMatrixReadOnly(getComputedStyle(plane).transform);
 return{progress,time:animation.currentTime,x:matrix.m41,y:matrix.m42,sameAnimation:animation===window.__cheeseOriginalPlaneAnimation};
},progress);
const resumeSwipe=page=>page.evaluate(()=>document.querySelector('.cheese-page-transition').getAnimations({subtree:true}).filter(animation=>animation.effect.target.matches('.cheese-page-plane,.cheese-page-melt')).forEach(animation=>animation.play()));

async function noWave(page){
 assert.equal(await phase(page),'idle');assert.equal(await page.locator('#root').evaluate(element=>element.inert),false);
 assert.equal(await page.locator('.cheese-page-transition').isVisible(),false);
 assert.equal((await trace(page)).filter(event=>event.phase!=='idle').length,0);
 assert.equal(await page.evaluate(()=>window.__cheeseTiming.length),0);
}

async function contentBounds(page){
 return page.evaluate(()=>{
  const rectangle=element=>{const {x,y,width,height,right,bottom}=element.getBoundingClientRect();return{x,y,width,height,right,bottom};};
  const main=rectangle(document.getElementById('main')),overlay=rectangle(document.querySelector('.cheese-page-transition'));
  const sidebar=rectangle(document.getElementById('workspace-sidebar')),header=rectangle(document.querySelector('.app-header'));
  const x=Math.max(0,main.x),y=Math.max(0,main.y),bottom=Math.min(innerHeight,main.bottom);
  const overlap=other=>Math.max(0,Math.min(overlay.right,other.right)-Math.max(overlay.x,other.x))*Math.max(0,Math.min(overlay.bottom,other.bottom)-Math.max(overlay.y,other.y));
  const probes=[document.querySelector('#workspace-sidebar .sidebar-links a'),document.querySelector('.app-header')].map(element=>{
   const box=element.getBoundingClientRect(),x=box.x+box.width/2,y=box.y+box.height/2,hit=document.elementFromPoint(x,y);
   return{x,y,hitTag:hit?.tagName,hitByOverlay:Boolean(hit?.closest('.cheese-page-transition'))};
  });
  return{main,overlay,sidebar,header,expected:{x,y,width:innerWidth-x,height:bottom-y},sidebarOverlap:overlap(sidebar),headerOverlap:overlap(header),probes};
 });
}

function assertContentBounds(bounds){
 for(const key of ['x','y','width','height'])assert.ok(Math.abs(bounds.overlay[key]-bounds.expected[key])<1,`${key}: ${bounds.overlay[key]} vs ${bounds.expected[key]}`);
 assert.equal(bounds.sidebarOverlap,0);assert.equal(bounds.headerOverlap,0);
 assert.ok(bounds.probes.every(probe=>!probe.hitByOverlay),'sidebar/header points must not hit the wave overlay');
}

async function declaredTiming(page){
 const animations=await page.evaluate(()=>window.__cheeseTiming);
 const planes=animations.filter(animation=>animation.target==='plane');
 assert.equal(planes.length,1,'one plane translation must span the whole transition');
 assert.equal(animations.filter(animation=>animation.target!=='plane').length,0,'sheets and overlay must not add movement or a hold');
 const timing=planes[0];timing.total=timing.duration+timing.delay+timing.endDelay;
 assert.equal(timing.easing,'linear');assert.equal(timing.delay,0);assert.equal(timing.endDelay,0);
 assert.ok(timing.total>0&&timing.total<=500,`declared continuous transition must fit 500ms, received ${timing.total}ms`);
 return timing;
}

async function installTrace(page){
 await page.evaluate(()=>{
  const root=document.querySelector('.cheese-page-transition');
  const entry=kind=>({kind,phase:root.dataset.transitionPhase,path:location.pathname+location.search,inert:document.getElementById('root').inert,time:performance.now(),...(kind==='push'?{sheets:[...root.querySelectorAll('.cheese-page-sheet')].map(sheet=>getComputedStyle(sheet).transform)}:{})});
  window.__cheeseTrace=[];window.__cheeseTiming=[];window.__cheeseMelt=[];
  new MutationObserver(records=>{for(const record of records)if(record.attributeName==='data-transition-phase')window.__cheeseTrace.push(entry('phase'));}).observe(root,{attributes:true});
  const push=history.pushState;
  history.pushState=function(...args){const result=push.apply(this,args);window.__cheeseTrace.push(entry('push'));return result;};
  const animate=Element.prototype.animate;
  Element.prototype.animate=function(keyframes,options){
   const animation=animate.call(this,keyframes,options);
   if(this.matches('.cheese-page-plane,.cheese-page-sheet,.cheese-page-transition')){
    const timing=animation.effect.getTiming(),target=this.matches('.cheese-page-plane')?'plane':this.matches('.cheese-page-sheet')?'sheet':'overlay';
    window.__cheeseTiming.push({target,phase:root.dataset.transitionPhase,duration:Number(timing.duration),delay:Number(timing.delay),endDelay:Number(timing.endDelay),easing:timing.easing});
    if(target==='plane'&&!window.__cheeseOriginalPlaneAnimation)window.__cheeseOriginalPlaneAnimation=animation;
   }
   if(this.matches('.cheese-page-melt'))window.__cheeseMelt.push({phase:root.dataset.transitionPhase});
   return animation;
  };
 });
}

async function setup({width=1440,height=1000,reducedMotion='no-preference',route='/plan',collapsed=false}={}){
 const context=await browser.newContext({viewport:{width,height},reducedMotion});
 const page=await context.newPage();page.setDefaultTimeout(9000);page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin,{waitUntil:'networkidle'});
 let records=emptyStageRecords();
 for(const period of ['week','month','year'])for(let index=0;index<2;index++)records=savePeriodGoal(records,period,today,{...blankGoal(period,today),title:`转场检查-${period}-${index}`});
 await page.evaluate(({KEY,s,records,key,collapsed})=>{
  localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem(key,JSON.stringify(records));
  localStorage.setItem('career-prototype-language','zh');
  localStorage.setItem('career-prototype-sidebar-v1',collapsed?'collapsed':'expanded');
  localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));
 },{KEY,s:scenarioState('PT04'),records,key:stageStorageKey('local'),collapsed});
 await page.goto(origin+route);await page.locator('.cheese-page-transition').waitFor({state:'attached'});await idle(page);
 if(route==='/plan')await stage(page);else if(route.startsWith('/plan/goals'))await manager(page);
 await page.evaluate(()=>document.fonts.ready);await installTrace(page);
 return{context,page};
}

async function check(name,options,run){
 if(process.env.CHEESE_TRANSITION_CASE&&!new RegExp(process.env.CHEESE_TRANSITION_CASE).test(name))return;
 const{context,page}=await setup(options);
 try{const detail=await run(page);results.push({name,status:'pass',...detail});console.log('PASS '+name);}
 catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL '+name,error.message);await capture(page,'失败-'+name);}
 finally{await context.close();await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));}
}

try{
 await check('四层芝士匀速连续扫过并在中点覆盖时换页',{},async page=>{
  const main=await page.evaluate(KEY=>localStorage.getItem(KEY),KEY);
  const records=await page.evaluate(key=>localStorage.getItem(key),stageStorageKey('local'));
  await capture(page,'1440-跳转前页面静止状态');
  await page.locator('.plan-context-actions a').click();
  assert.equal(path(page),'/plan');assert.equal(await phase(page),'covering');
  assert.equal(await page.locator('#root').evaluate(element=>element.inert),true);
  assert.equal(await page.locator('.cheese-page-transition').getAttribute('aria-hidden'),'true');
  assert.equal(await page.locator('.cheese-page-sheet').count(),4);
  assert.ok(await page.evaluate(()=>window.__cheeseMelt.length>0),'melting wave motion must animate the sheet surface');
  const geometry=await contentBounds(page);assertContentBounds(geometry);
  const samples=[await freezeAt(page,.25)];
  assert.equal(path(page),'/plan');await capture(page,'1440-匀速卷入-25百分比');
  samples.push(await freezeAt(page,.5));
  await page.waitForFunction(()=>location.pathname==='/plan/goals');
  await manager(page);await capture(page,'1440-连续扫过中点-50百分比');
  samples.push(await freezeAt(page,.75));await capture(page,'1440-匀速退场-75百分比');
  assert.ok(samples.every(sample=>sample.sameAnimation),'the original plane animation must survive the route commit');
  const firstStep={x:samples[1].x-samples[0].x,y:samples[1].y-samples[0].y},secondStep={x:samples[2].x-samples[1].x,y:samples[2].y-samples[1].y};
  assert.ok(Math.hypot(firstStep.x,firstStep.y)>50,'samples must measure an actual sweep');
  assert.ok(Math.hypot(firstStep.x-secondStep.x,firstStep.y-secondStep.y)<1,'equal time intervals must travel equal distances across the commit');
  await resumeSwipe(page);
  await idle(page);await manager(page);await capture(page,'1440-目标编辑落地');
  const events=await trace(page),pushes=events.filter(event=>event.kind==='push');
  assert.equal(pushes.length,1);assert.equal(pushes[0].phase,'covered');
  assert.ok(events.some(event=>event.phase==='covering'));assert.ok(events.some(event=>event.phase==='revealing'));
  assert.equal(await page.evaluate(KEY=>localStorage.getItem(KEY),KEY),main);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),stageStorageKey('local')),records);
  assert.equal(await page.locator('.cheese-page-transition').isVisible(),false);
  return{geometry,events,samples,firstStep,secondStep,timing:await declaredTiming(page)};
 });

 await check('键盘进入与重复激活只写入一次历史',{},async page=>{
  const before=await page.evaluate(()=>history.length);
  await page.locator('.plan-context-actions a').focus();await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');await page.keyboard.press('Enter');
  await idle(page);await manager(page);
  assert.equal(await page.evaluate(()=>history.length),before+1);
  assert.equal((await trace(page)).filter(event=>event.kind==='push').length,1);
  assert.equal(await page.locator('#root').evaluate(element=>element.inert),false);
  assert.equal(await page.evaluate(()=>Boolean(document.activeElement?.closest('[inert]'))),false);
 });

 await check('返回与浏览器前进后退完成转场',{},async page=>{
  await page.locator('.plan-context-actions a').click();await idle(page);await manager(page);
  await page.locator('.goal-manager-back').click();assert.equal(await phase(page),'covering');await idle(page);await stage(page);
  await page.evaluate(()=>history.back());await page.waitForFunction(()=>document.querySelector('.cheese-page-transition').dataset.transitionPhase!=='idle');await idle(page);await manager(page);assert.equal(path(page),'/plan/goals');
  await page.evaluate(()=>history.forward());await page.waitForFunction(()=>document.querySelector('.cheese-page-transition').dataset.transitionPhase!=='idle');await idle(page);await stage(page);assert.equal(path(page),'/plan');
 });

 await check('动画期间快速历史后退前进不锁页',{},async page=>{
  await page.locator('.plan-context-actions a').click();await idle(page);await manager(page);
  await page.locator('.goal-manager-back').click();await idle(page);await stage(page);
  await page.evaluate(()=>history.back());
  await page.waitForFunction(()=>document.querySelector('.cheese-page-transition').dataset.transitionPhase!=='idle');
  await page.evaluate(()=>history.forward());await idle(page);await stage(page);assert.equal(path(page),'/plan');
  assert.equal(await page.locator('#root').evaluate(element=>element.inert),false);
  assert.equal(await page.locator('.cheese-page-transition').isVisible(),false);
  await page.locator('.plan-context-actions a').click();await idle(page);await manager(page);
 });

 await check('同页周期与新增弹窗不触发整页动画',{route:'/plan/goals'},async page=>{
  for(const period of ['month','year','week']){
   await page.locator(`.goal-manager-periods a[href="${goalEditorUrl(period)}"]`).click();
   await page.locator(`.goal-manager-periods a[aria-current="page"][href="${goalEditorUrl(period)}"]`).waitFor();
   assert.equal(await phase(page),'idle');
  }
  await page.locator('.goal-manager-list-panel').getByRole('button',{name:'新增目标',exact:true}).click();
  await page.locator('.goal-manager-dialog[open]').waitFor();assert.equal(await phase(page),'idle');
  await page.keyboard.press('Escape');await page.locator('.goal-manager-dialog[open]').waitFor({state:'hidden'});
  assert.equal((await trace(page)).filter(event=>event.phase!=='idle').length,0);
 });

 await check('模块幕布保留且待排期按钮使用整页波浪',{},async page=>{
  await page.locator('[data-plan-card="week"] button').click();await stage(page,'week');assert.equal(await phase(page),'idle');
  assert.equal((await trace(page)).filter(event=>event.phase!=='idle').length,0);
  await page.locator('[data-stage-detail="week"] .plan-detail-back').click();await stage(page);
  await page.locator('[data-plan-card="undated"] button').click();assert.equal(await phase(page),'covering');
  await idle(page);await page.locator('.plan-scheduler').waitFor();assert.equal(path(page),'/plan/schedule');
  await page.locator('[data-schedule-goal] a').nth(1).click();assert.equal(await phase(page),'idle');
  await page.locator('.scheduler-navigation a').click();await idle(page);await stage(page);
 });

 await check('目标计划分类内的制定执行模式使用芝士波浪',{},async page=>{
  await page.getByRole('link',{name:'计划执行',exact:true}).click();assert.equal(await phase(page),'covering');
  await idle(page);assert.equal(new URL(page.url()).searchParams.get('tab'),'执行');
  await page.getByRole('link',{name:'计划制定',exact:true}).click();await idle(page);await stage(page);
 });

 await check('目标计划离开到学习职业工作台分类均立即切换',{},async page=>{
  for(const target of ['/learning','/careers','/app']){
   const link=target==='/learning'?page.locator('.plan-context-next a'):page.locator(`#workspace-sidebar a[href="${target}"]`);
   await link.click();assert.equal(path(page),target);await noWave(page);
   await page.locator('#workspace-sidebar a[href="/plan"]').click();await stage(page);await noWave(page);
  }
  return{events:await trace(page)};
 });

 await check('从其他分类进入目标计划立即切换且不加锁',{route:'/learning'},async page=>{
  await page.locator('#workspace-sidebar a[href="/plan"]').click();await stage(page);await noWave(page);
  return{events:await trace(page)};
 });

 await check('跨分类浏览器后退前进不触发芝士波浪',{},async page=>{
  await page.locator('.plan-context-next a').click();assert.equal(path(page),'/learning');await noWave(page);
  await page.evaluate(()=>history.back());await page.waitForURL(origin+'/plan');await stage(page);await noWave(page);
  await page.evaluate(()=>history.forward());await page.waitForURL(origin+'/learning');await noWave(page);
  return{events:await trace(page)};
 });

 await check('减少动态效果直接跳转且深链接无入场动画',{reducedMotion:'reduce'},async page=>{
  await page.locator('.plan-context-actions a').click();await manager(page);assert.equal(await phase(page),'idle');
  assert.equal((await trace(page)).filter(event=>event.phase!=='idle').length,0);
  await page.locator('.goal-manager-back').click();await stage(page);assert.equal(await phase(page),'idle');
  await page.goto(origin+'/plan/schedule');await idle(page);await page.locator('.plan-scheduler').waitFor();
  assert.equal(await page.locator('.cheese-page-transition').isVisible(),false);
  await capture(page,'1440-减少动态效果-计划排期');
 });

 await check('动画中开启减少动态效果立即落地并解除锁定',{},async page=>{
  await page.locator('.plan-context-actions a').click();assert.equal(await phase(page),'covering');
  await page.emulateMedia({reducedMotion:'reduce'});await idle(page);await manager(page);assert.equal(path(page),'/plan/goals');
  assert.equal(await page.locator('.cheese-page-transition').isVisible(),false);
  await page.locator('.goal-manager-back').click();await stage(page);assert.equal(await phase(page),'idle');
 });

 await check('转场期间调整电脑窗口立即落地且解除锁定',{},async page=>{
  await page.locator('.plan-context-actions a').click();assert.equal(await phase(page),'covering');
  await page.setViewportSize({width:1920,height:1080});await idle(page);await manager(page);
  assert.equal(path(page),'/plan/goals');assert.equal(await page.locator('#root').evaluate(element=>element.inert),false);
  assert.equal(await page.locator('.cheese-page-transition').isVisible(),false);
  await page.locator('.goal-manager-back').click();await idle(page);await stage(page);
 });

 await check('目标编辑查看目标后焦点落在可见目标标题',{route:'/plan/goals'},async page=>{
  await page.locator('.goal-manager-preview').click();assert.equal(await phase(page),'covering');
  await idle(page);await stage(page,'week');assert.equal(path(page),'/plan');assert.equal(new URL(page.url()).searchParams.get('goalView'),'week');
  assert.equal(await page.locator('[data-stage-detail="week"] [data-stage-heading]').evaluate(element=>element===document.activeElement),true);
 });

 await check('收起侧栏后立即跳转按最终内容区裁切且快捷键不改布局',{},async page=>{
  await page.locator('.sidebar-toggle').click();
  // Dispatch without Playwright's layout-stability wait so navigation races the 260ms sidebar FLIP.
  await page.locator('.plan-context-actions a').dispatchEvent('click');assert.equal(await phase(page),'covering');
  await freezeAt(page,.25);
  assert.equal(await page.locator('#workspace-sidebar').getAttribute('data-collapsed'),'true');
  const geometry=await contentBounds(page);assertContentBounds(geometry);
  await page.keyboard.press('Control+Backslash');
  assert.equal(await page.locator('#workspace-sidebar').getAttribute('data-collapsed'),'true');
  assertContentBounds(await contentBounds(page));await capture(page,'1440-收起侧栏后立即跳转');
  await resumeSwipe(page);
  await idle(page);await manager(page);return{geometry};
 });

 for(const width of [1024,1440,1920])for(const collapsed of [false,true])await check(`${width}电脑侧栏${collapsed?'收起':'展开'}时波浪仅覆盖内容区`,{width,height:width===1024?900:1080,collapsed},async page=>{
  const label=`${width}-${collapsed?'收起':'展开'}`;
  assert.equal(await page.locator('#workspace-sidebar').getAttribute('data-collapsed'),String(collapsed));
  await capture(page,label+'-跳转前');
  await page.locator('.plan-context-actions a').click();
  const geometry=await contentBounds(page);assertContentBounds(geometry);
  await freezeAt(page,.25);
  await capture(page,label+'-内容区卷入');
  await resumeSwipe(page);
  await idle(page);await manager(page);await capture(page,label+'-目标编辑落地');
  assert.equal(await page.locator('#root').evaluate(element=>element.inert),false);
  return{geometry,timing:await declaredTiming(page)};
 });
}finally{
 await browser.close();await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));
}
if(errors.length||results.some(result=>result.status==='fail'))process.exitCode=1;
