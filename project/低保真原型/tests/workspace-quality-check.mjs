import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const base='http://127.0.0.1:5184',dir='检查记录/工作区改进_v39';
await fs.mkdir(dir+'/调整后',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(6000);
const snapshot=()=>page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
async function visit(route,scene='PT01',lang='zh'){
 await page.goto(base);await page.evaluate(({KEY,s,lang})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);},{KEY,s:typeof scene==='string'?scenarioState(scene):scene,lang});
 await page.goto(base+route);await page.locator('.page-surface').waitFor();
}
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,500));await page.screenshot({path:dir+'/fail-'+results.length+'.png'});}}
try{
 await check('首页直接选择比较方向，不写入目标、任务或材料',async()=>{
  await visit('/app');const before=await snapshot();
  for(const choice of ['数据分析','人工智能'])await page.locator('.home-compare').getByRole('checkbox',{name:choice,exact:true}).check();
  assert.equal(await page.locator('.home-next a.primary').getAttribute('href'),'/careers?tab=比较');assert.deepEqual(await snapshot(),{...before,compare:['data','ai']});
 });
 await check('功能分组、所有原入口与可重看的工作区帮助可用',async()=>{
  for(const [label,count,link]of [['职业成长',6,'/assessment'],['求职准备',4,'/reports?tab=岗位简历'],['工具与账户',5,'/assistant']]){
   await page.getByRole('group',{name:'功能分组'}).getByRole('button',{name:label,exact:true}).click();assert.equal(await page.locator('.home-entry').count(),count);assert.ok(await page.locator(`.home-entry[href="${link}"]`).count());
  }await page.locator('.home-hub-heading>a').click();assert.equal(await page.locator('#workspace-help').getAttribute('open'),'');await page.locator('#workspace-help>summary').press('Enter');assert.equal(await page.locator('#workspace-help').getAttribute('open'),null);
 });
 await check('状态优先级、任务继续与暂停记录的恢复入口',async()=>{
  for(const [scene,text]of [['PT07','职业准备依据已变化'],['PT03','项材料待确认'],['PT04','数据质量小项目']]){await visit('/app',scene);assert.match(await page.locator('.home-next').innerText(),new RegExp(text));}
  await page.locator('.home-next button.primary').click();assert.match(page.url(),/\/work\/task-demo/);
  const s=scenarioState('PT04');s.tasks[0].status='延期';await visit('/app',s);assert.match(await page.locator('.home-recent-row a').getAttribute('href'),/\/plan\?tab=执行&task=task-demo/);
 });
 await check('本页指南键盘展开、状态提醒与原页操作保持独立',async()=>{
  await visit('/assessment?tab=原文确认','PT03');const before=await snapshot();
  const summary=page.locator('.workspace-guide>summary');await summary.focus();await summary.press('Enter');assert.match(await page.locator('.workspace-guide-body').innerText(),/未确认内容暂不参与评估/);
  assert.deepEqual(await snapshot(),before);await summary.press('Enter');assert.equal(await page.locator('.workspace-guide').getAttribute('open'),null);
  await visit('/assessment?tab=四维与差距','PT07');await page.locator('.workspace-guide>summary').click();assert.match(await page.locator('.workspace-guide-note').innerText(),/已有依据发生变化/);
 });
 await check('空状态动作在前，详细步骤可展开，指南不阻断原文输入',async()=>{
  await visit('/assessment?tab=原文确认');const empty=page.locator('.guided-start').first();assert.ok(await empty.getByRole('link',{name:'手填已有经历',exact:true}).isVisible());assert.equal(await empty.locator('details').getAttribute('open'),null);
  await empty.getByText('查看操作步骤',{exact:true}).click();assert.equal(await empty.locator('ol li').count(),3);
  await empty.getByRole('link',{name:'手填已有经历',exact:true}).click();await page.getByLabel('经历标题',{exact:true}).fill('工作区检查草稿（合成）');assert.equal((await snapshot()).claimDraft.title,'工作区检查草稿（合成）');
 });
 await check('账户菜单与退出确认可键盘操作，搜索范围保持',async()=>{
  await visit('/app');const menu=page.locator('.workspace-utilities'),summary=menu.locator('summary');await summary.focus();await summary.press('Enter');assert.ok(await menu.getByRole('button',{name:'站内提醒',exact:true}).isVisible());await summary.press('Escape');assert.equal(await menu.getAttribute('open'),null);
  await summary.click();await page.locator('.home-hub-heading h1').click();assert.equal(await menu.getAttribute('open'),null);
  await page.getByLabel('搜索范围',{exact:true}).selectOption('本人任务');assert.equal(await page.getByLabel('搜索范围',{exact:true}).inputValue(),'本人任务');
  await summary.click();await menu.getByRole('button',{name:'退出',exact:true}).click();assert.ok(await page.locator('dialog[open]').isVisible());assert.equal((await snapshot()).logged,true);await page.getByRole('button',{name:'关闭面板',exact:true}).click();
 });
 await check('首页续读直接恢复已保存章节，不创建任务',async()=>{
  const s=scenarioState('PT01');s.reading={quality:{chapter:1,version:1}};await visit('/app',s);await page.getByRole('button',{name:'继续阅读',exact:true}).click();assert.ok(await page.locator('dialog[open]').isVisible());assert.equal(await page.locator('dialog[open] .tabs button').nth(1).getAttribute('aria-pressed'),'true');assert.equal((await snapshot()).tasks.length,0);
 });
 const views=[['首页初次','/app','PT01'],['首页进行中','/app','PT04'],['首页依据变化','/app','PT07'],['职业目录','/careers','PT01'],['职业比较','/careers?tab=比较','PT03'],['岗位','/careers?tab=企业与岗位','PT05'],['我的机会','/careers?tab=我的机会','PT05'],['薪酬参考','/careers?tab=薪酬参考','PT01'],['经历','/assessment','PT02'],['确认','/assessment?tab=原文确认','PT03'],['评估','/assessment?tab=四维与差距','PT07'],['画像','/assessment?tab=成果档案','PT04'],['计划','/plan','PT04'],['执行','/plan?tab=执行','PT04'],['日程','/plan?tab=执行&view=calendar','PT04'],['复盘','/plan?tab=复盘','PT04'],['学习','/learning','PT01'],['短体验','/learning?tab=短体验','PT01'],['项目','/learning?tab=综合项目','PT06'],['实践','/work/task-demo','PT04'],['尝试','/work/task-demo?tab=尝试与反馈','PT06'],['贡献','/work/task-demo?tab=贡献与表达','PT06'],['回执','/work/task-demo?tab=完成回执','PT06'],['报告','/reports','PT01'],['报告阅读','/reports/report-demo','PT07'],['简历','/reports?tab=岗位简历','PT04'],['AI','/assistant','PT01'],['地图','/career-map','PT04'],['设置','/settings','PT01']];
 const measurements=[];
 await check('桌面/紧凑/手机全部工作区页面无整页溢出且指南完整',async()=>{
  for(const width of [1440,1024,390]){
   await page.setViewportSize({width,height:width===390?844:1000});
   for(const [name,route,scene]of views){
    await visit(route,scene);assert.equal(await page.locator('.page-surface').evaluate(el=>el.children.length>0),true,name);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+name);
    if(route==='/career-map')assert.equal(await page.locator('.work-atlas').count(),1,name);else if(route!='/app')assert.equal(await page.locator('.workspace-guide').count(),1,name);
    if(width!==1024){await page.screenshot({path:`${dir}/调整后/${width}-${name}.png`});}
    if(['首页初次','经历','计划','AI'].includes(name))measurements.push({width,name,header:await page.locator('.app-header').evaluate(el=>Math.round(el.getBoundingClientRect().height)),mainTop:await page.locator('main').evaluate(el=>Math.round(el.getBoundingClientRect().top))});
    if(name==='确认'&&width!==1024){await page.locator('.workspace-guide>summary').click();await page.screenshot({path:`${dir}/调整后/${width}-指南展开.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   }
   if(width===390){await page.getByRole('button',{name:'导航',exact:true}).click();assert.equal(await page.locator('#workspace-sidebar').isVisible(),true);await page.locator('#workspace-sidebar a[href="/app"]').click();assert.equal(await page.locator('#workspace-sidebar').isVisible(),false);}
  }
 });
 await check('英文工作区新引导完整并适配长文案',async()=>{
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:1000});
   for(const route of ['/app','/assessment?tab=原文确认','/plan','/assistant','/reports']){
    await visit(route,'PT01','en');if(route!='/app')await page.locator('.workspace-guide>summary').click();
    const text=await page.locator(route==='/app'?'.home-hub':'.workspace-guide').innerText();assert.ok(!/[\u3400-\u9fff]/.test(text),route+': '+text);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+route);
    if(route==='/app'||route==='/assistant')await page.screenshot({path:`${dir}/调整后/${width}-EN-${route.slice(1)}.png`});
   }
  }
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
 await fs.writeFile(dir+'/页面检查.json',JSON.stringify({results,measurements},null,2));
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
