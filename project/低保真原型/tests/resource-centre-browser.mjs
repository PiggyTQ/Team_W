import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {KEY,learning,makeTask,scenarioState} from '../src/model.js';

const origin=process.env.CAREER_PREVIEW_ORIGIN||'http://127.0.0.1:5184';
const output='../设计参考与同步/资源中心与我的资源_20261108';
const browser=await chromium.launch({channel:process.env.CAREER_BROWSER_CHANNEL||'chrome',headless:true});
const results=[],errors=[];
await mkdir(output+'/实际截图',{recursive:true});
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const capture=(page,name)=>page.screenshot({path:output+'/实际截图/'+name+'.png',fullPage:true,animations:'disabled'});

function fixture({empty=false,language='zh',long=false}={}){
 const s=scenarioState('PT04');s.budget=30;
 const make=(id,extra={})=>({...makeTask(s,{title:language==='en'?'Fixture project '+id:'合成项目 '+id,purpose:'记录范围与本人贡献',template:'quality',career:'data',hours:1,product:'问题清单与限制说明'}),id,...extra});
 const completed={status:'完成',completed:true,selfcheck:true,contribution:'本人整理方法、检查记录与限制',draft:'合成成果：记录数据清理方法与限制',attempts:[{id:'attempt-done',version:1,text:'合成成果：记录数据清理方法与限制',contribution:'本人整理方法、检查记录与限制',aid:'参考阅读',result:'自检记录',feedback:'本人自检',date:'2026-11-08'}]};
 s.tasks=empty?[]:[
  make('platform-completed',completed),
  make('platform-second',{...completed,template:'ai-eval',career:'ai',attempts:[{...completed.attempts[0],id:'attempt-second'}]}),
  make('hidden-active',{status:'进行中'}),
  make('hidden-flag-only',{completed:true,status:'进行中'}),
  make('hidden-status-only',{completed:false,status:'完成'}),
  make('hidden-external',{...completed,template:'external',mode:'recorded',recordedOnly:true,note:'已发生的外部行动，但没有上传项目文件',attempts:[]}),
  make('hidden-cancelled',{status:'取消'})
 ];
 s.reading={'log':{chapter:1,version:1}};
 if(long)for(const task of s.tasks){task.title=(language==='en'?'A long completed project title to check desktop text wrapping ':'用于检查电脑网页文字换行的长项目名称').repeat(5);task.standard='项目成果和限制说明'.repeat(14);}
 return s;
}

async function setup(options={}){
 const context=await browser.newContext({viewport:{width:options.width||1440,height:1000},timezoneId:'Asia/Singapore',reducedMotion:'reduce',acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
 const s=fixture(options);
 await context.addInitScript(({KEY,s,language})=>{
  if(sessionStorage.getItem('resource-test-initialized'))return;
  sessionStorage.setItem('resource-test-initialized','1');localStorage.clear();localStorage.setItem(KEY,JSON.stringify(s));
  localStorage.setItem('career-prototype-language',language);
  localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true,active:null,seen:[]}));
 },{KEY,s,language:options.language||'zh'});
 await page.goto(origin+(options.route||'/learning'));
 await page.locator('main h1').waitFor();await page.evaluate(()=>document.fonts.ready);
 return {context,page,s};
}

async function assertDesktop(page){
 const geometry=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth,main:document.querySelector('#main').scrollWidth,mainWidth:document.querySelector('#main').clientWidth}));
 assert.ok(geometry.page<=geometry.viewport+1,'Page horizontal overflow: '+JSON.stringify(geometry));
 assert.ok(geometry.main<=geometry.mainWidth+1,'Main horizontal overflow: '+JSON.stringify(geometry));
 return geometry;
}

const tabs=page=>page.locator('main .tabs');
async function myResources(page){
 await tabs(page).getByRole('link',{name:'我的资源',exact:true}).click();
 await page.waitForURL(url=>url.pathname==='/learning'&&url.searchParams.get('tab')==='我的资源');
 await page.getByRole('heading',{name:'把完成的项目，留在这里',exact:true}).waitFor();
}

async function check(name,options,run){
 if(process.env.RESOURCE_CENTRE_CASE&&!new RegExp(process.env.RESOURCE_CENTRE_CASE).test(name))return;
 const {context,page,s}=await setup(options);
 try{const details=await run(page,s);results.push({name,status:'pass',...details});console.log('PASS '+name);}
 catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL '+name+' '+error.message);await capture(page,'失败-'+name);}
 finally{await context.close();await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));}
}

try{
 await check('资源分区与平台项目',{},async page=>{
  assert.deepEqual(await tabs(page).getByRole('link').allTextContents(),['资源中心','我的资源']);
  assert.equal(await tabs(page).getByRole('link',{name:'资源中心',exact:true}).getAttribute('aria-current'),'page');
  assert.equal(await page.locator('.learning-card').count(),learning.length);
  assert.equal(await page.getByText('资源成本 / 语言',{exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'收藏内容',exact:true}).count(),0);
  const before=await state(page);await assertDesktop(page);assert.deepEqual(await state(page),before);
  await capture(page,'1440-资源中心');
  await page.getByRole('combobox',{name:'项目方向',exact:true}).selectOption('ai');
  assert.equal(await page.locator('.learning-card').count(),1);assert.equal(await page.locator('.learning-card').getAttribute('data-career'),'ai');
  await page.getByRole('combobox',{name:'项目方向',exact:true}).selectOption('all');
  await page.getByRole('combobox',{name:'预计投入',exact:true}).selectOption('2 小时以内');
  assert.equal(await page.locator('.learning-card').count(),4);
 });
 await check('只收录完成实践与来源筛选',{},async page=>{
  const before=await state(page);await myResources(page);
  assert.deepEqual(await page.locator('[data-resource-source="practice"]').evaluateAll(elements=>elements.map(element=>element.dataset.resourceId).sort()),['platform-completed','platform-second']);
  for(const id of ['hidden-active','hidden-flag-only','hidden-status-only','hidden-external','hidden-cancelled'])assert.equal(await page.locator(`[data-resource-id="${id}"]`).count(),0,id+' must not be a project result');
  assert.deepEqual(await state(page),before);await assertDesktop(page);await capture(page,'1440-我的资源');
  const sources=page.getByRole('navigation',{name:'我的资源来源',exact:true});
  await sources.getByRole('button',{name:/自主上传/}).click();
  assert.equal(await page.locator('[data-resource-id]').count(),0);assert.equal(await sources.getByRole('button',{name:/自主上传/}).getAttribute('aria-pressed'),'true');
  await sources.getByRole('button',{name:/平台实践/}).click();assert.equal(await page.locator('[data-resource-id]').count(),2);
  await page.getByRole('combobox',{name:'项目方向',exact:true}).selectOption('ai');assert.equal(await page.locator('[data-resource-id]').count(),1);assert.equal(await page.locator('[data-resource-id]').getAttribute('data-resource-id'),'platform-second');
  assert.deepEqual(await state(page),before);
  await page.locator('[data-resource-id="platform-second"]').getByRole('link',{name:'查看项目成果',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/work/platform-second'&&url.searchParams.get('tab')==='完成回执');
  assert.deepEqual(await state(page),before,'Viewing a result must not create tasks or confirm experience claims');
 });
 await check('没有成果的真实空状态',{empty:true,route:'/learning?tab=我的资源'},async page=>{
  assert.equal(await page.locator('[data-resource-id]').count(),0);
  assert.equal(await page.getByRole('button',{name:'上传项目',exact:true}).count(),1);
  assert.match(await page.locator('main').innerText(),/还没有|暂无/);
  await assertDesktop(page);await capture(page,'1440-我的资源空状态');
 });
 await check('桌面宽屏与长标题',{width:1920,long:true,route:'/learning?tab=我的资源'},async page=>{
  await assertDesktop(page);await capture(page,'1920-我的资源长标题');
 });
 await check('上传错误保留输入与文件刷新下载',{},async page=>{
  const before=await state(page);await myResources(page);await page.getByRole('button',{name:'上传项目',exact:true}).click();
  const form=page.getByRole('form',{name:'上传已完成项目',exact:true}),title='自主完成的分析项目（合成上传）',description='已完成合成数据分析，包含本人方法与限制说明。',contribution='本人完成问题整理与文字说明。';
  await form.getByLabel('项目名称',{exact:true}).fill(title);await form.locator('select[name="career"]').selectOption('data');await form.getByLabel('成果说明',{exact:true}).fill(description);await form.getByLabel('本人贡献',{exact:true}).fill(contribution);await form.getByRole('checkbox').check();
  await form.getByLabel('项目文件',{exact:true}).setInputFiles({name:'unsupported.exe',mimeType:'application/octet-stream',buffer:Buffer.from('unsupported fixture')});
  await form.getByRole('button',{name:'保存到我的资源',exact:true}).click();await form.getByRole('alert').waitFor();
  assert.match(await form.getByRole('alert').innerText(),/请上传/);assert.equal(await form.getByLabel('项目名称',{exact:true}).inputValue(),title);assert.equal(await form.getByLabel('成果说明',{exact:true}).inputValue(),description);assert.equal(await form.getByLabel('本人贡献',{exact:true}).inputValue(),contribution);
  assert.deepEqual(await state(page),before);await capture(page,'1440-上传错误保留输入');
  const bytes=Buffer.from('# 已完成的合成项目\n\n本人贡献：问题整理、结果说明。\n限制：仅合成数据，未核验实际能力。\n','utf8');
  await form.getByLabel('项目文件',{exact:true}).setInputFiles({name:'completed-project.md',mimeType:'text/markdown',buffer:bytes});
  await form.getByRole('button',{name:'保存到我的资源',exact:true}).click();await form.waitFor({state:'hidden'});
  const project=page.locator('[data-resource-source="upload"]');await project.waitFor();assert.match(await project.innerText(),/自主完成的分析项目/);assert.deepEqual(await state(page),before);
  await page.reload();await page.locator('[data-resource-source="upload"]').waitFor();assert.equal(await page.locator('[data-resource-source="upload"]').count(),1);
  const downloadEvent=page.waitForEvent('download');await page.locator('[data-resource-source="upload"]').getByRole('button',{name:'下载成果文件',exact:true}).click();const download=await downloadEvent;
  assert.equal(download.suggestedFilename(),'completed-project.md');assert.deepEqual(await readFile(await download.path()),bytes);await assertDesktop(page);await capture(page,'1440-自主上传项目');
  const sources=page.getByRole('navigation',{name:'我的资源来源',exact:true});await sources.getByRole('button',{name:/平台实践/}).click();assert.equal(await page.locator('[data-resource-source="upload"]').count(),0);assert.equal(await page.locator('[data-resource-source="practice"]').count(),2);
  await sources.getByRole('button',{name:/全部项目/}).click();assert.equal(await page.locator('[data-resource-id]').count(),3);
  const uploaded=page.locator('[data-resource-source="upload"]');await uploaded.getByText('项目详情与管理',{exact:true}).click();await uploaded.getByRole('button',{name:'移除上传项目',exact:true}).click();
  assert.equal(await page.locator('[data-resource-source="upload"]').count(),1,'The remove action must first show confirmation');
  await uploaded.getByRole('button',{name:'保留项目',exact:true}).click();assert.equal(await page.locator('[data-resource-source="upload"]').count(),1);
  await uploaded.getByRole('button',{name:'移除上传项目',exact:true}).click();await uploaded.getByRole('button',{name:'确认移除',exact:true}).click();await page.locator('[data-resource-source="upload"]').waitFor({state:'hidden'});
  await page.reload();await page.locator('[data-resource-source="practice"]').first().waitFor();assert.equal(await page.locator('[data-resource-source="upload"]').count(),0);assert.equal(await page.locator('[data-resource-source="practice"]').count(),2);
  assert.deepEqual(await state(page),before);
  await page.getByRole('button',{name:'上传项目',exact:true}).click();const clearForm=page.getByRole('form',{name:'上传已完成项目',exact:true});
  await clearForm.getByLabel('项目名称',{exact:true}).fill('注销清理检查项目');await clearForm.getByLabel('成果说明',{exact:true}).fill(description);await clearForm.getByLabel('本人贡献',{exact:true}).fill(contribution);await clearForm.getByRole('checkbox').check();await clearForm.getByLabel('项目文件',{exact:true}).setInputFiles({name:'cleanup.md',mimeType:'text/markdown',buffer:bytes});await clearForm.getByRole('button',{name:'保存到我的资源',exact:true}).click();await clearForm.waitFor({state:'hidden'});await page.locator('[data-resource-source="upload"]').waitFor();
  await page.goto(origin+'/settings?tab='+encodeURIComponent('资料与隐私'));await page.getByRole('button',{name:'注销本机演示账户',exact:true}).click();
  const confirmation=page.getByRole('dialog');await confirmation.getByRole('button',{name:'确认操作',exact:true}).click();await page.waitForURL(url=>url.pathname==='/');
  assert.equal((await state(page)).logged,false);
  assert.deepEqual(await page.evaluate(async()=>{const resources=await import('/src/resource-project-client.js');return resources.listResourceProjects();}),[],'Deleting the local demo account must clear uploaded project files');
 });
 await check('旧页签及阅读记录兼容',{},async page=>{
  for(const tab of ['路线与资源','短体验','综合项目']){
   await page.goto(origin+'/learning?tab='+encodeURIComponent(tab)+'&unit=quality&range='+encodeURIComponent('标准范围'));
   await page.waitForURL(url=>url.searchParams.get('tab')==='资源中心');
   assert.equal(new URL(page.url()).searchParams.get('unit'),'quality');assert.equal(new URL(page.url()).searchParams.get('range'),'标准范围');
   assert.equal(await tabs(page).getByRole('link',{name:'资源中心',exact:true}).getAttribute('aria-current'),'page');
  }
  assert.equal(await page.locator('.learning-card').count(),learning.length);
 });
 await check('英文桌面项目分区',{language:'en',route:'/learning?tab=我的资源'},async page=>{
  assert.deepEqual(await tabs(page).getByRole('link').allTextContents(),['Resource center','My resources']);
  assert.equal(await page.locator('[data-resource-source="practice"]').count(),2);await assertDesktop(page);await capture(page,'1440-英文我的资源');
 });
 assert.deepEqual(errors,[],'No browser runtime exceptions');
}finally{
 await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));await browser.close();
}
if(results.some(result=>result.status==='fail'))process.exitCode=1;
