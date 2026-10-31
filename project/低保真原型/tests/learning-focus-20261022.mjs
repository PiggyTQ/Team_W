import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState,learning} from '../src/model.js';

const base='http://127.0.0.1:5184',root='检查记录/链路与布局聚焦_20261022',dir=root+'/after';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({reducedMotion:'reduce'}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
const readState=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function load(scene='PT01',route='/learning',language='zh'){
 await page.goto(base);
 await page.evaluate(({key,state,language})=>{
  localStorage.setItem(key,JSON.stringify(state));
  localStorage.setItem('career-prototype-sidebar-v1','expanded');
  localStorage.setItem('career-prototype-language',language);
  localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));
 },{key:KEY,state:scenarioState(scene),language});
 await page.goto(base+route);await page.locator('.learning-focus').waitFor();
}
try{
 for(const width of [1440,1024,390,320])for(const scene of ['PT01','PT05']){
  await page.setViewportSize({width,height:width<=390?844:900});await load(scene);
  assert.equal(await page.locator('.learning-card').count(),4);
  assert.equal(await page.locator('.learning-reading-disclosure[open]').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const primary=await page.locator('.learning-card').first().locator('.actions>.primary').innerText();
  assert.equal(primary,'阅读 / 恢复位置');
  const firstCard=await page.locator('.learning-card').first().boundingBox();
  const reading=await page.getByRole('button',{name:primary,exact:true}).first().boundingBox();
  const continueTask=scene==='PT05'?await page.locator('.learning-continuation').getByRole('button',{name:'继续同一任务',exact:true}).boundingBox():null;
  if(width===1440||width===390)await page.screenshot({path:`${dir}/${width}-学习资源-${scene}-首屏.png`});
  const card=page.locator('.learning-card').first();
  await card.getByRole('button',{name:'预览范围与成果',exact:true}).click();
  assert.equal(await card.locator('.learning-reading-disclosure[open]').count(),1);
  assert.equal(await card.getByRole('combobox',{name:'数据质量小项目的实践范围',exact:true}).inputValue(),'最小范围');
  if(width===1440||width===390)await card.screenshot({path:`${dir}/${width}-学习资源-${scene}-实践展开.png`});
  assert.equal((await readState()).tasks.length,scene==='PT05'?1:0);
  results.push({width,scene,overflow:false,firstCard,reading,continueTask});
 }
 await page.setViewportSize({width:1440,height:900});await load();
 let chapterLinks=0;
 for(const [index,unit] of learning.entries()){
  const card=page.locator('.learning-card').nth(index);
  await card.locator('.learning-reading-disclosure>summary').click();
  for(const [chapter,title] of unit.chapters.entries()){
   await card.getByRole('button',{name:'阅读'+unit.title+'：'+title,exact:true}).click();
   const dialog=page.locator('dialog[open]');await dialog.waitFor();
   assert.equal(await dialog.locator('nav button[aria-pressed=true]').innerText(),title);
   await page.keyboard.press('Escape');chapterLinks++;
  }
 }
 assert.equal(chapterLinks,16);assert.equal((await readState()).tasks.length,0);
 const card=page.locator('.learning-card').first();
 await card.getByRole('button',{name:'阅读 / 恢复位置',exact:true}).click();
 await page.locator('dialog[open] nav button').nth(2).click();
 await page.getByRole('button',{name:'保存位置并返回',exact:true}).click();
 assert.equal((await readState()).reading.quality.chapter,2);
 await page.reload();await page.locator('.learning-focus').waitFor();
 await page.locator('.learning-card').first().getByRole('button',{name:'阅读 / 恢复位置',exact:true}).click();
 assert.equal(await page.locator('dialog[open] nav button[aria-pressed=true]').innerText(),learning[0].chapters[2]);
 await page.keyboard.press('Escape');
 await card.getByRole('button',{name:'收藏数据质量小项目',exact:true}).click();
 await page.getByRole('link',{name:'收藏（1）',exact:true}).click();
 assert.equal(await page.locator('.learning-card').count(),1);
 await page.reload();assert.equal(await page.locator('.learning-card').count(),1);
 await card.getByRole('button',{name:'取消收藏数据质量小项目',exact:true}).click();
 assert.equal(await page.locator('.light-empty').count(),1);
 await load('PT01','/learning?tab=短体验&hours=2%20小时以内');
 await card.getByRole('button',{name:'预览范围与成果',exact:true}).click();
 await card.getByRole('combobox',{name:'数据质量小项目的实践范围',exact:true}).selectOption('标准范围');
 assert.equal(new URL(page.url()).searchParams.get('tab'),'短体验');
 assert.equal(new URL(page.url()).searchParams.get('hours'),'2 小时以内');
 assert.equal(new URL(page.url()).searchParams.get('range'),'标准范围');
 await card.getByRole('button',{name:'选择范围并开始预检',exact:true}).click();
 await page.locator('dialog[open]').waitFor();assert.equal(await page.locator('dialog[open]').getByRole('textbox',{name:'行动标题',exact:true}).inputValue(),'数据质量小项目');
 assert.equal((await readState()).tasks.length,0);await page.keyboard.press('Escape');
 await card.getByRole('button',{name:'资源不可用怎么办？',exact:true}).click();
 await page.locator('dialog[open]').waitFor();assert.match(await page.locator('dialog[open]').innerText(),/替代内容/);
 await page.keyboard.press('Escape');
 await load('PT05','/learning?collection=我的学习');
 assert.equal(await page.locator('.learning-card').count(),1);
 await page.locator('.learning-continuation').getByRole('button',{name:'继续同一任务',exact:true}).click();
 assert.match(page.url(),/\/work\/task-demo/);assert.equal((await readState()).tasks.length,1);
 await load('PT01','/learning?tab=综合项目&unit=quality');
 assert.equal(await card.getByRole('combobox',{name:'数据质量小项目的实践范围',exact:true}).inputValue(),'标准范围');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:900});await load('PT01','/learning','en');
  await page.screenshot({path:`${dir}/${width}-学习资源-英文-首屏.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.equal(await page.getByText('Requirements and chapters',{exact:true}).count(),4);
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(root+'/学习专项验证.json',JSON.stringify({results,chapterLinks,checks:['default disclosure and reading priority','16 direct chapter links','reading-position save and reload','favorites and empty state','preview query parameters','practice precheck without task creation','unavailable-resource recovery','existing-task continuation without duplication','project range default','desktop/mobile English'],errors},null,2));
 console.log('PASS learning focus: 8 layout states, 16 chapter links, reading/favorite persistence, scope/precheck/recovery, same-task continuation, 2 English states.');
}finally{await browser.close();}
