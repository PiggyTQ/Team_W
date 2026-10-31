import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const dir='检查记录/案例章节松手吸附_v31';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await b.newPage({viewport:{width:1350,height:800}}),results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
const wait=ms=>p.waitForTimeout(ms);
const scenes=()=>p.locator('#case-study .story-scene').evaluateAll(nodes=>nodes.map(el=>{const box=el.getBoundingClientRect();return {id:el.id,top:box.top+scrollY,bottom:box.bottom+scrollY,target:box.top+scrollY-(innerHeight-box.height)/2,height:box.height,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight};}));
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message);}}
async function verify(id){const r=await p.locator('#'+id).evaluate(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,center:(r.top+r.bottom)/2,height:innerHeight};});assert.ok(Math.abs(r.center-r.height/2)<2,JSON.stringify(r));assert.ok(r.top>=23&&r.bottom<=r.height-23,JSON.stringify(r));}
try{
 await p.goto('http://127.0.0.1:5184/');await wait(1300);
 await check('复现附件：AI与报告之间停下后自动归位报告',async()=>{
  const list=await scenes(),report=list[2];
  await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),report.top-400);await wait(60);await p.screenshot({path:dir+'/附件同类状态_归位前.png'});
  await wait(1200);await verify('report-preview');await p.screenshot({path:dir+'/附件同类状态_归位后.png'});
 });
 await check('三张卡片均能正反向松手归位，整张居中',async()=>{
  for(const scene of await scenes())for(const delta of [-90,90]){
   await p.mouse.click(30,350);await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),scene.target+delta);await wait(1150);await verify(scene.id);
  }
 });
 await check('鼠标滚动停止自动归位，新滚轮可以打断',async()=>{
  const scene=(await scenes())[1];await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),scene.target);await wait(950);await p.mouse.move(30,350);
  await p.mouse.wheel(0,140);await wait(90);assert.ok(Math.abs(await p.evaluate(()=>scrollY)-scene.target-140)<2);
  await wait(1000);await verify('ai');
  await p.mouse.wheel(0,200);await wait(230);const before=await p.evaluate(()=>scrollY);await p.mouse.wheel(0,-120);await wait(70);assert.ok(await p.evaluate(()=>scrollY)<before-40);await wait(1000);await verify('ai');
 });
 await check('长卡片内部正常阅读，到底后单次滚轮移交下一张',async()=>{
  const scene=(await scenes())[0];await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),scene.target);await wait(1000);
  const card=p.locator('#skills'),box=await card.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+200);
  const before=await p.evaluate(()=>scrollY);await p.mouse.wheel(0,150);await wait(950);
  assert.ok(await card.evaluate(el=>el.scrollTop)>50);assert.ok(Math.abs(await p.evaluate(()=>scrollY)-before)<2);await verify('skills');
  await card.evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const next=(await scenes())[1];await p.mouse.wheel(0,next.target-scene.target-100);await wait(1150);await verify('ai');
 });
 await check('报告切换与AI展开不会把卡片挤出一屏',async()=>{
  const report=(await scenes())[2];await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),report.target);await wait(1000);
  await p.getByRole('button',{name:'02 行动与成果',exact:true}).click();await wait(800);await verify('report-preview');
  const ai=(await scenes())[1];await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),ai.target);await wait(1000);await p.getByRole('button',{name:'播放预录答复',exact:false}).click();await wait(800);await verify('ai');
  await p.screenshot({path:dir+'/AI展开_卡片完整停靠.png'});
 });
 await check('大屏与笔记本窗口整张停靠',async()=>{
  for(const [width,height] of [[2025,1160],[1280,720]]){await p.setViewportSize({width,height});await wait(1000);const report=(await scenes())[2];await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),report.target-140);await wait(1200);await verify('report-preview');await p.screenshot({path:dir+`/报告居中_${width}x${height}.png`});}
 });
 await check('减少动态效果与手机回退自然滚动',async()=>{
  await p.emulateMedia({reducedMotion:'reduce'});await wait(300);assert.equal(await p.locator('html').getAttribute('data-home-scroll'),'native');
  await p.setViewportSize({width:390,height:844});await p.emulateMedia({reducedMotion:'no-preference'});await wait(300);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
}finally{await fs.writeFile(dir+'/验证结果.json',JSON.stringify(results,null,2));await b.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
