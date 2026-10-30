import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';
const base='http://127.0.0.1:5186',dir='检查记录/Jimo深度改版_v2',phase=process.argv[2]||'first';
await fs.mkdir(`${dir}/${phase}`,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage(),errors=[],results=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const shot=async(name)=>page.screenshot({path:`${dir}/${phase}/${name}.png`});
const dismiss=async()=>{const finish=page.getByRole('button',{name:'结束引导',exact:true});if(await finish.isVisible())await finish.click();const pause=page.locator('.operation-guide-progress>button');if(await pause.isVisible())await pause.click();if(await finish.isVisible())await finish.click();};
try{
if(phase==='first'){
try{await page.setViewportSize({width:1440,height:1000});await page.goto('https://jimo.ai/',{waitUntil:'domcontentloaded',timeout:20000});await page.waitForTimeout(1800);await shot('reference-jimo');console.log('Reference captured');}catch(e){console.log('Reference unavailable:',e.message.split('\n')[0]);}
}
await page.goto(base);await page.evaluate(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s:scenarioState('PT04')});
for(const width of [1440,1280,768,390]){
await page.setViewportSize({width,height:width===1280?720:width===390?844:1000});
for(const [name,route]of [['首页','/'],['工作区','/app'],['职业','/careers'],['评估','/assessment'],['计划','/plan'],['学习','/learning'],['报告','/reports'],['助手','/assistant'],['设置','/settings'],['地图','/career-map']]){
 await page.goto(base+route);await page.waitForTimeout(400);await dismiss();
 results.push({width,name,...await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,title:document.querySelector('h1')?.innerText}))});
 if(width===1440||width===390)await shot(`${width}-${name}`);
 if(name==='首页'&&[1440,390].includes(width)){
  await page.locator('#career-product-preview').scrollIntoViewIfNeeded();await shot(`${width}-product`);
  if(width===1440){for(let i=1;i<4;i++){await page.locator('#preview-tab-'+i).click();await page.waitForTimeout(350);await shot(`${width}-product-${i}`);}}
  for(const id of ['outcomes','directions','case-study']){await page.locator('#'+id).scrollIntoViewIfNeeded();await page.waitForTimeout(250);await shot(`${width}-${id}`);}
  await page.locator('.studio-closing').scrollIntoViewIfNeeded();await shot(`${width}-ticket`);
 }
}
}
await page.setViewportSize({width:1440,height:1000});await page.goto(base);
const storage=await page.evaluate(KEY=>localStorage.getItem(KEY),KEY);
const check=async(name,fn)=>{await fn();checks.push({name,status:'pass'});};
await check('四种能力切换具体产物，预览不修改本人状态',async()=>{
 const expected=['看看工作','你的贡献','从一个问题','每次探索'];
 for(let i=0;i<4;i++){await page.locator('#preview-tab-'+i).click();assert.match(await page.locator('#career-preview-panel h2').innerText(),new RegExp(expected[i]));}
 assert.equal(await page.evaluate(KEY=>localStorage.getItem(KEY),KEY),storage);
});
await check('预览键盘左右和首尾切换且焦点跟随',async()=>{
 await page.locator('#preview-tab-0').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#preview-tab-1').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#preview-tab-1').evaluate(e=>e===document.activeElement),true);
 await page.keyboard.press('End');assert.equal(await page.locator('#preview-tab-3').getAttribute('aria-selected'),'true');
});
await check('示例职业切换同时更新工作与产物',async()=>{
 await page.locator('#preview-tab-0').click();await page.getByRole('button',{name:'人工智能',exact:true}).click();assert.match(await page.locator('.preview-career-sheet').innerText(),/调用与评估记录/);
});
await check('预览完整示例与票券开始入口有效',async()=>{
 await page.locator('.preview-bottom button').click();await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');
 await page.locator('.closing-ticket-action button').click();assert.match(page.url(),/careers/);
});
await page.goto(base+'/app');await dismiss();
await check('工作区主任务与记录预览使用同一任务',async()=>{
 assert.match(await page.locator('.current-record-sheet').innerText(),/数据质量小项目/);
 await page.locator('.home-current .primary').click();assert.match(page.url(),/work\/task-demo/);
});
await page.goto(base);await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
await check('减少动态效果下产品预览与书册静止',async()=>{
 await page.locator('#preview-tab-2').click();assert.equal(await page.locator('.preview-state').evaluate(e=>getComputedStyle(e).animationName),'none');assert.equal(await page.locator('.career-book').first().evaluate(e=>getComputedStyle(e).transform),'none');
});
await page.evaluate(()=>localStorage.setItem('career-prototype-language','en'));await page.reload();await page.locator('#career-product-preview').scrollIntoViewIfNeeded();await shot('1440-English-product');
await check('新增产品预览支持英文，四态不残留中文',async()=>{
 for(let i=0;i<4;i++){await page.locator('#preview-tab-'+i).click();assert.equal(/[\u4e00-\u9fff]/.test(await page.locator('.career-preview').innerText()),false);}
});
await check('320px英文主要入口无横向溢出',async()=>{
await page.setViewportSize({width:320,height:844});for(const route of ['/','/app','/plan']){await page.goto(base+route);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
});
console.log(JSON.stringify({checks,overflows:results.filter(r=>r.overflow),errors}));
}finally{await fs.writeFile(`${dir}/${phase}/results.json`,JSON.stringify({results,checks,errors},null,2));await browser.close();}
if(errors.length||results.some(r=>r.overflow))process.exitCode=1;
