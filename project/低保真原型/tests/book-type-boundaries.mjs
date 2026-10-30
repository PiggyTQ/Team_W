import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='检查记录/英文书封与标题层级_20261023';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']}),results=[];
try{for(const motion of ['reduce','no-preference']){const p=await b.newPage({reducedMotion:motion});await p.goto('http://127.0.0.1:5186');await p.evaluate(()=>localStorage.setItem('career-prototype-language','en'));
for(const width of [1440,1024,768,390,320]){await p.setViewportSize({width,height:960});await p.reload();await p.waitForTimeout(400);
 const books=await p.locator('.career-book-cover').evaluateAll(es=>es.map(e=>({height:e.clientHeight,scroll:e.scrollHeight,bad:[...e.children].filter(n=>n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2).map(n=>n.textContent)})));assert.ok(books.every(e=>e.scroll<=e.height+2&&!e.bad.length));
 const hierarchy=await p.locator('.tail-closing').evaluate(e=>{const h=getComputedStyle(e.querySelector('h2')),p=getComputedStyle(e.querySelector('p'));return {heading:h.fontSize,weight:h.fontWeight,body:p.fontSize};});assert.equal(hierarchy.heading,'40px');assert.equal(hierarchy.weight,'650');assert.equal(hierarchy.body,'18px');
 const section=p.locator('#directions');await section.scrollIntoViewIfNeeded();await p.waitForTimeout(400);
 const overlap=await p.locator('.direction-gallery-card[data-loop-copy="0"]').evaluateAll(es=>es.some(e=>e.querySelector('.career-book-shelf').getBoundingClientRect().bottom>e.querySelector('.direction-card-content').getBoundingClientRect().top+1));assert.equal(overlap,false);
 if([1440,390].includes(width)){await section.screenshot({path:`${dir}/${motion}-${width}-方向.png`});await p.locator('.tail-closing').scrollIntoViewIfNeeded();await p.waitForTimeout(400);await p.locator('.tail-closing').screenshot({path:`${dir}/${motion}-${width}-收尾.png`});}
 results.push({motion,width,books:books.length,overlap,hierarchy});
}await p.close();}console.log(JSON.stringify(results));}finally{await fs.writeFile(dir+'/results.json',JSON.stringify(results,null,2));await b.close();}

