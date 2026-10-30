import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {localBusinessHarness} from './helpers/local-business-harness.mjs';
const production=process.env.PLATFORM_TEST_PRODUCTION==='1';
const out=path.resolve('checks/backend-completeness-20261030'+(production?'/production':''));await mkdir(out,{recursive:true});
const report={localOnly:!production,production,syntheticOnly:true,realProviderCalls:0,checks:[],pageErrors:[],passed:false};let harness,browser,page,registered=false,reads=0,modelCalls=0;
const email='suggestions-'+randomUUID()+'@example.invalid',password='Synthetic suggestions 2026!';
const check=s=>report.checks.push(s),saved=()=>page.locator('.server-save-status[data-status="saved"]').waitFor();
try{
 harness=production?{base:'https://47.250.133.180',close:async()=>{}}:await localBusinessHarness();browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true})));
 await context.route('**/*',route=>{const url=new URL(route.request().url());return ['http:','https:'].includes(url.protocol)&&url.origin!==harness.base?route.abort():route.continue();});
 page=await context.newPage();page.on('response',r=>{if(r.url().endsWith('/api/auth/register')&&r.status()===201)registered=true;});page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('request',req=>{if(req.url().endsWith('/api/agent/suggestions'))reads++;if(req.url().endsWith('/api/agent/respond'))modelCalls++;});
 page.setDefaultTimeout(20000);await page.goto(harness.base+'/auth');await page.getByRole('button',{name:'注册',exact:true}).click();await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill(password);await page.locator('[name=agree]').check();await page.locator('.auth-submit:not(:disabled)').click();await page.waitForURL(harness.base+'/app');await saved();
 const panel=page.locator('.personal-suggestions');await panel.locator('li').first().waitFor();assert.ok(await panel.getByText('站内规则建议',{exact:true}).count());check('saved account context renders real rule suggestions with no model calls');
 await panel.locator('li').first().getByRole('button',{name:'忽略此建议',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.personal-suggestions li').length===1);check('dismissal is saved by the feedback endpoint');
 await page.reload();await saved();await panel.locator('li').first().waitFor();assert.equal(await panel.locator('li').count(),1);check('dismissal survives reload');
 const before=reads;await page.waitForTimeout(1100);assert.equal(reads,before);check('idle page does not poll');
 await page.setViewportSize({width:390,height:844});await panel.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'suggestions-mobile.png')});check('mobile suggestion panel and feedback controls stay reachable');
 await page.getByRole('button',{name:'Use English',exact:true}).first().click();await panel.getByText('Suggestions from site rules',{exact:true}).waitFor();check('English public rule copy is translated without model translation');
 await page.setViewportSize({width:1440,height:1000});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'suggestions-desktop-en.png')});
 assert.equal(modelCalls,0);assert.deepEqual(report.pageErrors,[]);report.passed=true;
}catch(e){report.error={message:e.message};process.exitCode=1;if(page)await page.screenshot({path:path.join(out,'suggestions-failure.png')}).catch(()=>{});}
finally{if(production&&registered&&page)try{const result=await page.evaluate(async({email,password})=>{const session=await(await fetch('/api/auth/session')).json();const r=await fetch('/api/auth/delete-account',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},body:JSON.stringify({email,currentPassword:password,confirmation:'DELETE_ACCOUNT'})});return {status:r.status,body:await r.json()};},{email,password});assert.equal(result.status,200);assert.equal(result.body.deleted,true);report.syntheticAccountDeleted=true;}catch(e){report.cleanupFailure=e.message;report.passed=false;process.exitCode=1;}await browser?.close();await harness?.close();report.modelRequests=modelCalls;report.suggestionReads=reads;await writeFile(path.join(out,'suggestions-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
