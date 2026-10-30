import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState,careers} from '../src/model.js';
import {branchesFor} from '../src/career-atlas-model.js';
const dir='检查记录/地图支线_v42';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await browser.newPage({viewport:{width:1440,height:1080}}),results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(4500);
async function visit(path,state='PT01',language='zh'){await p.goto('http://127.0.0.1:5184/');await p.evaluate(({KEY,s,language})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',language);},{KEY,s:typeof state==='string'?scenarioState(state):state,language});await p.goto('http://127.0.0.1:5184'+path);await p.locator('.work-atlas').waitFor();}
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,1800));await p.screenshot({path:dir+'/final-fail-'+results.length+'.png',fullPage:true});}}
try{
 await check('20 branches have translated questions, outputs, steps and controls',async()=>{
  for(const c of careers)for(const b of branchesFor(c.id)){
   await visit(`/career-map?career=${c.id}&tab=职业关系&relation=细分方向&node=branch:${b.id}`,'PT01','en');await p.locator('.atlas-practice-steps summary').click();
   for(const selector of ['.atlas-explore-bar','.atlas-dock']){const text=await p.locator(selector).innerText();assert.ok(!/[\u3400-\u9fff]/.test(text),c.id+b.id+' '+text);}
  }
 });
 await check('English desktop/mobile branch layouts, long practice steps and skill controls remain readable',async()=>{
  for(const width of [1440,1024,390]){
   await p.setViewportSize({width,height:width===390?844:1080});
   for(const [name,path]of [['支线','/career-map?career=frontend&tab=职业关系&relation=细分方向&node=branch:interface'],['工具','/career-map?node=skill:sheet']]){
    await visit(path,'PT01','en');await p.locator('.atlas-practice-steps summary').click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    for(const selector of ['.atlas-explore-bar','.atlas-dock-actions','.atlas-practice-steps'])assert.ok(!/[\u3400-\u9fff]/.test(await p.locator(selector).innerText()),selector+' '+await p.locator(selector).innerText());
    if(width===390&&name==='支线')assert.ok(await p.locator('.atlas-branches').evaluate(el=>{const range=document.createRange();range.selectNodeContents(el.querySelector('h3'));return range.getBoundingClientRect().right<el.querySelector('div').getBoundingClientRect().left-4;}),'Career title must not touch the branch stem');
    await p.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);document.querySelector('main')?.scrollTo(0,0);});await p.screenshot({path:`${dir}/${width}-EN-${name}.png`,fullPage:true});
   }
  }
 });
 await check('browser history restores branch, graph/list selection, and invalid links offer valid content',async()=>{
  await visit('/career-map?career=data&tab=职业关系&relation=细分方向&node=branch:business');await p.locator('.atlas-branches button').nth(1).click();await p.goBack();assert.equal(await p.locator('.atlas-dock h2').innerText(),'业务分析');await p.goForward();assert.equal(await p.locator('.atlas-dock h2').innerText(),'数据质量');
  await visit('/career-map?career=invalid&range=bad&node=skill:nope');assert.equal(await p.locator('.atlas-station.is-selected').getAttribute('data-skill'),'foundation');await p.locator('.atlas-phase-buttons button').nth(2).click();assert.equal(await p.locator('.atlas-station.is-selected').getAttribute('data-skill'),'quality');
 });
 await check('S1 tool route stays in manual record; projection source can be reviewed without giving AI private material',async()=>{
  const state=scenarioState('PT01');state.stage='S1';await visit('/career-map?node=skill:sheet',state);await p.locator('.atlas-dock-actions .primary').click();await p.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();await p.locator('.external-practice').waitFor();assert.match(p.url(),/practice=/);await p.locator('.atlas-task-context>a').click();assert.equal(await p.locator('.atlas-station.is-selected').getAttribute('data-skill'),'sheet');
  await visit('/career-map?node=skill:sql','PT04');await p.locator('.atlas-material-picker>summary').click();await p.locator('.atlas-material-content>button').filter({hasText:'SQL 报告'}).click();await p.locator('.atlas-material-basis summary').click();assert.match(await p.locator('.atlas-material-basis').innerText(),/使用合成表记录查询思路/);await p.getByRole('button',{name:'就这一步问 AI',exact:true}).click();const saved=await p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);assert.ok(!saved.aiDraft.includes('使用合成表记录查询思路'));assert.deepEqual(saved.aiScope,['职业原创知识']);
 });
 await check('reduced motion, native fullscreen, keyboard phase and equivalent relation list remain usable',async()=>{
  await p.setViewportSize({width:1440,height:1080});await p.emulateMedia({reducedMotion:'reduce'});await visit('/career-map');await p.getByRole('button',{name:'专注查看',exact:true}).click();assert.ok(await p.locator('.work-atlas').evaluate(el=>document.fullscreenElement===el));await p.getByRole('button',{name:'退出专注',exact:true}).click();assert.equal(await p.evaluate(()=>document.fullscreenElement),null);
  await visit('/career-map?tab=职业关系&node=neighbor');await p.locator('.atlas-options>summary').click();await p.getByLabel('查看方式',{exact:true}).selectOption('列表');await p.locator('.atlas-options>summary').click();assert.equal(await p.locator('.atlas-list>button').count(),3);assert.match(await p.locator('.atlas-list>button[aria-pressed=true]').innerText(),/人工智能/);await p.locator('.atlas-list>button').first().focus();await p.locator('.atlas-list>button').first().press('Enter');assert.match(await p.locator('.atlas-dock h2').innerText(),/数据分析/);
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});await fs.writeFile(dir+'/最终确认.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
