import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
import {blankGoal,emptyStageRecords,savePeriodGoal,stageStorageKey} from '../src/plan-stage-model.js';

const origin=process.env.CAREER_PREVIEW_ORIGIN||'http://127.0.0.1:5185';
const output=process.env.WORKSPACE_MOTION_OUTPUT||'checks/workspace-motion-scroll';
const browser=await chromium.launch({channel:process.env.CAREER_BROWSER_CHANNEL||'chrome',headless:true});
const results=[],errors=[];
await mkdir(output+'/实际截图',{recursive:true});
const settled=page=>page.waitForFunction(()=>!['waiting','running'].includes(document.getElementById('main').dataset.pageRevealState));
const animations=page=>page.evaluate(()=>document.getAnimations().filter(a=>a.id==='workspace-page-reveal').length);
const mainTop=page=>page.locator('#main').evaluate(el=>el.scrollTop);
const screenshot=(page,name)=>page.screenshot({path:output+'/实际截图/'+name+'.png',caret:'hide'});
const freeze=(page,time)=>page.evaluate(time=>{
 for(const animation of document.getAnimations()){
  if(animation.id==='workspace-page-reveal'){animation.pause();animation.currentTime=time;}
  else if(animation instanceof CSSTransition)animation.finish();
 }
},time);

async function setup({route='/app',width=1100,height=650,reducedMotion='no-preference'}={}){
 const context=await browser.newContext({viewport:{width,height},timezoneId:'Asia/Singapore',reducedMotion});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Singapore'}).format(new Date());
 let records=emptyStageRecords();
 for(let index=0;index<18;index++)records=savePeriodGoal(records,'week',today,{...blankGoal('week',today),title:'滚动检查目标 '+(index+1)});
 await page.addInitScript(({key,state,records,stageKey})=>{
  localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(stageKey,JSON.stringify(records));
  localStorage.setItem('career-prototype-language','zh');localStorage.setItem('career-prototype-sidebar-v1','expanded');
  localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));
  window.__reveals=[];const original=Element.prototype.animate;
  Element.prototype.animate=function(...args){const animation=original.apply(this,args);if(this.closest('.page-surface'))window.__reveals.push(animation);return animation;};
 },{key:KEY,state:scenarioState('PT05'),records,stageKey:stageStorageKey('local')});
 await page.goto(origin+route);await page.locator('.page-surface').waitFor();
 if(route==='/career-map')await page.locator('.skill-tree-board').waitFor();
 return {context,page};
}

async function check(name,options,run){
 if(process.env.WORKSPACE_MOTION_CASE&&!new RegExp(process.env.WORKSPACE_MOTION_CASE).test(name))return;
 const {context,page}=await setup(options);
 try{const detail=await run(page);results.push({name,status:'pass',...detail});console.log('PASS '+name);}
 catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL '+name,error.message);await screenshot(page,'失败-'+name);}
 finally{await context.close();await writeFile(output+'/检查结果.json',JSON.stringify({results,errors},null,2));}
}

async function navigate(page,path){
 const toggle=page.locator('.app-header button[aria-controls="workspace-sidebar"]');
 if(await toggle.isVisible()&&!await page.locator('#workspace-sidebar').isVisible())await toggle.click();
 await page.locator('#workspace-sidebar a[href="'+path+'"]').click();await page.waitForURL('**'+path);
}

async function wheelOn(page,selector,delta){
 const area=page.locator(selector).first();await area.scrollIntoViewIfNeeded();
 const point=await area.evaluate(el=>{
  const a=el.getBoundingClientRect(),main=document.getElementById('main').getBoundingClientRect();
  const top=Math.max(a.top,main.top,0),bottom=Math.min(a.bottom,main.bottom,innerHeight);
  return {x:(Math.max(a.left,main.left)+Math.min(a.right,main.right))/2,y:(top+bottom)/2};
 });
 await page.mouse.move(point.x,point.y);await page.waitForTimeout(140);
 // A physical wheel turn contains several ticks; let Chromium resolve its boundary latch.
 for(let tick=0;tick<3;tick++){await page.mouse.wheel(0,delta/3);await page.waitForTimeout(100);}
}

try{
 await check('普通状态摘要不会延迟个人评估的入场',{},async page=>{
  await navigate(page,'/assessment');await page.locator('.hub-snapshot-state').waitFor({state:'attached'});
  assert.notEqual(await page.locator('#main').getAttribute('data-page-reveal-state'),'waiting');await settled(page);
 });

 await check('全部九个导航入口能完成入场并清理动画',{},async page=>{
  for(const route of ['/assessment','/plan','/learning','/reports','/careers','/career-map','/assistant','/settings','/app']){
   await navigate(page,route);await page.waitForFunction(()=>!['waiting','running'].includes(document.getElementById('main').dataset.pageRevealState),{},{timeout:2500});
   assert.equal(await animations(page),0);assert.equal(await page.locator('#root').evaluate(el=>el.inert),false);
  }
 });

 await check('目标计划连同背景边框一起入场且不在幕布容器内裁切',{},async page=>{
  await navigate(page,'/plan');await freeze(page,0);
  const detail=await page.evaluate(()=>{
   const stage=document.querySelector('.plan-stage');
   return {stageOpacity:getComputedStyle(stage).opacity,stageAnimations:stage.getAnimations().filter(a=>a.id==='workspace-page-reveal').length,
    innerAnimations:stage.getAnimations({subtree:true}).filter(a=>a.id==='workspace-page-reveal'&&a.effect.target!==stage).length};
  });
  assert.equal(detail.stageOpacity,'0');assert.equal(detail.stageAnimations,1);assert.equal(detail.innerAnimations,0);
  for(const time of [0,240,420,1060]){await freeze(page,time);await screenshot(page,'目标计划-'+time+'ms');}
  return detail;
 });

 await check('技能地图等树图就绪后标题主体路径沿同一时间轴出现',{},async page=>{
  let releaseImage,heldImage;
  const held=new Promise(resolve=>{heldImage=resolve;});
  await page.route('**/*ash-tree*.webp*',async route=>{
   if(route.request().resourceType()==='image'){heldImage();await new Promise(resolve=>{releaseImage=resolve;});}
   await route.continue();
  });
  await navigate(page,'/career-map');await held;await page.locator('.skill-path').waitFor();
  assert.equal(await page.locator('#main').getAttribute('data-page-reveal-state'),'waiting');
  assert.equal(await page.locator('.skill-map-head').evaluate(el=>getComputedStyle(el).opacity),'0');
  assert.ok(await page.evaluate(()=>window.__reveals.filter(a=>a.id==='workspace-page-reveal').every(a=>a.playState==='paused'&&a.currentTime===0)));
  releaseImage();await page.waitForFunction(()=>document.getElementById('main').dataset.pageRevealState==='running');
  const detail=await page.evaluate(()=>document.getAnimations().filter(a=>a.id==='workspace-page-reveal').map(a=>({target:a.effect.target.className,start:a.startTime,delay:a.effect.getTiming().delay})));
  assert.deepEqual(detail.map(a=>a.target),['skill-map-head','skill-tree-board','skill-path']);
  assert.equal(new Set(detail.map(a=>a.start)).size,1);assert.ok(detail[0].delay<detail[1].delay&&detail[1].delay<detail[2].delay);
  for(const time of [0,160,320,700]){await freeze(page,time);await screenshot(page,'技能地图-'+time+'ms');}
  return {timeline:detail};
 });

 await check('地图等待图片时快速切页不会残留旧动画',{},async page=>{
  let releaseImage,heldImage;const held=new Promise(resolve=>{heldImage=resolve;});
  await page.route('**/*ash-tree*.webp*',async route=>{
   if(route.request().resourceType()==='image'){heldImage();await new Promise(resolve=>{releaseImage=resolve;});}
   await route.continue();
  });
  await navigate(page,'/career-map');await held;await navigate(page,'/plan');releaseImage();await settled(page);
  assert.equal(new URL(page.url()).pathname,'/plan');assert.equal(await animations(page),0);
  assert.equal(await page.evaluate(()=>window.__reveals.filter(a=>a.id==='workspace-page-reveal'&&!a.effect.target.isConnected).every(a=>a.playState==='idle')),true);
 });

 await check('九个工作区页面的实际滚轮在六个正文位置均能移动内容',{},async page=>{
  const probes=[];
  for(const route of ['/app','/assessment','/plan','/learning','/reports','/careers','/career-map','/assistant','/settings']){
   await page.goto(origin+route);await page.locator('.page-surface').waitFor();if(route==='/career-map')await page.locator('.skill-tree-board').waitFor();
   const box=await page.locator('#main').boundingBox();
   for(const [fx,fy]of [[.08,.25],[.5,.25],[.9,.25],[.08,.65],[.5,.65],[.9,.65]]){
    await page.evaluate(()=>{const main=document.getElementById('main');window.__scrollNodes=[document.scrollingElement,main,...main.querySelectorAll('*')].filter(el=>el===document.scrollingElement||/(auto|scroll)/.test(getComputedStyle(el).overflowY));window.__scrollNodes.forEach(el=>el.scrollTop=0);});
    const available=await page.locator('#main').evaluate(el=>el.scrollHeight-el.clientHeight);assert.ok(available>0,route+' has overflow in the short viewport');
    await page.mouse.move(box.x+box.width*fx,box.y+box.height*fy);await page.waitForTimeout(140);await page.mouse.wheel(0,250);
    await page.waitForFunction(()=>window.__scrollNodes.some(el=>el.scrollTop>0),{},{timeout:1200});
    probes.push({route,point:[fx,fy],mainScroll:await mainTop(page)});
   }
  }
  return {probes};
 });

 await check('资料列表优先滚动自身且上下边界继续滚动页面',{route:'/assessment'},async page=>{
  const panel=page.locator('.background-review-sidebar');await panel.scrollIntoViewIfNeeded();
  await panel.evaluate(el=>el.scrollTop=0);const initial=await mainTop(page);await wheelOn(page,'.background-review-sidebar',140);
  await page.waitForFunction(()=>document.querySelector('.background-review-sidebar').scrollTop>0);
  assert.equal(await mainTop(page),initial);
  await panel.evaluate(el=>el.scrollTop=el.scrollHeight);const beforeDown=await mainTop(page);await wheelOn(page,'.background-review-sidebar',150);
  await page.waitForFunction(before=>document.getElementById('main').scrollTop>before,beforeDown);
  await panel.scrollIntoViewIfNeeded();await panel.evaluate(el=>el.scrollTop=0);const beforeUp=await mainTop(page);assert.ok(beforeUp>0);
  await wheelOn(page,'.background-review-sidebar',-150);await page.waitForFunction(before=>document.getElementById('main').scrollTop<before,beforeUp);
 });

 await check('计划明细列表滚动及边界交接不影响原幕布切换',{route:'/plan'},async page=>{
  await page.locator('[data-plan-card="week"] button').click();await page.waitForFunction(()=>document.querySelector('.plan-stage').dataset.stagePhase==='idle');
  const selector='.plan-stage-view:not([hidden]) .plan-detail-list-scroll',list=page.locator(selector);
  await list.scrollIntoViewIfNeeded();assert.ok(await list.evaluate(el=>el.scrollHeight>el.clientHeight));
  await list.evaluate(el=>el.scrollTop=0);await wheelOn(page,selector,120);await page.waitForFunction(selector=>document.querySelector(selector).scrollTop>0,selector);
  await list.evaluate(el=>el.scrollTop=el.scrollHeight);const before=await mainTop(page);await wheelOn(page,selector,180);await page.waitForFunction(before=>document.getElementById('main').scrollTop>before,before);
  await screenshot(page,'计划明细-滚轮交接后');
 });

 await check('入场未结束时滚轮会结束动画并实际滚动页面',{},async page=>{
  await navigate(page,'/plan');await freeze(page,40);assert.ok(await animations(page)>0);
  const box=await page.locator('#main').boundingBox();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.55);await page.mouse.wheel(0,180);
  await page.waitForFunction(()=>document.getElementById('main').scrollTop>0);assert.equal(await animations(page),0);
 });

 await check('桌面滚到底保持导航固定且公开首页恢复窗口滚动',{route:'/assessment'},async page=>{
  const header=await page.locator('.app-header').boundingBox(),sidebar=await page.locator('#workspace-sidebar').boundingBox();
  await page.locator('#main').evaluate(el=>el.scrollTop=el.scrollHeight);
  const bounds=await page.locator('#main').boundingBox();await page.mouse.move(bounds.x+5,bounds.y+bounds.height/2);
  for(let tick=0;tick<3;tick++){await page.mouse.wheel(0,300);await page.waitForTimeout(100);}
  assert.equal(await page.evaluate(()=>scrollY),0);
  assert.deepEqual(await page.locator('.app-header').boundingBox(),header);assert.deepEqual(await page.locator('#workspace-sidebar').boundingBox(),sidebar);
  await page.locator('.app-header .brand').click();await page.waitForURL(origin+'/');
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).overflow),'clip');
  await page.mouse.move(700,400);await page.mouse.wheel(0,450);await page.waitForFunction(()=>scrollY>0);
 });

 for(const route of ['/plan','/career-map','/assistant'])await check('手机实际滚轮可滚动'+route,{route,width:390,height:844},async page=>{
  await page.mouse.move(200,500);await page.mouse.wheel(0,240);await page.waitForFunction(()=>scrollY>0||document.getElementById('main').scrollTop>0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await screenshot(page,'390-'+route.slice(1)+'-滚动后');
 });

 await check('减少动态效果直接显示完整目标计划和技能地图',{reducedMotion:'reduce'},async page=>{
  for(const route of ['/plan','/career-map']){
   await navigate(page,route);if(route==='/career-map')await page.locator('.skill-tree-board').waitFor();
   assert.equal(await animations(page),0);assert.equal(await page.locator('.page-surface').evaluate(el=>getComputedStyle(el).opacity),'1');
  }
 });
}finally{await browser.close();}
if(errors.length||results.some(result=>result.status==='fail'))process.exitCode=1;
