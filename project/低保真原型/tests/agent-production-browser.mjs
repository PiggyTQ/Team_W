// Approved deployment verification, synthetic account only. AI must stay off.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const base='https://47.250.133.180',out=new URL('../checks/AI业务闭环_20261028/production/',import.meta.url);
const password=`Deployment-${randomBytes(18).toString('base64url')}!`,email=`agent-ui-deploy-${randomUUID()}@example.invalid`;
const report={production:true,syntheticDataOnly:true,aiEnabled:false,realProviderCalls:0,checks:[],screenshots:[],pageErrors:[],modelBrowserRequests:[],passed:false};
let browser,page,account;
const check=name=>{report.checks.push(name);console.log('PASS '+name);};
async function saved(){await page.locator('.server-save-status[data-status="saved"]').waitFor({timeout:20000});}
async function api(path,{data,method=data?'POST':'GET'}={}){
 return page.evaluate(async({path,data,method})=>{
  const auth=await(await fetch('/api/auth/session',{cache:'no-store'})).json();
  const response=await fetch(path,{method,headers:{...(auth.user?{'X-Account-Id':auth.user.id}:{}),...(data?{'Content-Type':'application/json','X-CSRF-Token':auth.csrfToken}:{})},...(data?{body:JSON.stringify(data)}:{})});
  return {status:response.status,body:await response.json()};
 },{path,data,method});
}
async function screenshot(name){await page.screenshot({path:fileURLToPath(new URL(name+'.png',out)),fullPage:false});report.screenshots.push(name+'.png');}
async function overflow(name){const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(geometry.scrollWidth<=geometry.width+1,name+' horizontal overflow');(report.geometry??=[]).push({name,...geometry});}
try{
 await fs.mkdir(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true})));
 await context.route('**/api.deepseek.com/**',route=>{report.modelBrowserRequests.push(route.request().url());return route.abort();});
 page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>report.pageErrors.push(error.message));
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.locator('.career-tile-flip').first().waitFor();await overflow('public desktop');await screenshot('01-latest-home-preserved');check('latest public career covers and page remain available');
 await page.goto(base+'/auth',{waitUntil:'domcontentloaded'});await page.locator('.auth-submit:not(:disabled)').waitFor();await page.getByRole('button',{name:'注册',exact:true}).click();await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill(password);await page.locator('[name=agree]').check();
 const registration=page.waitForResponse(r=>r.url().endsWith('/api/auth/register')&&r.request().method()==='POST');await page.locator('.auth-submit').click();assert.equal((await registration).status(),201);await page.waitForURL(base+'/app');await saved();account=(await api('/api/auth/me')).body.user;assert.ok(account?.id);check('actual browser registration, session and account autosave');
 const initial=(await api('/api/workspace')).body,state=initial.state;state.onboard=true;state.goal='data';state.assessmentCareer='data';state.budget=3;state.authorized=false;state.aiExternalConsent=null;state.aiClaimRefs=[];
 state.claims=[{id:'deployment-synthetic-claim',title:'合成部署验收材料',text:'合成部署验收：本人尝试过一次 SQL 查询，尚未完成，未进行独立能力核验。',skill:'SQL',version:1,status:'已确认',origin:'合成验收'}];
 assert.equal((await api('/api/workspace',{method:'PUT',data:{actorId:account.id,state,baseVersion:initial.revision,mutationId:randomUUID()}})).status,200);
 await page.goto(base+'/assistant',{waitUntil:'domcontentloaded'});await saved();await page.getByRole('button',{name:'重新检查 AI 服务',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'发送至 DeepSeek',exact:true}).isDisabled(),true);assert.equal(await page.locator('.chat-demo-menu').count(),0);check('production AI disabled, no simulated-send fallback');
 const workflow=page.locator('.agent-workflow');await workflow.locator(':scope > summary').click();await workflow.getByText('选择站内核对片段',{exact:true}).click();await workflow.getByRole('checkbox',{name:'站内核对片段：合成部署验收材料',exact:true}).check();await workflow.getByRole('button',{name:'核对已选材料',exact:true}).click();await workflow.getByText('有关联的本人自述 · 未独立核验',{exact:true}).waitFor();assert.ok(await workflow.getByText('资料未知 · 没有材料不等于不会',{exact:true}).count()>0);assert.equal((await api('/api/workspace')).body.state.aiExternalConsent,null);check('on-site selected evidence review works without external consent');
 const hours=workflow.getByRole('spinbutton',{name:'本人预计投入（小时）',exact:true});await hours.fill('4');await workflow.getByRole('button',{name:'检查预算并预览',exact:true}).click();await workflow.getByRole('alert').filter({hasText:'任务总投入超过本周预算'}).waitFor();await hours.fill('1');await workflow.getByRole('button',{name:'检查预算并预览',exact:true}).click();const confirm=workflow.getByRole('button',{name:'本人确认新增到计划',exact:true});await confirm.waitFor();assert.equal((await api('/api/workspace')).body.state.tasks.length,0);await confirm.scrollIntoViewIfNeeded();await screenshot('02-production-preview');check('budget rejection and preview are visible before any task write');
 const applying=page.waitForResponse(r=>r.url().endsWith('/api/agent/apply'));await confirm.click();assert.equal((await applying).status(),200);await workflow.getByText(/行动已保存。计划/).waitFor();await saved();const applied=(await api('/api/workspace')).body;assert.equal(applied.state.tasks.length,1);assert.equal(applied.state.tasks[0].status,'待开始');assert.equal(applied.state.tasks[0].completed,false);await screenshot('03-production-receipt');check('actual UI confirmation saves one pending task and shows receipt');
 await workflow.getByText('可撤销的站内学习偏好',{exact:true}).click();await workflow.getByRole('textbox',{name:'学习偏好',exact:true}).fill('合成验收：先离线练习再复盘');await workflow.getByRole('button',{name:'确认保存偏好',exact:true}).click();await workflow.getByText('已保存站内偏好',{exact:true}).waitFor();await workflow.getByRole('button',{name:'撤回偏好',exact:true}).click();await workflow.getByText('尚未保存偏好',{exact:true}).waitFor();assert.equal((await api('/api/agent/memory')).body.preferences,null);check('explicit preference save and withdrawal through live UI');
 await page.getByRole('button',{name:'Use English',exact:true}).first().click();await page.setViewportSize({width:390,height:844});await overflow('English mobile workflow');await screenshot('04-english-mobile-workflow');await page.getByRole('button',{name:'使用中文',exact:true}).first().click();await overflow('Chinese mobile workflow');await screenshot('05-chinese-mobile-workflow');check('Chinese and English 390px workflow has no horizontal overflow');
 const catalog=(await api('/api/catalog/courses')).body;assert.equal(catalog.courses.filter(c=>c.status==='published').length,4);const caps=(await api('/api/system/capabilities')).body;assert.equal(caps.ai,false);assert.equal(caps.agent.enabled,false);assert.equal(report.modelBrowserRequests.length,0);check('four existing published courses and AI-off capability remain intact');
 report.material=await page.evaluate(()=>{const header=document.querySelector('header'),blur=getComputedStyle(document.documentElement).getPropertyValue('--lg-blur').trim(),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,small=matchMedia('(max-width:720px)').matches;return {headerBackdrop:header?getComputedStyle(header).backdropFilter:null,rootBlur:blur,materialStylePresent:blur===(reduced||small?'12px':'18px')};});
 assert.deepEqual(report.pageErrors,[]);check('no page JavaScript errors or direct model network request');report.passed=true;
}catch(error){report.failure=String(error.message).split('Call log:')[0];process.exitCode=1;if(page)try{await screenshot('failure');}catch{}}
finally{
 if(account&&page)try{const result=await api('/api/auth/delete-account',{data:{currentPassword:password,email,confirmation:'DELETE_ACCOUNT'}});report.syntheticAccountDeleted=result.status===200&&result.body.deleted===true;if(!report.syntheticAccountDeleted){report.passed=false;process.exitCode=1;}}catch{report.syntheticAccountDeleted=false;report.passed=false;process.exitCode=1;}
 try{await browser?.close();}catch{}await fs.mkdir(out,{recursive:true});await fs.writeFile(new URL('browser-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,syntheticAccountDeleted:report.syntheticAccountDeleted,realProviderCalls:0,...(report.failure?{failure:report.failure}:{})}));
}
