import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';

const phase=process.argv[2]||'after';
const dir=`检查记录/操作文案_20261022/${phase}`;
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({reducedMotion:'reduce'}),results=[],errors=[],guideChecks=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 for(const lang of phase==='before'?['zh']:['zh','en'])for(const width of [1440,390])for(const [name,route,scene,selector] of [
  ['复盘空态','/plan?tab=复盘','PT01','.action-review'],
  ['复盘填写','/plan?tab=复盘','PT05','.action-review'],
  ['经历录入','/assessment?tab=资料经历','PT01','.experience-writer']
 ]) {
  await page.setViewportSize({width,height:width===390?844:1000});
  await page.goto('http://127.0.0.1:5184/plan');
  await page.evaluate(({s,key,lang})=>{
   localStorage.setItem(key,JSON.stringify(s));
   localStorage.setItem('career-prototype-language',lang);
   localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));
  },{s:scenarioState(scene),key:KEY,lang});
  await page.goto('http://127.0.0.1:5184'+route);
  const area=page.locator(selector);
  await area.waitFor();
  await area.evaluate(e=>e.scrollIntoView({block:'start'}));
  await page.screenshot({path:`${dir}/${width}-${lang}-${name}.png`});
  const data=await page.evaluate(selector=>{
   const el=document.querySelector(selector);
   return {title:el.querySelector('h2')?.innerText,headings:[...el.querySelectorAll('h3')].map(e=>e.innerText),text:el.innerText,overflow:document.documentElement.scrollWidth>innerWidth+1};
  },selector);
  results.push({width,lang,name,...data});
 }
 if(phase!=='before')for(const lang of ['zh','en'])for(const [route,scene,flow,variant,stepId] of [
  ['/plan?tab=执行','PT05','plan','continue','plan.continue'],
  ['/plan?tab=复盘','PT05','review','','review.save'],
  ['/assessment?tab=资料经历','PT01','materials','','materials.save']
 ]){
  await page.goto('http://127.0.0.1:5184/plan');
  await page.evaluate(({s,key,lang})=>{localStorage.setItem(key,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);},{s:scenarioState(scene),key:KEY,lang});
  await page.goto('http://127.0.0.1:5184'+route);
  await page.locator('#main').waitFor();
  const target=await page.evaluate(async({flow,variant,stepId,key})=>{
   const {operationSteps}=await import('/src/operation-guide-model.js');
   const {findOperationTarget}=await import('/src/OperationGuide.jsx');
   const url=new URL(location.href),s=JSON.parse(localStorage.getItem(key));
   const spec=operationSteps(flow,{s,path:url.pathname,tab:url.searchParams.get('tab'),search:url.search},variant).find(step=>step.id===stepId);
   const element=findOperationTarget(spec);
   return {found:!!element,text:element?.textContent};
  },{flow,variant,stepId,key:KEY});
  guideChecks.push({lang,route,stepId,...target});
 }
}finally{await browser.close();}
await fs.writeFile(`${dir}/页面核对.json`,JSON.stringify({results,guideChecks,errors},null,2));
console.log(JSON.stringify({phase,screens:results.length,overflows:results.filter(r=>r.overflow).map(r=>({width:r.width,name:r.name,lang:r.lang})),guideChecks,errors},null,2));
if(errors.length||results.some(r=>r.overflow)||guideChecks.some(r=>!r.found))process.exitCode=1;
