import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState,careers} from '../src/model.js';
import {branchesFor} from '../src/career-atlas-model.js';
import {atlasCSV,atlasToolContent} from '../src/atlas-tool-content.js';
const dir='检查记录/地图交互复核_v43';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await b.newPage({viewport:{width:1440,height:1000}}),results=[],errors=[];p.setDefaultTimeout(5500);p.on('pageerror',e=>errors.push(e.message));
const snapshot=()=>p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
async function visit(route,state='PT01',lang='zh'){await p.goto('http://127.0.0.1:5184/');await p.evaluate(({KEY,s,lang})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);},{KEY,s:typeof state==='string'?scenarioState(state):state,lang});await p.goto('http://127.0.0.1:5184'+route);await p.locator('.work-atlas').waitFor();}
const close=()=>p.getByRole('button',{name:'关闭面板',exact:true}).click();
const preview=()=>p.locator('.atlas-dock-actions .primary').click();
const choose=tool=>p.locator('.atlas-tool-choice>button').filter({hasText:tool==='sql'?/^SQL$/:/^表格工具$/}).click();
async function check(name,fn){if(process.argv[2]&&!name.includes(process.argv[2]))return;try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,1400));await p.screenshot({path:dir+'/fail-'+results.length+'.png'});}}
try{
 await check('截图位置逐个点击：本次工具能展开，SQL与表格即时切换并显示真正样例',async()=>{
  await visit('/career-map?node=skill:sheet');await p.getByRole('button',{name:'本次工具',exact:true}).click();assert.equal(await p.getByRole('button',{name:'本次工具',exact:true}).getAttribute('aria-expanded'),'true');assert.match(await p.locator('.atlas-tool-guide h2').innerText(),/表格/);
  await choose('sql');assert.match(await p.locator('.atlas-tool-guide h2').innerText(),/SQL/);assert.match(await p.locator('.atlas-tool-purpose').innerText(),/SQL/);assert.match(await p.locator('.atlas-dock h2').innerText(),/SQL/);
  await choose('sheet');assert.match(await p.locator('.atlas-tool-guide textarea').inputValue(),/COUNTIF/);await p.getByRole('button',{name:'收起工具练习说明',exact:true}).click();assert.equal(await p.locator('.atlas-tool-guide').count(),0);
 });
 await check('下载包含真实样例行，复制成功与权限拒绝均有可操作结果',async()=>{
  await visit('/career-map?node=skill:sql&guide=tool');const waiting=p.waitForEvent('download');await p.getByRole('button',{name:'下载练习数据 CSV',exact:true}).click();const download=await waiting;await download.saveAs(dir+'/实际下载样例.csv');assert.equal((await fs.readFile(dir+'/实际下载样例.csv','utf8')).replace(/^\ufeff/,''),atlasCSV());
  await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}}));await p.getByRole('button',{name:'复制 SQL 示例',exact:true}).click();assert.equal(await p.evaluate(()=>window.__copied),atlasToolContent.sql.snippet);assert.match(await p.locator('.atlas-tool-notice').innerText(),/已复制/);
  await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}}));await choose('sheet');await p.getByRole('button',{name:'复制表格公式',exact:true}).click();assert.match(await p.locator('.atlas-tool-notice').innerText(),/手动复制/);assert.ok(await p.locator('.atlas-tool-guide textarea').evaluate(el=>el.selectionStart===0&&el.selectionEnd===el.value.length));
 });
 await check('鼠标和键盘换工具保留基础/成果阶段，筛选后仍可继续，刷新恢复同一选择',async()=>{
  await visit('/career-map?node=skill:limits&tool=sql');await choose('sheet');assert.equal(await p.locator('.atlas-visual').getAttribute('data-step'),'2');assert.match(await p.locator('.atlas-dock h2').innerText(),/局限/);await p.reload();assert.equal(await p.locator('.atlas-visual').getAttribute('data-step'),'2');
  await p.locator('.atlas-options>summary').click();await p.getByLabel('学习阶段',{exact:true}).selectOption('基础');await p.locator('.atlas-options>summary').click();await p.locator('.atlas-tool-choice>button').filter({hasText:/^SQL$/}).focus();await p.locator('.atlas-tool-choice>button').filter({hasText:/^SQL$/}).press('Enter');assert.equal(await p.locator('.atlas-visual').getAttribute('data-step'),'0');assert.equal(await p.locator('.atlas-station.is-selected').getAttribute('data-skill'),'foundation');
  await p.getByRole('button',{name:'本次工具',exact:true}).focus();await p.getByRole('button',{name:'本次工具',exact:true}).press('Space');assert.equal(await p.locator('.atlas-tool-guide').count(),1);
 });
 await check('草稿保存、关闭面板、刷新、跨步骤及跨工具恢复，用户填写字段不会重置',async()=>{
  await visit('/career-map?node=skill:sql');await preview();await p.getByLabel('行动标题',{exact:true}).fill('我的 SQL 草稿');await p.getByLabel('为什么做 / 要回答的问题',{exact:true}).fill('核对本人的疑问，不替我改写');await p.getByLabel('预计投入（本周期小时）',{exact:true}).fill('0.5');await p.getByRole('button',{name:'仅存草稿',exact:true}).click();
  await p.locator('.atlas-phase-buttons button').nth(2).click();await preview();assert.equal(await p.getByLabel('行动标题',{exact:true}).inputValue(),'我的 SQL 草稿');assert.equal(await p.getByLabel('预计投入（本周期小时）',{exact:true}).inputValue(),'0.5');await close();
  await choose('sheet');await preview();await p.getByLabel('行动标题',{exact:true}).fill('我的表格草稿');await close();await p.reload();await preview();assert.equal(await p.getByLabel('行动标题',{exact:true}).inputValue(),'我的表格草稿');await close();
  await choose('sql');await preview();assert.equal(await p.getByLabel('行动标题',{exact:true}).inputValue(),'我的 SQL 草稿');assert.equal(await p.getByLabel('为什么做 / 要回答的问题',{exact:true}).inputValue(),'核对本人的疑问，不替我改写');await close();assert.equal((await snapshot()).tasks.length,0);
 });
 await check('数据质量支线继承表格选择，工作各步骤续用同一任务且仅算一次预算',async()=>{
  await visit('/career-map?node=skill:sheet');await p.getByRole('button',{name:'数据质量',exact:true}).click();assert.equal(await p.locator('.atlas-tool-choice').count(),1);await preview();const draft=(await snapshot()).taskDraft;assert.equal(draft.atlas.tool,'sheet');assert.equal(draft.atlas.skill,'表格工具');assert.match(draft.purpose,/表格工具/);await p.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();await p.locator('.atlas-task-context').waitFor();
  const t=(await snapshot()).tasks[0];await p.locator('.atlas-task-context>a').click();await p.locator('.atlas-relation-notes summary').click();await p.getByRole('button',{name:'在工作路径中查看 →',exact:true}).click();assert.equal(await p.locator('.atlas-visual').getAttribute('data-step'),'0');assert.match(await p.locator('.atlas-dock-actions .primary').innerText(),/继续/);await p.locator('.atlas-phase-buttons button').nth(2).click();await preview();assert.ok(p.url().endsWith('/work/'+t.id));assert.equal((await snapshot()).tasks.length,1);
  await p.locator('.atlas-task-context summary').click();await p.getByRole('link',{name:'查看本次工具样例 →',exact:true}).click();assert.equal(await p.locator('.atlas-tool-guide').count(),1);assert.match(await p.locator('.atlas-tool-guide h2').innerText(),/表格/);
 });
 await check('投影相反工具的作品不改实践选择、草稿或已创建任务',async()=>{
  await visit('/career-map?node=skill:sheet','PT04');await preview();await p.getByLabel('行动标题',{exact:true}).fill('保留的表格选择');await close();const before=(await snapshot()).tasks;
  await p.locator('.atlas-material-picker>summary').click();await p.locator('.atlas-material-content>button').filter({hasText:'SQL 报告'}).click();assert.equal(new URL(p.url()).searchParams.get('tool'),'sheet');assert.equal(await p.locator('.atlas-station.is-selected').getAttribute('data-skill'),'sheet');assert.equal(await p.locator('.atlas-station.has-evidence').getAttribute('data-skill'),'sql');assert.deepEqual((await snapshot()).tasks,before);await preview();assert.equal(await p.getByLabel('行动标题',{exact:true}).inputValue(),'保留的表格选择');await close();
 });
 await check('资源受阻草稿换回离线资源后可继续，预算不足仍明确阻止创建',async()=>{
  await visit('/career-map?node=skill:sheet');await p.getByRole('button',{name:'完整节点说明',exact:true}).click();await p.getByRole('button',{name:'模拟资源失效 / 查看替代',exact:true}).click();await p.getByRole('button',{name:'查看受阻预检 / 存草稿',exact:true}).click();await p.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();assert.match(await p.locator('dialog[open]').innerText(),/不可用/);await p.getByRole('button',{name:'仅存草稿',exact:true}).click();
  await p.getByRole('button',{name:'完整节点说明',exact:true}).click();await p.getByRole('button',{name:'模拟资源失效 / 查看替代',exact:true}).click();await p.getByRole('button',{name:'替换为原创离线资源',exact:true}).click();await p.getByRole('button',{name:'转入统一实践预检',exact:true}).click();assert.equal((await snapshot()).taskDraft.unavailable,false);await p.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();await p.locator('.atlas-task-context').waitFor();assert.equal((await snapshot()).tasks.length,1);
  const state=scenarioState('PT01');state.budget=.25;await visit('/career-map?node=skill:sql',state);await preview();await p.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();assert.match(await p.locator('dialog[open]').innerText(),/超过/);assert.equal((await snapshot()).tasks.length,0);await close();
 });
 await check('完整说明、自述、阅读、规则分别有结果，不写入无效节点状态',async()=>{
  await visit('/career-map?node=skill:sql&guide=tool');await p.getByRole('button',{name:'查看所选工具节点',exact:true}).click();await p.getByLabel('自述学习状态',{exact:true}).selectOption('已学习');await close();assert.match(await p.locator('.atlas-node-state').innerText(),/已学习/);
  await p.getByRole('button',{name:'完整节点说明',exact:true}).click();await p.getByRole('button',{name:'只阅读原创资源',exact:true}).click();await p.getByRole('button',{name:'实践：记录质量问题',exact:true}).click();await p.getByRole('button',{name:'保存位置并返回',exact:true}).click();assert.equal((await snapshot()).reading.quality.chapter,2);assert.equal((await snapshot()).tasks.length,0);
  await p.getByRole('button',{name:'共同交付规则',exact:true}).click();assert.match(await p.locator('.atlas-dock>div>p').first().innerText(),/AND/);assert.equal(await p.locator('.atlas-node-state').count(),0);assert.ok(!Object.keys((await snapshot()).mapNodeStatus).some(k=>k.includes('undefined')));
 });
 await check('关系说明点击真正展开；责任范围图和列表操作等价；未知关系能恢复',async()=>{
  await visit('/career-map?tab=职业关系&node=relation');await p.locator('.atlas-bridge-common').click();assert.equal(await p.locator('.atlas-relation-notes').getAttribute('open'),'');
  await p.getByLabel('选择关系类型',{exact:true}).selectOption('责任进阶');await p.locator('.atlas-options>summary').click();await p.getByLabel('查看方式',{exact:true}).selectOption('列表');await p.locator('.atlas-options>summary').click();assert.match(await p.locator('.atlas-list>button').nth(0).innerText(),/按步骤记录/);assert.match(await p.locator('.atlas-list>button').nth(1).innerText(),/说明取舍与限制/);await p.locator('.atlas-list>button').nth(1).click();assert.equal(await p.locator('.atlas-relation-notes').getAttribute('open'),'');
  await p.getByLabel('当前方向',{exact:true}).selectOption('ops');await p.locator('.atlas-dock-actions .primary').click();assert.equal(new URL(p.url()).searchParams.get('relation'),'细分方向');assert.equal(await p.locator('.atlas-list>button').count(),2);
 });
 await check('二十支线的预检、AI与来源均对应当前支线，不借用其他方向任务',async()=>{
  for(const c of careers)for(const branch of branchesFor(c.id)){
   await visit(`/career-map?career=${c.id}&tab=职业关系&relation=细分方向&node=branch:${branch.id}`);await preview();const d=(await snapshot()).taskDraft;assert.equal(d.career,c.id);assert.equal(d.atlas.branch,branch.id);assert.ok(d.product);await close();await p.getByRole('button',{name:'就这一步问 AI',exact:true}).click();assert.ok((await snapshot()).aiDraft.includes(branch.title));await close();
  }
 });
 await check('专注模式内也能打开工具说明与预检；新输入可正常继续',async()=>{
  await visit('/career-map?node=skill:sql');await p.getByRole('button',{name:'专注查看',exact:true}).click();await p.getByRole('button',{name:'本次工具',exact:true}).click();assert.equal(await p.locator('.atlas-tool-guide').count(),1);await preview();assert.ok(await p.locator('dialog[open]').isVisible());await p.getByLabel('行动标题',{exact:true}).fill('专注模式草稿');await close();await p.getByRole('button',{name:'退出专注',exact:true}).click();await preview();assert.equal(await p.getByLabel('行动标题',{exact:true}).inputValue(),'专注模式草稿');await close();
 });
 await check('桌面与手机中英文工具区无横向溢出，展开/收起与选择可用',async()=>{
  for(const width of [1440,1024,390])for(const lang of ['zh','en'])for(const tool of ['sql','sheet']){
   await p.setViewportSize({width,height:width===390?844:1000});await visit(`/career-map?node=skill:${tool}&guide=tool`,'PT01',lang);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(lang==='en')for(const selector of ['.atlas-tool-choice','.atlas-tool-guide'])assert.ok(!/[\u3400-\u9fff]/.test(await p.locator(selector).innerText()),await p.locator(selector).innerText());
   assert.ok(await p.locator('.atlas-tool-example .table-wrap').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'All sample columns must be visible');
   await p.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);document.getElementById('main')?.scrollTo(0,0);});await p.locator('.atlas-tool-guide').screenshot({path:`${dir}/${width}-${lang}-${tool}-实际说明.png`});await p.locator('.atlas-tool-choice').screenshot({path:`${dir}/${width}-${lang}-${tool}-实际工具区.png`});
  }
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});await fs.writeFile(dir+(process.argv[2]?'/专项确认.json':'/验证结果.json'),JSON.stringify(results,null,2));
}finally{await b.close();}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
