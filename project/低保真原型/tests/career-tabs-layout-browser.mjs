import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';
import {fresh,KEY} from '../src/model.js';

// All state belongs to this disposable browser context. No account or external model is used.
const tag='career-tabs-alignment-20261126';
const images=`docs/releases/images/${tag}/actual`,checks=`checks/${tag}`;
await Promise.all([fs.mkdir(images,{recursive:true}),fs.mkdir(checks,{recursive:true})]);
const vite=await createServer({mode:'development',logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});
await vite.listen();
const base='http://127.0.0.1:'+vite.httpServer.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'}),page=await context.newPage();
const report={localOnly:true,syntheticOnly:true,mobileChecked:false,passed:false,errors:[],checks:[],layouts:[],screenshots:[]};
page.on('pageerror',error=>report.errors.push(error.message));
page.setDefaultTimeout(15000);
await context.addInitScript(({key,initial})=>{
 if(window.top!==window)return;
 if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(initial));
 localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true}));
 const animate=Element.prototype.animate;
 window.__careerAnimations=[];
 Element.prototype.animate=function(...args){const animation=animate.apply(this,args);window.__careerAnimations.push({animation,target:this});return animation;};
},{key:KEY,initial:{...fresh(),logged:true,onboard:true,goal:'data',budget:8}});
const ids=['overview','work','preparation','growth','practice','sources'];
const active=async id=>{
 await page.locator(`#career-reading-tab-${id}[aria-selected="true"]`).waitFor();
 await page.locator(`#career-panel-${id}`).waitFor({state:'visible'});
 assert.equal(await page.locator('.career-reading-panel:visible').count(),1);
 for(const other of ids.filter(value=>value!==id))assert.equal(await page.locator(`#career-panel-${other}`).isVisible(),false);
};
const settle=async()=>{
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{})));});
 await page.waitForTimeout(100);
};
const shot=async name=>{await settle();await page.screenshot({path:`${images}/${name}.png`});report.screenshots.push(`${images}/${name}.png`);};
const fit=async()=>{
 const dimensions=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth,main:document.getElementById('main')?.scrollWidth,mainWidth:document.getElementById('main')?.clientWidth}));
 assert.ok(dimensions.page<=dimensions.viewport+1,JSON.stringify(dimensions));
 assert.ok(dimensions.main<=dimensions.mainWidth+1,JSON.stringify(dimensions));
};
const navigate=async path=>{await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.career-workspace').waitFor({timeout:60000});await settle();};
const choose=async id=>{await page.locator(`#career-reading-tab-${id}`).click();await active(id);};
const switchLanguage=async language=>{
 if((await page.locator('html').getAttribute('lang'))?.startsWith(language))return;
 await page.getByRole('button',{name:language==='en'?'Use English':'使用中文',exact:true}).first().click();
 await page.waitForFunction(value=>document.documentElement.lang.startsWith(value),language);
};
try{
 const modes=[['list','/careers'],['compare','/careers?tab='+encodeURIComponent('比较')+'&set=data,ai'],['jobs','/careers?tab='+encodeURIComponent('企业与岗位')],['opportunities','/careers?tab='+encodeURIComponent('我的机会')]];
 for(const width of [1366,1616,2560]){
  await page.setViewportSize({width,height:width===1366?900:1000});
  for(const language of ['zh','en']){
   let firstRight;
   for(const [mode,path] of modes){
    await navigate(path);await switchLanguage(language);await settle();await fit();
    const geometry=await page.evaluate(()=>{
     const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
     return{workspace:rect('.career-workspace'),surface:rect('.page-surface:has(> .career-workspace)'),heading:rect('.career-workspace-heading'),title:rect('.career-workspace-title'),navigation:rect('.career-workspace-modes'),body:rect('.career-workspace-content')};
    });
    assert.ok(Math.abs(geometry.navigation.right-geometry.workspace.right)<=2,`${width}/${language}/${mode}: navigation right edge`);
    assert.ok(Math.abs(geometry.body.x-geometry.workspace.x)<=2,`${width}/${language}/${mode}: content start`);
    assert.ok(Math.abs(geometry.body.right-geometry.workspace.right)<=2,`${width}/${language}/${mode}: content end`);
    assert.ok(Math.abs((geometry.workspace.x-geometry.surface.x)-(geometry.surface.right-geometry.workspace.right))<=2,`${width}/${language}/${mode}: centered workspace`);
    assert.ok(Math.abs(geometry.title.y+geometry.title.height/2-geometry.navigation.y-geometry.navigation.height/2)<=2,`${width}/${language}/${mode}: title/nav center`);
    if(firstRight!==undefined)assert.ok(Math.abs(firstRight-geometry.navigation.right)<=2,`${width}/${language}/${mode}: navigation changed position`);
    firstRight=geometry.navigation.right;report.layouts.push({width,language,mode,...geometry});
    if(mode==='opportunities'){
     const card=await page.locator('.opportunity-start').boundingBox();
     assert.ok(Math.abs(card.x-geometry.body.x)<=2&&Math.abs(card.x+card.width-geometry.body.right)<=2,'Opportunity card must fill the shared content boundary');
     await page.locator('.opportunity-research-example').waitFor();
    }
    await shot(`${mode}-${language}-${width}`);
   }
   await navigate('/careers?career=data');await active('overview');
   const bounds=await page.locator('.career-section-nav > [role="tab"]').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}));
   assert.equal(bounds.length,6);
   assert.ok(Math.max(...bounds.map(r=>r.width))-Math.min(...bounds.map(r=>r.width))<=1,'Six tabs must be equally wide');
   assert.ok(Math.max(...bounds.map(r=>r.y))-Math.min(...bounds.map(r=>r.y))<=1,'Six tabs must share one row');
   for(const id of ids){await choose(id);await fit();}
   await choose('overview');await shot(`reading-tabs-${language}-${width}`);
  }
 }
 report.checks.push('Four modes share centered content and right-aligned navigation at 1366, 1616 and 2560 in Chinese and English.','All six career tabs have equal widths, one row and exactly one visible accessible panel.');

 await switchLanguage('zh');await page.setViewportSize({width:1616,height:1000});
 await navigate('/careers?career=data&section=practice');await active('practice');
 const draft='ISOLATED TRIAL / 只保存本次浏览器里的作答';
 await page.getByLabel('本例体验草稿',{exact:true}).fill(draft);
 await choose('work');await page.goBack();await active('practice');assert.equal(await page.getByLabel('本例体验草稿',{exact:true}).inputValue(),draft);
 await choose('overview');await choose('practice');assert.equal(await page.getByLabel('本例体验草稿',{exact:true}).inputValue(),draft);
 await page.reload();await active('practice');assert.equal(await page.getByLabel('本例体验草稿',{exact:true}).inputValue(),draft);
 await shot('practice-draft-restored-zh-1616');
 report.checks.push('Direct practice link, back navigation, tab changes and refresh preserve the unsubmitted trial draft.');

 const practiceTab=page.locator('#career-reading-tab-practice');await practiceTab.focus();await practiceTab.press('End');await active('sources');
 assert.equal(await page.locator('#career-reading-tab-sources').evaluate(element=>document.activeElement===element),true);
 await page.keyboard.press('Home');await active('overview');await page.keyboard.press('ArrowRight');await active('work');await page.keyboard.press('ArrowLeft');await active('overview');
 assert.equal(await page.locator('#career-reading-tab-overview').evaluate(element=>document.activeElement===element),true);
 report.checks.push('Home, End, ArrowRight and ArrowLeft switch tabs and retain tab focus.');

 const source=page.locator('#career-panel-overview .career-source-inline a[href*="#career-source-"]').first();const sourceUrl=await source.getAttribute('href');assert.ok(sourceUrl);
 await source.click();await active('sources');
 const hash=new URL(sourceUrl,base).hash.slice(1);assert.ok(hash.startsWith('career-source-'));
 await page.waitForFunction(id=>document.getElementById(id)?.open,hash);
 assert.equal(await page.locator('#'+hash+' > summary').evaluate(element=>document.activeElement===element),true);
 await settle();
 const hitTabs=async()=>{
  const hits=await page.locator('.career-section-nav > [role="tab"]').evaluateAll(tabs=>tabs.map(tab=>{const r=tab.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{id:tab.id,x,y,hit:document.elementFromPoint(x,y)?.closest('[role="tab"]')?.id||null};}));
  assert.equal(hits.length,6);
  for(const hit of hits)assert.equal(hit.hit,hit.id,'Source view sticky tab must receive pointer hit: '+JSON.stringify(hit));
  return hits;
 };
 report.sourceTabHitTests=await hitTabs();
 await choose('overview');await source.click();await active('sources');await page.waitForFunction(id=>document.getElementById(id)?.open,hash);await settle();
 report.sourceTabHitTestsAfterReturn=await hitTabs();
 report.checks.push('Every sticky tab receives pointer hits while a source is expanded; overview remains clickable and returning through the source link restores the expanded source.');
 await shot('source-opened-zh-1616');
 await page.reload();await active('sources');assert.equal(await page.locator('#'+hash).getAttribute('open'),'');
 await navigate('/careers?career=data&section=bad');await active('overview');await page.getByRole('status').filter({hasText:'阅读位置不可用'}).waitFor();
 await navigate('/careers?career=data#career-deliverables');await active('work');await page.locator('#career-deliverables').waitFor({state:'visible'});
 await navigate('/careers?career=data#career-practice');await active('practice');
 report.checks.push('Invalid sections recover to overview; source links open and focus their source with refresh restoration; older deliverable/practice hash links select the right panel.');

 await navigate('/careers?career=data&section=overview');await active('overview');await settle();
 await page.evaluate(()=>{window.__careerAnimations=[];});await page.emulateMedia({reducedMotion:'reduce'});await choose('growth');await settle();
 assert.deepEqual(await page.evaluate(()=>window.__careerAnimations.map(item=>item.animation.id).filter(id=>['report-runway-taxi','career-reading-panel-enter'].includes(id))),[]);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{window.__careerAnimations=[];});await choose('work');await choose('preparation');await choose('overview');await settle();
 const animations=await page.evaluate(()=>window.__careerAnimations.map(item=>({id:item.animation.id,duration:item.animation.effect.getTiming().duration})).filter(item=>['report-runway-taxi','career-reading-panel-enter'].includes(item.id)));
 assert.ok(animations.some(item=>item.id==='report-runway-taxi'),'Pointer tab selection must animate the horizontal indicator');
 assert.ok(animations.some(item=>item.id==='career-reading-panel-enter'),'Pointer tab selection must animate the incoming panel');
 assert.ok(animations.every(item=>item.duration<=300),'New career motion must remain under 300ms');
 await active('overview');await shot('normal-motion-final-state-zh-1616');
 await page.evaluate(()=>{window.__careerAnimations=[];});await page.locator('#career-reading-tab-overview').focus();await page.keyboard.press('ArrowRight');await active('work');await settle();
 assert.deepEqual(await page.evaluate(()=>window.__careerAnimations.map(item=>item.animation.id).filter(id=>['report-runway-taxi','career-reading-panel-enter'].includes(id))),[]);
 report.animations=animations;report.checks.push('Pointer changes animate the report-style indicator and content within 300ms; rapid reversals settle on the requested panel; reduced-motion and keyboard changes do not run positional animation.');
 const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 assert.equal(state.jobs.length,0);assert.equal(state.events.length,0);assert.equal(state.goal,'data');
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure={message:error.message,stack:error.stack};await page.screenshot({path:`${checks}/browser-failure.png`}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();await vite.close();await fs.writeFile(`${checks}/browser.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks,errors:report.errors,failure:report.failure,screenshots:report.screenshots.length}));}
