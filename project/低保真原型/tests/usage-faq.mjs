import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='检查记录/FAQ圆角白底_20261023';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await b.newPage({reducedMotion:"reduce"}),results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
try{for(const lang of ['zh','en'])for(const width of [1440,390,320]){
 await p.setViewportSize({width,height:960});await p.goto('http://127.0.0.1:5186');await p.evaluate(l=>localStorage.setItem('career-prototype-language',l),lang);await p.reload();await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(200);
 const section=p.locator('#before-start');await section.scrollIntoViewIfNeeded();await p.waitForTimeout(200);
 await section.locator('summary').first().click();assert.equal(await section.locator('details[open]').count(),1);
 await section.locator('.start-list-toolbar button').click();assert.equal(await section.locator('details[open]').count(),4);
 const bad=await section.evaluate(e=>[...e.querySelectorAll('summary,p,h2')].filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));assert.deepEqual(bad,[]);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await section.locator('.start-list-toolbar button').click();assert.equal(await section.locator('details[open]').count(),0);
 if(width!==320)await section.screenshot({path:`${dir}/${lang}-${width}.png`});results.push({lang,width,overflow:false,individualAndAllToggle:true});
}assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors}));}finally{await fs.writeFile(dir+'/results.json',JSON.stringify({results,errors},null,2));await b.close();}

