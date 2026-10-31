import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const dir='检查记录/职业循环卡片鼠标拖动_v35';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage({viewport:{width:1440,height:900}}),results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
const wait=ms=>p.waitForTimeout(ms),x=()=>p.locator('.direction-gallery-track').evaluate(el=>-new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message);}}
try{
 await p.goto('http://127.0.0.1:5184/');await wait(1200);await p.locator('#directions').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-24,behavior:'instant'}));await wait(400);
 const view=await p.locator('.direction-gallery-viewport').boundingBox(),startX=view.x+view.width/2,startY=view.y+150;
 await check('按住即暂停，向左拖动一比一跟随，松手继续32px秒',async()=>{
  await p.mouse.move(startX,startY);await p.mouse.down();await wait(100);const before=await x();await wait(400);assert.ok(Math.abs(await x()-before)<1);
  await p.mouse.move(startX-200,startY,{steps:12});assert.ok(Math.abs(await x()-before-200)<2);assert.equal(await p.locator('.direction-gallery-viewport').getAttribute('data-dragging'),'true');
  assert.equal(await p.locator('[role="dialog"],dialog[open]').count(),0);await p.screenshot({path:dir+'/按住拖动_轨道跟手.png'});
  const released=await x();await p.mouse.up();await wait(100);assert.ok(await x()-released<8);await wait(1000);assert.ok(await x()-released>30&&await x()-released<45);
  assert.equal(await p.locator('#directions').getAttribute('data-gallery-playing'),'true');
 });
 await check('向右跨越首尾也跟手，不出现尽头；区域外松开仍续播',async()=>{
  await p.mouse.move(startX,startY);await p.mouse.down();await p.mouse.move(startX+450,startY,{steps:15});
  assert.ok(await x()>3000,'应跨接到上一轮卡片');await p.mouse.move(20,20,{steps:10});await p.mouse.up();await wait(200);
  assert.equal(await p.locator('.direction-gallery-viewport').getAttribute('data-dragging'),'false');assert.equal(await p.locator('#directions').getAttribute('data-gallery-playing'),'true');
  const before=await x();await wait(800);assert.ok(await x()-before>20);
 });
 await check('从摘要按钮起拖不会误开详情，普通点击仍可打开',async()=>{
  await p.locator('.direction-gallery-toolbar select').selectOption('0');await p.getByRole('button',{name:'继续自动播放工作方向',exact:true}).click();await wait(150);
  const button=p.locator('[data-loop-copy="0"] button').first(),box=await button.boundingBox();const px=box.x+box.width/2,py=box.y+box.height/2;
  await p.mouse.move(px,py);await p.mouse.down();await p.mouse.move(px+100,py,{steps:10});await p.mouse.up();await wait(400);assert.equal(await p.locator('[role="dialog"],dialog[open]').count(),0);
  await p.locator('.direction-gallery-toolbar select').selectOption('0');await button.click();await wait(400);assert.equal(await p.locator('[role="dialog"],dialog[open]').count(),1);
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
}finally{await fs.writeFile(dir+'/验证结果.json',JSON.stringify(results,null,2));await b.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;

