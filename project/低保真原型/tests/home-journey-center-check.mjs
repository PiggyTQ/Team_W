import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const dir='检查记录/流程板块居中吸附_v30';await fs.mkdir(dir,{recursive:true});
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
 if(id==='#how')assert.ok(Math.abs((data.top+data.bottom)/2-data.height/2)<2,'整个流程没有垂直居中 '+JSON.stringify(data));
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
   const entry=await page.locator(id).evaluate(el=>el.getBoundingClientRect().top+scrollY+parseFloat(getComputedStyle(el.firstElementChild).paddingTop)-innerHeight*2/3-10);
   await page.mouse.click(25,350);await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),entry);await wait(80);
   await page.mouse.wheel(0,40);await wait(1150);await verify(id,0);
  });
 }
 await check('1280×720 两个舞台完整入屏并居中',async()=>{
  await page.setViewportSize({width:1280,height:720});await wait(600);
  for(const id of ['#how','#directions']){const g=await geometry(id);await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),g.start+g.range*.46);await wait(1100);await verify(id,Math.round(.46*(g.count-1)));await page.screenshot({path:dir+'/'+id.slice(1)+'_720.png'});}
 });
 await check('950×650 和用户667×815预览窗口流程均可吸附且完整居中',async()=>{
  for(const [width,height] of [[950,650],[667,815]]){
  await page.setViewportSize({width,height});await wait(1000);
  const g=await geometry('#how');assert.ok(g.range>0,'窄窗口不应退回普通列表');
  await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),g.start+g.range*.56);await wait(1200);await verify('#how',2);
  const bounds=await page.locator('#how .sj-item[data-active=true]').evaluate(el=>{
   const card=el.getBoundingClientRect(),view=el.closest('.sj-viewport').getBoundingClientRect(),icon=el.querySelector('.sj-medallion').getBoundingClientRect();return {top:card.top,bottom:card.bottom,viewTop:view.top,viewBottom:view.bottom,iconCenter:icon.left+icon.width/2,cardCenter:card.left+card.width/2};
  });assert.ok(bounds.top>=bounds.viewTop&&bounds.bottom<=bounds.viewBottom,JSON.stringify(bounds));
  assert.ok(Math.abs(bounds.iconCenter-bounds.cardCenter)<2,'节点图标也应居中');
  await page.screenshot({path:dir+`/流程_${width}x${height}.png`});
  }
 });
 await check('案例长内容在卡片内部自然滚动',async()=>{
  await page.setViewportSize({width:1350,height:800});await wait(1000);
  await page.locator('#skills').evaluate(el=>{const r=el.getBoundingClientRect();scrollTo({top:r.top+scrollY-(innerHeight-r.height)/2,behavior:'instant'});el.scrollTop=0;});await wait(1000);
  const box=await page.locator('#skills').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+200);
  const before=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,100);await wait(1100);
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before)<2);assert.ok(await page.locator('#skills').evaluate(el=>el.scrollTop)>50);
 });
 await check('减少动态和手机保持自然阅读',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await wait(300);assert.equal(await page.locator('#how').getAttribute('data-journey-mode'),'list');assert.equal(await page.locator('#directions').getAttribute('data-gallery-mode'),'list');
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});await wait(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
}finally{await fs.writeFile(dir+'/验证结果.json',JSON.stringify(results,null,2));await browser.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;


