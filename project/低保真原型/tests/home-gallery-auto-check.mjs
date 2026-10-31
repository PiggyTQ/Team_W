import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const dir='检查记录/职业方向自动播放_v32';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage({viewport:{width:1440,height:900}}),results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
const wait=ms=>p.waitForTimeout(ms),index=()=>p.locator('#directions').getAttribute('data-active-direction');
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message);}}
const show=async()=>{await p.locator('#directions').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-24,behavior:'instant'}));await wait(1000);};
try{
 await p.goto('http://127.0.0.1:5184/');await wait(1200);
 await check('屏外不播放；进入视口自动播放且页面不移动',async()=>{
  await wait(4400);assert.equal(await index(),'0');await show();const y=await p.evaluate(()=>scrollY);
  await p.screenshot({path:dir+'/进入视口_第一张.png'});await wait(4800);assert.equal(await index(),'1');assert.ok(Math.abs(await p.evaluate(()=>scrollY)-y)<2);
  const g=await p.locator('#directions').evaluate(el=>({height:el.offsetHeight,stage:el.firstElementChild.offsetHeight,snap:el.dataset.snapRange}));assert.ok(Math.abs(g.height-g.stage)<2);assert.equal(g.snap,undefined);
  await p.screenshot({path:dir+'/自动滑到第二张.png'});
 });
 await check('暂停后停止播放，继续后自动推进',async()=>{
  await p.getByRole('button',{name:'暂停自动播放工作方向',exact:true}).click();const before=await index();await wait(4500);assert.equal(await index(),before);
  await p.getByRole('button',{name:'继续自动播放工作方向',exact:true}).click();await wait(4500);assert.equal(Number(await index()),Number(before)+1);
 });
 await check('下拉与按钮可直接跳选、中心对齐并暂停',async()=>{
  await p.locator('.direction-gallery-toolbar select').selectOption('5');await wait(1200);assert.equal(await index(),'5');assert.equal(await p.locator('#directions').getAttribute('data-gallery-playing'),'false');
  const center=await p.locator('.direction-gallery-card[data-active=true]').evaluate(el=>{const c=el.getBoundingClientRect(),v=el.closest('.direction-gallery-viewport').getBoundingClientRect();return Math.abs(c.left+c.width/2-v.left-v.width/2);});assert.ok(center<2);
  await p.getByRole('button',{name:'下一个工作方向',exact:true}).click();await wait(1200);assert.equal(await index(),'6');
 });
 await check('滚轮仅向下浏览页面，不推动职业卡片',async()=>{
  await p.mouse.move(25,350);const before=await index(),y=await p.evaluate(()=>scrollY);await p.mouse.wheel(0,100);await wait(900);assert.equal(await index(),before);assert.ok(await p.evaluate(()=>scrollY)>y+50);
 });
 await check('最后一张停稳可重播，离开视口不继续播放',async()=>{
  await show();await p.locator('.direction-gallery-toolbar select').selectOption('9');await wait(1200);assert.equal(await index(),'9');await p.getByRole('button',{name:'重新播放工作方向',exact:true}).click();await wait(1200);assert.equal(await index(),'0');
  await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await wait(4500);assert.equal(await index(),'0');
 });
 await check('手机自动展示与减少动态效果的手动回退',async()=>{
  await p.setViewportSize({width:390,height:844});await wait(600);await show();await wait(4500);assert.equal(await index(),'1');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:dir+'/手机自动展示.png'});
  await p.emulateMedia({reducedMotion:'reduce'});await wait(200);const before=await index();await wait(4500);assert.equal(await index(),before);assert.equal(await p.locator('#directions').getAttribute('data-gallery-playing'),'false');
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
}finally{await fs.writeFile(dir+'/验证结果.json',JSON.stringify(results,null,2));await b.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
