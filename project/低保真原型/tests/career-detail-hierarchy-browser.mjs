import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';
import {fresh,KEY} from '../src/model.js';
import {careerContentIds,careerContent} from '../src/career-exploration-model.js';

// Disposable local browser state only. No real account, model or recruiting service.
const tag='career-detail-hierarchy-20261126',images=`docs/releases/images/${tag}/actual`,checks=`checks/${tag}`;
await Promise.all([fs.mkdir(images,{recursive:true}),fs.mkdir(checks,{recursive:true})]);
const vite=await createServer({mode:'development',logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await vite.listen();
const base='http://127.0.0.1:'+vite.httpServer.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'}),page=await context.newPage();
const report={localOnly:true,syntheticOnly:true,mobileChecked:false,realAccountsUsed:0,realModelCalls:0,realJobApiCalls:0,passed:false,checks:[],matrix:[],screenshots:[],errors:[]};
page.on('pageerror',error=>report.errors.push(error.message));page.setDefaultTimeout(18000);
await context.addInitScript(({key,initial})=>{if(window.top!==window)return;if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(initial));localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true}));},{key:KEY,initial:{...fresh(),logged:true,onboard:true,goal:'data',budget:8}});
const sections=['overview','work','preparation','growth','practice','sources'];
const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const settle=async()=>{await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{})));});await page.waitForTimeout(80);};
const fit=async label=>{const bounds=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth,main:document.getElementById('main').scrollWidth,mainWidth:document.getElementById('main').clientWidth}));assert.ok(bounds.page<=bounds.viewport+1&&bounds.main<=bounds.mainWidth+1,`${label}: ${JSON.stringify(bounds)}`);};
const active=async id=>{await page.locator(`#career-reading-tab-${id}[aria-selected=true]`).waitFor();await page.locator(`#career-panel-${id}`).waitFor({state:'visible'});assert.equal(await page.locator('.career-reading-panel:visible').count(),1);};
const visit=async(career,section='overview')=>{await page.goto(`${base}/careers?career=${career}&section=${section}`,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.career-reading').waitFor({timeout:60000});await active(section);await settle();};
const choose=async id=>{await page.locator('#career-reading-tab-'+id).click();await active(id);await settle();};
const language=async value=>{if((await page.locator('html').getAttribute('lang')).startsWith(value))return;await page.getByRole('button',{name:value==='en'?'Use English':'使用中文',exact:true}).first().click();await page.waitForFunction(lang=>document.documentElement.lang.startsWith(lang),value);};
const frame=async selector=>{await page.locator(selector).first().evaluate(element=>element.scrollIntoView({block:'start'}));await settle();};
const shot=async(name,selector)=>{if(selector)await frame(selector);await settle();await page.screenshot({path:`${images}/${name}.png`});report.screenshots.push(`${images}/${name}.png`);};
const normalize=text=>text.replace(/\s+/g,' ').trim();
const contains=(text,value,label)=>assert.ok(normalize(text).includes(normalize(value)),label+': '+value);
const contentChecks=async(career,id,lang)=>{
 const role=careerContent(career,lang),panel=page.locator('#career-panel-'+id),text=await panel.innerText();
 assert.ok(text.length>70,`${career}/${id}/${lang}: substantive content`);
 assert.equal(await panel.locator('.career-chapter-head').count(),1,`${career}/${id}: chapter heading`);
 if(id==='overview'){assert.equal(await panel.locator('.career-work-moments > li').count(),3);contains(text,role.occupation.tracks[0].text,'Overview keeps specialization');}
 if(id==='work'){
  assert.equal(await panel.locator('.career-artifact').count(),role.deliverables.length);
  await panel.locator('.career-case-stage').waitFor({state:'visible'});await panel.locator('.career-case-preview').waitFor({state:'visible'});
  contains(text,role.case.question,'Case question');contains(text,role.case.input,'Case inputs');contains(text,role.case.review,'Case review');
  for(const item of role.deliverables){contains(text,item.title,'Artifact title');contains(text,item.audience,'Artifact recipient');contains(text,item.checks[0],'Artifact acceptance');}
  if(career==='data'){
   const preview=await panel.locator('.career-case-preview .career-example-table').evaluate(wrapper=>{
    const bounds=wrapper.getBoundingClientRect();
    return {left:bounds.left,right:bounds.right,scrollWidth:wrapper.scrollWidth,width:wrapper.clientWidth,cells:[...wrapper.querySelectorAll('tbody td')].map(cell=>{const range=document.createRange();range.selectNodeContents(cell);const text=range.getBoundingClientRect();return {text:cell.textContent,left:text.left,right:text.right};})};
   });
   assert.ok(preview.scrollWidth<=preview.width+1,'The four-column preview must fit without concealing changes');
   for(const cell of preview.cells)assert.ok(cell.left>=preview.left-1&&cell.right<=preview.right+1,`Visible registration value: ${JSON.stringify(cell)}`);
  }
 }
 if(id==='preparation')for(const item of role.preparation){contains(text,item.skill,'Preparation identity');contains(text,item.work,'Preparation task');contains(text,item.quality,'Preparation quality');}
 if(id==='growth'){for(const item of role.collaboration)contains(text,item.exchange,'Collaboration exchange');contains(text,role.occupation.responsibility,'Responsibility scope');contains(text,role.pitfalls[0],'Pitfall');const route=panel.locator('.career-growth-list');const used=await route.evaluate(element=>({right:element.getBoundingClientRect().right,last:element.lastElementChild.getBoundingClientRect().right}));assert.ok(Math.abs(used.right-used.last)<=1,'Responsibility stages fill their route without an empty column');}
 if(id==='practice'){contains(text,role.practice.input,'Practice input');contains(text,role.practice.deliverable,'Practice deliverable');assert.equal(await panel.locator('.career-trial textarea').count(),1);}
 if(id==='sources'){assert.equal(await panel.locator('details.career-reference').count(),role.sourceRecords.length);for(const source of role.sourceRecords)contains(text,source.title,'Source title');}
 await fit(`${career}/${id}/${lang}`);return {career,section:id,language:lang};
};
try{
 for(const [lang,width,height]of [['zh',1366,900],['en',1616,1000]]){
  await page.setViewportSize({width,height});await visit('data');await language(lang);
  for(const career of careerContentIds){
   await visit(career);
   for(const id of sections){if(id!=='overview')await choose(id);report.matrix.push(await contentChecks(career,id,lang));if(career==='data')await shot(`data-${id}-${lang}-${width}`,'#career-panel-'+id);}
  }
 }
 report.checks.push('All 10 careers and six chapters retain their public work, outputs, preparation, collaboration, practice and source content in Chinese 1366 and English 1616; exactly one panel is visible, with no page/main overflow.');

 await language('zh');await page.setViewportSize({width:2560,height:1100});await visit('data','work');
 for(const id of sections){await choose(id);await fit('data/'+id+'/2560');}
 await choose('work');await shot('data-case-zh-2560','#career-panel-work');
 const total=await page.locator('.career-case-preview .career-example-table tbody tr').last().locator('td').allTextContents();assert.deepEqual(total.map(value=>value.trim()),['合计','320','280','-40']);
 assert.match(await page.locator('.career-case-preview .career-data-result').innerText(),/40.*12\.5%/);
 await page.setViewportSize({width:1616,height:1000});
 await shot('data-delivery-paper-zh-1616','.career-artifact[data-example="registrations"]');
 await shot('data-brief-paper-zh-1616','.career-artifact[data-example="brief"]');
 report.checks.push('Original registration preview and full delivery keep totals 320/280/-40 and decrease 12.5%; 2560 desktop fits every chapter.');

 for(const [career,section]of [['frontend','work'],['ai','work'],['security','preparation'],['ops','growth'],['backend','work']]){
  await visit(career,section);await fit(`${career}/${section}/1616`);await shot(`${career}-${section}-zh-1616`,'#career-panel-'+section);
 }
 await page.locator('.career-artifact[data-example="code"]').waitFor({state:'visible'});assert.ok((await page.locator('.career-artifact[data-example="code"] code').innerText()).length>40);
 await visit('frontend','work');
 const form=page.locator('.career-form-example').first();await form.waitFor();
 await form.getByRole('button',{name:'运行本机模拟',exact:true}).click();await form.getByText('演示邮箱为必填，请先输入。',{exact:true}).waitFor();
 await form.locator('input[type=email]').fill('invalid');await form.getByRole('button',{name:'运行本机模拟',exact:true}).click();await form.getByText('请填写含@和域名的演示邮箱；原输入保留。',{exact:true}).waitFor();assert.equal(await form.locator('input[type=email]').inputValue(),'invalid');
 await form.locator('input[type=email]').fill('isolated@example.invalid');await form.locator('select').selectOption('failure');await form.getByRole('button',{name:'运行本机模拟',exact:true}).click();await form.getByText('本机模拟失败；原输入保留，可重试。',{exact:true}).waitFor();assert.equal(await form.locator('input[type=email]').inputValue(),'isolated@example.invalid');
 await form.locator('select').selectOption('success');await form.getByRole('button',{name:'运行本机模拟',exact:true}).click();await form.getByText('本机模拟成功；未发送，未创建真实报名。',{exact:true}).waitFor();
 await shot('frontend-form-local-success-zh-1616','.career-form-example');
 report.checks.push('Representative tables, code and briefs remain readable. Frontend local form retains required/format/failure/success behaviors and never creates a real registration.');

 for(const career of ['data','ai']){
  await visit(career,'practice');const draft=`ISOLATED ${career} / 本轮层级改版验证稿，不是已确认经历`;
  const field=page.getByLabel('本例体验草稿',{exact:true});await field.fill(draft);await choose('growth');await choose('practice');assert.equal(await field.inputValue(),draft);
  await page.reload({waitUntil:'domcontentloaded'});await active('practice');assert.equal(await field.inputValue(),draft);
  await page.getByRole('button',{name:'保存体验草稿',exact:true}).click();await page.waitForFunction(({key,career,text})=>JSON.parse(localStorage.getItem(key)).careerTrials?.[career]?.text===text,{key:KEY,career,text:draft});
  await page.locator('.career-trial [data-trial-status="local"]').waitFor();await page.reload({waitUntil:'domcontentloaded'});await active('practice');assert.equal(await field.inputValue(),draft);
  if(career==='ai')await shot('ai-practice-draft-zh-1616','.career-trial-writing');
  await page.getByRole('button',{name:'预览目标选择',exact:true}).click();await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});assert.equal((await saved()).goal,'data');
 }
 report.checks.push('Data and AI unsaved drafts survive chapter switches and refresh; saved drafts persist in disposable local state. Original target preview remains a confirmation flow and does not change the goal.');

 await visit('data','overview');const source=page.locator('#career-panel-overview .career-source-inline a[href*="#career-source-"]').first(),href=await source.getAttribute('href');await source.click();await active('sources');const sourceId=new URL(href,base).hash.slice(1);await page.waitForFunction(id=>document.getElementById(id)?.open,sourceId);await settle();
 const hits=await page.locator('.career-section-nav > [role=tab]').evaluateAll(tabs=>tabs.map(tab=>{const r=tab.getBoundingClientRect();return{id:tab.id,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[role=tab]')?.id};}));for(const hit of hits)assert.equal(hit.id,hit.hit);report.sourceTabHits=hits;
 await shot('source-record-opened-zh-1616');await choose('overview');await source.click();await active('sources');await page.reload({waitUntil:'domcontentloaded'});await active('sources');assert.equal(await page.locator('#'+sourceId).getAttribute('open'),'');
 await visit('data');await page.locator('.career-hero-actions').getByRole('button',{name:'收藏方向',exact:true}).click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).favorites.includes('data'),KEY);
 await page.locator('.career-hero-actions').getByRole('button',{name:'加入比较',exact:true}).click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).compare.includes('data'),KEY);await page.locator('.career-reading-back').getByRole('button',{name:'移除数据分析',exact:true}).click();await page.waitForFunction(key=>!JSON.parse(localStorage.getItem(key)).compare.includes('data'),KEY);
 const state=await saved();assert.equal(state.goal,'data');assert.equal(state.jobs.length,0);assert.equal(state.events.length,0);
 report.checks.push('Sources open through their original links, every sticky tab receives pointer hits, and source/back/refresh restoration works. Favorite and compare/remove keep original business state; no jobs or events are created.');
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure={message:error.message,stack:error.stack};await page.screenshot({path:`checks/${tag}/failure.png`}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();await vite.close();await fs.writeFile(`${checks}/browser.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,matrix:report.matrix.length,screenshots:report.screenshots.length,checks:report.checks,errors:report.errors,failure:report.failure}));}
