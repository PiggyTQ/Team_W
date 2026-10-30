import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const dir='检查记录/完整板块轻吸附_v28';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await browser.newPage({viewport:{width:1440,height:900}}),checks=[],errors=[];
p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(7000);
const pause=ms=>p.waitForTimeout(ms),pos=()=>p.evaluate(()=>scrollY);
async function check(name,fn){try{await fn();checks.push({name,status:'pass'});console.log('PASS',name);}catch(e){checks.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message);}}
const scroll=async y=>{await p.mouse.click(30,300);await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await pause(90);await p.mouse.move(30,450);};
const geometry=selector=>p.locator(selector).evaluate(el=>{
 const css=getComputedStyle(el),top=el.getBoundingClientRect().top+scrollY+parseFloat(css.paddingTop),bottom=el.getBoundingClientRect().bottom+scrollY-parseFloat(css.paddingBottom);
 const heading=el.querySelector('.section-heading,.story-bridge,header')||el;
 const target=bottom-top<=innerHeight-48?bottom-innerHeight+24:heading.getBoundingClientRect().top+scrollY-48;
 return {top,bottom,target,trigger:top-innerHeight*2/3,height:innerHeight,fits:bottom-top<=innerHeight-48};
});
try{
 await p.goto('http://127.0.0.1:5184/');await p.locator('#case-study').waitFor();await pause(1100);
 await check('露出三分之一才触发，单次小滚轮自动完成底线吸附',async()=>{
  const g=await geometry('#starting-points');await scroll(g.trigger-24);
  let from=await pos();await p.mouse.wheel(0,10);await pause(160);assert.ok(Math.abs(await pos()-from-10)<2);assert.equal(await p.locator('html').getAttribute('data-home-snap-target'),null);
  await p.mouse.wheel(0,20);await pause(850);
  assert.equal(await p.locator('html').getAttribute('data-home-snap-target'),'starting-points');assert.ok(Math.abs(await pos()-g.target)<2);
  assert.ok(g.fits,'900px视口应展示完整卡牌板块');assert.ok(Math.abs(g.bottom-await pos()-(900-24))<2);
  checks.push({name:'底线取样',trigger:g.trigger,target:g.target,actual:await pos(),bottomInViewport:g.bottom-await pos()});
  await p.screenshot({path:dir+'/三分之一触发_底线对齐.png'});
 });
 await check('吸附后下一次滚轮直接生效，不蓄力、不要求第二次解锁',async()=>{
  const before=await pos();await p.mouse.wheel(0,100);await pause(180);assert.ok(Math.abs(await pos()-before-100)<2);
  assert.equal(await p.locator('.home-theme-cue,.home-exit-pull').count(),0);
 });
 await check('引导、学习、AI和报告是一个长板块，内部完全原生滚动',async()=>{
  for(const id of ['skills','ai','report-preview']){
   const y=await p.locator('#'+id).evaluate(el=>el.getBoundingClientRect().top+scrollY-100);await scroll(y);
   const before=await pos();await p.mouse.wheel(0,120);await pause(180);
   assert.ok(Math.abs(await pos()-before-120)<2,id+'内部被拦截');assert.equal(await p.locator('html').getAttribute('data-home-snap-target'),null);
  }
  await p.screenshot({path:dir+'/案例内部_自然滚动.png'});
 });
 await check('长案例只吸附入口，不自动跳过学习AI与报告',async()=>{
  const g=await geometry('#case-study');await scroll(g.trigger-12);await p.mouse.wheel(0,30);await pause(900);
  assert.equal(await p.locator('html').getAttribute('data-home-snap-target'),'case-study');assert.ok(Math.abs(await pos()-g.target)<2);
  assert.ok((await p.locator('#skills').boundingBox()).y>0);assert.ok((await p.locator('#report-preview').boundingBox()).y>900);
  await p.screenshot({path:dir+'/案例整体_仅入口吸附.png'});
 });
 await check('流程滚动中连续、松手归位，成果按钮仍然可用',async()=>{
  const y=await p.locator('#how').evaluate(el=>el.getBoundingClientRect().top+scrollY+150);await scroll(y);
  const before=await pos();await p.mouse.wheel(0,100);await pause(90);assert.ok(Math.abs(await pos()-before-100)<2);
  await pause(1000);const g=await p.locator('#how').evaluate(el=>({start:scrollY+el.getBoundingClientRect().top-Number(el.dataset.snapTop||42),step:Number(el.dataset.snapRange)/3}));
  assert.ok(Math.abs((await pos()-g.start)/g.step-Math.round((await pos()-g.start)/g.step))<.005);
  await p.locator('.outcome-stage-nav button').last().click();await pause(180);await p.getByRole('button',{name:'成果',exact:true}).click();await pause(180);
  assert.equal(await p.locator('.outcome-stage-layout').getAttribute('data-outcome-stage'),'4');assert.equal(await p.locator('.outcome-stage-layout').getAttribute('data-outcome-phase'),'2');
 });
 await check('常见笔记本视口也能一次触发，反向和键盘可打断',async()=>{
  for(const [width,height] of [[1280,712],[1000,650]]){
   await p.setViewportSize({width,height});await pause(500);const g=await geometry('#starting-points');await scroll(g.trigger-15);
   await p.mouse.wheel(0,30);await pause(900);assert.ok(Math.abs(await pos()-g.target)<2,`${width}x${height}`);
   const before=await pos();await p.mouse.wheel(0,-80);await pause(140);assert.ok(Math.abs(await pos()-before+80)<2);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:dir+`/笔记本_${height}.png`});
  }
  await p.keyboard.press('Home');await pause(100);assert.equal(await p.locator('html').getAttribute('data-home-scroll-phase'),'free');
 });
 await check('手机与减少动态效果保持原生滚动',async()=>{
  await p.emulateMedia({reducedMotion:'reduce'});await pause(60);assert.equal(await p.locator('html').getAttribute('data-home-scroll'),'native');
  await p.setViewportSize({width:390,height:844});await p.emulateMedia({reducedMotion:'no-preference'});await pause(90);
  assert.equal(await p.locator('html').getAttribute('data-home-scroll'),'native');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 checks.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
}finally{await fs.writeFile(dir+'/验证结果.json',JSON.stringify(checks,null,2));await browser.close();}
if(checks.some(c=>c.status==='fail'))process.exitCode=1;

