import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const dir='检查记录/首页滚动揭示_v23';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const check=async(name,fn)=>{try{await fn();checks.push({name,status:'pass'});console.log('PASS',name);}catch(e){checks.push({name,status:'fail',message:e.message});console.log('FAIL',name,e.message);}};
const scroll=async(y)=>{await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await page.waitForTimeout(180);};
const absolute=selector=>page.locator(selector).evaluate(el=>el.getBoundingClientRect().top+scrollY);
const opacity=selector=>page.locator(selector).evaluateAll(nodes=>nodes.map(el=>+getComputedStyle(el).opacity));
try{
 await page.goto('http://127.0.0.1:5184/');
 await page.locator('#intro-title .motion-unit').first().waitFor();
 await page.waitForTimeout(1200);
 await check('首屏文字完整，主要入口可用',async()=>{
   assert.ok((await opacity('#intro-title .motion-unit')).every(v=>v===1));
   assert.ok(await page.locator('.intro-actions .primary').isVisible());
   assert.ok((await page.locator('#intro-title').ariaSnapshot()).includes('找到想探索的方向'));
   await page.screenshot({path:dir+'/桌面_首屏.png'});
 });
 await check('成果画布随滚动连续展开，反向恢复收口',async()=>{
   const top=await absolute('#outcomes');
   await scroll(top-750);
   const initial=await page.locator('.outcome-aperture').evaluate(el=>getComputedStyle(el).clipPath);
   await scroll(top-420);
   const middle=await page.locator('.outcome-aperture').evaluate(el=>getComputedStyle(el).clipPath);
   await page.screenshot({path:dir+'/桌面_展开中.png'});
   await scroll(top-130);
   const end=await page.locator('.outcome-aperture').evaluate(el=>getComputedStyle(el).clipPath);
   assert.notEqual(initial,middle);assert.notEqual(middle,end);
   await page.screenshot({path:dir+'/桌面_展开完成.png'});
   await scroll(top-750);
   assert.equal(await page.locator('.outcome-aperture').evaluate(el=>getComputedStyle(el).clipPath),initial);
   checks.push({name:'展开采样',initial,middle,end});
 });
 await check('后半页文字逐字加深并支持反向回看',async()=>{
   const selector='#story-continuation-title .motion-unit',top=await absolute('#story-continuation-title');
   await scroll(top-750);const first=await opacity(selector);
   await scroll(top-600);const middle=await opacity(selector);
   assert.ok(middle.some(v=>v>.22&&v<1));assert.ok(middle.some((v,i)=>v>first[i]));
   await page.screenshot({path:dir+'/桌面_文字显现中.png'});
   await scroll(top-350);assert.ok((await opacity(selector)).every(v=>v>.99));
   await scroll(top-750);assert.ok((await opacity(selector)).some(v=>v<.5));
 });
 await check('原成果十五状态与键盘边界可用',async()=>{
   for(let stage=0;stage<5;stage++){
     await page.locator('.outcome-stage-nav button').nth(stage).click();
     for(let phase=0;phase<3;phase++){
       await page.getByRole('navigation',{name:'成果形成过程'}).getByRole('button').nth(phase).click();
       assert.equal(await page.locator('.outcome-stage-layout').getAttribute('data-outcome-phase'),String(phase));
       assert.equal(await page.locator('.outcome-stage-layout').getAttribute('data-outcome-stage'),String(stage));
     }
   }
   await page.locator('.outcome-canvas').focus();await page.keyboard.press('Home');
   assert.ok(await page.getByRole('button',{name:'上一个展示步骤'}).isDisabled());
   assert.equal(await page.locator('.outcome-aperture').evaluate(el=>getComputedStyle(el).clipPath),'none');
 });
 await check('手机与平板自然阅读，无整页横向溢出',async()=>{
   for(const width of [768,390,320]){
     await page.setViewportSize({width,height:844});await scroll(0);await page.waitForTimeout(500);
     assert.equal(await page.locator('#outcomes').getAttribute('data-outcome-mode'),'list');
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
     assert.equal(await page.locator('.outcome-aperture').evaluate(el=>getComputedStyle(el).clipPath),'none');
     await page.screenshot({path:dir+`/窄屏_${width}.png`});
   }
 });
 await check('减少动态效果直接显示完整文字和画布，切换可清理旧动画',async()=>{
   await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'reduce'});await scroll(0);
   assert.ok((await opacity('.motion-unit')).every(v=>v===1));
   assert.equal(await page.locator('.outcome-aperture').evaluate(el=>getComputedStyle(el).clipPath),'none');
   await page.screenshot({path:dir+'/减少动态效果.png'});
   await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(1200);
   assert.ok((await opacity('#intro-title .motion-unit')).every(v=>v===1));
 });
 await check('中英文切换后重新分词，不出现原文与译文叠加',async()=>{
   const en=page.getByRole('button',{name:'Use English',exact:true});await en.click();await page.waitForTimeout(1300);
   assert.ok(!/[\u4e00-\u9fff]/u.test(await page.locator('#intro-title .motion-sr-only').innerText()));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:dir+'/英文_首屏.png'});
 });
 await check('切换业务页再返回后动效正常重新挂载',async()=>{
   await page.goto('http://127.0.0.1:5184/careers');await page.locator('main').waitFor();
   await page.goto('http://127.0.0.1:5184/');await page.locator('#intro-title').waitFor();await page.waitForTimeout(1300);
   assert.ok((await opacity('#intro-title .motion-unit')).every(v=>v===1));
 });
 checks.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
}finally{
 await fs.writeFile(dir+'/验证结果.json',JSON.stringify(checks,null,2));
 await browser.close();
}
if(checks.some(c=>c.status==='fail'))process.exitCode=1;
