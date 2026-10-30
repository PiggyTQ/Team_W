import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/圆润按钮与版心_v4',base='http://127.0.0.1:5186';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await b.newPage(),results=[],errors=[],checks=[];p.on('pageerror',e=>errors.push(e.message));
const check=async(name,f)=>{await f();checks.push({name,status:'pass'});};
try{
await p.goto(base);await p.evaluate(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s:scenarioState('PT04')});
for(const lang of ['zh','en'])for(const width of [1920,1440,1024,768,390,320]){
 await p.setViewportSize({width,height:width<500?844:1000});await p.evaluate(l=>localStorage.setItem('career-prototype-language',l),lang);await p.goto(base);await p.waitForTimeout(300);
 const geometry=await p.locator('#main').evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {width:r.width,left:r.left,right:innerWidth-r.right,background:s.backgroundColor};});
 const bad=await p.locator('.section-heading a,.spread-index button,.os-footer button,.archive-caption').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.className));
 results.push({lang,width,...geometry,bad,overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 if(lang==='zh'&&[1920,390].includes(width)){await p.screenshot({path:`${dir}/${width}-首页.png`});for(const id of ['outcomes','how']){await p.locator('#'+id).scrollIntoViewIfNeeded();await p.waitForTimeout(250);await p.screenshot({path:`${dir}/${width}-${id}.png`});}}
 for(const route of ['/app','/careers','/reports','/plan','/learning','/assistant']){await p.goto(base+route);results.push({lang,width,route,overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});}
}
await p.setViewportSize({width:1920,height:1000});await p.evaluate(()=>localStorage.setItem('career-prototype-language','zh'));await p.goto(base);
await check('大屏版心1280px居中，留白320px',async()=>{const r=await p.locator('#main').boundingBox();assert.equal(r.width,1280);assert.equal(r.x,320);});
await check('次要按钮无双线扩张阴影，主要按钮圆润微渐变',async()=>{assert.equal(await p.locator('.hero-import-actions a').evaluate(e=>/0px 0px 0px [34]px/.test(getComputedStyle(e).boxShadow)),false);assert.equal(await p.locator('.hero-import-actions .primary').evaluate(e=>getComputedStyle(e).borderRadius),'999px');assert.match(await p.locator('.hero-import-actions .primary').evaluate(e=>getComputedStyle(e).backgroundImage),/radial-gradient/);});
await p.goto(base+'/app');
const pause=p.locator('.operation-guide-progress>button');if(await pause.isVisible())await pause.click();const finish=p.getByRole('button',{name:'结束引导',exact:true});if(await finish.isVisible())await finish.click();
await check('侧栏选中浅蓝底，未选中保持中性',async()=>{assert.equal(await p.locator('#workspace-sidebar a[aria-current=page]').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(231, 239, 251)');assert.equal(await p.locator('#workspace-sidebar a[aria-current=page]').evaluate(e=>getComputedStyle(e).boxShadow),'none');});
await p.screenshot({path:`${dir}/1440-工作区导航.png`});
await p.goto(base+'/careers');await check('加入比较保留切换且不再双线',async()=>{const c=p.locator('.occupation-actions>button').first(),state=await c.getAttribute('aria-pressed');await c.click();assert.notEqual(await c.getAttribute('aria-pressed'),state);assert.equal(await c.evaluate(e=>getComputedStyle(e).boxShadow.includes('inset')),false);});
await p.emulateMedia({reducedMotion:'reduce'});await p.goto(base);await check('键盘焦点保留清晰轮廓',async()=>{await p.locator('.hero-import-actions a').focus();assert.equal(await p.locator('.hero-import-actions a').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');});
assert.deepEqual(errors,[]);assert.deepEqual(results.filter(r=>r.overflow||r.bad?.length),[]);
console.log(JSON.stringify({layouts:results.length,checks,errors,failures:results.filter(r=>r.overflow||r.bad?.length)}));
}finally{await fs.writeFile(`${dir}/results.json`,JSON.stringify({results,checks,errors},null,2));await b.close();}
