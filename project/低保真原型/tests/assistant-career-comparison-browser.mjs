import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';
import {localBusinessHarness} from './helpers/local-business-harness.mjs';
import {AUTH_POLICY} from '../src/auth-contract.js';
import {fresh,KEY} from '../src/model.js';
import {ensureAssistantConversation,chooseComparison,taskInputDiscussion} from '../src/assistant-task-model.js';
import {careerComparison} from '../src/career-comparison.js';

// Both modes use disposable synthetic records. Public-source fault fixtures only
// replace the local source HTTP response; they never modify production content.
const tag='assistant-career-comparison-20261127',out=`checks/${tag}`,images=`docs/releases/images/${tag}/actual`;
await Promise.all([fs.mkdir(out,{recursive:true}),fs.mkdir(images,{recursive:true})]);
const demoOnly=process.argv.includes('--demo-only'),serverOnly=process.argv.includes('--server-only');
assert.ok(!(demoOnly&&serverOnly));
const report={localOnly:true,syntheticOnly:true,mobileChecked:false,realAccountsUsed:0,realModelCalls:0,realJobApiCalls:0,passed:false,modes:[],checks:[],screenshots:[],errors:[]};
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
const focuses=['work','outputs','starting'];
const question='PRIVATE QUESTION / 想比较具体工作，不是本人能力结论。';
const note='PRIVATE NOTE / 仅供隔离讨论，不属于职业公开资料。';
function fixture(){
 let s={...fresh(),logged:true,onboard:true,goal:'frontend',budget:8};
 s=ensureAssistantConversation(s,'compare').state;
 s=chooseComparison(s,s.conversationId,'ai','security');
 const c=s.conversations.find(row=>row.id===s.conversationId);
 c.discussion=taskInputDiscussion({...c.discussion,question},{note});
 return s;
}
const seed=fixture();
async function runMode(mode){
 let service,context,page;
 try{
  service=mode==='demo'?await createServer({mode:'development',logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}}):await localBusinessHarness();
  if(mode==='demo')await service.listen();
  const base=mode==='demo'?'http://127.0.0.1:'+service.httpServer.address().port:service.base;
  context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(18000);
  page.on('pageerror',error=>report.errors.push({mode,message:error.message}));
  await context.addInitScript(({key,state,demo})=>{if(window.top!==window)return;if(demo&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true}));},{key:KEY,state:seed,demo:mode==='demo'});
  const raw=async(route,data,method=data?'POST':'GET')=>{
   const session=await(await context.request.get(base+'/api/auth/session')).json();
   const response=await context.request.fetch(base+route,{method,headers:{Origin:base,...(session.user?{'X-Account-Id':session.user.id}:{}),...(data?{'X-CSRF-Token':session.csrfToken}:{})},...(data?{data:route==='/api/workspace'?{...data,actorId:session.user.id}:data}:{})});
   assert.ok(response.ok(),route+' '+await response.text());return response.json();
  };
  if(mode==='server'){
   await raw('/api/auth/register',{email:'ai-compare-'+randomUUID()+'@example.invalid',password:'Synthetic comparison verification secret!',agree:true,termsVersion:AUTH_POLICY.termsVersion});
   const saved=await raw('/api/workspace');await raw('/api/workspace',{state:seed,baseVersion:saved.revision,mutationId:randomUUID()},'PUT');
   assert.equal((await raw('/api/system/capabilities')).ai,false);
  }
  const settle=async()=>{await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{})));});if(mode==='server')await page.locator('.server-save-status[data-status="saved"]').waitFor();};
  const state=async()=>{await settle();return mode==='demo'?page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY):(await raw('/api/workspace')).state;};
  const current=async()=>{const s=await state();return s.conversations.find(row=>row.id===s.conversationId);};
  const goto=async path=>{await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.task-comparison').waitFor({timeout:60000});await settle();};
  const lang=async value=>{if((await page.locator('html').getAttribute('lang')).startsWith(value))return;await page.getByRole('button',{name:value==='en'?'Use English':'使用中文',exact:true}).first().click();await page.waitForFunction(value=>document.documentElement.lang.startsWith(value),value);await settle();};
  const fit=async label=>{const b=await page.evaluate(()=>({width:innerWidth,page:document.documentElement.scrollWidth,main:document.getElementById('main').scrollWidth,mainWidth:document.getElementById('main').clientWidth}));assert.ok(b.page<=b.width+1&&b.main<=b.mainWidth+1,`${mode}/${label}: ${JSON.stringify(b)}`);};
  const active=async focus=>{await page.locator(`#assistant-compare-tab-${focus}[aria-selected="true"]`).waitFor();await page.locator(`#assistant-compare-panel-${focus}`).waitFor({state:'visible'});assert.equal(await page.locator('[id^="assistant-compare-panel-"]:visible').count(),1);};
  const choose=async focus=>{await page.locator('#assistant-compare-tab-'+focus).click();await active(focus);await settle();};
  const pair=async(left,right)=>{await page.getByLabel(/^(职业 A|Career A)$/).selectOption(left);await page.getByLabel(/^(职业 B|Career B)$/).selectOption(right);await settle();await page.waitForFunction(({left,right,key,demo})=>{if(!demo)return true;const s=JSON.parse(localStorage.getItem(key)),c=s.conversations.find(v=>v.id===s.conversationId);return c?.discussion?.task?.left===left&&c?.discussion?.task?.right===right;},{left,right,key:KEY,demo:mode==='demo'});};
  const shot=async name=>{await page.locator('.task-comparison').evaluate(element=>element.scrollIntoView({block:'start'}));await settle();const path=`${images}/${mode}-${name}.png`;await page.screenshot({path});report.screenshots.push(path);};
  await goto('/assistant/compare?discussion='+seed.conversationId);await active('work');
  assert.equal((await current()).id,seed.conversationId);
  const initialPublic=await page.locator('.task-comparison').innerText();assert.doesNotMatch(initialPublic,/PRIVATE QUESTION|PRIVATE NOTE/);
  const texts={};
  for(const focus of focuses){await choose(focus);texts[focus]=await page.locator('#assistant-compare-panel-'+focus).innerText();assert.ok(texts[focus].length>100);await fit(focus);await shot(`${focus}-zh-1366`);assert.equal((await current()).discussion.task.focus,focus);assert.equal((await current()).discussion.question,question);assert.equal((await current()).discussion.task.note,note);}
  assert.notEqual(texts.work,texts.outputs);assert.notEqual(texts.outputs,texts.starting);assert.notEqual(texts.work,texts.starting);
  for(const id of ['ai','security']){
   const practice=careerComparison(id).practice,publicInstructions=[practice.input,practice.deliverable,...practice.steps,...practice.checks].join(' '),normalize=value=>value.replace(/\s+/g,' ').trim();
   for(const review of practice.review||[])if(!normalize(publicInstructions).includes(normalize(review)))assert.ok(!normalize(texts.starting).includes(normalize(review)),'Unrequested teaching-review text is not shown: '+id);
  }
  assert.ok(await page.locator('#assistant-compare-panel-outputs .assistant-compare-preview').count()>=2,'Both careers need concrete output previews');
  const trialLinks=await page.locator('#assistant-compare-panel-starting a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
  for(const id of ['ai','security'])assert.ok(trialLinks.some(href=>{const u=new URL(href,base);return u.pathname==='/careers'&&u.searchParams.get('career')===id&&u.searchParams.get('section')==='practice';}),`Same-case trial link for ${id}`);
  await page.reload({waitUntil:'domcontentloaded'});await active('starting');assert.equal((await current()).discussion.question,question);
  await page.locator('#assistant-compare-tab-starting').focus();await page.keyboard.press('Home');await active('work');await page.keyboard.press('ArrowRight');await active('outputs');await page.keyboard.press('End');await active('starting');await page.keyboard.press('ArrowLeft');await active('outputs');assert.equal(await page.locator('#assistant-compare-tab-outputs').evaluate(element=>document.activeElement===element),true);
  report.checks.push(`${mode}: three distinct panels, two concrete outputs, exact same-case links, keyboard, focus and private discussion input survive refresh.`);
  if(mode==='demo'){
   await page.setViewportSize({width:1616,height:1000});await lang('en');
   for(const focus of focuses){await choose(focus);await fit('en/'+focus);await shot(`${focus}-en-1616`);}
   assert.doesNotMatch(await page.locator('#assistant-compare-panel-outputs').innerText(),/资料问答应用评测|认证事件离线研判/);
   await lang('zh');await page.setViewportSize({width:2560,height:1100});await choose('work');await fit('zh/2560');await shot('work-zh-2560');
  }
  // Changing a pair uses the original separate-discussion identity model.
  await pair('data','ai');const other=await current();assert.notEqual(other.id,seed.conversationId);assert.equal(other.discussion.question,'');
  await choose('outputs');await fit('data/ai');
  const actualTables=await page.locator('#assistant-compare-panel-outputs .assistant-compare-preview .career-example-table').all();
  for(const table of actualTables){const geometry=await table.evaluate(wrapper=>{const b=wrapper.getBoundingClientRect();return {left:b.left,right:b.right,cells:[...wrapper.querySelectorAll('td')].filter(cell=>/^[-+]?\d+(?:\.\d+)?$/.test(cell.textContent.trim())).map(cell=>{const range=document.createRange();range.selectNodeContents(cell);const t=range.getBoundingClientRect();return {text:cell.textContent,left:t.left,right:t.right};})};});for(const cell of geometry.cells)assert.ok(cell.left>=geometry.left-1&&cell.right<=geometry.right+1,`Preview numeric value visible: ${JSON.stringify(cell)}`);}
  if(mode==='demo'){await page.setViewportSize({width:1366,height:900});await shot('data-ai-outputs-zh-1366');}
  await pair('ai','security');assert.equal((await current()).id,seed.conversationId);assert.equal((await current()).discussion.question,question);assert.equal((await current()).discussion.task.note,note);
  await page.getByRole('button',{name:/^(交换两方|Swap careers)$/}).click();await settle();assert.notEqual((await current()).id,seed.conversationId);await page.getByRole('button',{name:/^(交换两方|Swap careers)$/}).click();await settle();assert.equal((await current()).id,seed.conversationId);
  await pair('ai','ai');assert.equal(await page.locator('.assistant-compare-matrix:visible').count(),0,'Identical careers must not render a bilateral comparison');
  await pair('ai','');assert.equal(await page.locator('.assistant-compare-matrix:visible').count(),0,'A missing career must not render a bilateral comparison');
  await pair('ai','security');await active((await current()).discussion.task.focus||'work');
  if(mode==='server'){
   // Read-only controlled source-catalog fixtures: no public record is persisted.
   let missingReplacements=0;
   await page.route('**/api/agent/discussion-sources',async route=>{const response=await route.fetch();const payload=await response.json();payload.items=payload.items.map(row=>{if(row.ref.kind==='career'&&row.ref.id==='security'&&row.ref.part==='profile'){missingReplacements++;return {...row,publicContent:undefined};}return row;});await route.fulfill({response,json:payload});});
   const missingResponse=page.waitForResponse(response=>response.url().endsWith('/api/agent/discussion-sources')&&response.request().method()==='POST');
   await page.reload({waitUntil:'domcontentloaded'});await missingResponse;await page.locator('.task-comparison').waitFor();await settle();assert.ok(missingReplacements>0);assert.equal(await page.locator('.assistant-compare-matrix:visible').count(),0,'Missing public profile is not a complete comparison');await page.unroute('**/api/agent/discussion-sources');
   let legacyReplacements=0;
   await page.route('**/api/agent/discussion-sources',async route=>{const response=await route.fetch();const payload=await response.json();payload.items=payload.items.map(row=>{if(row.ref.kind!=='career'||row.ref.id!=='ai'||row.ref.part!=='profile')return row;const content=structuredClone(careerComparison('ai','career-detail-20261024'));content.focus='LEGACY_PUBLIC_SNAPSHOT';legacyReplacements++;return {...row,publicContent:content};});await route.fulfill({response,json:payload});});
   await page.reload({waitUntil:'domcontentloaded'});await active((await current()).discussion.task.focus||'work');await page.locator('[id^="assistant-compare-panel-"]:visible').getByText(/LEGACY_PUBLIC_SNAPSHOT/).first().waitFor();assert.ok(legacyReplacements>0);assert.doesNotMatch(await page.locator('.task-comparison').innerText(),new RegExp(careerComparison('ai').focus));assert.match(await page.locator('.task-comparison').innerText(),/这份资料版本没有此项详细实例/);await page.unroute('**/api/agent/discussion-sources');
   report.checks.push('server: controlled missing-profile and supplied legacy-public snapshot fixtures prevent invented/current-fallback comparisons. This is not a real historic-service result.');
  }
  const final=await state();assert.equal(final.goal,'frontend');assert.equal(final.budget,8);assert.equal(final.jobs.length,0);assert.equal(final.events.length,0);assert.equal(final.claims.length,seed.claims.length);report.modes.push(mode);
  report.checks.push(`${mode}: pair and swap restore the original discussion; same/missing careers do not produce a full comparison; goal, budget, records and private original text stay unchanged.`);
 }catch(error){report.failure={mode,message:error.message,stack:error.stack};await page?.screenshot({path:`${out}/${mode}-failure.png`}).catch(()=>{});throw error;}
 finally{await context?.close();if(service)await service.close();}
}
try{if(!serverOnly)await runMode('demo');if(!demoOnly)await runMode('server');assert.deepEqual(report.errors,[]);report.passed=true;}
catch{process.exitCode=1;}
finally{await browser.close();const filename=demoOnly?'demo-browser.json':serverOnly?'server-browser.json':'browser.json';await fs.writeFile(`${out}/${filename}`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,modes:report.modes,screenshots:report.screenshots.length,checks:report.checks,errors:report.errors,failure:report.failure}));}
