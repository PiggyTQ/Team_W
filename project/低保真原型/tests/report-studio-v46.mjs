import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
import {freezeReport} from '../src/alignment-model.js';
import {planningReportBody} from '../src/continuity-model.js';
const dir='检查记录/成果工作台_v46',base='http://127.0.0.1:5184';await fs.mkdir(dir+'/实际截图',{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await b.newPage({viewport:{width:1440,height:1000}}),results=[],errors=[];p.setDefaultTimeout(6000);p.on('pageerror',e=>errors.push(e.message));
async function load(route,s='PT05',lang='zh'){await p.goto(base);await p.evaluate(({KEY,s,lang})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);},{KEY,s:typeof s==='string'?scenarioState(s):s,lang});await p.goto(base+route);await p.locator('.page-surface').waitFor();}
const state=()=>p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
async function check(name,fn){if(process.argv[2]&&!name.includes(process.argv[2]))return;try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,700));await p.screenshot({path:dir+'/fail-'+results.length+'.png'});}}
async function screenshot(name){await p.screenshot({path:dir+'/实际截图/'+name+'.png'});}
const form=()=>p.locator('.resume-layout>.workspace-section').first();
try{
 await check('探索主线四类记录、11章实时编排、私人正文边界与原处出口',async()=>{
  const s=scenarioState('PT07');s.reviews=[{id:'review-test',date:'2026-10-20',result:'PRIVATE_RESULT',reason:'PRIVATE_REASON',next:'PRIVATE_NEXT'}];await load('/reports',s);
  const story=p.getByRole('region',{name:'报告探索主线'});await screenshot('1440-报告主线');
  for(const name of ['选择与疑问','行动与尝试','成果与依据','复盘与调整']){await story.getByRole('button',{name:new RegExp(name)}).focus();await p.keyboard.press('Space');assert.equal(await story.getByRole('button',{name:new RegExp(name)}).getAttribute('aria-pressed'),'true');}
  assert.doesNotMatch(await story.innerText(),/PRIVATE_/);await story.getByRole('button',{name:'查看11章结构'}).click();const chapters=story.getByRole('group',{name:'报告章节结构'}).getByRole('button');assert.equal(await chapters.count(),11);for(let i=0;i<11;i++){await chapters.nth(i).click();assert.equal(await chapters.nth(i).getAttribute('aria-pressed'),'true');}
  assert.equal((await state()).reports.length,1);await story.getByRole('link',{name:'回到本人复盘 →',exact:true}).click();assert.equal(new URL(p.url()).searchParams.get('tab'),'复盘');
 });
 await check('报告版本逐章差异、原始快照打开与撤回缓存保护',async()=>{
  const s=scenarioState('PT05'),a=freezeReport(s,'阶段记录',planningReportBody(s));s.decision.reason='验证数据工作日常';const c=freezeReport(s,'阶段记录',planningReportBody(s),a);s.reports=[a,c];await load('/reports/'+c.id,s);
  const trail=p.getByRole('region',{name:'报告版本变化'});assert.equal(await trail.getByRole('navigation',{name:'报告保存版本'}).getByRole('link').count(),2);await trail.locator('summary').click();assert.match(await trail.locator('.chapter-version-diff').innerText(),/验证数据工作日常/);await screenshot('1440-报告版本对照');
  await trail.getByRole('link').first().click();assert.equal(new URL(p.url()).pathname,'/reports/'+a.id);assert.doesNotMatch(await p.locator('.report-paper').innerText(),/验证数据工作日常/);
  s.claims[0].status='已撤回';await load('/reports/'+c.id,s);await p.locator('.version-difference summary').click();assert.equal(await p.locator('.chapter-version-diff').count(),0);assert.match(await p.locator('.version-difference').innerText(),/停止展示对照中的缓存正文/);
 });
 await check('简历编排连线、取消与持续草稿，不修改原事实',async()=>{
  await load('/reports?tab=岗位简历');const before=(await state()).claims;await p.getByLabel('目标岗位',{exact:true}).selectOption('job-a');
  const source=p.locator('.weave-source-node');await source.last().click();const req=p.getByRole('button',{name:/关联岗位要求 1：/});await req.click();await p.locator('.resume-weave-map>svg path').waitFor();assert.equal(await p.locator('.resume-weave-map>svg path').count(),1);await screenshot('1440-简历依据连线');
  await p.reload();await p.locator('.resume-weave-map>svg path').waitFor();assert.equal(await p.locator('.resume-weave-map>svg path').count(),1);assert.deepEqual((await state()).claims,before);
  await form().locator('input[value="claim-sql"]').uncheck();assert.equal(await p.locator('.resume-weave-map>svg path').count(),0);assert.doesNotMatch(await p.getByRole('complementary').filter({has:p.locator('.resume-preview-paper')}).innerText(),/SQL 报告/);
  await p.getByLabel('姓名（示例用途，不参与分析）').fill('编排示例');assert.match(await p.getByLabel('简历即时结构预览').innerText(),/编排示例/);
  await p.getByLabel('目标岗位',{exact:true}).selectOption('job-b');assert.deepEqual((await state()).resumeStudioDraft.tailoring,{});await p.getByLabel('目标岗位',{exact:true}).selectOption('');await screenshot('1440-通用简历');
 });
 await check('连线到表达核对、暂存重开、本人确认保存及相同依据导出',async()=>{
  await load('/reports?tab=岗位简历');await p.getByLabel('目标岗位',{exact:true}).selectOption('job-a');await p.locator('.weave-source-node').last().click();await p.getByRole('button',{name:/关联岗位要求 1：/}).click();await form().getByRole('button',{name:'预览原文与措辞差异'}).click();
  const dialog=p.locator('dialog[open]');await dialog.getByRole('button',{name:'生成此项模拟措辞'}).click();assert.match(await dialog.getByLabel('要求1的表达').inputValue(),/合成表/);
  await p.keyboard.press('Escape');await form().getByRole('button',{name:'预览原文与措辞差异'}).click();assert.match(await dialog.getByLabel('要求1的表达').inputValue(),/合成表/);await dialog.getByLabel('确认这段表达不超出所选事实').check();await dialog.getByRole('button',{name:'上移此经历'}).last().click();await dialog.getByRole('button',{name:'本人确认并保存简历版本'}).click();
  const r=(await state()).resumes.at(-1);assert.equal(r.facts[0].id,'claim-sql');assert.equal(r.tailoring.rows[0].confirmed,true);assert.deepEqual(r.tailoring.rows[0].claimIds,['claim-sql']);
  await p.getByRole('button',{name:'查看 / 打印为 PDF（模拟输出）'}).last().click();assert.match(await p.locator('#printable').innerText(),/针对岗位关注点/);await p.keyboard.press('Escape');await p.getByRole('button',{name:'基于此版本修订'}).last().click();assert.equal(await dialog.locator('.jd-tailor input:checked').count(),0);await p.keyboard.press('Escape');
 });
 await check('岗位原文变化和撤回失效关系可恢复，选中草稿不会冒用旧依据',async()=>{
  const s=scenarioState('PT05');s.resumeStudioDraft={target:'job-a',targetSeed:'',claimIds:['claim-demo','claim-sql'],educationIds:[],tailoring:{jobText:'原有但已改变的要求',rows:{0:{claimIds:['claim-demo'],claimRefs:{'claim-demo':1},wording:'OLD_DRAFT',confirmed:true}}}};await load('/reports?tab=岗位简历',s);assert.match(await p.locator('.resume-evidence-studio').innerText(),/岗位原文已变化/);assert.equal(await p.locator('.resume-weave-map>svg path').count(),0);assert.doesNotMatch(await p.locator('.resume-evidence-studio').innerText(),/OLD_DRAFT/);await p.getByRole('button',{name:'清空失效关联并重新编排'}).click();await p.getByRole('button',{name:/关联岗位要求 1：/}).click();assert.equal((await state()).resumeStudioDraft.tailoring.rows[0].claimIds[0],'claim-demo');
  s.claims[0].status='已撤回';s.resumeStudioDraft.tailoring.jobText=s.jobs[0].text;await load('/reports?tab=岗位简历',s);assert.equal(await p.locator('.weave-source-node').count(),1);assert.match(await p.locator('.resume-evidence-studio').innerText(),/事实已变化/);
 });
 await check('空资料、教育单独选择和移除岗位恢复',async()=>{
  await load('/reports','PT01');await screenshot('1440-空资料报告');assert.match(await p.locator('.report-story-studio').innerText(),/还没有选定长期方向/);await load('/reports?tab=岗位简历','PT01');await form().getByRole('button',{name:'预览原文与措辞差异'}).click();assert.equal(await p.locator('dialog[open]').count(),0);
  const s=scenarioState('PT01');s.education=[{id:'education-test',school:'合成学校',major:'合成专业',degree:'本科',status:'已确认',confirmed:true,version:1,start:'2024-09',ongoing:true}];await load('/reports?tab=岗位简历',s);assert.match(await p.getByLabel('简历即时结构预览').innerText(),/合成学校/);await form().locator('input[name=education]').uncheck();assert.doesNotMatch(await p.getByLabel('简历即时结构预览').innerText(),/合成学校/);await form().locator('input[name=education]').check();await form().getByRole('button',{name:'预览原文与措辞差异'}).click();await p.locator('dialog[open]').getByRole('button',{name:'本人确认并保存简历版本'}).click();assert.equal((await state()).resumes[0].educationFacts[0].id,'education-test');
  s.resumeStudioDraft={target:'removed',targetSeed:''};await load('/reports?tab=岗位简历',s);assert.match(await p.locator('.weave-targets').innerText(),/所选岗位已不可用/);await form().getByRole('button',{name:'预览原文与措辞差异'}).click();assert.equal(await p.locator('dialog[open]').count(),0);
  s.resumes=[{id:'old-resume',title:'旧岗位简历',name:'合成姓名',target:'removed',claimIds:[],educationFacts:s.education,facts:[],profileVersion:1,version:1,jobSnapshot:{title:'已移除岗位的保存快照'}}];await load('/reports?tab=岗位简历',s);await p.getByRole('button',{name:'基于此版本修订'}).click();assert.equal(await p.locator('dialog[open]').count(),0);assert.equal(await p.getByLabel('目标岗位',{exact:true}).inputValue(),'removed');assert.match(await p.locator('.resume-history').innerText(),/已移除岗位的保存快照/);
 });
 await check('岗位页主动制作简历采用点击的岗位，保留姓名和经历选择',async()=>{
  const s=scenarioState('PT05');s.resumeTarget='job-a';s.resumeStudioDraft={target:'job-b',targetSeed:'job-a',name:'本人编排',claimIds:['claim-sql'],educationIds:[],tailoring:{}};await load('/careers?tab=我的机会&job=job-a',s);await p.getByRole('button',{name:'制作岗位简历',exact:true}).click();assert.equal(await p.getByLabel('目标岗位',{exact:true}).inputValue(),'job-a');assert.equal(await p.getByLabel('姓名（示例用途，不参与分析）').inputValue(),'本人编排');assert.equal(await p.locator('.weave-source-node').count(),1);
 });
 await check('桌面手机与窄屏、英文、减少动态布局检查',async()=>{
  for(const width of [1440,1024,390,360]){await p.setViewportSize({width,height:width<600?844:1000});for(const [name,route]of [['报告','/reports'],['简历','/reports?tab=岗位简历']]){const s=scenarioState('PT05');s.resumeTarget='job-a';await load(route,s);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name}-${width} document`);const studio=p.locator(name==='报告'?'.report-story-studio':'.resume-evidence-studio');assert.ok(await studio.evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${name}-${width} studio`);await screenshot(`${width}-${name}-布局`);const overlay=await p.addStyleTag({content:'.flow-progress,.language-switch{visibility:hidden!important}'});try{await studio.screenshot({path:dir+'/实际截图/'+`${width}-${name}-核心区域.png`});}finally{await overlay.evaluate(e=>e.remove());}}}
  await p.emulateMedia({reducedMotion:'reduce'});await load('/reports?tab=岗位简历','PT05','en');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await screenshot('360-英文简历');await p.emulateMedia({reducedMotion:'no-preference'});await p.setViewportSize({width:1440,height:1000});
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});await fs.writeFile(dir+'/结果.json',JSON.stringify(results,null,2));
}finally{await b.close();}if(results.some(r=>r.status==='fail'))process.exitCode=1;
