import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const dir='检查记录/首页文字入场全检_v38';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage({viewport:{width:1350,height:800}}),results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
const wait=ms=>p.waitForTimeout(ms);
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message);}}
async function go(selector){await p.mouse.click(25,350);await p.locator(selector).evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-40,behavior:'instant'}));await wait(1000);}
try{
 await p.goto('http://127.0.0.1:5184/');await wait(1200);await p.mouse.move(25,350);
 await check('七个主要板块标题全部接入文字揭示，静态阅读区全部登记',async()=>{
  for(const id of ['outcomes-title','entry-title','journey-title','directions-title','story-continuation-title','tail-before-title','tail-closing-title'])assert.equal(await p.locator('#'+id+' .motion-text').count(),1,id);
  const selectors=['.outcomes-heading p','.entry-deck-note','.sj-shortcuts','.direction-gallery-toolbar>label','.story-rail>h3','.story-scene-meta','.story-scene-exit','.start-answer summary','.tail-footer-nav'];
  for(const selector of selectors)assert.ok(await p.locator(selector).first().getAttribute('data-reveal-state')||await p.locator(selector).first().getAttribute('data-content-reveal'),selector);
  results.push({name:'静态覆盖清单',selectors});
  const inventory=await p.locator('.publicmain').evaluate(root=>{
   const nodes=[...root.querySelectorAll('h1,h2,h3,h4,p,dt,dd,blockquote,summary')];
   const uncovered=nodes.filter(node=>!node.closest('[data-reveal-state],[data-content-reveal],[data-motion-snapshot]')&&!node.querySelector('.motion-text')&&!node.closest('details:not([open])')).map(node=>({tag:node.tagName,text:node.textContent.slice(0,90)}));
   return {textNodes:nodes.length,uncovered};
  });assert.deepEqual(inventory.uncovered,[]);results.push({name:'全页文字节点归属扫描（含备用内容与循环副本）',...inventory});
 });
 await check('屏外的动态内容等待进入视口，不会提前播完',async()=>{
  for(const selector of ['.sj-current-detail>div:first-child','.tail-route-detail','.tail-chat-question','.tail-report-paper'])assert.equal(await p.locator(selector).first().getAttribute('data-content-reveal'),'pending',selector);
 });
 await check('流程未到达节点文字保持隐藏，第一张到达后才显示',async()=>{
  const future=p.locator('.sj-item').nth(1).locator('h3');assert.equal(await future.getAttribute('data-reveal-state'),'pending');assert.equal(await future.evaluate(el=>Number(getComputedStyle(el).opacity)),0);
  await p.locator('#how').evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-Number(el.dataset.snapTop),behavior:'instant'}));await wait(1100);
  assert.equal(await p.locator('.sj-item').nth(0).locator('h3').getAttribute('data-reveal-state'),'shown');assert.equal(await future.getAttribute('data-reveal-state'),'pending');
  await p.screenshot({path:dir+'/流程首节点_后续文字未提前显示.png'});
 });
 await check('轻滚到下一节点才浮现，反向返回同样重新浮现',async()=>{
  await p.mouse.move(25,350);await p.mouse.wheel(0,80);
  await p.waitForFunction(()=>document.querySelectorAll('.sj-item')[1].querySelector('h3').dataset.revealState==='revealing');
  const during=await p.locator('.sj-item').nth(1).locator('h3').evaluate(el=>({opacity:Number(getComputedStyle(el).opacity),transform:getComputedStyle(el).transform}));assert.ok(during.opacity<1,JSON.stringify(during));
  await p.screenshot({path:dir+'/流程第二节点_文字浮现途中.png'});await wait(1100);
  assert.equal(await p.locator('.sj-item').nth(1).locator('.sj-artifact').getAttribute('data-reveal-state'),'shown');assert.equal(await p.locator('.sj-item').nth(2).locator('h3').getAttribute('data-reveal-state'),'pending');
  await p.mouse.wheel(0,-80);await p.waitForFunction(()=>document.querySelectorAll('.sj-item')[0].querySelector('h3').dataset.revealState==='revealing');await wait(900);
  assert.equal(await p.locator('.sj-current-detail>div:first-child').getAttribute('data-content-direction'),'down');
 });
 await check('四个流程阶段逐一到达后可见，成果顶部与入口提示也有内容过渡',async()=>{
  for(const index of [1,2,3]){await p.getByRole('button',{name:'下一个流程节点',exact:true}).click();await wait(1100);assert.equal(await p.locator('.sj-item').nth(index).locator('h3').getAttribute('data-reveal-state'),'shown');assert.equal(await p.locator('.sj-item').nth(index).locator('.sj-artifact').getAttribute('data-reveal-state'),'shown');}
  await go('#outcomes');await p.getByRole('button',{name:'下一个展示步骤',exact:true}).click();await wait(900);assert.equal(await p.locator('.outcome-canvas-head:not([data-motion-snapshot])').getAttribute('data-content-reveal'),'shown');
  await go('#starting-points');await p.getByRole('button',{name:'选择：目标已定',exact:true}).click();assert.ok(await p.locator('.entry-deck-note:not([data-motion-snapshot])').getAttribute('data-content-direction'));
 });
 await check('职业卡片、案例章节和FAQ随实际进入显示，内容切换继续有过渡',async()=>{
  await go('#directions');assert.equal(await p.locator('.direction-card-content').first().getAttribute('data-reveal-state'),'shown');
  await go('#skills');assert.equal(await p.locator('#skills .story-scene-intro').getAttribute('data-reveal-state'),'shown');
  await p.getByRole('button',{name:'表格工具',exact:false}).first().click();await wait(900);assert.ok(await p.locator('#skills .story-scene-meta:not([data-motion-snapshot])').getAttribute('data-content-direction'));
  await p.locator('#skills').evaluate(el=>{el.scrollTop=el.scrollHeight;});await wait(1000);assert.equal(await p.locator('.tail-route-detail:not([data-motion-snapshot])').getAttribute('data-content-reveal'),'shown');
  await p.locator('#ai').evaluate(el=>{const r=el.getBoundingClientRect();scrollTo({top:r.top+scrollY-(innerHeight-r.height)/2,behavior:'instant'});});await wait(1100);
  assert.equal(await p.locator('.tail-chat-question').getAttribute('data-content-reveal'),'shown');await p.getByRole('button',{name:'播放预录答复',exact:false}).click();await wait(900);assert.ok(await p.locator('.tail-chat-answer').getAttribute('data-content-direction'));
  await go('#before-start');const summary=p.locator('.start-answer summary').first();assert.equal(await summary.getAttribute('data-reveal-state'),'shown');await summary.click();await wait(900);assert.equal(await p.locator('.start-answer>div').first().getAttribute('data-content-reveal'),'shown');
 });
 await check('手机纵向列表每项进入后显现，减少动态效果全部直接可读',async()=>{
  await p.setViewportSize({width:390,height:844});await wait(600);await go('#how');await p.locator('.sj-item').nth(2).scrollIntoViewIfNeeded();await wait(1000);assert.equal(await p.locator('.sj-item').nth(2).locator('h3').getAttribute('data-reveal-state'),'shown');
  await p.screenshot({path:dir+'/手机流程_当前节点文字可读.png'});await p.emulateMedia({reducedMotion:'reduce'});await wait(300);
  const pending=await p.locator('[data-reveal-state="pending"],[data-content-reveal="pending"]').count();assert.equal(pending,0);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 await check('英文首页同样覆盖流程标题和节点，没有翻译或布局回归',async()=>{
  await p.evaluate(()=>localStorage.setItem('career-prototype-language','en'));await p.emulateMedia({reducedMotion:'no-preference'});await p.reload();await wait(1000);await go('#how');
  const title=await p.locator('#journey-title .motion-sr-only').textContent();assert.ok(!/[\u4e00-\u9fff]/u.test(title),title);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:dir+'/英文手机流程_文字揭示.png'});
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
}finally{await fs.writeFile(dir+'/验证结果.json',JSON.stringify(results,null,2));await b.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
