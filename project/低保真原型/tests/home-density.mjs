import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const before=process.argv.includes('--before'),dir='检查记录/首页后半段密度_20261023';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']}),results=[],errors=[],checks=[];
try{
 for(const lang of before?['zh']:['zh','en'])for(const width of before?[1440]:[1920,1440,1024,768,390,320]){
  const p=await b.newPage({viewport:{width,height:width<500?844:1000}});p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5186');await p.evaluate(l=>localStorage.setItem('career-prototype-language',l),lang);await p.reload();await p.waitForTimeout(350);
  const heights=await p.evaluate(()=>Object.fromEntries(['#directions','#case-study','#before-start','.tail-closing'].map(s=>[s,document.querySelector(s).offsetHeight])));
  if(!before){
   const directory=p.locator('.direction-directory');assert.equal(await directory.locator('.direction-index button').count(),10);
   if(width>900){for(let i=0;i<10;i++){await directory.locator('.direction-index button').nth(i).click();assert.equal(await directory.locator('.direction-index button').nth(i).getAttribute('aria-pressed'),'true');assert.equal(await directory.locator('#direction-summary-title').textContent(),await directory.locator('.direction-index button').nth(i).locator('.direction-index-name').textContent());}}
   else{await directory.locator('select').selectOption('9');assert.equal(await directory.locator('select').inputValue(),'9');}
   const bad=await directory.evaluate(e=>[...e.querySelectorAll('*')].filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+2&&getComputedStyle(n).overflowX==='visible'&&[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())).map(n=>n.textContent));assert.deepEqual(bad,[]);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await directory.locator('figure').count(),0);
   if(width<=900)await directory.locator('select').selectOption('0');
   if(width>900)await directory.locator('.direction-index button').first().click();
  }
  if((lang==='zh'&&[1440,390].includes(width))||(lang==='en'&&width===1440))for(const selector of ['#directions','#case-study','#before-start','.tail-closing']){await p.locator(selector).evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:'instant'}));await p.waitForTimeout(250);await p.screenshot({path:`${dir}/${before?'before':'after'}-${lang}-${width}-${selector.replace(/[#.]/g,'')}.png`});}
  if(!before&&width===1440){
   const first=p.locator('.direction-index button').first();await first.focus();await p.keyboard.press('End');assert.equal(await p.locator('.direction-index button').last().getAttribute('aria-pressed'),'true');await p.keyboard.press('Home');assert.equal(await first.getAttribute('aria-pressed'),'true');await p.keyboard.press('ArrowDown');assert.equal(await p.locator('.direction-index button').nth(2).getAttribute('aria-pressed'),'true');await first.click();checks.push({lang,keyboardDirectory:true});
   await p.locator('#directions').evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY+50,behavior:'instant'}));await p.waitForTimeout(300);await p.mouse.move(1300,500);const start=await p.evaluate(()=>scrollY);await p.mouse.wheel(0,137);await p.waitForTimeout(700);const distance=await p.evaluate(()=>scrollY)-start;assert.ok(Math.abs(distance-137)<4,`natural wheel distance ${distance}`);checks.push({lang,naturalWheel:distance});
   await p.locator('.direction-preview').click();await p.locator('dialog[open]').waitFor();await p.keyboard.press('Escape');checks.push({lang,preview:true});
   await p.locator('.archive-switch nav button').nth(1).click();assert.equal(await p.locator('.archive-switch nav button').nth(1).getAttribute('aria-pressed'),'true');
   await p.locator('.archive-plan nav button').nth(1).click();assert.equal(await p.locator('.archive-plan nav button').nth(1).getAttribute('aria-pressed'),'true');
   const all=p.locator('.start-list-toolbar>button');await all.click();assert.equal(await p.locator('.start-answer[open]').count(),4);await all.click();assert.equal(await p.locator('.start-answer[open]').count(),0);checks.push({lang,exampleAndFAQ:true});
  }
  results.push({lang,width,heights});await p.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({results,checks,errors}));
}finally{await fs.writeFile(`${dir}/${before?'before':'after'}.json`,JSON.stringify({results,checks,errors},null,2));await b.close();}
