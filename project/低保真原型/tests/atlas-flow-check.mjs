import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState,careers} from '../src/model.js';
import {branchesFor} from '../src/career-atlas-model.js';
const dir='检查记录/地图支线_v42';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await browser.newPage({viewport:{width:1440,height:1080}}),results=[],errors=[];
p.setDefaultTimeout(5500);p.on('pageerror',e=>errors.push(e.message));
const snapshot=()=>p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
const route=()=>new URL(p.url()).pathname+new URL(p.url()).search;
async function visit(path,state='PT01',lang='zh'){
 await p.goto('http://127.0.0.1:5184/');await p.evaluate(({KEY,s,lang})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);},{KEY,s:typeof state==='string'?scenarioState(state):state,lang});
 await p.goto('http://127.0.0.1:5184'+path);await p.locator('.work-atlas').waitFor();
}
const close=()=>p.getByRole('button',{name:'关闭面板',exact:true}).click();
const preview=()=>p.locator('.atlas-dock-actions .primary').click();
async function check(name,fn){if(process.argv[2]&&!name.includes(process.argv[2]))return;try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,1000));await p.screenshot({path:dir+'/fail-'+results.length+'.png'});}}
try{
 await check('20条支线：图和列表同节点、问题交付实际进入预检，浏览不改目标或材料',async()=>{
  for(const c of careers){
   await visit('/career-map?tab=职业关系&relation=细分方向&career='+c.id);const before=await snapshot();
   for(const b of branchesFor(c.id)){
    await p.locator('.atlas-branches button').filter({hasText:b.title}).click();assert.equal(await p.locator('.atlas-dock h2').innerText(),b.title);
    assert.match(await p.locator('.atlas-dock').innerText(),new RegExp(b.question));await preview();
    const draft=(await snapshot()).taskDraft;assert.equal(draft.atlas.branch,b.id);assert.equal(draft.career,c.id);assert.equal(draft.product,b.product);assert.equal(draft.template,b.template);await close();
   }
   await p.locator('.atlas-options>summary').click();await p.getByLabel('查看方式',{exact:true}).selectOption('列表');await p.locator('.atlas-options>summary').click();
   assert.equal(await p.locator('.atlas-list>button').count(),2);assert.equal(await p.locator('.atlas-list>button[aria-pressed=true]').count(),1);
   const after=await snapshot();assert.deepEqual(after.tasks,before.tasks);assert.deepEqual(after.claims,before.claims);assert.equal(after.goal,before.goal);
  }
 });
 await check('SQL/表格替代选择跨步骤、过滤与刷新保留，规则入口可用',async()=>{
  await visit('/career-map?node=skill:sheet');await p.locator('.atlas-phase-buttons button').nth(2).click();await p.reload();
  assert.equal(await p.locator('.atlas-tool-choice button[aria-pressed=true]').first().innerText(),'表格工具');await p.locator('.atlas-phase-buttons button').nth(1).click();assert.equal(await p.locator('.atlas-station.is-selected').getAttribute('data-skill'),'sheet');
  await p.locator('.atlas-options>summary').click();await p.getByLabel('学习阶段',{exact:true}).selectOption('产物');await p.locator('.atlas-options>summary').click();await p.locator('.atlas-phase-buttons button').nth(0).click();assert.equal(await p.locator('.atlas-station.is-selected').getAttribute('data-skill'),'foundation');
  await p.getByRole('button',{name:'共同交付规则',exact:true}).click();assert.match(await p.locator('.atlas-dock p').first().innerText(),/AND/);await preview();assert.equal((await snapshot()).taskDraft.atlas.skill,'表格工具');assert.match((await snapshot()).taskDraft.product,/限制说明/);await close();
 });
 await check('完整S2闭环：表格实践→提交自检→有限完成→候选确认→返回原节点并对照',async()=>{
  await visit('/career-map?career=data&node=skill:sheet');await preview();await p.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();await p.locator('.atlas-task-context').waitFor();
  const task=(await snapshot()).tasks[0];assert.equal(task.mode,'S2');assert.equal(task.atlas.skill,'表格工具');
  await p.getByRole('button',{name:'填写尝试产物',exact:true}).click();await p.getByLabel('产物文本（每次提交形成独立版本）',{exact:true}).fill('合成表缺失1条；保留原值，说明处理理由、描述统计与限制；没有真实业务结论。');
  await p.getByLabel('本人贡献',{exact:true}).fill('本人使用表格整理并说明取舍。');await p.getByRole('button',{name:'提交为 v1',exact:true}).click();await p.getByRole('button',{name:'记录本人自检（非实核）',exact:true}).click();
  await p.getByRole('link',{name:'完成回执',exact:true}).click();await p.getByRole('checkbox',{name:/我已逐项核对交付物/}).check();await p.getByRole('button',{name:'记录有限范围完成',exact:true}).click();
  await p.getByRole('button',{name:'选择成果版本 → 本人确认',exact:true}).click();assert.equal(await p.getByLabel('技能名称 1',{exact:true}).inputValue(),'表格工具');await p.getByLabel('支持范围 1',{exact:true}).fill('仅支持本次合成数据整理与说明');
  await p.getByRole('button',{name:'生成候选并去本人逐项确认',exact:true}).click();assert.equal((await snapshot()).claims[0].status,'待确认');
  await p.getByRole('button',{name:'修正 / 确认此项',exact:true}).click();await p.getByRole('button',{name:'确认这一项并查看回执',exact:true}).click();assert.equal((await snapshot()).claims[0].status,'已确认');
  await p.getByRole('link',{name:'返回这条地图路线 →',exact:true}).click();assert.equal(await p.locator('.atlas-station.is-selected').getAttribute('data-skill'),'sheet');assert.equal(await p.locator('.atlas-related>div').count(),1);
  await p.getByRole('button',{name:'对照已确认成果',exact:true}).click();assert.equal(await p.locator('.atlas-station.has-evidence').getAttribute('data-skill'),'sheet');await p.getByText('核对投影材料原文',{exact:true}).click();assert.match(await p.locator('.atlas-material-basis').innerText(),/合成表缺失/);
  await p.screenshot({path:dir+'/1440-表格成果闭环.png',fullPage:true});
 });
 await check('手工支线S1闭环：具体步骤→记录结果贡献→生成候选→返回同支线',async()=>{
  await visit('/career-map?career=frontend&tab=职业关系&relation=细分方向&node=branch:interface');await preview();await p.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();await p.locator('.external-practice').waitFor();assert.match(route(),/practice=/);
  await p.locator('.atlas-task-context summary').click();assert.match(await p.locator('.atlas-task-context').innerText(),/键盘和手机/);
  await p.getByRole('link',{name:'去记录本次行动结果',exact:true}).click();await p.getByLabel('实际行动与结果（自动保留）',{exact:true}).fill('制作虚构报名表，记录键盘操作和错误提示。');await p.getByLabel('本人实际贡献（自动保留）',{exact:true}).fill('本人完成界面与检查记录。');
  await p.getByRole('button',{name:'保存实践记录',exact:true}).click();await p.getByRole('button',{name:'更新任务状态或整理经历',exact:true}).click();await p.getByRole('button',{name:'外部成果 → 待确认候选',exact:true}).click();
  assert.equal((await snapshot()).claims[0].contribution,'本人完成界面与检查记录。');await p.getByRole('link',{name:'返回这条地图路线 →',exact:true}).click();assert.equal(await p.locator('.atlas-dock h2').innerText(),'Web 界面');assert.match(await p.locator('.atlas-dock-actions .primary').innerText(),/继续这条路线的实践/);
  await p.locator('.atlas-dock-actions .primary').click();assert.equal((await snapshot()).tasks.length,1);
 });
 await check('重复实践按路线续用，不把其他职业或SQL任务放到表格支线上；预算超额可恢复',async()=>{
  await visit('/career-map?node=skill:sql','PT04');assert.equal(await p.locator('.atlas-related').count(),0);await preview();await p.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();await p.locator('.atlas-task-context>a').click();assert.match(await p.locator('.atlas-dock-actions .primary').innerText(),/继续/);
  await p.getByRole('button',{name:'完整节点说明',exact:true}).click();await p.getByRole('button',{name:'生成学习 / 验证草稿',exact:true}).click();assert.match(await p.locator('dialog[open]').innerText(),/续用已有任务/);await close();
  await p.locator('.atlas-tool-choice button').filter({hasText:'表格工具'}).click();assert.equal(await p.locator('.atlas-related').count(),0);
  const limited=scenarioState('PT01');limited.budget=.5;await visit('/career-map?node=skill:sql',limited);await preview();await p.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();assert.match(await p.locator('dialog[open]').innerText(),/超过/);assert.equal((await snapshot()).tasks.length,0);
  await p.getByRole('button',{name:'设置总预算后返回',exact:true}).click();await p.getByLabel('每周总预算（小时）',{exact:true}).fill('2');await p.getByRole('button',{name:'保存预算并回预检',exact:true}).click();assert.equal((await snapshot()).taskDraft.atlas.node,'skill:sql');await p.getByRole('button',{name:'仅存草稿',exact:true}).click();assert.equal((await snapshot()).tasks.length,0);
 });
 await check('旧版地图创建的任务仍能续用，旧标准与尝试记录不被改写',async()=>{
  const state=scenarioState('PT04');state.tasks[0].source='/career-map?tab=技能先修&node=skill:sheet';state.tasks[0].purpose='验证 表格工具 的已有材料与未知';const before=structuredClone(state.tasks[0]);
  await visit('/career-map?node=skill:sheet',state);assert.equal(await p.locator('.atlas-related>div').count(),1);await p.locator('.atlas-dock-actions .primary').click();assert.match(await p.locator('.atlas-task-context').innerText(),/历史地图任务/);assert.deepEqual((await snapshot()).tasks[0],before);await p.locator('.atlas-task-context>a').click();assert.equal(await p.locator('.atlas-station.is-selected').getAttribute('data-skill'),'sheet');
 });
 await check('续读及资源替换不丢工具、来源或阅读位置；阅读不会创建任务',async()=>{
  const state=scenarioState('PT01');state.reading.quality={chapter:2,version:1};await visit('/career-map?node=skill:sheet',state);await p.getByRole('button',{name:'完整节点说明',exact:true}).click();await p.getByRole('button',{name:'只阅读原创资源',exact:true}).click();assert.match(await p.locator('dialog[open] h3').last().innerText(),/实践/);await p.getByRole('button',{name:'转入统一实践预检',exact:true}).click();assert.equal((await snapshot()).taskDraft.atlas.tool,'sheet');assert.equal((await snapshot()).tasks.length,0);await close();
  await p.getByRole('button',{name:'完整节点说明',exact:true}).click();await p.getByRole('button',{name:'模拟资源失效 / 查看替代',exact:true}).click();await p.getByRole('button',{name:'替换为原创离线资源',exact:true}).click();assert.match(await p.locator('dialog[open] h3').last().innerText(),/实践/);await p.getByRole('button',{name:'转入统一实践预检',exact:true}).click();assert.equal((await snapshot()).taskDraft.atlas.tool,'sheet');await close();
 });
 await check('关系AI使用当前支线；相邻方向可以进入；未发布关系提供恢复',async()=>{
  await visit('/career-map?career=data&tab=职业关系&relation=细分方向&node=branch:business');await p.getByRole('button',{name:'就这一步问 AI',exact:true}).click();assert.match((await snapshot()).aiDraft,/业务分析/);assert.ok(!(await snapshot()).aiDraft.includes('理解问题与数据'));await close();
  await p.getByLabel('选择关系类型',{exact:true}).selectOption('学习桥接');await p.locator('.atlas-bridge-career.right').click();await p.getByRole('button',{name:'进入人工智能地图 →',exact:true}).click();assert.equal(await p.getByLabel('当前方向',{exact:true}).inputValue(),'ai');
  await p.getByRole('button',{name:'比较方向',exact:true}).click();await p.getByLabel('选择关系类型',{exact:true}).selectOption('责任进阶');assert.equal(await p.locator('.atlas-unpublished').count(),1);await p.getByRole('button',{name:'探索可用支线',exact:true}).click();assert.equal(await p.locator('.atlas-branches button').count(),2);
 });
 await check('材料投影刷新保留，撤回/改版即收起，无对应节点时不强制切换职业',async()=>{
  await visit('/career-map?node=skill:sql','PT04');await p.locator('.atlas-material-picker>summary').click();await p.locator('.atlas-material-content>button').filter({hasText:'SQL 报告'}).click();await p.reload();assert.equal(await p.locator('.atlas-station.has-evidence').count(),1);
  await p.evaluate(KEY=>{const s=JSON.parse(localStorage.getItem(KEY));s.claims.find(c=>c.id==='claim-sql').version=2;localStorage.setItem(KEY,JSON.stringify(s));},KEY);await p.reload();assert.equal(await p.locator('.atlas-station.has-evidence').count(),0);assert.ok(!new URL(p.url()).searchParams.has('material'));
  await visit('/career-map?career=ai','PT04');await p.locator('.atlas-material-picker>summary').click();await p.locator('.atlas-material-content>button').filter({hasText:'Python'}).click();assert.equal(await p.getByLabel('当前方向',{exact:true}).inputValue(),'ai');assert.match(await p.locator('.atlas-dock').innerText(),/暂未确认对应节点/);
 });
 await check('多尺寸与键盘浏览、原位置返回、无横向溢出',async()=>{
  for(const width of [1440,1024,390]){
   await p.setViewportSize({width,height:width===390?844:1080});
   for(const [name,path]of [['技能','/career-map?node=skill:sheet'],['支线','/career-map?career=frontend&tab=职业关系&relation=细分方向&node=branch:interface'],['关系','/career-map?tab=职业关系&node=relation']]){
    await visit(path,'PT04');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(name==='支线')await p.locator('.atlas-practice-steps summary').click();await p.screenshot({path:`${dir}/${width}-${name}.png`,fullPage:true});
   }
  }
  await visit('/career-map?node=skill:sheet');await p.getByLabel('浏览工作步骤',{exact:true}).focus();await p.getByLabel('浏览工作步骤',{exact:true}).press('ArrowRight');assert.equal(await p.locator('.atlas-visual').getAttribute('data-step'),'2');
  await p.getByRole('link',{name:'补充或核对已有材料 →',exact:true}).click();await p.getByRole('link',{name:'资料与经历',exact:true}).click();await p.getByRole('link',{name:'返回刚才的地图位置 →',exact:true}).click();assert.equal(await p.locator('.atlas-visual').getAttribute('data-step'),'2');
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});await fs.writeFile(dir+'/验证结果.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
