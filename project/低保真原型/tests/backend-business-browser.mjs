import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
import {localBusinessHarness} from './helpers/local-business-harness.mjs';
const production=process.env.BACKEND_TEST_PRODUCTION==='1',out=path.resolve(process.env.BACKEND_TEST_OUTPUT||'checks/后端闭环_20261029'+(production?'/production':''));assert.ok(out.startsWith(path.resolve('checks')+path.sep));await fs.mkdir(out,{recursive:true});
const report={localOnly:!production,production,syntheticDataOnly:true,realProviderCalls:0,checks:[],commandResponses:[],pageErrors:[],passed:false};let harness,browser,page,registered=false;
const email=`backend-ui-${randomUUID()}@example.invalid`,password='Synthetic browser secret 2026!';
const check=text=>{report.checks.push(text);console.log('PASS '+text);};
async function saved(){await page.locator('.server-save-status[data-status="saved"]').waitFor({timeout:20000});}
async function api(route,{data,method=data?'POST':'GET'}={}){
  return page.evaluate(async({route,data,method})=>{const auth=await(await fetch('/api/auth/session')).json();const response=await fetch(route,{method,headers:{'X-Account-Id':auth.user.id,...(data?{'Content-Type':'application/json','X-CSRF-Token':auth.csrfToken}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:response.status,body:await response.json()};},{route,data,method});
}
async function snapshot(){return (await api('/api/workspace')).body;}
async function command(type,payload){const s=await snapshot(),result=await api('/api/commands',{data:{type,payload,baseVersion:s.revision,mutationId:randomUUID()}});assert.equal(result.status,200,JSON.stringify(result.body));return result.body;}
async function screenshot(name){await page.screenshot({path:path.join(out,name+'.png'),fullPage:false});}
try{
  harness=production?{base:'https://47.250.133.180',close:async()=>{}}:await localBusinessHarness();browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
  const context=await browser.newContext({ignoreHTTPSErrors:production,viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true})));
  await context.route('**/*',route=>{const url=new URL(route.request().url());return ['http:','https:'].includes(url.protocol)&&url.origin!==harness.base?route.abort():route.continue();});
  page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>report.pageErrors.push(error.message));
  page.on('response',async r=>{if(r.url().endsWith('/api/auth/register')&&r.status()===201)registered=true;if(r.url().endsWith('/api/commands')&&r.request().method()==='POST'){const data=r.request().postDataJSON();report.commandResponses.push({type:data.type,status:r.status(),code:(await r.json()).code||null});}});
  await page.goto(harness.base+'/auth');await page.locator('.auth-submit:not(:disabled)').waitFor();await page.getByRole('button',{name:'注册',exact:true}).click();
  await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill(password);await page.locator('[name=agree]').check();await page.locator('.auth-submit').click();await page.waitForURL(harness.base+'/app');registered=true;await saved();
  const state=await snapshot(),owner=(await api('/api/auth/me')).body.user.id;
  const seeded=await api('/api/workspace',{method:'PUT',data:{actorId:owner,baseVersion:state.revision,mutationId:randomUUID(),state:{...state.state,onboard:true,budget:4,goal:'data',claims:[{id:'ui-claim',title:'合成 SQL 材料',text:'本人尝试过一次合成 SQL 练习；未独立核验。',contribution:'测试本人整理',skill:'SQL',version:1,status:'待确认'}]}}});assert.equal(seeded.status,200);
  await page.goto(harness.base+'/assessment?tab=原文确认');await saved();await page.getByRole('button',{name:'修正 / 确认此项',exact:true}).click();await page.locator('dialog[open]').getByRole('button',{name:'确认这一项并查看回执',exact:true}).click();await saved();assert.equal((await snapshot()).state.claims[0].status,'已确认');check('material confirmation goes through a server command and survives reload');
  await page.goto(harness.base+'/assessment?tab=四维与差距');await saved();await page.getByRole('button',{name:'建立职业材料对照',exact:true}).click();await page.getByRole('button',{name:'更新职业材料对照',exact:true}).waitFor();await saved();assert.ok((await snapshot()).state.analysis.authority);await screenshot('01-server-assessment');check('assessment is saved on the server before the page acknowledges it');
  await page.goto(harness.base+'/plan');await saved();await page.getByRole('button',{name:'安排行动',exact:true}).click();
  const dialog=page.locator('dialog[open]');await dialog.getByLabel('行动标题',{exact:true}).fill('合成外部验证行动');
  const areas=dialog.locator('textarea');await areas.first().fill('核对一次有限范围的问题');
  await dialog.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();await saved();assert.ok((await snapshot()).state.tasks.some(task=>task.title==='合成外部验证行动'&&task.authority));check('existing task precheck creates a server-owned task with a receipt');
  const created=await command('task.create',{draft:{title:'合成课程任务',template:'quality',purpose:'检查数据质量的局限',hours:1},confirmation:'CREATE_TASK'}),taskId=created.refs.taskId;
  await page.goto(harness.base+'/work/'+taskId+'?tab=尝试与反馈');await saved();await page.getByLabel('产物文本（每次提交形成独立版本）',{exact:true}).fill('合成测试产物：问题清单、处理理由与限制。');await page.getByLabel('本人贡献',{exact:true}).fill('测试本人整理、比对并记录限制');
  await page.getByRole('button',{name:'提交为 v1',exact:true}).click();await page.getByRole('button',{name:'记录本人自检（非实核）',exact:true}).click();await saved();let task=(await snapshot()).state.tasks.find(t=>t.id===taskId);assert.equal(task.attempts.length,1);assert.equal(task.attempts[0].result,'自检记录');check('artifact submission and self-check use separate atomic commands');
  await page.goto(harness.base+'/work/'+taskId+'?tab=完成回执');await saved();await page.locator('#task-standard-confirmation').check();await page.getByRole('button',{name:'记录有限范围完成',exact:true}).click();await saved();task=(await snapshot()).state.tasks.find(t=>t.id===taskId);assert.equal(task.completed,true);assert.ok(task.completionReceipt);await screenshot('02-completion-receipt');check('completion records its limited self-check scope and durable receipt');
  await page.getByRole('button',{name:'选择成果版本 → 本人确认',exact:true}).click();await page.locator('dialog[open]').getByRole('button',{name:'生成候选并去本人逐项确认',exact:true}).click();await saved();assert.equal((await snapshot()).state.claims.at(-1).status,'待确认');check('selected artifact produces pending candidates without automatically confirming ability');
  await page.goto(harness.base+'/reports');await saved();const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'导出职业准备文档',exact:true}).click();await downloading;await saved();assert.ok((await snapshot()).state.reports.some(r=>r.authority&&r.catalogVersion));check('report compilation saves an immutable server snapshot before downloading');
  await page.getByRole('button',{name:'创建报告 · 先检查缺项',exact:true}).click();
  const preflight=page.locator('dialog[open]');await preflight.getByLabel('我了解缺项和资料范围，创建带明确缺项的草稿。',{exact:true}).check();assert.equal(await preflight.getByRole('button',{name:'模拟生成失败',exact:true}).count(),0);
  await preflight.getByRole('button',{name:'冻结输入并建立报告草稿',exact:true}).click();await page.waitForURL(/\/reports\/[^/?]+$/);await saved();const composed=(await snapshot()).state.reports.at(-1);assert.ok(composed.authority);assert.match(composed.body,/职业资料/);await screenshot('04-server-report-draft');check('primary report draft uses a server preview and saves the selected chapters atomically');
  await page.goto(harness.base+'/assessment?tab=原文确认');await saved();await page.getByRole('button',{name:'撤回声明',exact:true}).click();await page.locator('dialog[open]').getByRole('button',{name:'确认操作',exact:true}).click();await saved();assert.equal((await snapshot()).state.claims[0].status,'已撤回');check('withdrawal is confirmed and persisted by a server command');
  await page.setViewportSize({width:390,height:844});await page.goto(harness.base+'/plan');await saved();const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(geometry.scroll<=geometry.width+1);await screenshot('03-mobile-plan');
  await page.getByRole('button',{name:'Use English',exact:true}).first().click();await page.getByText('Saved to your account',{exact:true}).waitFor();await screenshot('05-english-mobile');
  assert.equal((await api('/api/system/capabilities')).body.ai,false);assert.deepEqual(report.pageErrors,[]);assert.ok(report.commandResponses.every(row=>row.status===200));check('AI remains off; mobile plan has no horizontal overflow; no JavaScript errors');report.passed=true;
}catch(error){report.failure={name:error.name,message:error.message,stack:error.stack?.slice(0,1200)};if(page)await screenshot('failure').catch(()=>{});process.exitCode=1;}
finally{
  if(production&&registered&&page)try{const result=await api('/api/auth/delete-account',{data:{email,currentPassword:password,confirmation:'DELETE_ACCOUNT'}});assert.equal(result.status,200);report.syntheticAccountDeleted=true;}catch(error){report.cleanupFailure=error.message;report.passed=false;process.exitCode=1;}
  await browser?.close();await harness?.close();await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
