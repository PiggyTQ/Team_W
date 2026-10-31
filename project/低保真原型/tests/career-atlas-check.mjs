import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/工作透镜_v41';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await b.newPage({viewport:{width:1440,height:1000}}),results=[],errors=[];
p.setDefaultTimeout(6500);p.on('pageerror',e=>errors.push(e.message));
const snapshot=()=>p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
async function visit(route,s='PT04',lang='zh'){
 await p.goto('http://127.0.0.1:5184/');await p.evaluate(({KEY,s,lang})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);},{KEY,s:typeof s==='string'?scenarioState(s):s,lang});await p.goto('http://127.0.0.1:5184'+route);await p.locator('.work-atlas').waitFor();
}
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,800));await p.screenshot({path:dir+'/fail-'+results.length+'.png'});}}
try{
 await check('步骤、范围与节点可浏览，未改目标、任务或确认材料',async()=>{
  await visit('/career-map');const before=await snapshot();await p.locator('.atlas-phase-buttons button').nth(1).click();assert.match(await p.locator('.atlas-dock h2').innerText(),/SQL/);await p.locator('[data-skill="sheet"]').click();assert.match(await p.locator('.atlas-dock h2').innerText(),/表格/);
  await p.locator('.atlas-options>summary').click();await p.getByLabel('学习阶段',{exact:true}).selectOption('产物');assert.equal(await p.locator('.atlas-station').count(),2);assert.match(await p.locator('.atlas-dock h2').innerText(),/质量/);assert.deepEqual(await snapshot(),before);
 });
 await check('本人作品投影精准支持SQL，合成投影与本人记录隔离',async()=>{
  await visit('/career-map');const before=await snapshot();await p.locator('.atlas-material-picker>summary').click();await p.locator('.atlas-material-content>button').filter({hasText:'SQL 报告'}).click();assert.equal(await p.locator('.atlas-station.has-evidence').count(),1);assert.equal(await p.locator('.atlas-station.has-evidence').getAttribute('data-skill'),'sql');assert.match(await p.locator('.atlas-projection').innerText(),/本人材料投影/);assert.deepEqual(await snapshot(),before);
  await visit('/career-map','PT01');await p.locator('.atlas-material-picker>summary').click();assert.equal(await p.locator('.atlas-material-content>button').count(),0);await p.getByRole('button',{name:'体验合成作品投影 →',exact:true}).click();assert.match(await p.locator('.atlas-projection').innerText(),/合成投影示例/);assert.equal((await snapshot()).claims.length,0);
 });
 await check('阅读、完整说明、预检、AI保留实际出口且无重复右栏',async()=>{
  await visit('/career-map?tab=技能先修&node=skill:sql');await p.getByRole('button',{name:'完整节点说明',exact:true}).click();assert.ok(await p.locator('dialog[open]').isVisible());await p.getByRole('button',{name:'只阅读原创资源',exact:true}).click();assert.match(await p.locator('dialog[open]').innerText(),/业务：哪些数据/);assert.equal((await snapshot()).tasks.length,1);await p.getByRole('button',{name:'关闭面板',exact:true}).click();
  await p.getByRole('button',{name:/预览一次小实践/}).click();assert.ok(await p.locator('dialog[open]').isVisible());assert.equal((await snapshot()).tasks.length,1);await p.getByRole('button',{name:'关闭面板',exact:true}).click();await p.getByRole('button',{name:'就这一步问 AI',exact:true}).click();assert.match((await snapshot()).aiDraft,/SQL 查询/);assert.equal(await p.locator('.map-context').count(),0);
 });
 await check('职业关系保留桥接、细分和责任范围，未发布方向不造线',async()=>{
  await visit('/career-map?tab=职业关系&career=data&node=relation');assert.equal(await p.locator('.atlas-bridge ellipse').count(),2);await p.locator('.atlas-options>summary').click();await p.getByLabel('关系类型',{exact:true}).selectOption('细分方向');assert.equal(await p.locator('.atlas-branches button').count(),2);
  await p.getByLabel('关系类型',{exact:true}).selectOption('责任进阶');assert.equal(await p.locator('.atlas-responsibility').count(),1);await p.getByLabel('当前方向',{exact:true}).selectOption('security');assert.equal(await p.locator('.atlas-unpublished').count(),1);assert.equal(await p.locator('.atlas-bridge').count(),0);
 });
 await check('键盘游标、手机节点和列表可读，选择时不跳回页顶',async()=>{
  await p.setViewportSize({width:390,height:844});await visit('/career-map?tab=技能先修');await p.locator('.atlas-step-range input').scrollIntoViewIfNeeded();const before=await p.evaluate(()=>scrollY);await p.getByLabel('浏览工作步骤',{exact:true}).focus();await p.getByLabel('浏览工作步骤',{exact:true}).press('ArrowRight');assert.equal(await p.locator('.atlas-visual').getAttribute('data-step'),'1');assert.ok(Math.abs(await p.evaluate(()=>scrollY)-before)<20);assert.ok(await p.locator('[data-skill="sql"]').isVisible());
  await p.locator('.atlas-options>summary').click();await p.getByLabel('查看方式',{exact:true}).selectOption('列表');assert.equal(await p.locator('.atlas-list>button').count(),5);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 await check('桌面、笔记本、手机和中英文多状态无整页溢出',async()=>{
  for(const width of [1440,1024,390]){
   await p.setViewportSize({width,height:width===390?844:1000});
   for(const [name,route]of [['工作','/career-map?tab=技能先修'],['工具','/career-map?tab=技能先修&node=skill:sql'],['成果','/career-map?tab=技能先修&node=skill:limits'],['关系','/career-map?tab=职业关系&node=relation'],['未知路线','/career-map?tab=技能先修&career=ai']]){
    await visit(route);await p.waitForTimeout(260);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+name);await p.screenshot({path:`${dir}/${width}-${name}.png`});
   }
   await visit('/career-map?tab=技能先修&node=skill:sql');await p.locator('.atlas-material-picker>summary').click();await p.getByRole('button',{name:'体验合成作品投影 →',exact:true}).click();await p.waitForTimeout(260);await p.screenshot({path:`${dir}/${width}-作品投影.png`});
   await visit('/career-map?tab=技能先修&node=skill:sql','PT04','en');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));for(const selector of ['.atlas-head','.atlas-hero','.atlas-phase-strip'])assert.ok(!/[\u3400-\u9fff]/.test(await p.locator(selector).innerText()),selector+' English copy');await p.screenshot({path:`${dir}/${width}-EN.png`});
  }
 });
 await check('减少动态效果与专注查看可以返回',async()=>{
  await p.setViewportSize({width:1440,height:1000});await p.emulateMedia({reducedMotion:'reduce'});await visit('/career-map');await p.getByRole('button',{name:'专注查看',exact:true}).click();assert.equal(await p.locator('.work-atlas').evaluate(el=>document.fullscreenElement===el),true);await p.getByRole('button',{name:'退出专注',exact:true}).click();assert.equal(await p.evaluate(()=>document.fullscreenElement),null);await p.locator('.atlas-phase-buttons button').nth(2).click();assert.equal(await p.locator('.atlas-visual').getAttribute('data-step'),'2');
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});await fs.writeFile(dir+'/验证结果.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await b.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
