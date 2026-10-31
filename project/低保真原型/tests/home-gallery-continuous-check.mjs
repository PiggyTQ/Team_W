import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const dir='检查记录/职业卡片连续慢滑_v33';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage({viewport:{width:1440,height:900}}),results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
const wait=ms=>p.waitForTimeout(ms),x=()=>p.locator('.direction-gallery-track').evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message);}}
const show=async()=>{await p.locator('#directions').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-24,behavior:'instant'}));await wait(180);};
try{
 await p.goto('http://127.0.0.1:5184/');await wait(1200);
 await check('首张从左侧开始，无居中留白',async()=>{
  const r=await p.locator('.direction-gallery-card').first().evaluate(el=>({card:el.getBoundingClientRect().left,view:el.closest('.direction-gallery-viewport').getBoundingClientRect().left}));assert.ok(Math.abs(r.card-r.view)<1);await p.screenshot({path:dir+'/初始_首张贴左.png',fullPage:false});
 });
 await check('进入后持续匀速移动，没有逐张停顿，页面原位',async()=>{
  await show();const y=await p.evaluate(()=>scrollY),samples=[await x()];await p.screenshot({path:dir+'/开始_左侧无留白.png'});
  for(let i=0;i<8;i++){await wait(500);samples.push(await x());}
  const distances=samples.slice(1).map((v,i)=>samples[i]-v);for(const d of distances)assert.ok(d>12&&d<24,JSON.stringify(distances));
  assert.ok(Math.abs(await p.evaluate(()=>scrollY)-y)<2);results.push({name:'连续位移取样',samples,distances});await p.screenshot({path:dir+'/连续慢速移动中.png'});
 });
 await check('暂停保持当前位置，继续播放不跳回卡片起点',async()=>{
  await p.getByRole('button',{name:'暂停自动播放工作方向',exact:true}).click();const before=await x();await wait(1100);assert.ok(Math.abs(await x()-before)<1);
  await p.getByRole('button',{name:'继续自动播放工作方向',exact:true}).click();await wait(100);assert.ok(before-await x()<8);await wait(1000);assert.ok(before-await x()>28);
 });
 await check('手动跳选左对齐，末尾右侧不留白，重新播放回到最左',async()=>{
  await p.locator('.direction-gallery-toolbar select').selectOption('4');await wait(150);
  const r=await p.locator('.direction-gallery-card').nth(4).evaluate(el=>({card:el.getBoundingClientRect().left,view:el.closest('.direction-gallery-viewport').getBoundingClientRect().left}));assert.ok(Math.abs(r.card-r.view)<1);
  await p.locator('.direction-gallery-toolbar select').selectOption('9');await wait(150);
  const end=await p.locator('.direction-gallery-card').last().evaluate(el=>({card:el.getBoundingClientRect().right,view:el.closest('.direction-gallery-viewport').getBoundingClientRect().right}));assert.ok(Math.abs(end.card-end.view)<1);
  await p.getByRole('button',{name:'重新播放工作方向',exact:true}).click();await wait(100);assert.ok(Math.abs(await x())<7);
 });
 await check('离开视口停止，手机连续播放不横向溢出，减少动态不自动播放',async()=>{
  await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await wait(300);const before=await x();await wait(700);assert.ok(Math.abs(await x()-before)<1);
  await p.setViewportSize({width:390,height:844});await wait(400);await show();const from=await x();await wait(1100);assert.ok(from-await x()>28);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:dir+'/手机连续慢滑.png'});
  await p.emulateMedia({reducedMotion:'reduce'});await wait(200);const paused=await x();await wait(700);assert.ok(Math.abs(await x()-paused)<1);
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
}finally{await fs.writeFile(dir+'/验证结果.json',JSON.stringify(results,null,2));await b.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
