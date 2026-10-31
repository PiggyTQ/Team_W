import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='检查记录/成果三幕_v61';await fs.mkdir(root,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5184');await page.waitForTimeout(1000);
const scroll=async(chapter,progress)=>{await page.locator('#outcomes').evaluate((el,{chapter,progress})=>{const top=el.getBoundingClientRect().top+scrollY-16;scrollTo({top:top+innerHeight*2.7*(chapter+progress)/3,behavior:'instant'});},{chapter,progress});await page.waitForTimeout(700);};
for(const [chapter,progress] of [[0,.12],[0,.43],[0,.95],[1,.43],[1,.95],[2,.43],[2,.95]]){await scroll(chapter,progress);await page.screenshot({path:`${root}/1440-${chapter}-${progress}.png`});assert.equal(await page.locator('.showcase-frame').getAttribute('data-chapter'),String(chapter));}
assert.ok((await page.locator('.showcase-frame').boundingBox()).height<=900);
await page.locator('.os-footer button').first().click();await page.waitForTimeout(500);assert.equal(await page.locator('.showcase-frame').getAttribute('data-chapter'),'0');
await page.locator('.os-reveal').click();await page.waitForTimeout(600);assert.equal(await page.locator('[data-os-scene="0"]').evaluate(e=>e.inert),false);
await page.locator('[data-os-scene="0"] button').click();await page.waitForTimeout(300);assert.ok(await page.getByRole('dialog').count()>0);await page.keyboard.press('Escape');
await page.goto('http://127.0.0.1:5184');await page.waitForTimeout(800);await scroll(1,.45);await page.mouse.move(900,500);const before=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,150);await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>scrollY)>before);await page.mouse.wheel(0,-150);await page.waitForTimeout(700);assert.ok(await page.evaluate(()=>scrollY)<before+30);
await page.locator('.os-stage').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(400);assert.equal(await page.locator('.showcase-frame').getAttribute('data-chapter'),'2');
for(const [width,height]of [[2514,1399],[1024,720]]){await page.setViewportSize({width,height});await page.waitForTimeout(600);await scroll(1,.95);const box=await page.locator('.showcase-frame').boundingBox();assert.ok(box.height<=height);await page.screenshot({path:`${root}/${width}-record.png`});}
await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(600);await page.getByRole('button',{name:'Use English',exact:true}).click();await page.waitForTimeout(500);await scroll(2,.95);assert.match(await page.locator('#outcomes-title').innerText(),/direction/);await page.screenshot({path:`${root}/1440-en.png`});

await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1000);assert.equal(await page.locator('#outcomes').getAttribute('data-os-mode'),'list');assert.equal(await page.locator('.os-finished').count(),3);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#outcomes').evaluate(e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:`${root}/390-en.png`});await page.getByRole('button',{name:'使用中文',exact:true}).click();await page.waitForTimeout(500);await page.screenshot({path:`${root}/390-zh.png`});
await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(600);assert.equal(await page.locator('#outcomes').getAttribute('data-os-mode'),'list');assert.deepEqual(errors,[]);
await fs.writeFile(`${root}/验证.json`,JSON.stringify({errors,result:'3 chapters; 7 progress states; mobile; reduced motion; no horizontal overflow'},null,2));await page.goto('file:///C:/Users/tsnbx/Desktop/team/project/设计参考与同步/设计稿/成果三幕连续展示_v61.svg');await page.setViewportSize({width:1440,height:950});await page.screenshot({path:'../设计参考与同步/设计稿/成果三幕连续展示_v61.png'});console.log('PASS: chapter controls, record modal, real wheel forward/reverse, keyboard, 4 screen sizes, English, reduced motion, no page errors');await browser.close();


