import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/板块衔接_20261022';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await browser.newPage(),results=[],errors=[];p.setDefaultTimeout(10000);p.setDefaultNavigationTimeout(30000);p.on('pageerror',e=>errors.push(e.message));
async function load(route,s,width,lang='zh'){await p.setViewportSize({width,height:width===390?844:1000});await p.goto('http://127.0.0.1:5184/plan',{waitUntil:'domcontentloaded'});await p.evaluate(({s,k,lang})=>{localStorage.setItem(k,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));},{s:scenarioState(s),k:KEY,lang});await p.goto('http://127.0.0.1:5184'+route,{waitUntil:'domcontentloaded'});await p.locator('.action-cycle').waitFor();await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});}
async function shot(name){await p.locator('.action-cycle').evaluate(e=>e.scrollIntoView({block:'start'}));await p.screenshot({path:dir+'/'+name+'-视口.png'});const v=p.viewportSize(),box=await p.locator('.action-cycle').boundingBox();await p.setViewportSize({width:v.width,height:Math.ceil(box.height+650)});const style=await p.addStyleTag({content:'.flow-progress{visibility:hidden!important}'});await p.locator('.action-cycle').screenshot({path:dir+'/'+name+'-板块.png'});await style.evaluate(e=>e.remove());await p.setViewportSize(v);}
async function joined(selector,width){const boxes=await p.locator(selector).evaluate(el=>[...el.children].slice(0,2).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,bottom:r.bottom,right:r.right};}));if(width>900&&selector!=='.action-focus-layout'&&!(await p.locator('.review-receipt-layout').count())){assert.ok(Math.abs(boxes[0].y-boxes[1].y)<=1);assert.ok(Math.abs(boxes[0].bottom-boxes[1].bottom)<=1,JSON.stringify(boxes));assert.ok(Math.abs(boxes[0].right-boxes[1].x)<=1,JSON.stringify(boxes));}else assert.ok(Math.abs(boxes[0].bottom-boxes[1].y)<=1,JSON.stringify(boxes));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);return boxes;}
try{
for(const [name,route,s,width,lang,selector]of [
 ['1440-复盘空态','/plan?tab=复盘','PT01',1440,'zh','.review-empty-layout'],
 ['1024-复盘空态','/plan?tab=复盘','PT01',1024,'zh','.review-empty-layout'],
 ['390-复盘空态','/plan?tab=复盘','PT01',390,'zh','.review-empty-layout'],
 ['1440-复盘英文','/plan?tab=复盘','PT01',1440,'en','.review-empty-layout'],
 ['390-复盘英文','/plan?tab=复盘','PT01',390,'en','.review-empty-layout'],
 ['1440-复盘写作','/plan?tab=复盘','PT05',1440,'zh','.review-writing-layout'],
 ['390-复盘写作','/plan?tab=复盘','PT05',390,'zh','.review-writing-layout'],
 ['1440-执行起点','/plan?tab=执行','PT01',1440,'zh','.action-starter-layout'],
 ['390-执行起点','/plan?tab=执行','PT01',390,'zh','.action-starter-layout'],
 ['1440-执行队列','/plan?tab=执行','PT05',1440,'zh','.action-focus-layout']
 ]){await load(route,s,width,lang);const boxes=await joined(selector,width);await shot(name);results.push({name,status:'pass',boxes});}
await load('/plan?tab=复盘','PT05',1440);await p.locator('.review-step-tabs button').nth(1).click();await joined('.review-writing-layout',1440);await shot('1440-复盘原因');await p.getByLabel('不足与困难原因',{exact:true}).fill('字段口径不清楚（合成）');await p.locator('.review-step-tabs button').nth(2).click();await p.getByLabel('下一调整',{exact:true}).fill('先核对输入（合成）');await p.locator('.review-step-tabs button').first().click();await p.getByLabel('实际结果与贡献',{exact:true}).fill('整理出问题清单（合成）');await p.getByRole('button',{name:'保存本人复盘',exact:true}).click();await joined('.review-writing-layout',1440);await shot('1440-复盘回执');results.push({name:'写作分步与保存回执保持共同边界，原保存可用',status:'pass'});
assert.deepEqual(errors,[]);
}finally{await fs.writeFile(dir+'/版式验证.json',JSON.stringify({results,errors},null,2));await browser.close();}
console.log(JSON.stringify({count:results.length,errors}));
