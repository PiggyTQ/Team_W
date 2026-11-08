import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {KEY,fresh,makeTask,scenarioState} from '../src/model.js';

const origin=process.env.CAREER_PREVIEW_ORIGIN||'http://127.0.0.1:5184';
const output='../设计参考与同步/职业综合报告_20261108';
const browser=await chromium.launch({channel:process.env.CAREER_BROWSER_CHANNEL||'chrome',headless:true});
const results=[],errors=[];
const chapterTitles=['已完成项目与能力背景','推荐岗位与匹配依据','岗位工作特点与所需能力','建议补充的项目'];
await mkdir(output+'/实际截图',{recursive:true});
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const capture=(page,name)=>page.screenshot({path:output+'/实际截图/'+name+'.png',fullPage:true,animations:'disabled'});
const coreState=s=>({tasks:s.tasks,claims:s.claims,education:s.education,preferences:s.preferences});
const chapter=(page,id)=>page.locator(`[data-report-section="${({background:'profile',recommendation:'recommendations'})[id]||id}"]`);

function fixture({empty=false,long=false,language='zh'}={}){
 const s=empty?fresh():scenarioState('PT05');s.logged=true;s.onboard=true;s.budget=20;
 if(empty)return s;
 s.preferences={...s.preferences,interestType:'INTJ',interestGroup:'NT',location:'杭州',constraint:'希望工作节奏可预期，具体岗位条件待核对'};
 s.preferences.capabilityMastery={SQL:true,Python:false};
 s.decision={reason:'希望用项目经历核对数据分析岗位的实际要求',question:'我的项目说明能支持哪些岗位要求？',result:'继续核对具体岗位与证据'};
 s.education=[{id:'edu-confirmed',title:'已确认教育',school:'合成大学',major:'计算机科学与技术',degree:'本科',courses:'数据库原理、软件工程',status:'已确认',version:1,start:'2023-09',end:'',ongoing:true,date:'2026-11-08'},{id:'edu-pending',school:'UNCONFIRMED_EDUCATION_SENTINEL',major:'未确认专业',status:'待确认',version:1}];
 s.claims.push({id:'claim-pending',title:'UNCONFIRMED_CAPABILITY_SENTINEL',text:'未核对的 Java 能力不能作为已有能力',contribution:'待核对',skill:'Java',status:'待确认',version:1});
 const completed={...makeTask(s,{title:'已完成的数据质量项目',purpose:'记录问题、处理理由与限制',template:'quality',career:'data',hours:2,product:'问题清单、处理理由和限制说明'}),id:'report-completed',status:'完成',completed:true,selfcheck:true,contribution:'本人整理问题清单、SQL说明和边界',draft:'已完成成果说明',attempts:[{id:'report-attempt',version:1,text:'合成项目成果：问题清单、处理理由和限制说明',contribution:'本人整理问题清单、SQL说明和边界',aid:'参考阅读',result:'自检记录',feedback:'本人自检，未独立核验',date:'2026-11-08'}]};
 const pending={...makeTask(s,{title:'UNFINISHED_PROJECT_SENTINEL',purpose:'尚未完成的实践',template:'ai-eval',career:'ai',hours:1,product:'尚未完成'}),id:'report-in-progress',status:'进行中'};
 s.tasks=[completed,pending];
 s.reading={'log':{chapter:1,version:1}};
 s.jobs=[{id:'job-report-data',title:'数据分析岗位研究样本',career:'data',company:'合成机构',location:'杭州',form:'未知',text:'使用 SQL 整理业务数据；能说明数据质量问题与限制；学历条件待核对。',source:'本人保存的岗位研究样本；在招状态未核验',date:'2026-11-01',status:'准备',note:'工作节奏和协作方式待核对'},{id:'job-report-ops',title:'运维岗位研究样本',career:'ops',company:'合成机构B',location:'未知',form:'未知',text:'使用 Linux 处理运维问题；轮班条件需核对。',source:'历史岗位研究样本；在招状态未核验',date:'2026-11-01',status:'收藏'}];
 s.reviews=[{id:'private-review',taskId:completed.id,date:'2026-11-08',result:'PRIVATE_REPORT_RESULT_SENTINEL',reason:'PRIVATE_REPORT_REASON_SENTINEL',next:'PRIVATE_REPORT_NEXT_SENTINEL',version:1}];
 if(language==='en'){
  s.tasks[0].title='Completed data quality project';s.tasks[0].contribution='I organized the issue list and limitations.';
  s.education[0].school='Synthetic University';s.education[0].major='Computer science';
 }
 if(long){s.tasks[0].title=(language==='en'?'A long completed data project title for checking desktop layout ':'用于检查桌面排版的较长已完成数据项目名称').repeat(5);s.tasks[0].contribution='本人负责数据问题梳理、方法记录和局限说明。'.repeat(15);s.claims[0].title='较长的本人确认项目经历名称'.repeat(6);}
 return s;
}

async function setup(options={}){
 const context=await browser.newContext({viewport:{width:options.width||1440,height:1100},timezoneId:'Asia/Singapore',reducedMotion:'reduce',acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const s=fixture(options);
 await context.addInitScript(({KEY,s,language})=>{
  if(sessionStorage.getItem('career-report-test-initialized'))return;
  sessionStorage.setItem('career-report-test-initialized','1');localStorage.clear();localStorage.setItem(KEY,JSON.stringify(s));
  localStorage.setItem('career-prototype-language',language);
  localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true,active:null,seen:[]}));
 },{KEY,s,language:options.language||'zh'});
 await page.goto(origin+(options.route||'/reports'));await page.locator('main h1').waitFor();await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>{const button=document.querySelector('.career-report-intro>button');return button&&!button.disabled;});
 return {context,page,s};
}

async function assertDesktop(page){
 const geometry=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth,main:document.querySelector('#main').scrollWidth,mainWidth:document.querySelector('#main').clientWidth}));
 assert.ok(geometry.page<=geometry.viewport+1,'Page horizontal overflow: '+JSON.stringify(geometry));assert.ok(geometry.main<=geometry.mainWidth+1,'Main horizontal overflow: '+JSON.stringify(geometry));return geometry;
}

async function uploadFixture(page){
 await page.goto(origin+'/learning?tab='+encodeURIComponent('我的资源'));await page.getByRole('button',{name:'上传项目',exact:true}).click();
 const form=page.getByRole('form',{name:'上传已完成项目',exact:true});
 await form.getByLabel('项目名称',{exact:true}).fill('自主完成的可视化作品');await form.locator('select[name="career"]').selectOption('data');
 await form.getByLabel('成果说明',{exact:true}).fill('独立项目说明第一行\n第二行：保留限制，不将完成等于能力认证。');await form.getByLabel('本人贡献',{exact:true}).fill('本人完成可视化说明与限制记录');await form.getByRole('checkbox').check();
 await form.getByLabel('项目文件',{exact:true}).setInputFiles({name:'report-project.md',mimeType:'text/markdown',buffer:Buffer.from('DO_NOT_READ_ATTACHMENT_SENTINEL\n附件只保存，报告应只读取metadata。','utf8')});
 await form.getByRole('button',{name:'保存到我的资源',exact:true}).click();await form.waitFor({state:'hidden'});await page.locator('[data-resource-source="upload"]').waitFor();
 await page.goto(origin+'/reports');
}

async function saveCurrentReport(page,title='综合报告验收快照'){
 await page.getByRole('button',{name:/创建报告.*检查缺项|保存.*报告/}).first().click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('报告标题',{exact:true}).fill(title);
 await dialog.getByRole('checkbox',{name:/我了解缺项/}).check();
 await dialog.getByRole('button',{name:/冻结输入并建立.*草稿/}).click();
 await page.waitForURL(url=>/^\/reports\/[^/]+$/.test(url.pathname));
 return (await state(page)).reports.at(-1);
}

async function downloadCurrentReport(page){
 await page.getByRole('button',{name:'选择片段导出',exact:true}).click();const dialog=page.getByRole('dialog');
 assert.equal(await dialog.getByRole('checkbox',{name:/主动加入本人复盘片段/}).isChecked(),false);
 const downloadEvent=page.waitForEvent('download');await dialog.getByRole('button',{name:'导出选中片段 TXT（本地示例）',exact:true}).click();
 const download=await downloadEvent;return (await readFile(await download.path())).toString('utf8');
}

async function check(name,options,run){
 if(process.env.CAREER_REPORT_CASE&&!new RegExp(process.env.CAREER_REPORT_CASE).test(name))return;
 const {context,page,s}=await setup(options);
 try{const details=await run(page,s);results.push({name,status:'pass',...details});console.log('PASS '+name);}
 catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL '+name+' '+error.message);await capture(page,'失败-'+name);}
 finally{await context.close();await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));}
}

try{
 await check('综合结果四章与真实项目背景',{},async page=>{
  await chapter(page,'background').waitFor();const before=await state(page);
  assert.deepEqual(await page.locator('[data-report-section]').evaluateAll(elements=>elements.map(element=>element.dataset.reportSection)),['profile','recommendations','requirements','projects']);
  const background=await chapter(page,'background').innerText();assert.match(background,/已完成的数据质量项目/);assert.match(background,/合成大学/);assert.match(background,/SQL/);assert.match(background,/本人/);
  assert.doesNotMatch(background,/UNFINISHED_PROJECT_SENTINEL|UNCONFIRMED_CAPABILITY_SENTINEL|UNCONFIRMED_EDUCATION_SENTINEL/);
  assert.equal(await page.locator('.report-record-flow,.report-record-charts,.report-material-chart,.report-action-chart').count(),0);
  assert.doesNotMatch(await page.locator('main').innerText(),/PRIVATE_REPORT_/);
  assert.deepEqual(coreState(await state(page)),coreState(before));assert.equal((await state(page)).reports.length,0);
  await assertDesktop(page);await capture(page,'1440-综合报告项目与能力背景');
  const navigation=page.getByRole('navigation',{name:'综合报告章节',exact:true});
  for(const [index,id,name]of [[1,'recommendation','1440-推荐岗位与匹配依据'],[2,'requirements','1440-岗位工作特点与所需能力'],[3,'projects','1440-建议项目与计划衔接']]){
   await navigation.getByRole('button').nth(index).focus();await page.keyboard.press('Enter');assert.equal(await navigation.getByRole('button').nth(index).getAttribute('aria-current'),'location');
   assert.equal(await chapter(page,id).locator('h2').evaluate(element=>element===document.activeElement),true);await capture(page,name);
  }
  assert.deepEqual(coreState(await state(page)),coreState(before));
 });
 await check('推荐依据透明且MBTI只作偏好',{},async page=>{
  await chapter(page,'recommendation').waitFor();const recommendations=await chapter(page,'recommendation').innerText();
  assert.match(recommendations,/技能依据覆盖|技能材料覆盖/);assert.match(recommendations,/INTJ/);assert.match(recommendations,/不.*(?:能力|职业|胜任|录用)/);
  await page.locator('.career-report-limits>summary').click();assert.match(await page.locator('.career-report-limits').innerText(),/MBTI/);assert.match(await page.locator('.career-report-limits').innerText(),/不能据此判定/);
  assert.match(await chapter(page,'requirements').innerText(),/SQL|数据/);assert.match(await chapter(page,'requirements').innerText(),/任务|工作|流程/);
  assert.doesNotMatch(recommendations,/UNCONFIRMED_CAPABILITY_SENTINEL/);await assertDesktop(page);
 });
 await check('补项目入口只预览不创建任务',{},async page=>{
  await chapter(page,'projects').waitFor();const before=await state(page),suggestion=chapter(page,'projects').getByRole('link').filter({hasText:/预览|查看项目|继续/}).first();
  const href=await suggestion.getAttribute('href');assert.match(href,/^\/(?:learning|career-map)/);await suggestion.click();
  await page.waitForURL(url=>url.pathname==='/learning'||url.pathname==='/career-map');assert.deepEqual(coreState(await state(page)),coreState(before));assert.equal((await state(page)).reports.length,before.reports.length);
  if(new URL(href,origin).searchParams.has('unit'))assert.equal(new URL(page.url()).searchParams.get('unit'),new URL(href,origin).searchParams.get('unit'));
 });
 await check('上传项目进入报告保存刷新与相同正文导出',{},async page=>{
  await uploadFixture(page);await chapter(page,'background').getByText('自主完成的可视化作品',{exact:true}).waitFor();const before=await state(page);
  assert.doesNotMatch(await page.locator('main').innerText(),/DO_NOT_READ_ATTACHMENT_SENTINEL|PRIVATE_REPORT_/);
  const report=await saveCurrentReport(page);assert.equal(report.format,'career-report-v1');
  assert.deepEqual(report.sections,[...chapterTitles,'引用与局限']);assert.equal(report.body.split('\n').length,5,'Multiline project descriptions must not create fake report chapters');
  assert.match(report.body,/自主完成的可视化作品/);assert.match(report.body,/独立项目说明第一行/);assert.match(report.body,/第二行/);assert.match(report.body,/INTJ/);assert.match(report.body,/合成大学/);assert.doesNotMatch(report.body,/DO_NOT_READ_ATTACHMENT_SENTINEL|PRIVATE_REPORT_|UNCONFIRMED_/);
  assert.deepEqual(coreState(await state(page)),coreState(before));await page.reload();await page.locator('.report-paper').waitFor();assert.equal((await state(page)).reports.at(-1).body,report.body);await capture(page,'1440-综合报告保存快照');
  const exported=await downloadCurrentReport(page);assert.ok(exported.includes(report.body),'Exported text must contain the saved composite report body');assert.doesNotMatch(exported,/PRIVATE_REPORT_|DO_NOT_READ_ATTACHMENT_SENTINEL/);
  assert.deepEqual(coreState(await state(page)),coreState(before));
  await page.goto(origin+'/learning?tab='+encodeURIComponent('我的资源')+'&source=upload');const uploaded=page.locator('[data-resource-source="upload"]');await uploaded.waitFor();await uploaded.getByText('项目详情与管理',{exact:true}).click();await uploaded.getByRole('button',{name:'移除上传项目',exact:true}).click();await uploaded.getByRole('button',{name:'确认移除',exact:true}).click();await uploaded.waitFor({state:'hidden'});
  await page.goto(origin+'/reports/'+report.id);await page.waitForFunction(()=>document.querySelector('.report-paper')?.innerText.includes('引用已不可访问'));
  assert.doesNotMatch(await page.locator('.report-paper').innerText(),/自主完成的可视化作品|独立项目说明第一行/);await page.getByRole('button',{name:'选择片段导出',exact:true}).click();
  assert.equal(await page.getByRole('dialog').getByRole('button',{name:'导出选中片段 TXT（本地示例）',exact:true}).isDisabled(),true,'Removed project references must block cached-text export');
  return {reportId:report.id,chapters:report.sections.length};
 });
 await check('缺项保留未知且不生成最高推荐',{empty:true},async page=>{
  await chapter(page,'background').waitFor();const text=await page.locator('main').innerText();assert.match(text,/尚无已完成|还没有已完成|暂无已完成/);assert.match(text,/材料不足|资料不足|依据不足|暂不.*推荐|尚无.*推荐/);assert.match(text,/未知|待补充|尚未/);
  assert.doesNotMatch(await chapter(page,'recommendation').innerText(),/\d+\s*%/);assert.equal((await state(page)).tasks.length,0);assert.equal((await state(page)).reports.length,0);await assertDesktop(page);await capture(page,'1440-综合报告缺项空态');
 });
 await check('1920宽屏长文字与岗位简历入口',{width:1920,long:true},async page=>{
  await chapter(page,'background').waitFor();await assertDesktop(page);await capture(page,'1920-综合报告长项目名称');
  await page.locator('main .tabs').getByRole('link',{name:'岗位简历',exact:true}).click();await page.waitForURL(url=>url.searchParams.get('tab')==='岗位简历');assert.match(await page.locator('main h1').innerText(),/简历/);
 });
 await check('英文综合结果桌面展示',{language:'en'},async page=>{
  await chapter(page,'background').waitFor();await assertDesktop(page);await capture(page,'1440-英文综合报告');
  const headings=await page.locator('[data-report-section]>header').allTextContents();assert.equal(headings.length,4);assert.doesNotMatch(headings.join(' '),/[\u3400-\u9fff]/);assert.equal(await page.locator('.report-record-flow,.report-record-charts').count(),0);
 });
 assert.deepEqual(errors,[],'No browser runtime exceptions');
}finally{
 await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));await browser.close();
}
if(results.some(result=>result.status==='fail'))process.exitCode=1;
