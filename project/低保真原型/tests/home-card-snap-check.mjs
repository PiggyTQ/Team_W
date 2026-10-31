import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const dir='检查记录/卡片松手居中吸附_v29';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const wait=ms=>page.waitForTimeout(ms);
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message);}}
async function geometry(id){return page.locator(id).evaluate(el=>({start:scrollY+el.getBoundingClientRect().top-Number(el.dataset.snapTop||42),range:Number(el.dataset.snapRange),count:Number(el.dataset.snapCount)}));}
async function verify(id,index){
 const g=await geometry(id);assert.ok(g.range>0,'舞台应启用');
 const data=await page.locator(id).evaluate((el,index)=>{
  const cards=el.querySelectorAll('.sj-item,.direction-gallery-card'),card=cards[index].getBoundingClientRect();
  const view=el.querySelector('.sj-viewport,.direction-gallery-viewport').getBoundingClientRect();
  const stage=el.firstElementChild.getBoundingClientRect();
  return {center:card.left+card.width/2,expected:view.left+view.width/2,top:stage.top,bottom:stage.bottom,y:scrollY,height:innerHeight};
 },index);
 assert.ok(Math.abs(data.y-(g.start+g.range*index/(g.count-1)))<2,JSON.stringify(data));
 assert.ok(Math.abs(data.center-data.expected)<2,'卡片未居中 '+JSON.stringify(data));
 assert.ok(data.top>=23&&data.bottom<=data.height,'整块内容未完整入屏 '+JSON.stringify(data));
}
try{
 await page.goto('http://127.0.0.1:5184/');await wait(1300);await page.mouse.move(30,450);
 for(const id of ['#how','#directions']){
  await check(id+' 松手吸附最近卡片，前进后退与首尾都居中',async()=>{
   const g=await geometry(id),step=g.range/(g.count-1);assert.ok(step>0);
   for(const fraction of [0.22,1.63,1.28,g.count-1-.2]){
    await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),g.start+step*fraction);
    await wait(1100);await verify(id,Math.round(fraction));
   }
   await page.screenshot({path:dir+'/'+id.slice(1)+'_末张居中.png'});
  });
  await check(id+' 单次滚轮松手归位；新滚轮立即打断吸附',async()=>{
   const g=await geometry(id),step=g.range/(g.count-1);
   await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),g.start+step);await wait(900);
   await page.mouse.wheel(0,step*.35);await wait(95);
   const y=await page.evaluate(()=>scrollY);assert.ok(y>g.start+step+10,'滚动时应自由推进');
   await wait(1000);await verify(id,1);
   await page.mouse.wheel(0,step*.64);await wait(240);
   const before=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,-step*.75);await wait(65);
   assert.ok((await page.evaluate(()=>scrollY))<before-20,'新输入没有打断吸附');
   await wait(1100);
   const current=await page.evaluate(()=>scrollY);await verify(id,Math.round((current-g.start)/step));
   await page.screenshot({path:dir+'/'+id.slice(1)+'_松手归位.png'});
  });
  await check(id+' 入口吸附完整舞台',async()=>{
   const g=await geometry(id);
   const entry=await page.locator(id).evaluate(el=>el.getBoundingClientRect().top+scrollY+parseFloat(getComputedStyle(el.firstElementChild).paddingTop)-innerHeight*2/3-10); await page.mouse.click(25,350);await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),entry);await wait(80);
   await page.mouse.wheel(0,40);await wait(1150);await verify(id,0);
  });
 }
 await check('1280×720 两个舞台完整入屏并居中',async()=>{
  await page.setViewportSize({width:1280,height:720});await wait(600);
  for(const id of ['#how','#directions']){const g=await geometry(id);await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),g.start+g.range*.46);await wait(1100);await verify(id,Math.round(.46*(g.count-1)));await page.screenshot({path:dir+'/'+id.slice(1)+'_720.png'});}
 });
 await check('连贯案例内部停止后保持原位',async()=>{
  for(const id of ['#skills','#ai','#report-preview']){
   await page.mouse.click(25,350);await page.locator(id).evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY+100,behavior:'instant'}));await wait(80);
   await page.mouse.wheel(0,100);await wait(90);const before=await page.evaluate(()=>scrollY);await wait(1100);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before)<2);
  }
 });
 await check('减少动态和手机保持自然阅读',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await wait(300);assert.equal(await page.locator('#how').getAttribute('data-journey-mode'),'list');assert.equal(await page.locator('#directions').getAttribute('data-gallery-mode'),'list');
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});await wait(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
}finally{await fs.writeFile(dir+'/验证结果.json',JSON.stringify(results,null,2));await browser.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;


