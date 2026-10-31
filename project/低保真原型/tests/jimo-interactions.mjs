import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/Jimo视觉深化_20261023';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),checks=[];
const check=async(name,fn)=>{await fn();checks.push({name,status:'pass'});};
try{
await page.goto('http://127.0.0.1:5186/');
await page.evaluate(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s:scenarioState('PT04')});
await page.goto('http://127.0.0.1:5186/app');
if(await page.locator('.operation-guide-progress>button').isVisible())await page.locator('.operation-guide-progress>button').click();
await check('工作区蓝紫表面与深海军蓝主按钮',async()=>{
assert.equal(await page.locator('.home-scope').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(245, 242, 254)');
assert.equal(await page.locator('.home-current .primary').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(7, 19, 49)');
});
await check('主任务入口仍进入同一任务，不改变业务状态',async()=>{
const before=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
await page.locator('.home-current .primary').click();await page.waitForTimeout(250);
assert.match(page.url(),/work\/task-demo/);
const after=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
assert.equal(after.tasks[0].id,before.tasks[0].id);assert.equal(after.tasks[0].completed,before.tasks[0].completed);
});
await page.goto('http://127.0.0.1:5186/');
await page.locator('#directions').scrollIntoViewIfNeeded();
await check('职业书册悬停开启，焦点可见且详情按钮可操作',async()=>{
const card=page.locator('.direction-gallery-card[data-loop-copy="0"]').first();
await card.hover();await page.waitForTimeout(350);
assert.notEqual(await card.locator('.career-book-cover').evaluate(e=>getComputedStyle(e).transform),'none');
await card.getByRole('button').focus();assert.equal(await card.getByRole('button').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
await card.getByRole('button').click();await page.locator('dialog[open]').waitFor();
assert.match(await page.locator('dialog[open]').innerText(),/数据分析/);
await page.keyboard.press('Escape');
});
await page.emulateMedia({reducedMotion:'reduce'});
await page.reload();await page.locator('#directions').scrollIntoViewIfNeeded();
await check('减少动态效果时书册静止，展廊停止自动播放',async()=>{
assert.equal(await page.locator('.career-book').first().evaluate(e=>getComputedStyle(e).transform),'none');
assert.equal(await page.locator('.career-book-cover').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
assert.notEqual(await page.locator('#directions').getAttribute('data-gallery-playing'),'true');
});
await page.evaluate(()=>localStorage.setItem('career-prototype-language','en'));
await page.reload();await page.locator('#directions').scrollIntoViewIfNeeded();
await check('新增书册说明支持英文',async()=>assert.equal(await page.locator('.career-book-cover i').first().innerText(),'Career notes / Work & outputs'));
await page.screenshot({path:dir+'/after/1440-English-books.png'});
await check('320px英文首页、工作区与计划无横向溢出',async()=>{
await page.setViewportSize({width:320,height:844});
for(const route of ['/','/app','/plan']){await page.goto('http://127.0.0.1:5186'+route);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
});
}finally{await fs.writeFile(dir+'/interaction-results.json',JSON.stringify(checks,null,2));await browser.close();}
console.log(JSON.stringify(checks));
