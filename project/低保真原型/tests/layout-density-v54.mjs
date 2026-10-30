import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';
const before=process.argv.includes('--before'),root=`检查记录/板块空间重组_v54/${before?'调整前':'调整后'}`;
await fs.mkdir(root,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await b.newPage(),errors=[],results=[];
p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('career-prototype-operation-guide-v1','{"enabled":false,"seen":[],"active":null}');localStorage.setItem('career-prototype-guidance-v1','{"auto":false}');});
try{
 for(const width of [1440,1024,390])for(const scene of ['PT01','PT07'])for(const route of ['/plan','/reports']){
  await p.setViewportSize({width,height:900});await p.goto('http://127.0.0.1:5184');
  await p.evaluate(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s:scenarioState(scene)});
  await p.goto('http://127.0.0.1:5184'+route);await p.locator('main').waitFor();
  if(route==='/reports'&&width>720){
   const buttons=p.locator('.report-theme-navigation button');
   for(let i=0;i<await buttons.count();i++){await buttons.nth(i).click();assert.equal(await buttons.nth(i).getAttribute('aria-pressed'),'true');}
   await buttons.first().click();
  }else if(route==='/reports'){for(const value of ['choice','evidence','action','review','choice'])await p.getByRole('combobox',{name:'选择报告板块',exact:true}).selectOption(value);}
  const geometry=await p.evaluate(()=>{
   const rect=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right};};
   return {overflow:document.documentElement.scrollWidth>innerWidth+1,phase:rect('.phased-plan'),overview:rect('.plan-overview'),paper:rect('.archive-paper'),desk:rect('.archive-reading-desk'),catalog:rect('.report-center'),list:rect('.report-center>.workspace-section')};
  });
  if(!before){assert.equal(geometry.overflow,false);if(route==='/plan')assert.ok(Math.abs(geometry.phase.w-geometry.overview.w)<2,'阶段区应占满可用宽度');else{assert.ok(Math.abs(geometry.paper.w-geometry.desk.w)<2,'报告正文不留空侧栏');assert.ok(Math.abs(geometry.list.w-geometry.catalog.w)<2,'报告列表不留空侧栏');}}
  results.push({width,scene,route,...geometry});
  for(const [label,selector]of route==='/plan'?[['阶段','.phased-plan']]:[['阅读','.archive-reading-desk'],['保存列表','.report-center']]){await p.locator(selector).scrollIntoViewIfNeeded();await p.screenshot({path:`${root}/${width}-${scene}-${label}.png`});}
  if(!before&&route==='/reports'){
   await p.getByRole('button',{name:'展开全篇阅读',exact:true}).click();assert.equal(await p.locator('.report-topic-spread').count(),4);
   const drawer=p.locator('.archive-record-drawer');await drawer.locator('summary').first().click();assert.equal(await drawer.getAttribute('open'),'');
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile(root+'/布局与交互.json',JSON.stringify({results,errors},null,2));
 console.log(`${results.length} layout cases, theme navigation and reading controls passed`);
}finally{await b.close();}
