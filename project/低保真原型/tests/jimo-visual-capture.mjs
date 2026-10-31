import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const phase=process.argv[2]||'after';
const dir=`检查记录/Jimo视觉深化_20261023/${phase}`;
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage();const results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
for(const width of phase==='before'?[1440]:[1440,768,390]){
await page.setViewportSize({width,height:width===390?844:1000});
await page.goto('http://127.0.0.1:5186/');
await page.evaluate(({KEY,state})=>localStorage.setItem(KEY,JSON.stringify(state)),{KEY,state:scenarioState('PT04')});
for(const [name,route] of [['首页','/'],['工作区','/app'],['职业','/careers'],['评估','/assessment'],['计划','/plan'],['学习','/learning'],['报告','/reports'],['助手','/assistant'],['设置','/settings']]){
await page.goto('http://127.0.0.1:5186'+route);await page.waitForTimeout(650);
if(phase!=='before'&&await page.locator('.operation-guide-progress>button').isVisible())await page.locator('.operation-guide-progress>button').click();
await page.screenshot({path:`${dir}/${width}-${name}.png`});
results.push({width,name,...await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,heading:document.querySelector('h1')?.textContent,buttons:document.querySelectorAll('button').length}))});
if(name==='首页'&&width===1440){
console.log('HOME',await page.locator('main>*,.publicmain>*>*').evaluateAll(es=>es.slice(0,35).map(e=>e.className)));
for(const id of ['outcomes','directions','case-study']){await page.locator('#'+id).scrollIntoViewIfNeeded();await page.waitForTimeout(350);await page.screenshot({path:`${dir}/${width}-${id}.png`});}
}
if(name==='工作区'&&width===1440)console.log('WORKSPACE',await page.locator('.page-surface,.home-hub,#workspace-sidebar').evaluateAll(es=>es.map(e=>({class:e.className,children:[...e.children].map(c=>c.className)}))));
}
}
}finally{await fs.writeFile(`${dir}/results.json`,JSON.stringify({results,errors},null,2));await browser.close();}
console.log(JSON.stringify({results,errors}));
if(errors.length||results.some(r=>r.overflow))process.exitCode=1;

