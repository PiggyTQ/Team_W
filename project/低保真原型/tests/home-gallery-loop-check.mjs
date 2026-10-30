import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const dir='检查记录/职业卡片无限循环_v34';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage({viewport:{width:1440,height:900}}),results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
const wait=ms=>p.waitForTimeout(ms),index=()=>p.locator('#directions').getAttribute('data-active-direction');
const show=async()=>{await p.locator('#directions').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-24,behavior:'instant'}));await wait(300);};
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message);}}
try{
 await p.goto('http://127.0.0.1:5184/');await wait(1100);await show();
 await check('十张循环链有连续接续副本且动画无限循环',async()=>{
  assert.equal(await p.locator('[data-loop-copy="0"]').count(),10);assert.equal(await p.locator('[data-loop-copy="1"]').count(),10);
  const r=await p.locator('.direction-gallery-track').evaluate(el=>{const a=el.getAnimations()[0];return {iterations:a.effect.getTiming().iterations===Infinity,easing:a.effect.getTiming().easing};});assert.equal(r.iterations,true);assert.equal(r.easing,'linear');
 });
 await check('第十张接第一张不跳动、无空白、无倒播',async()=>{
  const sample=await p.locator('.direction-gallery-track').evaluate(el=>{
   const a=el.getAnimations()[0],duration=a.effect.getTiming().duration;a.pause();a.currentTime=duration-300;
   const before=el.querySelector('[data-loop-copy="1"]').getBoundingClientRect().left;
   a.currentTime=duration+300;const after=el.querySelector('[data-loop-copy="0"]').getBoundingClientRect().left;
   return {before,after,distance:before-after,duration};
  });assert.ok(Math.abs(sample.distance-19.2)<1,JSON.stringify(sample));results.push({name:'接缝位移取样',...sample});
  await p.screenshot({path:dir+'/第十接第一_无缝循环.png'});
  await p.locator('.direction-gallery-track').evaluate(el=>{const a=el.getAnimations()[0];a.currentTime=a.effect.getTiming().duration*3+1500;a.play();});await wait(500);
  assert.equal(await index(),'0');assert.equal(await p.locator('#directions').getAttribute('data-gallery-playing'),'true');
 });
 await check('手动前后选择也首尾相接，继续时保持匀速',async()=>{
  await p.locator('.direction-gallery-toolbar select').selectOption('9');await p.getByRole('button',{name:'下一个工作方向',exact:true}).click();assert.equal(await index(),'0');
  await p.getByRole('button',{name:'上一个工作方向',exact:true}).click();assert.equal(await index(),'9');await p.getByRole('button',{name:'继续自动播放工作方向',exact:true}).click();await wait(900);assert.equal(await p.locator('#directions').getAttribute('data-gallery-playing'),'true');
 });
 await check('离开再进入从第一张重新自动播放',async()=>{
  await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await wait(500);await show();assert.equal(await index(),'0');
  const left=await p.locator('.direction-gallery-track').evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);assert.ok(left<0&&left>-20,String(left));
  assert.equal(await p.locator('#directions').getAttribute('data-gallery-playing'),'true');await p.screenshot({path:dir+'/重新进入_从第一张播放.png'});
 });
 await check('手机循环无溢出、重复副本不进入键盘顺序、减少动态停止',async()=>{
  assert.equal(await p.locator('[data-loop-copy="1"] button').first().getAttribute('tabindex'),'-1');
  await p.setViewportSize({width:390,height:844});await wait(600);await show();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.emulateMedia({reducedMotion:'reduce'});await wait(300);assert.equal(await p.locator('#directions').getAttribute('data-gallery-playing'),'false');
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
}finally{await fs.writeFile(dir+'/验证结果.json',JSON.stringify(results,null,2));await b.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
