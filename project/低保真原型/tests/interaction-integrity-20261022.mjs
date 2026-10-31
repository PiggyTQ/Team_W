import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';

const dir='检查记录/控件可操作性_20261022/after';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await browser.newPage({reducedMotion:'reduce'}),results=[],errors=[];
p.setDefaultTimeout(7000);p.on('pageerror',e=>errors.push(e.message));
async function load(route,scene='PT05',width=1440,lang='zh',goal='data'){
 await p.setViewportSize({width,height:width===390?844:1000});
 await p.goto('http://127.0.0.1:5184/plan');
 const s=scenarioState(scene);s.goal=goal;
 await p.evaluate(({s,key,lang})=>{localStorage.setItem(key,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));},{s,key:KEY,lang});
 await p.goto('http://127.0.0.1:5184'+route);await p.locator('main').waitFor();
}
const state=()=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,650));await p.screenshot({path:dir+'/失败-'+results.length+'.png'});}}
try{
 await check('工作、工具、成果三个入口鼠标与键盘均打开对应内容，保持当前方向和业务记录',async()=>{
  for(const goal of ['data','frontend'])for(const [width,lang] of [[1440,'zh'],[390,'zh'],[390,'en']])for(let i=0;i<3;i++){
   await load('/app','PT05',width,lang,goal);const before=await state(),nav=p.locator('.home-map-route');
   assert.equal(await nav.getAttribute('aria-hidden'),null);assert.equal(await nav.getByRole('link').count(),3);
   const link=nav.getByRole('link').nth(i);await link.scrollIntoViewIfNeeded();
   const box=await link.boundingBox();assert.ok(box.height>=44&&box.width>=44);
   if(i===1){await link.focus();await link.press('Enter');}else await link.click();
   const url=new URL(p.url());assert.equal(url.pathname,['/careers','/career-map','/assessment'][i]);
   if(i===0){assert.equal(url.searchParams.get('career'),goal);assert.equal(await p.locator('.career-detail-actions').count(),1);}
   if(i===1){assert.equal(url.searchParams.get('career'),goal);assert.equal(await p.locator('.work-atlas').count(),1);}
   if(i===2){assert.equal(url.hash,'#assessment-profile');assert.equal(await p.locator('#assessment-profile').count(),1);}
   const after=await state();for(const key of ['goal','tasks','claims','reviews','planVersion'])assert.deepEqual(after[key],before[key]);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  }
 });
 await check('只读状态与比较数量不再使用按钮边框，实际状态仍可读',async()=>{
  for(const route of ['/app','/careers?tab=比较','/assessment','/plan?tab=执行','/plan?tab=复盘','/work/task-demo?tab=完成回执','/reports']){
   await load(route);
   const tags=await p.locator('main.workspace span.status-chip,main.workspace span.pill').evaluateAll(list=>list.filter(e=>e.getBoundingClientRect().height>0).map(e=>({text:e.textContent,border:parseFloat(getComputedStyle(e).borderTopWidth),cursor:getComputedStyle(e).cursor,role:e.getAttribute('role'),tabIndex:e.tabIndex})));
   for(const tag of tags){assert.ok(tag.text.trim());assert.equal(tag.border,0,route+': '+tag.text);assert.notEqual(tag.cursor,'pointer');assert.notEqual(tag.role,'button');assert.ok(tag.tabIndex<0);}
  }
 });
 await check('方向比较保留至少两个方向的校验，选择后按钮可实际定位结果',async()=>{
  await load('/careers?tab=比较','PT01');const button=p.getByRole('button',{name:'查看比较',exact:true});
  assert.equal(await button.isDisabled(),true);assert.match(await button.getAttribute('title'),/至少选择两个方向/);
  assert.equal(await button.getAttribute('aria-describedby'),'career-comparison-requirements');
  await p.locator('.compare-option input').nth(0).check();await p.locator('.compare-option input').nth(1).check();
  assert.equal(await button.isEnabled(),true);await button.click();assert.equal(await p.locator('#comparison-result').count(),1);
  assert.equal((await state()).compare.length,2);
 });
 await check('岗位比较明确启用条件，选中两项后展开和关闭真实对照',async()=>{
  await load('/careers?tab=企业与岗位');const button=p.getByRole('button',{name:'比较所选岗位',exact:true});
  assert.equal(await button.isDisabled(),true);assert.match(await p.locator('#job-comparison-requirements').innerText(),/选择2至3个岗位/);
  for(let i=0;i<2;i++)await p.locator('.discovery-job-card').getByRole('button',{name:'加入比较',exact:true}).first().click();
  assert.equal(await button.isEnabled(),true);await button.click();assert.equal(await p.locator('.discovery-comparison table thead th').count(),3);
  await p.getByRole('button',{name:'关闭字段比较',exact:true}).click();assert.equal(await p.locator('.discovery-comparison').count(),0);
 });
 await check('空白发送显示原因，填写后能发送模拟问题',async()=>{
  await load('/assistant');const input=p.getByRole('textbox',{name:'当前问题（本机自动保留）',exact:true}),button=p.getByRole('button',{name:'发送并显示模拟结果',exact:true});
  await input.fill('');assert.equal(await button.isDisabled(),true);assert.match(await p.locator('#assistant-input-requirement').innerText(),/先输入问题后再发送/);
  const question='控件检查：如何核对已有材料（合成测试）';await input.fill(question);assert.equal(await button.isEnabled(),true);await button.click();
  await p.getByText(question,{exact:true}).first().waitFor();assert.ok((await state()).conversations.some(c=>c.messages.some(m=>m.text===question||m.content===question||JSON.stringify(m).includes(question))));
 });
 await check('桌面、手机和英文入口可读，截图与状态样式一致',async()=>{
  for(const [width,lang] of [[1440,'zh'],[390,'zh'],[1440,'en'],[390,'en']]){
   await load('/app','PT05',width,lang);const area=p.locator('.home-map-entry');await area.scrollIntoViewIfNeeded();
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   if(lang==='en')assert.doesNotMatch(await area.innerText(),/[\u4e00-\u9fff]/);
   await p.screenshot({path:`${dir}/${width}-${lang}-工作区入口.png`});await area.screenshot({path:`${dir}/${width}-${lang}-入口局部.png`});
  }
 });
}finally{await browser.close();await fs.writeFile(dir+'/实际交互验收.json',JSON.stringify({results,errors},null,2));}
if(errors.length||results.some(r=>r.status==='fail'))process.exitCode=1;
