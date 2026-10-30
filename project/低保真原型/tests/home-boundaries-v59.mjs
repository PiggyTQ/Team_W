import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const before=process.argv.includes('--before'),root='检查记录/首页屏幕边界_v59/'+(before?'调整前':'调整后');await fs.mkdir(root,{recursive:true});const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage(),errors=[],results=[];p.on('pageerror',e=>errors.push(e.message));
try{for(const [width,height]of [[1920,1080],[1440,900],[1024,720],[390,844]]){
 await p.setViewportSize({width,height});await p.goto('http://127.0.0.1:5184');await p.waitForTimeout(900);await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 const first=await p.locator('.landing-intro').evaluate(e=>({bottom:e.getBoundingClientRect().bottom,top:e.getBoundingClientRect().top}));if(!before)assert.ok(first.bottom>=height-1,'首屏完整覆盖当前视口');await p.screenshot({path:root+`/${width}-首屏.png`});
 for(const selector of ['.outcomes-heading','#starting-points .section-heading','#how .section-heading','#directions .section-heading','.story-bridge']){
  const group=p.locator(selector).first();await group.scrollIntoViewIfNeeded();await p.waitForTimeout(850);
  const state=await group.evaluate(e=>({selector:e.className,clip:getComputedStyle(e).overflowY,text:[...e.querySelectorAll('[data-reveal-state]')].map(n=>({state:n.dataset.revealState,animations:n.getAnimations().filter(a=>a.playState==='running').length}))}));if(!before)assert.equal(state.clip,'clip');results.push({width,selector,...state});
 }
 await p.screenshot({path:root+`/${width}-后续板块.png`});
}assert.deepEqual(errors,[]);await fs.writeFile(root+'/验证.json',JSON.stringify({results,errors},null,2));console.log('PASS first-screen size and section clipping across 4 widths');}finally{await b.close();}
