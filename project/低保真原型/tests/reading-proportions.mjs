import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='检查记录/字号与画面比例_v2_20261023';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']}),results=[],errors=[];
try{for(const lang of ['zh','en'])for(const [width,height] of [[2560,1440],[1920,1080],[1440,960],[1024,768],[390,844],[320,740]]){
 const p=await b.newPage({viewport:{width,height}});p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5186');await p.evaluate(l=>localStorage.setItem('career-prototype-language',l),lang);await p.reload();await p.waitForTimeout(500);
 const geometry=await p.evaluate(()=>({main:document.querySelector('#main').clientWidth,hero:document.querySelector('.hero-import').offsetHeight,photo:document.querySelector('.hero-import-photo').offsetHeight,title:getComputedStyle(document.querySelector('.hero-import h1')).fontSize,cardTitle:getComputedStyle(document.querySelector('.problem-card-title')).fontSize,body:getComputedStyle(document.querySelector('.hero-import-description')).fontSize}));assert.equal(geometry.title,'40px');assert.equal(geometry.cardTitle,'24px');assert.equal(geometry.body,'18px');
 if([2560,1440,390].includes(width))await p.screenshot({path:`${dir}/${lang}-${width}-首屏.png`});
 for(const id of ['outcomes','starting-points']){await p.locator('#'+id).evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:'instant'}));await p.waitForTimeout(700);if([2560,1440,390].includes(width))await p.screenshot({path:`${dir}/${lang}-${width}-${id}.png`});}
 const cards=await p.locator('.problem-card-face').evaluateAll(es=>es.map(e=>({height:e.clientHeight,scroll:e.scrollHeight})));assert.ok(cards.every(c=>c.scroll<=c.height+2));
 await p.locator('.problem-card-face').first().click();assert.equal(await p.locator('.problem-card-face').first().getAttribute('aria-pressed'),'true');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 results.push({lang,width,height,...geometry,cards,selection:true});await p.close();
}assert.deepEqual(errors,[]);console.log(JSON.stringify({layouts:results.length,errors}));}finally{await fs.writeFile(dir+'/results.json',JSON.stringify({results,errors},null,2));await b.close();}
