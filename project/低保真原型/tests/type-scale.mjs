import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import fs from 'node:fs/promises';
const before=process.argv.includes('--before'),dir='检查记录/四档字体_20261023';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({reducedMotion:'reduce'}),results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const routes=['/','/app','/onboarding','/careers','/assessment','/career-map','/plan','/learning','/work/task-demo','/reports','/assistant','/settings','/resume'];
try{await page.goto('http://127.0.0.1:5187');await page.evaluate(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s:scenarioState('PT04')});
 for(const lang of before?['zh']:['zh','en'])for(const width of before?[1440]:[1920,1440,390,320]){
 await page.setViewportSize({width,height:960});await page.evaluate(l=>localStorage.setItem('career-prototype-language',l),lang);
 for(const route of routes){await page.goto('http://127.0.0.1:5187'+route);await page.waitForTimeout(100);
 const row=await page.evaluate(()=>{const nodes=[...document.querySelectorAll('#root *')].filter(e=>!e.closest('svg')&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.getClientRects().length);return {fonts:[...new Set(nodes.map(e=>getComputedStyle(e).fontSize))].sort((a,b)=>parseFloat(a)-parseFloat(b)),unexpected:nodes.filter(e=>![12,13,14,15,16,18,20,22,24,26,30,32,36].includes(parseFloat(getComputedStyle(e).fontSize))).slice(0,12).map(e=>({class:e.className,style:e.getAttribute('style'),tag:e.tagName,text:e.textContent.slice(0,50),font:getComputedStyle(e).fontSize})),overflow:document.documentElement.scrollWidth>innerWidth,bad:nodes.filter(e=>e.scrollWidth>e.clientWidth+3&&getComputedStyle(e).overflowX==='visible').slice(0,12).map(e=>({tag:e.tagName,class:e.className,parent:e.parentElement.className,text:e.textContent.slice(0,70),width:e.clientWidth,scroll:e.scrollWidth}))};});results.push({lang,width,route,...row});
 if(!before&&width!==320&&['/','/app','/careers','/reports'].includes(route)&&lang==='zh'){if(route==='/')await page.locator('#before-start').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${width}-${route.slice(1)||'首页'}.png`});}
 }}console.log(JSON.stringify({layouts:results.length,fonts:[...new Set(results.flatMap(r=>r.fonts))],overflow:results.filter(r=>r.overflow),bad:results.filter(r=>r.bad.length),errors}));
}finally{await fs.writeFile(`${dir}/${before?'diagnostic':'after'}.json`,JSON.stringify({results,errors},null,2));await browser.close();}



