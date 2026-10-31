import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';
const before=process.argv.includes('--before'),dir='检查记录/参考字号校准_20261023',base='http://127.0.0.1:5187';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:false,args:['--no-proxy-server']});
const context=await browser.newContext({deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
async function load(route,width=1440,height=900,lang='zh'){
 await page.setViewportSize({width,height});if(!page.url().startsWith(base))await page.goto(base+'/app');
 await page.evaluate(({KEY,state,guideKey,lang})=>{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem('career-prototype-language',lang);localStorage.setItem('career-prototype-sidebar-v1','expanded');localStorage.setItem(guideKey,JSON.stringify({enabled:false,neverPrompt:true,seen:[],active:null}));},{KEY,state:scenarioState('PT04'),guideKey:OPERATION_GUIDE_KEY,lang});
 await page.goto(base+route,{waitUntil:'networkidle'});await page.locator('#main').waitFor();
}
async function inspect(name,capture=true){
 const r=await page.evaluate(()=>{
  const m=document.querySelector('#main');
  const sample=s=>{const e=m.querySelector(s);if(!e)return null;const c=getComputedStyle(e);return {text:e.textContent.slice(0,45),size:c.fontSize,lineHeight:c.lineHeight};};
  // The current carousel tile intentionally scales past its transparent slide.
  // Its text descendants and the actual page remain subject to overflow checks.
  const overflow=[...m.querySelectorAll('*')].filter(e=>e.checkVisibility()&&!e.closest('svg,.sr-only,[aria-hidden=true]')&&e.getBoundingClientRect().width&&getComputedStyle(e).overflowX==='visible'&&e.scrollWidth>e.clientWidth+3&&!e.matches('.atlas-station,.career-slide')).slice(0,8).map(e=>({cls:typeof e.className==='string'?e.className:'',text:e.textContent.slice(0,40),px:e.scrollWidth-e.clientWidth}));
  const band=m.querySelector('.workbench-record-grid')?.getBoundingClientRect(),home=m.querySelector('.home-hub')?.getBoundingClientRect();
  return {url:location.pathname+location.search,width:innerWidth,height:innerHeight,mainOverflow:m.scrollWidth-m.clientWidth,documentOverflow:document.documentElement.scrollWidth-innerWidth,mainScrollHeight:m.scrollHeight,heading:sample('h1'),section:sample('h2'),body:sample('p'),control:sample('input,textarea,select'),metric:sample('.workbench-metric-value'),recordBandTop:band?.top,homeHeight:home?.height,overflow,zoom:getComputedStyle(document.documentElement).zoom};
 });results.push({name,...r});if(capture)await page.screenshot({path:`${dir}/${before?'before':'after'}-${name}.png`});
}
try{
 const routes=before?[['dashboard','/app'],['assistant','/assistant']]:[['dashboard','/app'],['assistant','/assistant'],['assessment','/assessment'],['careers','/careers'],['plan','/plan'],['learning','/learning'],['reports','/reports'],['resume','/reports?tab=岗位简历'],['settings','/settings'],['public','/']];
 for(const [name,route]of routes){await load(route);await inspect(name);}
 if(!before){
  for(const lang of ['zh','en'])for(const [w,h]of [[1366,768],[1280,650],[1024,768],[390,844],[320,720]])for(const [name,route]of [['dashboard','/app'],['assistant','/assistant']]){await load(route,w,h,lang);await inspect(`${name}-${w}-${lang}`,lang==='zh'&&[1366,390].includes(w));}
  await load('/app');assert.equal(await page.locator('h1').first().evaluate(e=>getComputedStyle(e).fontSize),'30px');assert.equal(await page.locator('.workbench-intro').evaluate(e=>getComputedStyle(e).fontSize),'14px');await page.locator('.sidebar-toggle').click();await inspect('dashboard-collapsed');assert.equal(await page.locator('.dashboard-dimension-links a').count(),4);
  await load('/assistant',390,844);assert.equal(await page.locator('#assistant-question').evaluate(e=>getComputedStyle(e).fontSize),'16px');await page.locator('.chat-send').scrollIntoViewIfNeeded();await page.locator('#assistant-question').fill('字号调整后的合成检查问题');await page.locator('.chat-send').click();await page.locator('.has-messages').waitFor();await inspect('assistant-mobile-message');
 }
 const problems=results.filter(r=>r.mainOverflow>3||r.documentOverflow>3||r.overflow.length);console.log(JSON.stringify({browser:browser.version(),cases:results.length,errors,problems,samples:results.filter(r=>['dashboard','assistant','public'].includes(r.name))},null,2));assert.deepEqual(errors,[]);assert.deepEqual(problems,[]);
}finally{await fs.writeFile(`${dir}/${before?'before':'after'}-results.json`,JSON.stringify({browser:browser.version(),results,errors},null,2));await browser.close();}
