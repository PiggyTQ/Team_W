import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {localBusinessHarness} from './helpers/local-business-harness.mjs';
import {AUTH_POLICY} from '../src/auth-contract.js';
import {createLocalServer} from '../server/practice-growth/local-service.mjs';
import {runScenario} from '../server/practice-growth/scenarios.mjs';
import {DatabaseSync} from 'node:sqlite';

const root=path.resolve('course-packs/growth'),registry=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
const out=path.resolve('checks/practice-growth-20261126'),shots=path.resolve('docs/releases/images/practice-growth-20261126/actual');
await fs.mkdir(shots,{recursive:true});
const report={localOnly:true,syntheticOnly:true,realModelCalls:0,projects:[],screenshots:[],runtime:process.version,errors:[],passed:false};
const harness=await localBusinessHarness();const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});let page;
try{
 await context.addInitScript(()=>{if(window.top!==window)return;localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true}));});
 page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>report.errors.push(error.message));
 const raw=async(route,{data,method=data?'POST':'GET'}={})=>{const session=await(await context.request.get(harness.base+'/api/auth/session')).json();const response=await context.request.fetch(harness.base+route,{method,headers:{Origin:harness.base,...(session.user?{'X-Account-Id':session.user.id}:{}),...(data?{'X-CSRF-Token':session.csrfToken}: {})},...(data?{data:route==='/api/workspace'?{...data,actorId:session.user.id}:data}: {})});return {status:response.status(),body:await response.json()};};
 const registered=await raw('/api/auth/register',{data:{email:'growth-'+randomUUID()+'@example.invalid',password:'Synthetic growth browser secret!',agree:true,termsVersion:AUTH_POLICY.termsVersion}});assert.equal(registered.status,201);
 let saved=await raw('/api/workspace');saved.body.state.budget=168;saved.body.state.onboard=true;
 assert.equal((await raw('/api/workspace',{method:'PUT',data:{state:saved.body.state,baseVersion:saved.body.revision,mutationId:randomUUID()}})).status,200);
 const stable=()=>page.locator('.server-save-status[data-status="saved"]').waitFor();
 const screenshot=async name=>{await page.screenshot({path:path.join(shots,name+'.png'),fullPage:false});report.screenshots.push(name);};
 const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page must fit desktop width');
 await page.goto(harness.base+'/learning?career=all');await stable();await page.locator('.growth-library').waitFor();assert.equal(await page.locator('.growth-family').count(),11);await overflow();await screenshot('library-zh-1366x900');
 for(const p of registry.projects){
  const started=Date.now();
  await page.goto(harness.base+'/learning/projects/'+p.id);await stable();
  if(p.legacy){await page.locator('.practice-project-page, .practice-project').first().waitFor().catch(()=>page.getByRole('heading').first().waitFor());report.projects.push({id:p.id,overview:true,legacy:true});continue;}
  await page.locator('.growth-heading h1').waitFor();await overflow();
  const catalog=await raw('/api/catalog/courses/'+p.id);assert.equal(catalog.body.course.canStart,true);assert.equal(catalog.body.course.status,'local_trial');
  const zip=catalog.body.course.assets.find(a=>a.relative_path==='project.zip');assert.ok(zip);
  const downloaded=await context.request.get(harness.base+zip.url),bytes=await downloaded.body();assert.equal(downloaded.status(),200);assert.ok(downloaded.headers()['content-type'].includes('application/zip'));assert.equal(createHash('sha256').update(bytes).digest('hex'),zip.sha256);
  const deliveryReceipt=JSON.parse(await fs.readFile(path.resolve('public/practice-bundles',p.id,'1/delivery-receipt.json'),'utf8'));
  const deliveryUrl=await page.locator('.growth-download-main').getAttribute('href');assert.equal(deliveryUrl,'/practice-bundles/'+p.id+'/1/practice.zip');
  const delivery=await context.request.get(harness.base+deliveryUrl);assert.equal(delivery.status(),200);assert.equal(createHash('sha256').update(await delivery.body()).digest('hex'),deliveryReceipt.sha256);assert.equal(deliveryReceipt.materialManifestSha256,catalog.body.course.packHash);assert.equal(deliveryReceipt.actualExtractedReference.exit,0);
  await page.getByRole('button',{name:'预览预算并安排实践',exact:true}).click();
  await page.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();await page.locator('#growth-editor').waitFor();await stable();
  const id=new URL(page.url()).searchParams.get('task');assert.ok(id);
  const artifact=JSON.parse(await fs.readFile(path.join(root,p.id,'1/reference/artifact.json'),'utf8'));
  const bad=JSON.parse(await fs.readFile(path.join(root,p.id,'1/reference/counterexample.json'),'utf8'));
  for(const filename of p.requiredFiles){
   const wait=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/workspace'&&r.request().method()==='PUT');
   await page.locator('.growth-workspace input[type=file]').setInputFiles({name:filename,mimeType:filename.endsWith('.json')?'application/json':'text/plain',buffer:Buffer.from(bad.files[filename])});await wait;await stable();
  }
  await page.getByRole('button',{name:'检查文件与结果',exact:true}).click();await page.getByRole('heading',{name:'发现需要修正的项',exact:true}).waitFor();
  await page.locator('.growth-workspace .growth-file-tabs button').filter({hasText:'result.json'}).click();
  let wait=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/workspace'&&r.request().method()==='PUT');await page.locator('#growth-editor').fill(artifact.files['result.json']);await wait;await stable();
  await page.getByRole('button',{name:'检查文件与结果',exact:true}).click();await page.getByRole('heading',{name:'文件与结果核对通过',exact:true}).waitFor();
  if(p.id==='multi-source-analysis'){
   wait=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/workspace'&&r.request().method()==='PUT');await page.locator('#growth-editor').fill(artifact.files['result.json']+' ');await wait;await stable();await page.getByRole('heading',{name:'产物已修改，请重新检查',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'提交本次产物',exact:true}).isDisabled(),true);await screenshot('stale-artifact-zh-1366x900');await page.getByRole('button',{name:'检查文件与结果',exact:true}).click();await page.getByRole('heading',{name:'文件与结果核对通过',exact:true}).waitFor();
  }
  wait=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/workspace'&&r.request().method()==='PUT');await page.getByLabel('本人贡献',{exact:true}).fill('本人练习记录：逐项复算合成输入，修订反例，未宣称真实工作经历。');await wait;await stable();
  await page.getByRole('button',{name:'提交本次产物',exact:true}).click();await stable();await page.getByRole('button',{name:'记录本人复核',exact:true}).click();await stable();await page.getByRole('button',{name:'确认本次范围并归档',exact:true}).click();await page.getByRole('heading',{name:'本次产物已归档',exact:true}).waitFor();
  const snapshot=await raw('/api/workspace'),task=snapshot.body.state.tasks.find(t=>t.id===id);assert.equal(task.completed,true);assert.equal(task.projectCheck.masteryGranted,false);
  report.projects.push({id:p.id,overview:true,downloadHash:true,deliveryUrl,deliveryHash:deliveryReceipt.sha256,extractedReferenceExecuted:true,packHash:catalog.body.course.packHash,taskId:id,wrongFailed:true,correctPassed:true,archived:true,sourceFiles:p.requiredFiles.length});
  console.log('PASS UI '+p.id);
  await page.waitForTimeout(Math.max(0,8500-(Date.now()-started)));
  if(['cross-metric-service','accessible-form','contract-api'].includes(p.id))await screenshot(p.id+'-archived-zh');
 }
 await page.reload();await stable();await page.getByRole('heading',{name:'本次产物已归档',exact:true}).waitFor();report.refreshRestores=true;
 for(const width of [1366,1616])for(const height of [900,960])for(const language of ['zh','en']){
  await page.setViewportSize({width,height});
  const button=page.getByRole('button',{name:language==='en'?'Use English':'使用中文',exact:true}).first();if(await button.count())await button.click();
  await page.goto(harness.base+'/learning?career=all');await stable();await page.locator('.growth-library').waitFor();await overflow();await screenshot(`library-${language}-${width}x${height}`);
  await page.goto(harness.base+'/learning/projects/cross-metric-service');await stable();await page.locator('.growth-heading h1').waitFor();await overflow();await screenshot(`project-${language}-${width}x${height}`);
 }
 await page.getByRole('button',{name:'使用中文',exact:true}).first().click();await page.goto(harness.base+'/learning?tab='+encodeURIComponent('我的资源'));await stable();await page.getByRole('heading').first().waitFor();await screenshot('resources-32-completed');
 report.completedCount=(await raw('/api/workspace')).body.state.tasks.filter(t=>t.completed).length;assert.equal(report.completedCount,32);
 const createTask=async(template)=>{const snapshot=(await raw('/api/workspace')).body;const result=await raw('/api/commands',{data:{type:'task.create',payload:{draft:{template,title:'Synthetic retirement compatibility',purpose:'Retirement read-only scenario',hours:1},confirmation:'CREATE_TASK'},baseVersion:snapshot.revision,mutationId:randomUUID()}});assert.equal(result.status,200);return result.body.refs.taskId;};
 const pending=await createTask('multi-source-analysis'),legacyPending=await createTask('quality');
 const temporaryDb=new DatabaseSync(harness.database);temporaryDb.exec("UPDATE courses SET status='retired' WHERE id IN ('quality','multi-source-analysis')");temporaryDb.close();
 await page.goto(harness.base+'/learning/projects/multi-source-analysis?task='+pending);await stable();assert.equal(await page.locator('#growth-editor').isDisabled(),true);await screenshot('retired-new-project-read-only');
 await page.goto(harness.base+'/learning/projects/quality?task='+legacyPending);await stable();await page.getByText('已退役；历史材料与本人记录仍可回看。',{exact:true}).waitFor();await page.getByRole('button',{name:'导出本次记录',exact:true}).waitFor();report.retiredHistory=true;await screenshot('retired-legacy-project-history');
 // Actual browser behavior of the runnable original interfaces, separate from file checks.
 await page.goto(harness.base+'/practice-projects/accessible-form/1/reference/ui.html');await page.getByRole('button',{name:'Register',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.locator('#email').evaluate(e=>document.activeElement===e),true);
 await page.locator('#email').fill('test@example.invalid');await page.locator('#outcome').selectOption('failure');await page.getByRole('button',{name:'Register',exact:true}).click();await page.getByText('Failed; input retained',{exact:true}).waitFor();assert.equal(await page.locator('#email').inputValue(),'test@example.invalid');
 await page.locator('#outcome').selectOption('success');await page.getByRole('button',{name:'Register',exact:true}).click();await page.locator('#email').fill('edited@example.invalid');await page.waitForTimeout(400);assert.equal(await page.locator('#feedback').textContent(),'Input changed');await screenshot('interface-form-keyboard-and-late-response');
 await page.goto(harness.base+'/practice-projects/data-workbench/1/reference/ui.html');await page.locator('#group').selectOption('B');await page.waitForTimeout(500);assert.match(await page.locator('#rows').textContent(),/^B/);await page.locator('#group').selectOption('empty');await page.getByText('No records',{exact:true}).waitFor();await page.locator('#group').selectOption('error');await page.getByText('Request failed; retry by choosing a group',{exact:true}).waitFor();await screenshot('interface-data-error');
 await page.goto(harness.base+'/practice-projects/frontend-release-delivery/1/reference/ui.html#detail/7');await page.reload();await page.getByText('Item 7 · available',{exact:true}).waitFor();await page.locator('#api').selectOption('1');await page.getByText('Contract changed: refresh data mapping',{exact:true}).waitFor();report.interfaceFlows=true;
 const crossInput=JSON.parse(await fs.readFile(path.join(root,'cross-registration-service/1/input/fixture.json'),'utf8')),ui=await fs.readFile(path.join(root,'cross-registration-service/1/reference/ui.html'),'utf8');
 const service=createLocalServer('cross-registration-service',crossInput,x=>runScenario('cross-registration-service',x),{ui});await new Promise(r=>service.listen(0,'127.0.0.1',r));
 try{await page.goto('http://127.0.0.1:'+service.address().port+'/ui');await page.locator('#email').fill('joint@example.invalid');await page.getByRole('button',{name:'Register',exact:true}).click();await page.getByText('Registered 1',{exact:true}).waitFor();await page.getByRole('button',{name:'Register',exact:true}).click();await page.getByText('Registered 1',{exact:true}).waitFor();await screenshot('cross-registration-real-ui-http');report.jointUiHttp=true;}finally{await new Promise(r=>service.close(r));}
 assert.equal((await raw('/api/system/capabilities')).body.ai,false);assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure={message:error.message,stack:error.stack?.slice(0,1800)};if(page)await page.screenshot({path:path.join(shots,'failure.png')}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();await harness.close();await fs.writeFile(path.join(out,'browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,projects:report.projects.length,failure:report.failure}));}
