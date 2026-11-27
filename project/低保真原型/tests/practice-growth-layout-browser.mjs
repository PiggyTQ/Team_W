import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
import {localBusinessHarness} from './helpers/local-business-harness.mjs';
import {AUTH_POLICY} from '../src/auth-contract.js';
const h=await localBusinessHarness(),browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']}),context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'}),page=await context.newPage();
const folder='docs/releases/images/practice-growth-20261126/actual',report={localOnly:true,syntheticOnly:true,passed:false,checks:[],screenshots:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));page.setDefaultTimeout(20000);
await context.addInitScript(()=>{if(window.top===window)localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true}));});
const raw=async(route,data,method=data?'POST':'GET')=>{const session=await(await context.request.get(h.base+'/api/auth/session')).json();const response=await context.request.fetch(h.base+route,{method,headers:{Origin:h.base,...(session.user?{'X-Account-Id':session.user.id}:{}),...(data?{'X-CSRF-Token':session.csrfToken}:{})},...(data?{data:route==='/api/workspace'?{...data,actorId:session.user.id}:data}:{})});assert.ok(response.ok(),route+' '+await response.text());return response.json();};
const stable=()=>page.locator('.server-save-status[data-status="saved"]').waitFor();
const shot=async name=>{await page.screenshot({path:path.join(folder,name+'.png'),fullPage:false});report.screenshots.push(name);};
try{
 await raw('/api/auth/register',{email:'growth-layout-'+randomUUID()+'@example.invalid',password:'Synthetic layout secret!',agree:true,termsVersion:AUTH_POLICY.termsVersion});const state=await raw('/api/workspace');state.state.onboard=true;state.state.budget=168;await raw('/api/workspace',{state:state.state,baseVersion:state.revision,mutationId:randomUUID()},'PUT');
 for(const width of [1366,1616])for(const height of [900,960])for(const language of ['zh','en']){
  await page.setViewportSize({width,height});await page.goto(h.base+'/learning?career=all');await stable();await page.getByRole('button',{name:language==='en'?'Use English':'使用中文',exact:true}).first().click();await page.locator('.growth-library').waitFor();assert.equal(await page.locator('.growth-family').count(),11);assert.equal(await page.locator('.growth-project-row').count(),36);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot(`library-${language}-${width}x${height}`);
  await page.goto(h.base+'/learning/projects/cross-metric-service');await stable();await page.locator('.growth-heading h1').waitFor();const values=await page.evaluate(()=>{const e=s=>getComputedStyle(document.querySelector(s));return {outerPadding:e('.growth-overview').padding,sidePadding:e('.growth-start-panel').padding,titleDisplay:e('.growth-section-title').display,filenameDisplay:e('.growth-deliverable-list code').display,overflow:document.documentElement.scrollWidth>innerWidth+1};});assert.equal(values.outerPadding,'0px');assert.equal(values.titleDisplay,'flex');assert.equal(values.filenameDisplay,'block');assert.ok(parseFloat(values.sidePadding)>=19);assert.equal(values.overflow,false);report.checks.push({width,height,language,...values});await shot(`project-${language}-${width}x${height}`);
 }
 await page.getByRole('button',{name:'使用中文',exact:true}).first().click();await page.locator('.growth-materials').scrollIntoViewIfNeeded();await shot('final-input-materials-zh');await page.locator('.growth-handoffs').scrollIntoViewIfNeeded();await shot('final-consuming-handoff-zh');
 await page.locator('.growth-download-main').focus();assert.equal(await page.locator('.growth-download-main').evaluate(e=>document.activeElement===e),true);report.keyboardDownload=true;assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure={message:e.message,stack:e.stack};process.exitCode=1;}
finally{await browser.close();await h.close();await fs.writeFile('checks/practice-growth-20261126/layout-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
