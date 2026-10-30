import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/Jimo白底材质_v3',phase=process.argv[2]||'first',base='http://127.0.0.1:5186';
await fs.mkdir(`${dir}/${phase}`,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage(),results=[],checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const shot=async name=>{await page.waitForTimeout(250);return page.screenshot({path:`${dir}/${phase}/${name}.png`});};
const check=async(name,fn)=>{await fn();checks.push({name,status:'pass'});};
const pause=async()=>{for(const selector of ['.operation-guide-progress>button','.operation-guide-dock']){if(await page.locator(selector).first().isVisible()){if(selector.includes('progress'))await page.locator(selector).click();else{const finish=page.locator(selector).getByRole('button',{name:'结束引导',exact:true});if(await finish.isVisible())await finish.click();}}}};
const seed=async(scene='PT04',logged=true,language='zh')=>{await page.goto(base);await page.evaluate(({KEY,s,logged,language})=>{s.logged=logged;localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',language);},{KEY,s:scenarioState(scene),logged,language});};
try{
await seed();
for(const width of [1440,768,390]){
await page.setViewportSize({width,height:width===390?844:1000});
for(const [name,route]of [['首页','/'],['职业','/careers'],['实践画布','/career-map?tab=技能先修&career=data'],['报告','/reports'],['工作区','/app'],['计划','/plan'],['评估','/assessment'],['学习','/learning'],['助手','/assistant'],['设置','/settings']]){
 await page.goto(base+route);await page.waitForTimeout(450);await pause();
 results.push({width,name,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 if(width!==768)await shot(`${width}-${name}`);
 if(name==='实践画布'&&width!==768){await page.locator('.atlas-dock').scrollIntoViewIfNeeded();await shot(`${width}-实践区`);}
 if(name==='报告'&&width!==768){await page.locator('.output-report-document').scrollIntoViewIfNeeded();await shot(`${width}-报告正文`);}
}
}
await page.setViewportSize({width:1440,height:1000});await page.goto(base);
await check('首页恢复原首屏，未挂载新增画面',async()=>{assert.equal(await page.locator('.hero-import-photo img').count(),1);assert.equal(await page.locator('.career-preview,.studio-compass,.closing-ticket').count(),0);});
await page.goto(base+'/careers');await pause();
await check('职业页白卡24px圆角，比较按钮双层边缘及选中反馈',async()=>{
 const card=page.locator('.occupation-grid>article').first();assert.equal(await card.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');assert.equal(await card.evaluate(e=>getComputedStyle(e).borderRadius),'24px');
 const b=card.locator('.occupation-actions>button');assert.notEqual(await b.evaluate(e=>getComputedStyle(e).boxShadow),'none');const old=await b.getAttribute('aria-pressed');await b.click();assert.notEqual(await b.getAttribute('aria-pressed'),old);
});
await page.goto(base+'/career-map?tab=技能先修&career=data');await pause();
await check('实际实践区白色24px表面，激活工具文字有对比',async()=>{
 assert.equal(await page.locator('.atlas-dock').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');assert.equal(await page.locator('.atlas-dock').evaluate(e=>getComputedStyle(e).borderRadius),'24px');
 const b=page.locator('.atlas-tool-choice>button[aria-pressed=true]').first();assert.equal(await b.evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
});
await page.goto(base+'/reports');await pause();
await check('报告正文白色24px纸面，阅读目录有一致选中状态',async()=>{
assert.equal(await page.locator('.output-report-document').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');assert.equal(await page.locator('.output-report-document').evaluate(e=>getComputedStyle(e).borderRadius),'24px');
const b=page.locator('.output-report-nav button').nth(1);await b.click();assert.equal(await b.getAttribute('aria-pressed'),'true');
});
await seed('PT01',false);await page.goto(base);await page.locator('.publicnav>button').click();await page.locator('.auth-dialog[open]').waitFor();
await check('首页上方弹窗，保留背景、尺寸内收和页面滚动锁',async()=>{
const b=await page.locator('.auth-dialog').boundingBox();assert.ok(b.width<1440&&b.x>20&&b.y>10);assert.match(page.url(),/5186\/?$/);assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).overflow),'hidden');assert.equal(await page.locator('.hero-import-photo img').count(),1);
});
await shot('1440-登录弹窗');
await check('表单在左、信息卡在右，取消和Esc恢复首页焦点',async()=>{
const form=await page.locator('.auth-form-region').boundingBox(),info=await page.locator('.auth-reference-panel').boundingBox();assert.ok(form.x<info.x);await page.keyboard.press('Escape');assert.equal(await page.locator('.auth-dialog[open]').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');assert.equal(await page.locator('.publicnav>button').evaluate(e=>document.activeElement===e),true);
});
await page.locator('.publicnav>button').click();
await check('邮箱、注册同意与找回流程继续可用',async()=>{
await page.getByLabel('示例邮箱',{exact:true}).fill('sample@example.com');await page.locator('.auth-modes button').nth(1).click();assert.equal(await page.locator('.auth-agree input').count(),1);await page.getByRole('button',{name:'忘记密码？',exact:true}).click();assert.equal(await page.getByLabel('示例邮箱',{exact:true}).inputValue(),'sample@example.com');await page.locator('.auth-submit').click();assert.match(await page.locator('.auth-feedback').innerText(),/没有发送邮件/);await page.locator('.auth-modes button').first().click();
});
await page.setViewportSize({width:390,height:844});await shot('390-登录弹窗');
await check('手机弹窗表单优先、可滚动、关闭可达且不横向溢出',async()=>{assert.equal(await page.locator('.auth-dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false);const f=await page.locator('.auth-form-region').boundingBox(),r=await page.locator('.auth-reference-panel').boundingBox();assert.ok(f.y<r.y);assert.ok(await page.locator('.auth-close').isVisible());await page.locator('.auth-close').click();});
await seed('PT01',false,'en');await page.goto(base);await page.locator('.publicnav>button').click();await shot('390-English-login');
await check('英文登录信息卡无中文残留，减少动态效果关闭过渡',async()=>{
assert.equal(/[\u4e00-\u9fff]/.test(await page.locator('.auth-form-region').innerText()+await page.locator('.auth-reference-panel').innerText()),false);await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.auth-notes-card').evaluate(e=>getComputedStyle(e).transform),'none');await page.keyboard.press('Escape');
});
await page.setViewportSize({width:320,height:844});
await check('320px英文首页及登录无横向溢出',async()=>{await page.goto(base);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('.publicnav>button').click();assert.equal(await page.locator('.auth-dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false);});
console.log(JSON.stringify({checks,errors,overflows:results.filter(r=>r.overflow)}));
}finally{await fs.writeFile(`${dir}/${phase}/results.json`,JSON.stringify({results,checks,errors},null,2));await browser.close();}
if(errors.length||results.some(r=>r.overflow))process.exitCode=1;
