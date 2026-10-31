import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';
const base='http://127.0.0.1:5184',dir='检查记录/工作区起始区域_20261022/after';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']}),p=await browser.newPage({reducedMotion:'reduce'}),results=[],errors=[],measurements=[];
p.setDefaultTimeout(7000);p.on('pageerror',e=>errors.push(e.message));
const stored=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
async function load(scene='PT01',width=1440,lang='zh',guide=false){
 await p.setViewportSize({width,height:width<=390?844:1000});await p.goto(base+'/plan');
 const s=typeof scene==='string'?scenarioState(scene):scene;
 await p.evaluate(({s,key,lang,guide})=>{
  localStorage.setItem(key,JSON.stringify(s));localStorage.setItem('career-prototype-sidebar-v1','expanded');localStorage.setItem('career-prototype-language',lang);
  localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:guide,neverPrompt:!guide}));localStorage.setItem('career-prototype-guidance-v1','{"auto":false}');
 },{s,key:KEY,lang,guide});
 await p.goto(base+'/app');await p.locator('.home-next').waitFor();
}
async function shot(name){await p.screenshot({path:dir+'/'+name+'.png'});await p.locator('.home-resume-grid').screenshot({path:dir+'/'+name+'-区域.png'});}
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,750));await p.screenshot({path:dir+'/失败-'+results.length+'.png'});}}
const guideAt=id=>p.locator('.operation-guide[data-step="'+id+'"]').waitFor();
try{
 await check('首页直接选择并进入比较，仅保存候选，不修改目标、材料或任务',async()=>{
  await load();const before=await stored(),box=p.locator('.home-compare');
  assert.equal(await box.getByRole('checkbox').count(),10);assert.equal(await box.getByRole('button',{name:'查看方向比较 →',exact:true}).isDisabled(),true);
  assert.match(await box.getByRole('status').innerText(),/选择2–3/);
  await box.getByRole('checkbox',{name:'数据分析',exact:true}).check();assert.equal(await box.locator('button.primary').isDisabled(),true);
  await box.getByRole('checkbox',{name:'人工智能',exact:true}).check();await shot('1440-已选方向');
  assert.deepEqual(await stored(),{...before,compare:['data','ai']});
  await box.getByRole('link',{name:'查看方向比较 →',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/careers');assert.equal(new URL(p.url()).searchParams.get('tab'),'比较');
  assert.deepEqual((await stored()).compare,['data','ai']);assert.equal((await stored()).goal,null);assert.equal((await stored()).tasks.length,0);
 });
 await check('最多三个方向，取消后可更换；刷新和侧栏伸缩保留选择',async()=>{
  await load();const box=p.locator('.home-compare');for(const name of ['数据分析','人工智能','前端开发'])await box.getByRole('checkbox',{name,exact:true}).check();
  const fourth=box.getByRole('checkbox',{name:'网络安全',exact:true});assert.equal(await fourth.isDisabled(),true);assert.match(await box.getByRole('status').innerText(),/取消一项/);
  await box.getByRole('checkbox',{name:'人工智能',exact:true}).uncheck();assert.equal(await fourth.isEnabled(),true);await fourth.check();
  await p.reload();assert.equal(await box.getByRole('checkbox',{checked:true}).count(),3);
  await p.getByRole('button',{name:'收起侧栏',exact:true}).click();assert.equal(await box.getByRole('checkbox',{checked:true}).count(),3);await shot('1440-收起侧栏');
  assert.deepEqual((await stored()).compare,['data','frontend','security']);
 });
 await check('添加经历和职业准备可直接进入，浏览职业详情不代选目标',async()=>{
  for(const [label,tab]of [['添加经历','资料经历'],['核对职业准备','四维与差距']]){
   await load();const before=await stored();await p.locator('.home-other-actions').getByRole('link',{name:label,exact:true}).click();assert.equal(new URL(p.url()).pathname,'/assessment');assert.equal(new URL(p.url()).searchParams.get('tab'),tab);assert.deepEqual(await stored(),before);
  }
  await load();await p.locator('.home-compare').getByRole('link',{name:'查看职业详情 →',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/careers');assert.equal((await stored()).goal,null);
 });
 await check('已有记录遵循原优先级，待确认对象、继续任务和提醒均可用',async()=>{
  await load('PT07');assert.match(await p.locator('.home-current').innerText(),/职业准备依据已变化/);
  await load('PT03');assert.match(await p.locator('.home-current').innerText(),/项材料待确认/);assert.ok(await p.locator('.home-pending-items li').count());await p.locator('.home-next .primary').click();assert.equal(new URL(p.url()).searchParams.get('tab'),'原文确认');
  await load('PT04');const before=await stored();assert.match(await p.locator('.home-current').innerText(),/数据质量小项目/);assert.ok(await p.locator('.home-task-standard').count());
  await p.locator('.home-next').getByRole('button',{name:'暂缓提醒',exact:true}).click();assert.equal((await stored()).deferred,true);await p.locator('.home-next').getByRole('button',{name:'恢复提醒',exact:true}).click();assert.deepEqual(await stored(),before);
  await p.locator('.home-next button.primary').click();assert.match(new URL(p.url()).pathname,/^\/work\/task-demo/);assert.deepEqual((await stored()).tasks.map(t=>t.id),before.tasks.map(t=>t.id));
 });
 await check('首页引导定位真实选择，已有候选和次要入口可以接续原流程',async()=>{
  await load('PT01',1440,'zh',true);await guideAt('home.start');await p.locator('.home-compare').getByRole('checkbox',{name:'数据分析',exact:true}).check();await p.locator('.home-compare').getByRole('checkbox',{name:'人工智能',exact:true}).check();await guideAt('home.compare');await p.locator('[data-operation-guide-target="home.compare"]').click();await guideAt('explore.save');
  await load('PT01',1440,'zh',true);await guideAt('home.start');await p.locator('.home-other-actions').getByRole('link',{name:'添加经历',exact:true}).click();await guideAt('materials.save');assert.equal((await stored()).claims.length,0);
  const s=scenarioState('PT01');s.compare=['data','ai'];await load(s,390,'en',true);await guideAt('home.compare');assert.equal(/[\u3400-\u9fff]/.test(await p.locator('.operation-guide').innerText()),false);await shot('390-英文引导');
 });
 await check('桌面、收起侧栏和窄屏按内容排列，中英文均无水平溢出',async()=>{
  for(const width of [1440,1024,390,320])for(const scene of ['PT01','PT03','PT04']){
   await load(scene,width);const panel=p.locator('.home-next'),r=await panel.boundingBox();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await p.locator('#main').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);assert.equal(await panel.evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
   if(width>=1024)assert.ok(r.height<480,scene+' panel height '+r.height);assert.equal(await panel.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(250, 250, 250)');
   measurements.push({width,scene,lang:'zh',panelHeight:r.height});await shot(width+'-'+scene);
  }
  for(const scene of ['PT01','PT03','PT04','PT07']){
   await load(scene,390,'en');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   const interfaceCopy=scene==='PT01'?await p.locator('.home-next').innerText():(await p.locator('.home-next').locator('h2,.home-section-title .status-chip,.actions,.home-task-standard dt').allTextContents()).join(' ');
   assert.equal(/[\u3400-\u9fff]/.test(interfaceCopy),false,interfaceCopy);await shot('390-en-'+scene);
  }
 });
}finally{await fs.writeFile(dir+'/交互验收.json',JSON.stringify({results,errors,measurements},null,2));await browser.close();}
if(errors.length||results.some(r=>r.status==='fail'))process.exitCode=1;
