import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/工作区控件_v45',base='http://127.0.0.1:5184';await fs.mkdir(dir+'/实际截图',{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await b.newPage({viewport:{width:1440,height:1000}}),results=[],errors=[];p.setDefaultTimeout(6000);p.on('pageerror',e=>errors.push(e.message));
async function load(route,s='PT04',lang='zh'){await p.goto(base);await p.evaluate(({KEY,s,lang})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);},{KEY,s:typeof s==='string'?scenarioState(s):s,lang});await p.goto(base+route);await p.locator('.page-surface').waitFor();}
const state=()=>p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
async function check(name,fn){if(process.argv[2]&&!name.includes(process.argv[2]))return;try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,600));await p.screenshot({path:dir+'/fail-'+results.length+'.png'});}}
async function plateMatches(container){await p.waitForTimeout(260);const dimensions=await container.evaluate(el=>{const active=el.querySelector(':scope>[aria-current=page],:scope>[aria-pressed=true],:scope>.selected'),plate=el.querySelector('.selection-plate');if(!active||!plate)return null;const a=active.getBoundingClientRect(),b=plate.getBoundingClientRect();return{dx:Math.abs(a.x-b.x),dy:Math.abs(a.y-b.y),dw:Math.abs(a.width-b.width),dh:Math.abs(a.height-b.height)};});assert.ok(dimensions, 'active plate exists');assert.ok(Object.values(dimensions).every(v=>v<1.5),JSON.stringify(dimensions));}
try{
 await check('全局搜索即时结果、鼠标直达、清空、无结果及全部结果出口',async()=>{
  await load('/app');const before=await state();const input=p.getByRole('combobox',{name:'工作区搜索',exact:true});await input.fill('SQL');const list=p.getByRole('listbox',{name:'工作区搜索结果',exact:true});assert.ok(await list.isVisible());assert.ok(await list.getByRole('option').count()>0);await p.screenshot({path:dir+'/实际截图/1440-搜索结果.png'});
  await list.getByRole('option').filter({hasText:'数据分析'}).click();assert.equal(new URL(p.url()).searchParams.get('career'),'data');assert.deepEqual((await state()).tasks,before.tasks);
  await input.fill('找不到的合成条件XYZ');assert.ok(await p.getByText('没有找到匹配内容',{exact:true}).isVisible());await p.getByRole('button',{name:'清空工作区搜索',exact:true}).click();assert.equal(await input.inputValue(),'');assert.equal(await list.getByRole('option').count(),6);
  await input.fill('SQL');await p.getByRole('button',{name:'查看全部结果',exact:true}).click();assert.equal(new URL(p.url()).searchParams.get('q'),'SQL');assert.equal(new URL(p.url()).searchParams.has('career'),false);
 });
 await check('搜索快捷键、方向键选择、Escape与Tab离开可用',async()=>{
  await load('/plan');await p.keyboard.press('Control+k');const input=p.getByRole('combobox',{name:'工作区搜索',exact:true});assert.equal(await input.evaluate(e=>e===document.activeElement),true);await input.fill('SQL');await input.press('ArrowDown');assert.ok(await input.getAttribute('aria-activedescendant'));await input.press('Enter');assert.equal(new URL(p.url()).pathname,'/careers');
  await input.focus();await input.press('Escape');assert.equal(await p.locator('.workspace-search-results').count(),0);await input.focus();await input.press('ArrowDown');await input.press('Escape');assert.equal(await input.getAttribute('aria-expanded'),'false');
  await input.fill('SQL');await p.getByLabel('搜索范围',{exact:true}).focus();await p.getByLabel('搜索范围',{exact:true}).press('Tab');await p.keyboard.press('Tab');assert.equal(await p.locator('.workspace-search-results').count(),0);
  await p.setViewportSize({width:390,height:480});await load('/app');await p.getByRole('combobox',{name:'工作区搜索',exact:true}).focus();await p.getByRole('combobox',{name:'工作区搜索',exact:true}).press('ArrowUp');const selected=p.locator('.workspace-search-results [aria-selected=true]');await selected.waitFor();const row=await selected.boundingBox(),footer=await p.locator('.search-result-footer').boundingBox();assert.ok(row.y+row.height<=footer.y+1);await p.setViewportSize({width:1440,height:1000});
 });
 await check('本人任务搜索续用同一记录，暂停任务进入恢复预检',async()=>{
  await load('/app');await p.getByLabel('搜索范围',{exact:true}).selectOption('本人任务');await p.getByRole('combobox',{name:'工作区搜索',exact:true}).fill('数据质量');await p.getByRole('listbox',{name:'工作区搜索结果',exact:true}).getByRole('option').first().click();assert.equal(new URL(p.url()).pathname,'/work/task-demo');assert.equal((await state()).tasks.length,1);
  const s=scenarioState('PT04');s.tasks[0].status='取消';await load('/app',s);await p.getByLabel('搜索范围',{exact:true}).selectOption('本人任务');await p.getByRole('combobox',{name:'工作区搜索',exact:true}).fill('数据质量');await p.getByRole('listbox',{name:'工作区搜索结果',exact:true}).getByRole('option').first().click();assert.ok(await p.locator('dialog[open]').isVisible());assert.equal((await state()).tasks[0].status,'取消');
 });
 await check('计划、目录与日程分段切换支持键盘，活动底板精确跟随',async()=>{
  await load('/plan');const tabs=p.locator('.page-surface>.tabs');await plateMatches(tabs);await tabs.getByRole('link',{name:'计划总览',exact:true}).focus();await p.keyboard.press('ArrowRight');assert.equal(new URL(p.url()).searchParams.get('tab'),'执行');await plateMatches(tabs);const view=p.getByRole('group',{name:'行动显示方式',exact:true});await view.getByRole('link',{name:'日程',exact:true}).click();await plateMatches(view);const calendar=p.getByRole('group',{name:'日程显示范围',exact:true});await calendar.getByRole('button',{name:'周',exact:true}).focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('.week-grid>section').count(),1);await plateMatches(calendar);await p.reload();assert.equal(await p.locator('.week-grid>section').count(),1);
  await load('/app');const group=p.getByRole('group',{name:'功能分组',exact:true});await group.getByRole('button',{name:'职业成长',exact:true}).focus();await p.keyboard.press('End');assert.equal(await group.getByRole('button',{name:'工具与账户',exact:true}).getAttribute('aria-pressed'),'true');await plateMatches(group);
 });
 await check('预计投入容量、真实明细、未知与超预算不混同进度',async()=>{
  await load('/plan');const before=await state();const capacity=p.locator('.weekly-budget .budget-capacity');assert.equal(await capacity.locator('.capacity-rail>.capacity-segment').count(),1);assert.equal(await capacity.getByRole('meter').getAttribute('aria-valuenow'),'2');await capacity.locator('summary').click();assert.equal(await capacity.locator('.capacity-task').count(),1);await p.screenshot({path:dir+'/实际截图/1440-预算明细.png'});await capacity.locator('.capacity-task a').click();assert.equal(new URL(p.url()).pathname,'/work/task-demo');assert.deepEqual((await state()).tasks,before.tasks);
  const unknown=scenarioState('PT04');unknown.budget=null;await load('/plan',unknown);assert.equal(await p.locator('.budget-capacity').getAttribute('data-state'),'unknown');assert.equal(await p.locator('.budget-capacity').getByRole('meter').count(),0);
  const over=scenarioState('PT04');over.budget=1;await load('/plan',over);assert.equal(await p.locator('.budget-capacity').getAttribute('data-state'),'over');assert.match(await p.locator('.capacity-legend').innerText(),/超出.*1/s);await p.screenshot({path:dir+'/实际截图/1440-预算超额.png'});
 });
 await check('任务独立状态节点可往返，浏览不提交或完成',async()=>{
  await load('/work/task-demo');const before=await state(),trail=p.getByRole('navigation',{name:'任务过程与独立状态',exact:true});assert.equal(await trail.getByRole('link').count(),4);await trail.getByRole('link').filter({hasText:'成果尝试'}).click();assert.equal(new URL(p.url()).searchParams.get('tab'),'尝试与反馈');assert.equal((await state()).tasks[0].completed,before.tasks[0].completed);assert.equal((await state()).tasks[0].attempts.length,before.tasks[0].attempts.length);await trail.getByRole('link').filter({hasText:'个人材料确认'}).click();assert.equal(new URL(p.url()).searchParams.get('tab'),'完成回执');await p.screenshot({path:dir+'/实际截图/1440-任务过程.png'});
  const s=scenarioState('PT04');s.tasks[0].attempts=[{id:'attempt-v45',version:1,text:'合成检查',result:'自检记录'}];s.claims=[{id:'claim-v45',version:1,title:'合成成果',text:'仅本轮合成范围',status:'待确认',taskId:s.tasks[0].id,attemptId:'attempt-v45',skill:'SQL'}];await load('/work/task-demo',s);await p.locator('.milestone-trail a').filter({hasText:'个人材料确认'}).click();assert.equal(new URL(p.url()).pathname,'/assessment');assert.equal(new URL(p.url()).searchParams.get('tab'),'原文确认');assert.equal((await state()).claims[0].status,'待确认');
 });
 await check('提醒开关保存与刷新保持，不改变目标或任务',async()=>{
  await load('/settings');const before=await state(),toggle=p.getByRole('switch',{name:/开启站内复盘提醒/});assert.equal(await toggle.isChecked(),true);await toggle.uncheck();await p.reload();assert.equal(await toggle.isChecked(),false);assert.equal((await state()).goal,before.goal);assert.deepEqual((await state()).tasks,before.tasks);
 });
 await check('桌面手机与英文：长切换标签、搜索弹层和预算均可操作',async()=>{
  for(const width of [1440,1024,390,360])for(const lang of ['zh','en']){
   await p.setViewportSize({width,height:width<721?844:1000});for(const [name,route]of [['计划','/plan'],['任务','/work/task-demo'],['学习','/learning'],['设置','/settings']]){await load(route,'PT04',lang);assert.ok(await p.locator('main').evaluate(e=>e.scrollWidth<=e.clientWidth+1),width+lang+name);const tabs=p.locator('.page-surface>.tabs');if(await tabs.count())await plateMatches(tabs);if(width!==360&&width!==1024)await p.screenshot({path:`${dir}/实际截图/${width}-${lang}-${name}.png`});}
   await load('/app','PT04',lang);await p.getByLabel(lang==='en'?'Search workspace':'工作区搜索',{exact:true}).fill('SQL');const pop=await p.locator('.workspace-search-results').boundingBox();assert.ok(pop.x>=0&&pop.x+pop.width<=width+1&&pop.y>=0);assert.ok(await p.locator('.workspace-search-results').evaluate(e=>e.scrollWidth<=e.clientWidth+1));if(width===390)await p.screenshot({path:`${dir}/实际截图/390-${lang}-搜索.png`});
  }
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});await fs.writeFile(dir+(process.argv[2]?'/'+process.argv[2]+'专项验收.json':'/控件验收.json'),JSON.stringify(results,null,2));
}finally{await b.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
