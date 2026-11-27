import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {chromium} from '@playwright/test';
import {localBusinessHarness} from './helpers/local-business-harness.mjs';
import {importCoursePack} from '../server/course-library.mjs';
import {AUTH_POLICY} from '../src/auth-contract.js';
const harness=await localBusinessHarness();
const seed=new DatabaseSync(harness.database);importCoursePack(seed,path.resolve('course-packs/practice-20261113'));seed.close();
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1616,height:960},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);
const out=path.resolve('docs/releases/images/practice-growth-20261126/actual/compat');await fs.mkdir(out,{recursive:true});
const report={localOnly:true,syntheticOnly:true,passed:false,errors:[],checks:[],screenshots:[]};page.on('pageerror',e=>report.errors.push(e.message));
await context.addInitScript(()=>{if(window.top!==window)return;localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true}));});
const raw=async(route,{data,method=data?'POST':'GET'}={})=>{const session=await(await context.request.get(harness.base+'/api/auth/session')).json();const response=await context.request.fetch(harness.base+route,{method,headers:{Origin:harness.base,...(session.user?{'X-Account-Id':session.user.id}:{}),...(data?{'X-CSRF-Token':session.csrfToken}:{})},...(data?{data:route==='/api/workspace'?{...data,actorId:session.user.id}:data}:{})});return {status:response.status(),body:await response.json()};};
const save=async state=>{const current=(await raw('/api/workspace')).body;const result=await raw('/api/workspace',{method:'PUT',data:{state,baseVersion:current.revision,mutationId:randomUUID()}});assert.equal(result.status,200,JSON.stringify(result.body));};
const command=async(type,payload)=>{const current=(await raw('/api/workspace')).body;const result=await raw('/api/commands',{data:{type,payload,baseVersion:current.revision,mutationId:randomUUID()}});assert.equal(result.status,200,JSON.stringify(result.body));return result.body;};
const stable=()=>page.locator('.server-save-status[data-status="saved"]').waitFor();
const screenshot=async name=>{await page.screenshot({path:path.join(out,name+'.png'),fullPage:false});report.screenshots.push(name);};
try{
 assert.equal((await raw('/api/auth/register',{data:{email:'growth-compat-'+randomUUID()+'@example.invalid',password:'Synthetic compatibility secret!',agree:true,termsVersion:AUTH_POLICY.termsVersion}})).status,201);
 let state=(await raw('/api/workspace')).body.state;state.budget=168;state.onboard=true;await save(state);
 for(const id of ['quality','ai-eval','log','restore']){
  const course=(await raw('/api/catalog/courses/'+id)).body.course;assert.equal(course.content_version,2);const p=course.project;
  await page.goto(harness.base+'/learning/projects/'+id);await stable();await page.locator('.project-setup').waitFor();
  await page.getByRole('button',{name:'核对时间并开始',exact:true}).click();await page.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();await page.locator('[data-project-view="practice"]').waitFor();await stable();
  const taskId=new URL(page.url()).searchParams.get('task');assert.ok(taskId);
  state=(await raw('/api/workspace')).body.state;state.tasks.find(t=>t.id===taskId).projectPractice={role:'member',scope:'core',responses:Object.fromEntries(p.steps.map(step=>[step.id,{choice:step.choices[0].id,evidence:p.dataset.rows.slice(0,step.minEvidence).map(r=>r.id),note:'Synthetic compatibility reasoning based on the supplied rows.',...(step.id==='delivery'?{contribution:'Synthetic original-flow reproduction.',limits:'No real employment or independent certification.'}:{})}]))};await save(state);
  await page.goto(harness.base+'/learning/projects/'+id+'?view=outcome&task='+taskId);await stable();await page.getByRole('button',{name:'提交当前成果',exact:true}).click();await stable();await page.locator('.project-selfcheck input[type=checkbox]').check();await page.getByRole('button',{name:'记录本人自查',exact:true}).click();await stable();await page.getByRole('button',{name:'确认完成本次实践',exact:true}).click();await page.getByRole('heading',{name:'实践已完成',exact:true}).waitFor();await screenshot(id+'-v2-completed');
  const completed=(await raw('/api/workspace')).body.state.tasks.find(t=>t.id===taskId);assert.equal(completed.completed,true);assert.equal(completed.courseVersion,2);report.checks.push({id,version:2,actualUiCreateSubmitReviewComplete:true});
 }
 const oldTask=(await command('task.create',{draft:{template:'quality',title:'Synthetic retained v1 draft',purpose:'Original v1 compatibility',hours:1,courseVersion:1},confirmation:'CREATE_TASK'})).refs.taskId;
 state=(await raw('/api/workspace')).body.state;state.tasks.find(t=>t.id===oldTask).draft='Retained v1 personal draft 原稿保持';state.reading.quality={chapter:2,version:1};await save(state);
 await page.goto(harness.base+'/learning/projects/quality?task='+oldTask);await stable();await page.locator('.course-reader').waitFor();assert.match(await page.locator('.course-chapters [aria-current=step]').textContent(),/^3\./);await page.reload();await stable();assert.equal((await raw('/api/workspace')).body.state.tasks.find(t=>t.id===oldTask).draft,'Retained v1 personal draft 原稿保持');await screenshot('quality-v1-reading-bookmark');
 const oldCourse=(await raw('/api/catalog/courses/quality?version=1')).body.course,asset=oldCourse.assets.find(a=>a.filename.endsWith('.csv'));
 const downloaded=await context.request.get(harness.base+asset.url);assert.equal(createHash('sha256').update(await downloaded.body()).digest('hex'),asset.sha256);report.checks.push({id:'quality',version:1,bookmarkAndDraftRestored:true,downloadHash:true});
 // Real input failure and retry, then keyboard navigation in the current file workbench.
 await page.route('**/practice-projects/relational-model/1/input/fixture.json',r=>r.abort());await page.goto(harness.base+'/learning/projects/relational-model');await stable();await page.getByText('材料读取失败',{exact:false}).waitFor();await page.unroute('**/practice-projects/relational-model/1/input/fixture.json');await page.getByRole('button',{name:'重试',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.growth-input pre')?.textContent.includes('customers'));await screenshot('material-failure-retried');report.checks.push({materialRetry:true});
 await page.goto(harness.base+'/learning/projects/multi-source-analysis');await stable();await page.locator('.growth-overview select').selectOption('data-2');await page.locator('.growth-instance summary').click();await page.locator('.growth-instance a[download]').waitFor();const runner=await context.request.get(harness.base+'/practice-tools/instance-runner-1.mjs');assert.equal(runner.status(),200);assert.match(await runner.text(),/Avemly original local tool/);await page.getByRole('button',{name:'预览预算并安排实践',exact:true}).click();await page.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();await stable();await page.waitForFunction(()=>document.querySelector('.growth-input pre')?.textContent.includes('A4'));await screenshot('selected-frozen-instance');
 const variantArtifact=JSON.parse(await fs.readFile('course-packs/growth/multi-source-analysis/1/reference/artifact.json','utf8')),variant=JSON.parse(await fs.readFile('course-packs/growth/multi-source-analysis/1/input/variants/data-2.json','utf8'));variantArtifact.files['result.json']=JSON.stringify(variant.expected);variantArtifact.files['notes.md']='Synthetic instance reproduction: A4 remains unpaid; no inference about users or cause.';
 for(const [name,body] of Object.entries(variantArtifact.files)){const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/workspace'&&r.request().method()==='PUT');await page.locator('.growth-workspace input[type=file]').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from(body)});await response;await stable();}
 await page.getByRole('button',{name:'检查文件与结果',exact:true}).click();await page.getByRole('heading',{name:'文件与结果核对通过',exact:true}).waitFor();report.checks.push({selectedInstance:'data-2',runnerDownload:true,inputRestored:true,actualUiVariantCheck:true});
 await page.goto(harness.base+'/learning?career=all&level=missing');await stable();await page.getByText('当前筛选下没有项目，可改选方向或阶段。',{exact:true}).waitFor();await screenshot('empty-filter');
 await page.goto(harness.base+'/learning?career=data');await stable();await screenshot('current-v2-and-growth-route');
 await page.getByRole('button',{name:'Use English',exact:true}).first().click();await page.goto(harness.base+'/learning/projects/quality');await stable();await page.locator('[data-project="quality"]').waitFor();await screenshot('quality-v2-English');
 assert.deepEqual(report.errors,[]);assert.equal((await raw('/api/system/capabilities')).body.ai,false);report.passed=true;
}catch(error){report.failure={message:error.message,stack:error.stack?.slice(0,1300)};await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();await harness.close();await fs.writeFile('checks/practice-growth-20261126/compat-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
