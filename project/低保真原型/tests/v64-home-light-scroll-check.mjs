import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const dir='检查记录/首页完整边界_v64/滚动回归';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage({viewport:{width:1350,height:800}}),results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
const wait=ms=>p.waitForTimeout(ms),y=()=>p.evaluate(()=>scrollY);
async function check(name,fn){if(process.argv[2]&&!name.includes(process.argv[2]))return;try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message);}}
async function go(top){await p.mouse.click(25,350);await p.evaluate(top=>scrollTo({top,behavior:'instant'}),top);await wait(1000);await p.mouse.move(25,350);}
const scenes=()=>p.locator('.story-scene').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {id:el.id,target:r.top+scrollY-(innerHeight-r.height)/2};}));
const flow=()=>p.locator('#how').evaluate(el=>({start:el.getBoundingClientRect().top+scrollY-Number(el.dataset.snapTop),step:Number(el.dataset.snapRange)/3}));
try{
 await p.goto('http://127.0.0.1:5184/');await wait(1300);
 await check('案例只滚80px即可前进下一张，反向80px返回',async()=>{
  const stops=await scenes();await go(stops[0].target);await p.mouse.wheel(0,80);await wait(1100);assert.ok(Math.abs(await y()-stops[1].target)<2);
  results.push({name:'实际滚动取样',input:80,distance:stops[1].target-stops[0].target});await p.screenshot({path:dir+'/80px轻滚_进入下一章节.png'});
  await p.mouse.wheel(0,-80);await wait(1100);assert.ok(Math.abs(await y()-stops[0].target)<2);
 });
 await check('20px微小输入不误翻页，保持完整停靠',async()=>{
  const stops=await scenes();await go(stops[0].target);await p.mouse.wheel(0,20);await wait(1100);assert.ok(Math.abs(await y()-stops[0].target)<2);
 });
 await check('流程节点80px轻滚即可前进与返回，新文案保留',async()=>{
  const g=await flow();assert.ok(g.step>0,JSON.stringify(g));
  await go(g.start);await p.mouse.wheel(0,80);await wait(1100);const current=await flow();assert.ok(Math.abs(await y()-current.start-current.step)<2,JSON.stringify({current,y:await y()}));assert.equal(await p.locator('#how').getAttribute('data-active-step'),'1');
  assert.equal(await p.locator('.sj-item').nth(1).locator('h3').textContent(),'分析准备差距');await p.screenshot({path:dir+'/流程_轻滚前进_保留最新文案.png'});
  await p.mouse.wheel(0,-80);await wait(1100);assert.ok(Math.abs(await y()-(await flow()).start)<2);
 });
 await check('卡片内部自然阅读，到底后80px即交接下一张',async()=>{
  const stops=await scenes();await go(stops[0].target);const card=p.locator('#skills');await card.evaluate(el=>{el.scrollTop=0;});const r=await card.boundingBox();await p.mouse.move(r.x+r.width/2,r.y+200);
  const before=await y();await p.mouse.wheel(0,80);await wait(800);assert.ok(await card.evaluate(el=>el.scrollTop)>50);assert.ok(Math.abs(await y()-before)<2);
  await card.evaluate(el=>{el.scrollTop=el.scrollHeight;});await p.mouse.wheel(0,80);await wait(1100);assert.ok(Math.abs(await y()-(await scenes())[1].target)<2);
 });
 await check('连续小滚轮累积生效，反向及时打断吸附',async()=>{
  const stops=await scenes();await go(stops[0].target);
  for(let i=0;i<4;i++){await p.mouse.wheel(0,20);await wait(35);}await wait(1100);assert.ok(Math.abs(await y()-stops[1].target)<2,"small-wheel accumulation");
  await p.mouse.wheel(0,80);await wait(230);const before=await y();await p.mouse.wheel(0,-80);await wait(100);assert.ok(await y()<before-2,"reverse interruption: "+JSON.stringify({before,after:await y()}));await wait(1100);assert.ok(Math.abs(await y()-stops[1].target)<2,"reverse returns to preceding stop");
 });
 await check('笔记本同样80px切换；减少动态效果回退自然滚动',async()=>{
  await p.setViewportSize({width:1280,height:720});await wait(900);const stops=await scenes();await go(stops[0].target);await p.mouse.wheel(0,80);await wait(1100);assert.ok(Math.abs(await y()-stops[1].target)<2);await p.screenshot({path:dir+'/笔记本_80px轻滚.png'});
  await p.emulateMedia({reducedMotion:'reduce'});await wait(300);assert.equal(await p.locator('html').getAttribute('data-home-scroll'),'native');
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
}finally{await fs.writeFile(dir+'/验证结果.json',JSON.stringify(results,null,2));await b.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;

