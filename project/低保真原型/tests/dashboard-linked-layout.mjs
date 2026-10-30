import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';

const dir='检查记录/Dashboard主辅联动_20261024';
const base=process.env.DASHBOARD_TEST_BASE||'http://127.0.0.1:5187';
const beforeOnly=process.argv.includes('--before');
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
const context=await browser.newContext({reducedMotion:'reduce'});
const page=await context.newPage();
page.setDefaultTimeout(8000);
page.setDefaultNavigationTimeout(30000);
const results=[],checks=[],errors=[];
const consoleWarnings=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(['warning','error'].includes(message.type()))consoleWarnings.push(message.text());});
async function load(state='PT04',width=1440,lang='zh',collapsed=false){
 await page.setViewportSize({width,height:width<721?844:900});
 if(!page.url().startsWith(base))await page.goto(base+'/app',{waitUntil:'domcontentloaded'});
 await page.evaluate(({state,key,lang,collapsed,guideKey})=>{
  localStorage.setItem(key,JSON.stringify(state));
  localStorage.setItem('career-prototype-language',lang);
  localStorage.setItem('career-prototype-sidebar-v1',collapsed?'collapsed':'expanded');
  localStorage.setItem(guideKey,JSON.stringify({enabled:false,neverPrompt:true,seen:[],active:null}));
  localStorage.setItem('career-prototype-guidance-v1',JSON.stringify({auto:false,seen:[]}));
 },{state:typeof state==='string'?scenarioState(state):state,key:KEY,lang,collapsed,guideKey:OPERATION_GUIDE_KEY});
 await page.goto(base+'/app',{waitUntil:'networkidle'});
 await page.locator('#main.workbench-home .workbench-grid').waitFor();
}
async function shot(name){
 await page.evaluate(()=>{window.scrollTo(0,0);document.querySelector('#main')?.scrollTo(0,0);});
 await page.screenshot({path:`${dir}/${name}.png`});
}
const stored=()=>page.evaluate(key=>localStorage.getItem(key),KEY);
async function openDetail(id){
 await page.locator(`[data-workspace-detail="${id}"]`).click();
 await page.locator('.workspace-detail-drawer[open]').waitFor();
}
async function closeDetail(){
 if(await page.locator('.workspace-detail-drawer[open]').count()){
  await page.locator('.workspace-detail-drawer .information-drawer-heading>button').click();
  await page.locator('.workspace-detail-drawer').waitFor({state:'detached'});
 }
}
const groups={waiting:['待开始'],active:['进行中'],blocked:['受阻'],complete:['完成'],stopped:['延期','取消','跳过']};
const active=scenarioState('PT04');
const mixed=structuredClone(active);
mixed.tasks=['待开始','进行中','受阻','完成','延期','取消','跳过','核对中'].map((status,index)=>({...active.tasks[0],id:`linked-${index}`,title:`合成任务 ${index+1} · ${status}`,status,completed:status==='完成',hours:index===3?0:1}));
const unknown=structuredClone(active);unknown.budget=null;
const over=structuredClone(active);over.budget=1;
const long=structuredClone(mixed);
long.tasks[0].title='VeryLongTaskIdentifierWithoutAnySpaces'.repeat(12);
long.tasks[0].standard='LongDeliverableWithoutSpaces'.repeat(10);
long.tasks[2].title='需要本人核对范围、输入质量和交付限制的长任务标题'.repeat(12);
long.claims[0].title='长经历材料标题与本人贡献记录'.repeat(16);
async function inspect(name){
 const observation=await page.evaluate(()=>{
  const main=document.querySelector('#main');
  const visible=element=>{const r=element.getBoundingClientRect(),style=getComputedStyle(element);return r.width>0&&r.height>0&&style.visibility!=='hidden'&&element.checkVisibility()&&!element.closest('.sr-only,[aria-hidden=true]');};
  const drawer=document.querySelector('.workspace-detail-drawer[open]');
  const rect=selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const controls=[...main.querySelectorAll('.workbench-home-body :is(a,button,input,select,textarea)'),...(drawer?.querySelectorAll('a,button,input,select,textarea')||[])].filter(visible);
  const controlOverflow=controls.filter(e=>{const r=e.getBoundingClientRect();return e.scrollWidth>e.clientWidth+3||r.left< -1||r.right>innerWidth+1;}).map(e=>({className:e.className,text:e.textContent.trim().slice(0,80),scroll:e.scrollWidth,client:e.clientWidth}));
  const panelOverflow=[...main.querySelectorAll('.workbench-grid>*'),...(drawer?.querySelectorAll('.workbench-panel,.dashboard-status-filters,.dashboard-status-preview')||[])].filter(visible).filter(e=>e.scrollWidth>e.clientWidth+3).map(e=>({className:e.className,overflow:e.scrollWidth-e.clientWidth}));
  const boxes=Object.fromEntries(['.workbench-focus','.workbench-week','.workbench-preparation','.workbench-status'].map(selector=>[selector,rect(selector)]));
  const pairs=[['.workbench-focus','.workbench-week'],['.workbench-preparation','.workbench-status']].map(([a,b])=>({a,b,first:boxes[a],second:boxes[b]})).filter(pair=>pair.first&&pair.second&&Math.abs(pair.first.y-pair.second.y)<2&&pair.second.x>pair.first.x+pair.first.width/2).map(pair=>({a:pair.a,b:pair.b,bottomDifference:Math.abs(pair.first.bottom-pair.second.bottom),topDifference:Math.abs(pair.first.y-pair.second.y)}));
  const records=[...main.querySelectorAll('.workbench-record-grid>.workbench-panel')].map(e=>{const r=e.getBoundingClientRect();return {id:e.dataset.record,y:r.y,bottom:r.bottom,x:r.x};});
  const recordPairs=[];for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++)if(Math.abs(records[i].y-records[j].y)<2)recordPairs.push({a:records[i].id,b:records[j].id,bottomDifference:Math.abs(records[i].bottom-records[j].bottom)});
  return {width:innerWidth,height:innerHeight,collapsed:document.querySelector('#workspace-sidebar')?.dataset.collapsed,zoom:getComputedStyle(document.documentElement).zoom,documentOverflow:document.documentElement.scrollWidth-innerWidth,mainOverflow:main.scrollWidth-main.clientWidth,drawerOverflow:drawer?drawer.scrollWidth-drawer.clientWidth:0,drawer:drawer?rect('.workspace-detail-drawer'):null,controlOverflow,panelOverflow,boxes,pairs,recordPairs,previewRows:document.querySelectorAll('.dashboard-task-preview').length,detailEntries:main.querySelectorAll('[data-workspace-detail]').length,missingPanels:['.workbench-focus','.workbench-week'].filter(selector=>!boxes[selector])};
 });
 const faults=[];
 if(observation.missingPanels.length)faults.push('missing dashboard panels');
 if(observation.documentOverflow>3)faults.push('document horizontal overflow');
 if(observation.mainOverflow>3)faults.push('main horizontal overflow');
 if(observation.drawerOverflow>3)faults.push('drawer horizontal overflow');
 if(observation.drawer&&(observation.drawer.x< -1||observation.drawer.right>observation.width+1))faults.push('drawer outside viewport');
 if(observation.detailEntries!==3)faults.push('missing detail entries');
 if(observation.controlOverflow.length)faults.push('control overflow');
 if(observation.panelOverflow.length)faults.push('panel overflow');
 if(observation.pairs.some(pair=>pair.bottomDifference>2))faults.push('paired panel bottom mismatch');
 if(observation.recordPairs.some(pair=>pair.bottomDifference>2))faults.push('record panel bottom mismatch');
 if(observation.previewRows>1)faults.push('more than one task preview');
 results.push({name,...observation,status:faults.length?'fail':'pass',faults});
}
async function check(name,work){
 try{await work();checks.push({name,status:'pass'});}
 catch(error){checks.push({name,status:'fail',message:error.message});console.log(`FAIL ${name}: ${error.message}`);}
}
const matching=(tasks,id)=>tasks.filter(task=>id==='other'?!Object.values(groups).flat().includes(task.status):groups[id].includes(task.status));
async function navigate(selector,pathname,searchPart){
 const target=page.locator(selector).first();
 await target.click();
 await page.waitForURL(url=>url.pathname===pathname&&(!searchPart||url.searchParams.get(searchPart[0])===searchPart[1]));
 await page.locator('#main').waitFor();
 await page.goto(base+'/app',{waitUntil:'networkidle'});
 await page.locator('.workbench-grid').waitFor();
}
try{
 if(beforeOnly){
  await load('PT04',1440);await shot('before-desktop');
  await load('PT04',390);await shot('before-mobile');
  console.log(JSON.stringify({mode:'before',browser:browser.version(),screenshots:[`${dir}/before-desktop.png`,`${dir}/before-mobile.png`],errors},null,2));
 }else{
  const cases=[
   ...[320,390,820,1024,1366,1440].map(width=>({name:`PT04-${width}-zh`,state:'PT04',width,lang:'zh'})),
   ...[320,390,1440].map(width=>({name:`PT04-${width}-en`,state:'PT04',width,lang:'en'})),
   {name:'PT01-empty-desktop',state:'PT01',width:1440,lang:'zh'},
   {name:'PT01-empty-mobile-en',state:'PT01',width:390,lang:'en'},
   {name:'PT02-pending-desktop',state:'PT02',width:1440,lang:'zh'},
   {name:'PT02-pending-mobile',state:'PT02',width:390,lang:'zh'},
   {name:'mixed-desktop',state:mixed,width:1440,lang:'zh'},
   {name:'mixed-tablet-en',state:mixed,width:820,lang:'en'},
   {name:'unknown-mobile',state:unknown,width:390,lang:'zh'},
   {name:'unknown-desktop-en',state:unknown,width:1440,lang:'en'},
   {name:'over-desktop',state:over,width:1440,lang:'zh'},
   {name:'long-mobile',state:long,width:320,lang:'zh'},
   {name:'long-desktop-en',state:long,width:1024,lang:'en'}
  ];
  for(const item of cases){
   await load(item.state,item.width,item.lang);await inspect(item.name);
   const screenshots={'PT04-1440-zh':'after-desktop','PT04-390-zh':'after-mobile','PT04-1440-en':'after-english','PT01-empty-desktop':'after-empty','PT01-empty-mobile-en':'after-empty-mobile-en','mixed-desktop':'after-mixed','unknown-mobile':'after-budget-unknown','over-desktop':'after-budget-over','long-mobile':'after-long-mobile'};
   if(screenshots[item.name])await shot(screenshots[item.name]);
   if(item.name==='PT04-390-zh')await page.screenshot({path:`${dir}/after-mobile-full.png`,fullPage:true});
   if(['PT04-320-zh','PT04-390-zh','PT04-1440-zh','PT04-1440-en','mixed-desktop','mixed-tablet-en','long-mobile','long-desktop-en','PT01-empty-mobile-en','PT02-pending-mobile'].includes(item.name)){
    for(const detail of ['preparation','actions','records']){
     await openDetail(detail);await inspect(`${item.name}-drawer-${detail}`);
     if(['PT04-390-zh','PT04-1440-zh','PT04-1440-en'].includes(item.name))await shot(`after-${detail}-${item.width}-${item.lang}`);
     await closeDetail();
    }
   }
  }
  await check('侧栏收起后正文与成对卡片继续适配',async()=>{
   await load('PT04',1366);await page.locator('.sidebar-toggle').click();await page.waitForFunction(()=>document.querySelector('#workspace-sidebar')?.dataset.collapsed==='true');await inspect('PT04-1366-collapsed');await shot('after-collapsed');
  });
  await check('200% CSS zoom下内容自然重排且保留入口',async()=>{
   await load('PT04',1440);await page.evaluate(()=>document.documentElement.style.zoom='2');await inspect('PT04-1440-zoom200');await shot('after-zoom200');await openDetail('actions');await inspect('PT04-1440-zoom200-drawer');await closeDetail();await page.evaluate(()=>document.documentElement.style.zoom='');
  });
  await check('全部分组选择均显示同组真实任务且不修改业务存储',async()=>{
   await load(mixed,1440);const prior=await stored();await openDetail('actions');
   assert.equal(await page.locator('.dashboard-status-filters button[data-status]').count(),6);
   for(const id of [...Object.keys(groups),'other']){
    const button=page.locator(`.dashboard-status-filters button[data-status="${id}"]`);
    await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');
    const preview=page.locator('.dashboard-status-preview');
    assert.equal(await preview.locator('.dashboard-task-preview').count(),1);
    const candidates=matching(mixed.tasks,id),text=await preview.innerText();
    assert.ok(candidates.some(task=>text.includes(task.title)),`wrong task for ${id}: ${text}`);
    const taskLink=preview.locator('a[href*="task="]');
    assert.equal(await taskLink.count(),1);
    const url=new URL(await taskLink.getAttribute('href'),base);
    assert.equal(url.pathname,'/plan');assert.equal(url.searchParams.get('tab'),'执行');
    assert.ok(candidates.some(task=>url.searchParams.get('task')===task.id));
    assert.equal(await stored(),prior);
   }
   await page.locator('.dashboard-status-reset').click();
   assert.equal(await page.locator('.dashboard-status-filters button[aria-pressed="true"]').count(),0);
   assert.equal(await stored(),prior);
  });
  await check('键盘Enter选择、hover和focus联动高亮',async()=>{
   await load(mixed,1440);const prior=await stored();await openDetail('actions');
   const waiting=page.locator('.dashboard-status-filters button[data-status="waiting"]');
   const activeButton=page.locator('.dashboard-status-filters button[data-status="active"]');
   await waiting.hover();assert.equal(await page.locator('.dashboard-status-chart span[data-status="waiting"]').getAttribute('data-highlighted'),'true');
   await activeButton.focus();await page.mouse.move(0,0);
   assert.equal(await page.locator('.dashboard-status-chart span[data-status="active"]').getAttribute('data-highlighted'),'true');
   await page.keyboard.press('Enter');assert.equal(await activeButton.getAttribute('aria-pressed'),'true');
   assert.match(await page.locator('.dashboard-status-preview').innerText(),/合成任务 2/);
   await inspect('mixed-desktop-selected');await shot('after-selected');await page.locator('.workbench-status').screenshot({path:`${dir}/after-selected-panel.png`});assert.equal(await stored(),prior);
  });
  await check('零计数组可选择并呈现空态，other按真实状态出现',async()=>{
   await load('PT04',1440);const prior=await stored();await openDetail('actions');
   assert.equal(await page.locator('.dashboard-status-filters button[data-status="other"]').count(),1);
   const waiting=page.locator('.dashboard-status-filters button[data-status="waiting"]');
   await waiting.click();assert.equal(await waiting.getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('.dashboard-status-preview .dashboard-task-preview').count(),0);
   assert.ok((await page.locator('.dashboard-status-preview').innerText()).trim().length>0);
   await page.locator('.dashboard-status-filters button[data-status="other"]').click();
   assert.equal(await page.locator('.dashboard-status-preview .dashboard-task-preview').count(),0);
   assert.ok(await page.locator('.dashboard-status-preview .dashboard-filter-empty').isVisible());
   assert.equal(await stored(),prior);
  });
  await check('筛选任务入口进入原执行页并带所选task，不改变记录',async()=>{
   await load(mixed,1440);const prior=await stored();await openDetail('actions');
   await page.locator('.dashboard-status-filters button[data-status="blocked"]').click();
   const link=page.locator('.dashboard-status-preview a[href*="task="]');
   await link.click();await page.waitForURL(url=>url.pathname==='/plan'&&url.searchParams.get('tab')==='执行'&&url.searchParams.get('task')==='linked-2');
   assert.equal(await stored(),prior);
  });
  await check('四维图标入口保留原评估详情且查看不确认材料',async()=>{
   await load('PT04',1440);const prior=await stored();await openDetail('preparation');assert.equal(await page.locator('.dashboard-dimension-links a').count(),4);
   for(let index=0;index<4;index++){
    const href=await page.locator('.dashboard-dimension-links a').nth(index).getAttribute('href');
    const expected=new URL(href,base).pathname;
    await page.locator('.dashboard-dimension-links a').nth(index).click();await page.waitForURL(url=>url.pathname===expected);
    assert.equal(await stored(),prior);await page.goto(base+'/app',{waitUntil:'networkidle'});await openDetail('preparation');
   }
  });
  await check('当前任务、预算、材料、报告和简历原入口可达',async()=>{
   await load('PT04',1440);await page.locator('.workbench-focus .primary').click();await page.waitForURL(url=>url.pathname==='/work/task-demo');
   await page.goto(base+'/app',{waitUntil:'networkidle'});
   await navigate('.workbench-week-link','/plan',['tab','执行']);
   await openDetail('records');
   await navigate('[data-record="materials"] .workbench-panel-heading a','/assessment');
   await openDetail('records');
   await navigate('[data-record="reports"] .workbench-panel-heading a','/reports');
   await openDetail('records');
   await navigate('[data-record="resumes"] a','/reports',['tab','岗位简历']);
  });
  await check('未知预算不画meter，超额预算明确标识超出',async()=>{
   await load(unknown,1440);assert.equal(await page.locator('.budget-capacity').getAttribute('data-state'),'unknown');assert.equal(await page.locator('.budget-capacity [role="meter"]').count(),0);
   await load(over,1440);assert.equal(await page.locator('.budget-capacity').getAttribute('data-state'),'over');assert.match(await page.locator('.capacity-legend').innerText(),/超出/);
  });
  await check('空首页保留真实起点并排除状态虚构',async()=>{
   await load('PT01',390);await openDetail('actions');assert.equal(await page.locator('.dashboard-status-chart span[data-status]').count(),0);assert.equal(await page.locator('.dashboard-task-preview').count(),0);await closeDetail();
   assert.equal(await page.locator('.workbench-focus a[href*="assessment"]').count()>0,true);
   await openDetail('preparation');
   assert.equal(await page.locator('.dashboard-dimension-links a[data-recorded="true"]').count(),0);
  });
  await check('详情关闭恢复入口焦点且筛选只在详情内显示',async()=>{
   await load('PT04',390);assert.equal(await page.locator('.workbench-status').count(),0);await openDetail('actions');
   await page.locator('.dashboard-status-filters button[data-status="active"]').focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');
   await page.locator('.workspace-detail-drawer').waitFor({state:'detached'});
   assert.equal(await page.locator('[data-workspace-detail="actions"]').evaluate(el=>el===document.activeElement),true);
  });
  const summary={browser:browser.version(),layoutCases:results.length,layoutPass:results.filter(r=>r.status==='pass').length,behaviorChecks:checks.length,behaviorPass:checks.filter(c=>c.status==='pass').length,pageErrors:[...new Set(errors)],consoleWarnings:[...new Set(consoleWarnings)],layoutFailures:results.filter(r=>r.status==='fail').map(r=>({name:r.name,faults:r.faults,controlOverflow:r.controlOverflow,panelOverflow:r.panelOverflow})),behaviorFailures:checks.filter(c=>c.status==='fail'),limits:'Isolated local headless Microsoft Edge; synthetic fixtures and CSS zoom. No full-site, real-device, assistive-technology, production-service or final visual acceptance.'};
  await fs.writeFile(`${dir}/verification.json`,JSON.stringify({...summary,results,checks},null,2));
  console.log(JSON.stringify(summary,null,2));
  if(summary.layoutFailures.length||summary.behaviorFailures.length||errors.length)process.exitCode=1;
 }
}finally{
 await browser.close();
}
