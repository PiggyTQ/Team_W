// Local-only UI verification. No key, real provider, production host or billable calls.
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from '@playwright/test';
import {createAuthServer} from '../server/auth-server.mjs';
import {createAgentService} from '../server/agent/service.mjs';
import {reviewedLibrary} from '../server/agent/library.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const out=path.join(root,'checks','AI工作台接通_20261028');
const base='http://127.0.0.1:5197';
const temporary=await fs.mkdtemp(path.join(tmpdir(),'career-agent-browser-'));
await fs.mkdir(out,{recursive:true});
const fixtureText='合成验收片段：本人记录一次 SQL 查询练习，尚未进行独立能力核验。';
const forbidden=['UNSELECTED_CLAIM_SENTINEL','PRIVATE_REFLECTION_SENTINEL','UNSENT_CLAIM_NOTE_SENTINEL'];
const report={localOnly:true,frontendTransport:'built-dist-local-static',provider:'injected fixture',realProviderCalls:0,checks:[],screenshots:[],pageErrors:[],blockedExternalRequests:[],egress:[],passed:false};
let server,web,browser,page,webLog='',providerCalls=0,abortedCalls=0;
let publicKnowledge=false;
const reviewed=reviewedLibrary(),emptySnapshot={version:'empty-browser-fixture',digest:'empty-browser-fixture',chunks:[]};
const check=name=>{report.checks.push(name);console.log('PASS '+name);};
const provider={configuredModel:'local-browser-fixture',respond:async({messages,signal})=>{
  providerCalls++;
  const payload=JSON.parse(messages.at(-1).content),wire=JSON.stringify(messages);
  for(const marker of forbidden)assert.equal(wire.includes(marker),false,'Unselected/private fixture reached provider');
  if(payload.message.startsWith('MODEL_INVALID_PUBLIC'))return {output:{statements:[],limitations:[]}};
  const evidence=payload.evidence.filter(row=>row.sourceType==='user_confirmed_unverified');
  assert.equal(evidence.length,1,'Only one explicitly selected fixture must be disclosed');
  const claim=JSON.parse(evidence[0].text);assert.equal(claim.id,'browser-selected');assert.equal(claim.independentlyVerified,false);
  assert.equal(messages.filter(message=>message.role==='system').length,1);assert.deepEqual(messages.map(message=>message.role),['system','user']);
  report.egress.push({mode:payload.mode,evidenceIds:evidence.map(row=>row.id),selectedCount:evidence.length,privateMarkersPresent:false});
  const milliseconds=payload.message.includes('等待期间')?2200:900;
  await new Promise((resolve,reject)=>{
    const done=()=>{signal?.removeEventListener('abort',abort);resolve();};
    const timer=setTimeout(done,milliseconds);
    const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);abortedCalls++;reject(Object.assign(new Error('AI_CANCELLED'),{code:'AI_CANCELLED',status:499}));};
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  });
  if(payload.message.includes('失败测试'))throw Object.assign(new Error('AI_INVALID_RESPONSE'),{code:'AI_INVALID_RESPONSE',status:502});
  return {configuredModel:'local-browser-fixture',providerActualModel:'local-browser-fixture',usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150},output:{
    statements:[{kind:'fact',text:claim.text,evidenceIds:[evidence[0].id]},{kind:'suggestion',text:'可以补充练习过程与限制；这条建议尚未成为任务。',evidenceIds:[evidence[0].id]}],
    limitations:['本地浏览器测试桩；不是实际 DeepSeek 输出。','本人确认不等于独立能力核验。']
  }};
}};

async function saved(){await page.locator('.server-save-status[data-status="saved"]').waitFor({timeout:20000});}
async function api(route,{data,method=data?'POST':'GET'}={}){
  return page.evaluate(async({route,data,method})=>{
    const auth=await(await fetch('/api/auth/session',{cache:'no-store'})).json();
    const response=await fetch(route,{method,cache:'no-store',headers:{...(auth.user?{'X-Account-Id':auth.user.id}:{}),...(data?{'Content-Type':'application/json','X-CSRF-Token':auth.csrfToken}:{})},...(data?{body:JSON.stringify(data)}:{})});
    return {status:response.status,body:await response.json()};
  },{route,data,method});
}
async function screenshot(name,fullPage=true){await page.screenshot({path:path.join(out,name+'.png'),fullPage});report.screenshots.push(name+'.png');}
async function notes(){
  const button=page.getByRole('button',{name:/^本人笔记/}).first();
  if(!await button.isVisible())await page.getByRole('button',{name:'讨论管理',exact:true}).or(page.locator('summary[aria-label="讨论管理"]')).first().click();
  await button.click();return page.locator('dialog[open]').last();
}
async function noOverflow(label){
  const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  report.geometry??=[];report.geometry.push({label,...geometry});assert.ok(geometry.scrollWidth<=geometry.width+1,label+' horizontal overflow');
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.gif':'image/gif','.ico':'image/x-icon',
  '.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.bin':'application/octet-stream',
  '.wasm':'application/wasm','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.pdf':'application/pdf','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.csv':'text/csv; charset=utf-8'};
const SPA=/^\/(?:|auth|onboarding|app|assessment|careers|career-map|plan|learning|work(?:\/[^/]+)?|reports(?:\/[^/]+)?|assistant|settings|companion|admin\/(?:quality|data|content))\/?$/;
async function createBuiltServer(apiPort){
  const dist=await fs.realpath(path.join(root,'dist')),inside=file=>file===dist||file.startsWith(dist+path.sep);
  const local=http.createServer(async(req,res)=>{
    const fail=(status,code)=>{if(!res.headersSent)res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({code}));};
    try{
      const pathname=new URL(req.url,base).pathname;
      if(pathname.startsWith('/api/')){
        // The only proxy destination is the isolated loopback API. Preserve the
        // browser Origin, session cookies, account binding and Set-Cookie headers.
        const upstream=http.request({hostname:'127.0.0.1',port:apiPort,path:req.url,method:req.method,headers:{...req.headers}},response=>{
          res.writeHead(response.statusCode||502,response.headers);response.pipe(res);
        });
        const cancel=()=>{if(!res.writableEnded)upstream.destroy();};res.on('close',cancel);
        upstream.on('error',()=>{if(!res.destroyed)fail(502,'LOCAL_PROXY_FAILED');});
        req.on('aborted',()=>upstream.destroy());req.pipe(upstream);return;
      }
      if(!['GET','HEAD'].includes(req.method))return fail(405,'METHOD_NOT_ALLOWED');
      const decoded=decodeURIComponent(pathname);if(/[\\\u0000]/.test(decoded))return fail(400,'INVALID_PATH');
      let filename=path.resolve(dist,'.'+decoded);if(!inside(filename))return fail(403,'PATH_OUTSIDE_DIST');
      let info;try{info=await fs.stat(filename);}catch{}
      if(!info?.isFile()){
        if(!SPA.test(decoded))return fail(404,'STATIC_NOT_FOUND');
        filename=path.join(dist,'index.html');info=await fs.stat(filename);
      }
      const resolved=await fs.realpath(filename);if(!inside(resolved))return fail(403,'PATH_OUTSIDE_DIST');
      const type=MIME[path.extname(resolved).toLowerCase()];if(!type)return fail(415,'UNSUPPORTED_STATIC_TYPE');
      res.writeHead(200,{'Content-Type':type,'Content-Length':info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD'){res.end();return;}
      const stream=createReadStream(resolved);stream.on('error',()=>res.destroy());stream.pipe(res);
    }catch{fail(500,'LOCAL_STATIC_FAILED');}
  });
  await new Promise((resolve,reject)=>{local.once('error',reject);local.listen(5197,'127.0.0.1',()=>{local.removeListener('error',reject);resolve();});});
  return local;
}

try {
  server=await createAuthServer({database:path.join(temporary,'auth.sqlite'),knowledgeDatabase:path.join(temporary,'no-knowledge.sqlite'),origin:base,production:false,trustProxy:false,
    agentFactory:business=>createAgentService({business,provider,enabled:true,knowledge:{snapshot:()=>publicKnowledge?reviewed.snapshot():emptySnapshot,search:(snapshot,args)=>publicKnowledge?reviewed.search(snapshot,args):[]}})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  web=await createBuiltServer(server.address().port);
  const health=await fetch(base+'/api/health');assert.ok(health.ok&&(await health.json()).status==='ok','Local static proxy did not reach the isolated API');
  webLog='Built dist served on 127.0.0.1:5197; /api forwards only to the temporary loopback auth service.\n';
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true})));
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(['http:','https:'].includes(url.protocol)&&url.origin!==base){report.blockedExternalRequests.push(url.origin);return route.abort();}
    return route.continue();
  });
  page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(60000);page.on('pageerror',error=>report.pageErrors.push(error.message));
  await page.goto(base+'/auth',{waitUntil:'domcontentloaded'});await page.locator('.auth-submit:not(:disabled)').waitFor();
  await page.getByRole('button',{name:'注册',exact:true}).click();
  await page.locator('#auth-email').fill(`agent-browser-${Date.now()}@example.com`);
  await page.locator('#auth-password').fill('Local browser fixture 2026!');await page.locator('[name=agree]').check();
  const registerResponse=page.waitForResponse(response=>response.url().endsWith('/api/auth/register')&&response.request().method()==='POST');
  await page.locator('.auth-submit').click();assert.equal((await registerResponse).status(),201);await page.waitForURL(base+'/app',{waitUntil:'domcontentloaded'});await saved();
  const account=(await api('/api/auth/me')).body.user;
  const initial=(await api('/api/workspace')).body,state=initial.state;
  state.onboard=true;state.goal='data';state.assessmentCareer='data';
  state.claims=[{id:'browser-selected',title:'合成已选材料',text:fixtureText,contribution:'测试本人记录',origin:'合成测试',skill:'SQL',status:'已确认',version:1,verified:true,privateNote:forbidden[2]},
    {id:'browser-unselected',title:'合成未选材料',text:forbidden[0],origin:'合成测试',skill:'Python',status:'已确认',version:1}];
  state.preferences.privateReflection=forbidden[1];state.aiExternalConsent=null;state.aiClaimRefs=[];state.authorized=false;state.aiScope=['职业原创知识'];
  const seeded=await api('/api/workspace',{method:'PUT',data:{actorId:account.id,state,baseVersion:initial.revision,mutationId:randomUUID()}});assert.equal(seeded.status,200);
  await page.goto(base+'/assistant',{waitUntil:'domcontentloaded'});await saved();await page.locator('.chat-service-status').filter({hasText:'DeepSeek'}).waitFor();
  const composer=page.locator('#assistant-question'),send=page.locator('.chat-send');
  await composer.fill('外发授权前不应发送');assert.equal(await send.isDisabled(),true);assert.equal(providerCalls,0);
  check('real account UI blocks model sending until fresh external consent');

  await page.getByRole('button',{name:'选择本次可用资料',exact:true}).click();
  const scope=page.locator('dialog[open]').last();await scope.locator('.external-ai-scope').waitFor();
  await scope.getByRole('checkbox',{name:'本人确认片段',exact:true}).check();
  await scope.getByRole('checkbox',{name:'使用确认片段：合成已选材料',exact:true}).check();
  assert.equal(await scope.getByRole('checkbox',{name:'使用确认片段：合成未选材料',exact:true}).isChecked(),false);
  const confirm=scope.getByRole('button',{name:'确认所选范围与外发授权',exact:true});assert.equal(await confirm.isDisabled(),true);
  await screenshot('01-external-scope-before-consent');
  await scope.locator('.agent-consent-check input').check();await confirm.click();await saved();
  await page.getByRole('combobox',{name:'意图 / 六种咨询模式',exact:true}).selectOption({value:'评估解释'});await saved();
  assert.equal(await page.locator('.composer-controls select option:disabled').count(),3);
  check('external scope explains provider and fields, selects one fragment and disables unsupported modes');

  await composer.fill('范围测试：只解释我选择的片段');
  const firstResponse=page.waitForResponse(response=>response.url().endsWith('/api/agent/respond'));
  await send.click();assert.equal((await firstResponse).status(),200);
  await page.locator('.agent-statement-fact p').first().waitFor();await saved();
  assert.equal(await page.locator('.chat-message').count(),2);assert.equal(providerCalls,1);
  assert.equal(await page.getByText('可确认的行动卡（模拟提议）',{exact:true}).count(),0);
  check('selected fragment reaches only the fixture provider and its exact quotation is rendered without a simulated proposal');
  const answerFeedback=page.locator('.agent-answer-feedback').first();await answerFeedback.locator('summary').click();await answerFeedback.getByRole('button',{name:'依据不足',exact:true}).click();await answerFeedback.getByText('反馈已保存，等待复核。',{exact:true}).waitFor();

  const previousRevision=(await api('/api/workspace')).body.revision;
  await composer.fill('等待期间保存测试：请保留我正在输入的新问题');
  const secondRequest=page.waitForRequest(request=>request.url().endsWith('/api/agent/respond'));
  const secondResponse=page.waitForResponse(response=>response.url().endsWith('/api/agent/respond'));
  await send.click();await secondRequest;await page.getByRole('button',{name:'取消请求',exact:true}).waitFor();
  assert.equal(await send.isDisabled(),true);await composer.fill('等待时另写的新问题，不应被清空');await composer.press('Enter');
  const noteSave=page.waitForResponse(response=>response.url().endsWith('/api/workspace')&&response.request().method()==='PUT'&&response.status()===200);
  await page.getByRole('button',{name:'保存回答为本人笔记',exact:true}).first().click();await noteSave;
  assert.ok((await api('/api/workspace')).body.revision>previousRevision);
  assert.equal((await secondResponse).status(),200);await page.locator('.chat-message').nth(3).waitFor();await saved();
  assert.equal(providerCalls,2);assert.equal(await composer.inputValue(),'等待时另写的新问题，不应被清空');
  assert.equal((await api('/api/workspace')).body.state.aiNotes.length,1);
  check('pending blocks duplicate sends, preserves a newly typed draft and survives an unrelated real workspace save');

  await page.locator('.agent-reference-details').last().locator('summary').click();
  assert.equal(await page.locator('.agent-citation-original').last().innerText(),fixtureText);
  await noOverflow('desktop-1440');await screenshot('02-desktop-answer-citations');
  await page.reload({waitUntil:'domcontentloaded'});await saved();await page.locator('.chat-message').nth(3).waitFor();
  assert.equal((await api('/api/workspace')).body.state.aiNotes.length,1);
  const noteDialog=await notes();await noteDialog.getByText('DeepSeek 回答笔记',{exact:false}).waitFor();assert.ok((await noteDialog.innerText()).includes(fixtureText));
  await screenshot('03-saved-note');await noteDialog.getByRole('button',{name:'关闭面板',exact:true}).click();
  check('confirmed messages and the explicit personal note survive refresh');

  await page.getByRole('button',{name:'Use English',exact:true}).first().click();
  await page.locator('.chat-send').waitFor();assert.ok((await page.locator('.chat-service-status').innerText()).includes('DeepSeek'));
  assert.equal(await page.locator('.chat-message-body [translate="no"]').filter({hasText:fixtureText}).count()>0,true);
  await noOverflow('english-desktop');await screenshot('04-english-answer');
  await page.setViewportSize({width:390,height:844});await noOverflow('english-mobile-390');
  const modeFit=await page.locator('.composer-controls select').evaluate(el=>{const style=getComputedStyle(el),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=style.font;return {actual:el.clientWidth,required:Math.ceil(ctx.measureText(el.selectedOptions[0].textContent).width+parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+20)};});
  assert.ok(modeFit.actual>=modeFit.required,'English mode label must fit in the mobile selector');report.modeFit=modeFit;
  await screenshot('05-mobile-english');
  await page.getByRole('button',{name:'使用中文',exact:true}).first().click();await noOverflow('chinese-mobile-390');await screenshot('06-mobile-chinese');
  await page.setViewportSize({width:1440,height:1000});
  check('desktop, 390px layout and English controls preserve original quoted content without horizontal overflow');

  const oldCount=await page.locator('.chat-message').count();await composer.fill('取消测试：这条不得保存为成功回答');
  const cancellationStarted=page.waitForRequest(request=>request.url().endsWith('/api/agent/respond'));
  await send.click();await cancellationStarted;await page.getByRole('button',{name:'取消请求',exact:true}).click();await delay(1150);
  assert.equal(await page.locator('.chat-message').count(),oldCount);assert.equal(await composer.inputValue(),'取消测试：这条不得保存为成功回答');
  check('cancellation keeps the question and rejects the late result without appending messages');

  await composer.fill('失败测试：返回不合格模型结构');const failedResponse=page.waitForResponse(response=>response.url().endsWith('/api/agent/respond'));
  await send.click();assert.equal((await failedResponse).status(),502);await page.locator('.chat-inline-error').waitFor();
  assert.equal(await page.locator('.chat-message').count(),oldCount);assert.equal(await composer.inputValue(),'失败测试：返回不合格模型结构');
  const failureCalls=providerCalls;await delay(1100);assert.equal(providerCalls,failureCalls);await screenshot('07-invalid-response-keeps-question');
  check('invalid provider output shows a real error, retains the question and never retries automatically');

  const beforeWithdrawal=(await api('/api/workspace')).body,withdrawn=beforeWithdrawal.state;
  withdrawn.claims=withdrawn.claims.map(claim=>claim.id==='browser-selected'?{...claim,status:'已撤回',version:claim.version+1}:claim);withdrawn.profileVersion++;
  assert.equal((await api('/api/workspace',{method:'PUT',data:{actorId:account.id,state:withdrawn,baseVersion:beforeWithdrawal.revision,mutationId:randomUUID()}})).status,200);
  await page.reload({waitUntil:'domcontentloaded'});await saved();await page.locator('.agent-retracted').first().waitFor();
  assert.equal(await page.locator('.agent-citation-original').count(),0);assert.equal((await page.locator('.chat-stream').innerText()).includes(fixtureText),false);
  const hiddenNotes=await notes();await hiddenNotes.getByText('引用材料或授权已失效，笔记正文与历史已隐藏。请使用当前有效资料重新生成。',{exact:true}).waitFor();
  assert.equal((await hiddenNotes.innerText()).includes(fixtureText),false);await screenshot('08-retracted-note-hidden');await hiddenNotes.getByRole('button',{name:'关闭面板',exact:true}).click();
  assert.equal(await send.isDisabled(),true);check('material withdrawal hides user/assistant cached bodies, citations and saved note history and blocks further external access');

  const conversationId=(await api('/api/workspace')).body.state.conversationId;
  const title=await page.locator('.chat-session-title h2').innerText();await page.goto(base+'/plan',{waitUntil:'domcontentloaded'});await saved();
  await page.locator('summary[aria-label="账户与工具"]').click();await page.getByRole('button',{name:'AI 侧栏',exact:true}).click();
  const side=page.locator('dialog.cheese-context-drawer[open]');await side.locator('.ai-chat-surface').waitFor();
  assert.equal(await side.locator('.chat-session-title h2').innerText(),title);assert.equal((await api('/api/workspace')).body.state.conversationId,conversationId);
  assert.equal(await side.locator('.chat-message').count(),oldCount);assert.equal((await side.innerText()).includes(fixtureText),false);
  await screenshot('09-same-conversation-sidebar');
  await page.setViewportSize({width:390,height:844});await noOverflow('mobile-sidebar-390');
  for(const selector of ['#assistant-question','.chat-send'])assert.ok(await side.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'Sidebar input and send must be visible without scrolling the whole dialog');
  await screenshot('10-mobile-sidebar');
  await side.locator('#assistant-question').scrollIntoViewIfNeeded();await side.locator('#assistant-question').fill('侧栏草稿可输入');
  assert.equal(await side.locator('#assistant-question').inputValue(),'侧栏草稿可输入');
  await side.getByRole('button',{name:'展开同一会话',exact:true}).click();await page.waitForURL(base+'/assistant');await saved();
  assert.equal((await api('/api/workspace')).body.state.conversationId,conversationId);
  check('sidebar reuses the same saved conversation and the same retraction guard');

  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('combobox',{name:'意图 / 六种咨询模式',exact:true}).selectOption('职业咨询');
  await page.getByRole('button',{name:'选择本次可用资料',exact:true}).click();
  const genericScope=page.locator('dialog[open]').last();
  await genericScope.getByRole('checkbox',{name:'本人确认片段',exact:true}).uncheck();
  await genericScope.getByRole('checkbox',{name:'职业原创知识',exact:true}).check();
  await genericScope.getByRole('checkbox',{name:/^我同意将本次所选范围下的问题/}).check();
  await genericScope.getByRole('button',{name:'确认所选范围与外发授权',exact:true}).click();await saved();
  const beforeGapCalls=providerCalls;
  await page.locator('#assistant-question').fill('当前有哪些获准的职业知识？');await page.getByRole('button',{name:'发送至 DeepSeek',exact:true}).click();
  await page.locator('.chat-message-author').filter({hasText:'系统 · 资料缺口说明'}).waitFor();await saved();
  assert.equal(providerCalls,beforeGapCalls);
  await page.locator('.agent-save-note').last().click();await saved();
  const gapNotes=await notes();await gapNotes.getByRole('heading',{name:/系统资料缺口笔记/}).waitFor();
  await gapNotes.getByRole('button',{name:'关闭面板',exact:true}).click();await screenshot('11-no-approved-knowledge-system-response');
  check('empty approved knowledge reports a system gap without a provider call and labels the saved note honestly');

  await page.route('**/api/system/capabilities',route=>route.fulfill({json:{agent:{enabled:false}}}));
  await page.reload({waitUntil:'domcontentloaded'});await saved();
  await page.getByRole('button',{name:'重新检查 AI 服务',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'发送至 DeepSeek',exact:true}).isDisabled(),true);
  assert.equal(await page.locator('.chat-demo-menu').count(),0);await screenshot('12-service-disabled-no-simulation-fallback');
  await page.unroute('**/api/system/capabilities');await page.getByRole('button',{name:'重新检查 AI 服务',exact:true}).click();
  await page.locator('.chat-service-status').filter({hasText:'DeepSeek'}).waitFor();
  check('disabled service never falls back to demo answers and the explicit availability recheck recovers');
  const workflowSeed=(await api('/api/workspace')).body;
  const restoredClaim=workflowSeed.state.claims.find(c=>c.id==='browser-selected');restoredClaim.status='已确认';
  workflowSeed.state.budget=3;workflowSeed.state.authorized=true;workflowSeed.state.aiScope=['职业原创知识','本人确认片段'];workflowSeed.state.aiClaimRefs=[{id:'browser-selected',version:restoredClaim.version}];
  assert.equal((await api('/api/workspace',{method:'PUT',data:{actorId:account.id,state:workflowSeed.state,baseVersion:workflowSeed.revision,mutationId:randomUUID()}})).status,200);
  await page.reload({waitUntil:'domcontentloaded'});await saved();
  const workflow=page.locator('.agent-workflow');await workflow.locator(':scope > summary').click();
  await workflow.getByText('选择站内核对片段',{exact:true}).click();await workflow.getByRole('checkbox',{name:'站内核对片段：合成已选材料',exact:true}).check();
  await workflow.getByRole('button',{name:'核对已选材料',exact:true}).click();
  await workflow.getByText('有关联的本人自述 · 未独立核验',{exact:true}).waitFor();
  assert.ok(await workflow.getByText('资料未知 · 没有材料不等于不会',{exact:true}).count()>0);
  const time=workflow.getByRole('spinbutton',{name:'本人预计投入（小时）',exact:true});await time.fill('4');
  await workflow.getByRole('button',{name:'检查预算并预览',exact:true}).click();await workflow.getByRole('alert').filter({hasText:'任务总投入超过本周预算'}).waitFor();
  await time.fill('1');await workflow.getByRole('button',{name:'检查预算并预览',exact:true}).click();
  const action=workflow.getByRole('button',{name:'本人确认新增到计划',exact:true});await action.waitFor();
  assert.equal((await api('/api/workspace')).body.state.tasks.length,0);await action.scrollIntoViewIfNeeded();await screenshot('13-workflow-preview-no-write',false);
  await page.getByRole('button',{name:'Use English',exact:true}).first().click();await page.setViewportSize({width:390,height:844});await noOverflow('workflow English mobile 390');await page.getByRole('button',{name:'使用中文',exact:true}).first().click();await page.setViewportSize({width:1440,height:1000});
  const applyResponse=page.waitForResponse(r=>r.url().endsWith('/api/agent/apply'));
  await action.click();assert.equal((await applyResponse).status(),200);await workflow.getByText(/行动已保存。计划/).waitFor();await saved();
  const applied=(await api('/api/workspace')).body;assert.equal(applied.state.tasks.length,1);assert.equal(applied.state.tasks[0].status,'待开始');assert.equal(applied.state.tasks[0].completed,false);
  await workflow.getByRole('combobox',{name:'这次行动建议是否有帮助？',exact:true}).selectOption('useful');await workflow.getByRole('button',{name:'保存反馈',exact:true}).click();
  await workflow.getByText('可撤销的站内学习偏好',{exact:true}).click();await workflow.getByRole('textbox',{name:'学习偏好',exact:true}).fill('合成测试：先做小练习，再复盘');await workflow.getByRole('button',{name:'确认保存偏好',exact:true}).click();await workflow.getByText('已保存站内偏好',{exact:true}).waitFor();
  await workflow.getByRole('button',{name:'撤回偏好',exact:true}).click();await workflow.getByText('尚未保存偏好',{exact:true}).waitFor();assert.equal((await api('/api/agent/memory')).body.preferences,null);
  await workflow.getByText('尚未保存偏好',{exact:true}).scrollIntoViewIfNeeded();await screenshot('14-workflow-receipt-memory-withdrawn',false);await page.setViewportSize({width:390,height:844});await noOverflow('workflow mobile 390');await screenshot('15-workflow-mobile');
  const operations=(await api('/api/agent/operations')).body;assert.ok(operations.rows.some(r=>r.operation==='apply'&&r.status===200&&r.count===1));assert.equal(JSON.stringify(operations).includes(fixtureText),false);
  check('deterministic evidence review, over-budget rejection, preview-confirm-receipt, feedback and revocable preference complete through actual UI');
  publicKnowledge=true;await page.setViewportSize({width:1440,height:1000});await workflow.locator(':scope > summary').click();
  await page.getByRole('button',{name:'选择本次可用资料',exact:true}).click();const fallbackScope=page.locator('dialog[open]').last();await fallbackScope.locator('.agent-consent-check input').check();await fallbackScope.getByRole('button',{name:'确认所选范围与外发授权',exact:true}).click();await saved();
  await page.locator('#assistant-question').fill('MODEL_INVALID_PUBLIC：请解释数据分析的任务与学习方向');const fallbackResponse=page.waitForResponse(r=>r.url().endsWith('/api/agent/respond'));await page.getByRole('button',{name:'发送至 DeepSeek',exact:true}).click();assert.equal((await fallbackResponse).status(),200);await page.getByText('系统 · 检索原文回退',{exact:true}).waitFor();await saved();
  assert.equal(providerCalls,5);await page.locator('.agent-save-note').last().click();await saved();const fallbackNotes=await notes();await fallbackNotes.getByRole('heading',{name:/系统检索原文笔记/}).waitFor();await fallbackNotes.getByRole('button',{name:'关闭面板',exact:true}).click();await screenshot('16-labelled-public-source-fallback');
  await page.setViewportSize({width:390,height:844});await noOverflow('public source fallback mobile');
  check('answer correction feedback is owner-bound and malformed model output falls back once to labelled public originals with honest note provenance');
  await page.route('**/api/agent/knowledge-status',route=>route.fulfill({json:{knowledgeDigest:'0'.repeat(64),knowledgeVersion:'withdrawal-browser-fixture'}}));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.getByText('知识版本尚未核对或已变化，此回答与缓存引用暂不展示。请重新核对知识后生成。',{exact:true}).waitFor();
  const staleNotes=await notes();await staleNotes.getByText('知识版本尚未核对或已变化，笔记正文与历史暂不展示。',{exact:true}).waitFor();await staleNotes.getByRole('button',{name:'关闭面板',exact:true}).click();await screenshot('17-withdrawn-knowledge-hides-cached-answer-and-note');
  await page.unroute('**/api/agent/knowledge-status');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('.agent-statement-fact').first().waitFor();
  check('knowledge approval refresh invalidates cached public answers, notes and history without a paid retry');
  assert.deepEqual(report.pageErrors,[]);assert.ok(report.egress.length>=3);check('no browser JavaScript errors and no unselected/private marker ever reaches the injected provider');
  report.providerFixtureCalls=providerCalls;report.abortedFixtureCalls=abortedCalls;report.passed=true;
} catch(error) {
  report.failure=String(error.message).split('Call log:')[0];report.providerFixtureCalls=providerCalls;report.abortedFixtureCalls=abortedCalls;
  if(page)try{await screenshot('failure');}catch{}
  process.exitCode=1;
} finally {
  try{await browser?.close();}catch{}
  if(web)await new Promise(resolve=>{web.close(resolve);web.closeIdleConnections?.();});
  if(server)await new Promise(resolve=>{server.close(resolve);server.closeIdleConnections?.();});
  await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(out,'local-static.log'),webLog);
  const resolved=path.resolve(temporary),allowed=path.resolve(tmpdir())+path.sep;
  if(resolved.startsWith(allowed)&&path.basename(resolved).startsWith('career-agent-browser-'))await fs.rm(resolved,{recursive:true,force:true});
  console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,providerFixtureCalls:providerCalls,realProviderCalls:0,output:out,...(report.failure?{failure:report.failure}:{})}));
}
