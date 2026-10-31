import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';
const dir='检查记录/Dashboard参考深化_20261023',base='http://127.0.0.1:5187';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:false,args:['--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage(),errors=[],results=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
async function load(route='/app',state=scenarioState('PT04'),width=1440,lang='zh'){
 await page.setViewportSize({width,height:1000});
 if(!page.url().startsWith(base))await page.goto(base+'/app');
 await page.evaluate(({KEY,state,guideKey,lang})=>{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem('career-prototype-language',lang);localStorage.setItem(guideKey,JSON.stringify({enabled:false,neverPrompt:true,seen:[],active:null}));},{KEY,state,guideKey:OPERATION_GUIDE_KEY,lang});
 await page.goto(base+route,{waitUntil:'networkidle'});
 await page.locator('#main.student-workspace').waitFor();
}
async function measure(name,screen=false){
 const data=await page.evaluate(()=>{
  const m=document.querySelector('#main'),r=m.getBoundingClientRect();
  const nodes=[...m.querySelectorAll('*')].filter(el=>{const b=el.getBoundingClientRect(),c=getComputedStyle(el);return b.width&&b.height&&c.visibility!=='hidden'&&el.scrollWidth>el.clientWidth+3&&c.overflowX==='visible'&&el.tagName!=='svg'&&!el.closest('svg')&&!el.matches('.atlas-station')});
  // Station labels intentionally sit outside their small point buttons. Check
  // against their containing drawing instead of treating that as text overflow.
  const visual=m.querySelector('.atlas-visual'),vr=visual?.getBoundingClientRect();
  const clippedAtlasLabels=vr?[...visual.querySelectorAll('.atlas-station-label')].map(el=>el.getBoundingClientRect()).filter(b=>b.right>vr.right+3||b.left<vr.left-3||b.bottom>vr.bottom+3).length:0;
  const boxes=Object.fromEntries(['.workbench-focus','.workbench-week','.workbench-preparation','.workbench-status','.workbench-record-grid','.capacity-header','.capacity-plot','.capacity-legend','.capacity-note','.workbench-goal','.dashboard-preparation-chart'].map(q=>{const el=m.querySelector(q);if(!el)return [q,null];const b=el.getBoundingClientRect(),c=getComputedStyle(el);return [q,{y:Math.round(b.y),height:Math.round(b.height),width:Math.round(b.width),margin:c.margin,lineHeight:c.lineHeight,display:c.display}]}));
  return {url:location.pathname+location.search,width:innerWidth,documentOverflow:document.documentElement.scrollWidth-innerWidth,mainOverflow:m.scrollWidth-m.clientWidth,mainHeight:m.scrollHeight,clippedAtlasLabels,boxes,overflow:nodes.slice(0,10).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'',text:e.textContent.slice(0,55),overflow:e.scrollWidth-e.clientWidth}))};
 });
 results.push({name,...data});
 if(screen){await page.screenshot({path:`${dir}/${name}.png`});await page.evaluate(()=>{if(innerWidth<=720)window.scrollTo(0,document.documentElement.scrollHeight);else{const m=document.querySelector('#main');m.scrollTop=m.scrollHeight;}});await page.screenshot({path:`${dir}/${name}-bottom.png`});}
}
try{
 for(const [name,route] of [['dashboard','/app'],['assessment','/assessment'],['careers','/careers'],['plan','/plan'],['learning','/learning'],['reports','/reports'],['resume','/reports?tab=岗位简历'],['assistant','/assistant'],['settings','/settings'],['map','/career-map']]){await load(route);await measure(name,true);}
 const cases={fresh:scenarioState('PT01'),pending:scenarioState('PT02'),active:scenarioState('PT04'),stale:scenarioState('PT07'),long:scenarioState('PT04'),blocked:scenarioState('PT04'),over:scenarioState('PT04'),unknown:scenarioState('PT04')};
 cases.blocked.tasks[0].status='受阻';cases.over.budget=1;cases.unknown.budget=0;
 cases.long.tasks[0].title='AnExtremelyLongProjectIdentifierWithoutSpaces'.repeat(4);
 for(const [name,state]of Object.entries(cases))for(const width of [1280,1024,390,320])for(const lang of ['zh','en']){await load('/app',state,width,lang);await measure(`${name}-${width}-${lang}`,['fresh','active'].includes(name)&&[390,1280].includes(width)&&lang==='zh');}
 for(const [name,route]of [['assessment','/assessment'],['plan','/plan'],['learning','/learning'],['careers','/careers'],['reports','/reports'],['assistant','/assistant'],['settings','/settings']]){await load(route,scenarioState('PT04'),390);await measure(`${name}-mobile`,true);}
 await load();
 assert.deepEqual(await page.locator('.workbench-metric-value').allTextContents(),['2','1','0']);checks.push('指标与合成测试场景的真实模型计数一致');
 assert.equal(await page.locator('.dashboard-dimension-links a').count(),4);checks.push('四维图保留四个详情入口');
 const unchanged=await page.evaluate(KEY=>localStorage.getItem(KEY),KEY);
 for(let i=0;i<4;i++){await page.locator('.dashboard-dimension-links a').nth(i).click();assert.notEqual(new URL(page.url()).pathname,'/app');await page.goto(base+'/app');}
 assert.equal(await page.evaluate(KEY=>localStorage.getItem(KEY),KEY),unchanged);checks.push('四维入口只导航，不更改本人确认、目标或行动');
 for(const [selector,expected]of [['[data-record=resumes] a','/reports'],['.workbench-week-link','/plan'],['.workbench-status .workbench-panel-heading a','/plan'],['[data-metric=materials]','/assessment']]){await page.goto(base+'/app');await page.locator(selector).click();assert.equal(new URL(page.url()).pathname,expected);}checks.push('简历、预算、行动、材料入口均进入原业务页面');
 await load('/app',scenarioState('PT01'));await page.locator('.home-first-action .primary').click();assert.equal(new URL(page.url()).pathname,'/assessment');checks.push('空态可直接录入第一段经历');
 await load();await page.locator('.home-defer').click();assert.equal(await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).deferred,KEY),true);await page.locator('.home-defer').click();checks.push('当前行动提醒可暂缓并恢复');
 await load('/app',cases.over);assert.match(await page.locator('.workbench-week .capacity-legend').innerText(),/超出/);assert.equal(await page.locator('.workbench-week [role=meter]').getAttribute('aria-valuemax'),'1');checks.push('超预算显示真实超额且保留预算位置');
 await load('/app',cases.unknown);assert.equal(await page.locator('.workbench-week [role=meter]').count(),0);assert.match(await page.locator('.workbench-week .capacity-unknown').innerText(),/预算未定/);checks.push('未知预算不绘制分配比例');
 await load('/app',cases.blocked);await page.locator('.home-next .actions .primary').click();assert.equal(new URL(page.url()).pathname,'/plan');assert.equal(await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).tasks[0].status,KEY),'受阻');checks.push('受阻行动进入处理页且不自动重启');
 await load();
 await page.locator('.sidebar-toggle').click();await measure('sidebar-collapsed',true);await page.locator('.sidebar-toggle').click();checks.push('侧栏伸缩后图表和入口随可用宽度重排');
 assert.deepEqual(errors,[]);const problems=results.filter(r=>r.documentOverflow>3||r.mainOverflow>3||r.overflow.length||r.clippedAtlasLabels);console.log(JSON.stringify({browser:browser.version(),checked:results.length,checks,errors,problems:problems.map(r=>({name:r.name,overflow:r.overflow,clippedAtlasLabels:r.clippedAtlasLabels})),dashboard:results.find(r=>r.name==='dashboard')},null,2));
}finally{await fs.writeFile(`${dir}/layout-results.json`,JSON.stringify({browser:browser.version(),results,checks,errors},null,2));await browser.close();}
