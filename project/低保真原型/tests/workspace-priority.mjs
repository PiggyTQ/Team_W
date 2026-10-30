import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY,tourSnapshot} from '../src/operation-guide-model.js';

const dir='检查记录/工作区行动优先_20261023';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({reducedMotion:'reduce'}),errors=[],layouts=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const seed=(name,edit)=>{const s=scenarioState(name);edit?.(s);return s;};
const cases={fresh:seed('PT01'),pending:seed('PT02'),active:seed('PT04'),stale:seed('PT07'),blocked:seed('PT04',s=>s.tasks[0].status='受阻'),goal:seed('PT04',s=>s.tasks=[]),confirmed:seed('PT02',s=>s.claims[0].status='已确认'),long:seed('PT04',s=>{s.tasks[0].title='InvestigateAnExtremelyLongUnbrokenCareerProjectIdentifierWithoutSpaces'.repeat(3);s.claims[0].title='Review the original contribution and limitations of a cross-functional data preparation and quality research project';})};
async function load(state=cases.fresh,width=1440,lang='zh',guide=null){
 await page.setViewportSize({width,height:1000});
 if(!page.url().startsWith('http://127.0.0.1:5186'))await page.goto('http://127.0.0.1:5186/app',{waitUntil:'domcontentloaded'});
 await page.evaluate(({KEY,state,lang,guide,guideKey})=>{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem('career-prototype-language',lang);localStorage.setItem(guideKey,JSON.stringify(guide||{active:null,seen:[],enabled:false,neverPrompt:true}));},{KEY,state,lang,guide,guideKey:OPERATION_GUIDE_KEY});
 await page.goto('http://127.0.0.1:5186/app',{waitUntil:'domcontentloaded'});await page.locator('.home-work-overview').waitFor();await page.waitForTimeout(80);
}
const stored=()=>page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
const primary=()=>page.locator('.home-next .actions .primary');
async function check(name,fn){await fn();checks.push(name);}
try{
 for(const lang of ['zh','en'])for(const width of [1920,1440,1024,768,390,320])for(const [state,s]of Object.entries(cases)){
  await load(s,width,lang);
  const measured=await page.locator('.home-hub').evaluate(root=>{const nodes=[...root.querySelectorAll('*')].filter(e=>!e.closest('svg')&&e.getClientRects().length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));return {horizontal:document.documentElement.scrollWidth>innerWidth,fonts:[...new Set(nodes.map(e=>getComputedStyle(e).fontSize))],bad:nodes.filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth+3&&getComputedStyle(e).overflowX==='visible').map(e=>({class:e.className,text:e.textContent.slice(0,70),width:e.clientWidth,scroll:e.scrollWidth})),focusHeight:root.querySelector('.home-next').clientHeight,focusTop:root.querySelector('.home-next').getBoundingClientRect().top,recordsTop:root.querySelector('.home-work-overview').getBoundingClientRect().top};});
  layouts.push({state,width,lang,...measured});
  assert.equal(measured.horizontal,false,JSON.stringify(layouts.at(-1)));assert.deepEqual(measured.bad,[],JSON.stringify(layouts.at(-1)));assert.ok(measured.fonts.every(n=>['18px','24px','32px','40px'].includes(n)));
  assert.equal(await page.locator('.home-compare-options').count(),0);
  if(['fresh','active','pending'].includes(state)&&[1440,390].includes(width))await page.screenshot({path:`${dir}/${lang}-${width}-${state}.png`});
 }
 await check('Browsing the redesigned homepage preserves business records and compare choices',async()=>{
  const s=seed('PT01',s=>s.compare=['data','ai']);await load(s);const after=await stored();for(const k of ['claims','tasks','goal','compare','reports'])assert.deepEqual(after[k],s[k]);
  await page.locator('.home-explore-shortcut a').click();assert.equal(new URL(page.url()).pathname,'/careers');assert.equal(new URL(page.url()).searchParams.get('tab'),'比较');assert.deepEqual((await stored()).compare,['data','ai']);
 });
 await check('First experience enters the existing writer, without creating or confirming a material',async()=>{await load();await primary().click();assert.equal(new URL(page.url()).pathname,'/assessment');assert.equal(new URL(page.url()).searchParams.get('tab'),'资料经历');assert.equal((await stored()).claims.length,0);});
 await check('Preview practice enters the catalogue without creating a task',async()=>{await load();await page.locator('.home-first-action .actions a').nth(1).click();assert.equal(new URL(page.url()).pathname,'/learning');assert.equal((await stored()).tasks.length,0);});
 await check('Pending materials take priority and route to source confirmation',async()=>{await load(cases.pending);assert.match(await page.locator('#home-next-title').innerText(),/材料待确认/);await primary().click();assert.equal(new URL(page.url()).searchParams.get('tab'),'原文确认');assert.equal((await stored()).claims[0].status,'待确认');});
 await check('Changed evidence takes priority over an existing active task and saved report',async()=>{await load(cases.stale);assert.match(await page.locator('#home-next-title').innerText(),/依据已变化/);assert.match(await page.locator('[data-record=reports]').innerText(),/合成旧快照/);await primary().click();assert.equal(new URL(page.url()).searchParams.get('tab'),'四维与差距');assert.equal((await stored()).analysisStale,true);});
 await check('Active task continues the same task and keeps its estimated effort',async()=>{await load(cases.active);await primary().click();await page.waitForTimeout(100);assert.equal(new URL(page.url()).pathname,'/work/task-demo');assert.deepEqual((await stored()).tasks.map(t=>t.id),['task-demo']);assert.equal((await stored()).tasks[0].hours,2);});
 await check('Blocked task opens its recovery context without silently restarting or completing it',async()=>{await load(cases.blocked);assert.match(await primary().innerText(),/记录并处理阻塞/);await primary().click();assert.equal(new URL(page.url()).pathname,'/plan');assert.equal(new URL(page.url()).searchParams.get('task'),'task-demo');assert.equal((await stored()).tasks[0].completed,false);assert.equal((await stored()).tasks[0].status,'受阻');});
 await check('Reminder deferral preserves the task and can be reversed',async()=>{await load(cases.active);await page.locator('.home-defer').click();assert.equal((await stored()).deferred,true);assert.equal((await stored()).tasks.length,1);await page.locator('.home-defer').click();assert.equal((await stored()).deferred,false);});
 await check('Existing reading and report entries retain their real destinations',async()=>{
  const s=seed('PT07',s=>s.reading={quality:{chapter:1}});await load(s);await page.locator('.home-reading-resume button').click();assert.equal(await page.locator('dialog[open]').count(),1);await page.keyboard.press('Escape');await page.locator('[data-record=reports] a').click();assert.equal(new URL(page.url()).pathname,'/reports/report-demo');
 });
 await check('Catalogue groups and map links remain operable',async()=>{await load();await page.getByRole('button',{name:'求职准备',exact:true}).click();assert.equal(await page.locator('#home-catalogue-items .home-entry').count(),4);await page.getByRole('button',{name:'工具与账户',exact:true}).click();assert.equal(await page.locator('#home-catalogue-items .home-entry').count(),5);await page.getByRole('link',{name:'技能工具',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/career-map');});
 await check('Legacy comparison-guide checkpoint resumes on the current primary action, with English copy',async()=>{await load(cases.fresh,390,'en',{active:{flow:'home',index:1,baseline:tourSnapshot(cases.fresh)},seen:[],enabled:true});await page.locator('[data-operation-guide-target="home.start"]').waitFor();const guide=page.locator('.operation-guide');assert.ok(!/[\u3400-\u9fff]/.test(await guide.innerText()));await primary().click();await page.locator('[data-operation-guide-target="materials.save"]').waitFor();assert.equal((await stored()).claims.length,0);});
 await check('Secondary practice preview hands off the guide to the actual learning page',async()=>{await load(cases.fresh,1440,'zh',{active:null,seen:[],enabled:true});await page.locator('[data-operation-guide-target="home.start"]').waitFor();await page.locator('.home-first-action .actions a').nth(1).click();await page.locator('[data-operation-guide-target="learning.preview"]').waitFor();assert.equal((await stored()).tasks.length,0);});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({layouts:layouts.length,checks,errors}));
}finally{await fs.writeFile(`${dir}/results.json`,JSON.stringify({layouts,checks,errors},null,2));await browser.close();}
