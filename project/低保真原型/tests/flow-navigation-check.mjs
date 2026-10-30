import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const bar=()=>page.getByRole('navigation',{name:'流程前进与返回'});
const snapshot=()=>page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
const next=async()=>bar().locator('.flow-next').click();
const back=async()=>bar().locator('.flow-back').click();
async function visit(route,s){await page.goto('http://127.0.0.1:5174/');if(s)await page.evaluate(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s});await page.goto('http://127.0.0.1:5174'+route);if(!route.startsWith('/assistant'))await bar().waitFor();else await page.getByRole('navigation',{name:'AI 工作台页面操作'}).waitFor();}
try{
await fs.mkdir('检查记录/统一流程导航',{recursive:true});
await visit('/careers',scenarioState('PT01'));await next();assert.equal(new URL(page.url()).pathname,'/assessment');
await page.getByLabel('经历标题',{exact:true}).fill('导航验证草稿（合成）');await page.getByLabel('原文 / 实际经历',{exact:true}).fill('尚未保存候选的草稿');
await next();assert.equal(new URL(page.url()).searchParams.get('tab'),'原文确认');assert.equal((await snapshot()).claims.length,0);
await back();assert.equal(await page.getByLabel('经历标题',{exact:true}).inputValue(),'导航验证草稿（合成）');await next();await next();assert.equal(new URL(page.url()).searchParams.get('tab'),'四维与差距');assert.equal((await snapshot()).analysis,null);await next();assert.equal(new URL(page.url()).pathname,'/plan');await next();assert.equal(new URL(page.url()).pathname,'/learning');assert.equal((await snapshot()).tasks.length,0);await bar().getByRole('link',{name:'先带缺项复盘'}).click();assert.equal(new URL(page.url()).pathname,'/reports');assert.equal((await snapshot()).reports.length,0);await next();assert.equal(new URL(page.url()).pathname,'/app');console.log('PASS first exploration, missing materials, draft return and report loop without automatic mutations');
await visit('/plan',scenarioState('PT05'));await next();assert.equal(new URL(page.url()).pathname,'/work/task-demo');const before=await snapshot();await next();assert.equal(new URL(page.url()).searchParams.get('tab'),'尝试与反馈');await next();assert.equal(new URL(page.url()).searchParams.get('tab'),'贡献与表达');await next();assert.equal(new URL(page.url()).searchParams.get('tab'),'完成回执');assert.deepEqual((await snapshot()).tasks,before.tasks);await next();assert.equal(new URL(page.url()).searchParams.get('tab'),'复盘');await next();assert.equal(new URL(page.url()).pathname,'/reports');assert.deepEqual((await snapshot()).tasks,before.tasks);console.log('PASS task substeps do not submit attempts or complete tasks');
const stopped=scenarioState('PT05');stopped.tasks[0].status='取消';await visit('/plan',stopped);assert.equal(await bar().locator('.flow-next').getAttribute('href'),'/learning');
const manual=scenarioState('PT05');manual.stage='S1';await visit('/plan',manual);await next();assert.equal(new URL(page.url()).searchParams.get('tab'),'执行');assert.equal(new URL(page.url()).searchParams.get('practice'),'task-demo');await next();assert.equal(new URL(page.url()).searchParams.get('step'),'record');await next();assert.equal(new URL(page.url()).searchParams.get('tab'),'复盘');await next();assert.equal(new URL(page.url()).pathname,'/reports');
await visit('/reports/report-demo',scenarioState('PT07'));await back();assert.equal(new URL(page.url()).pathname,'/reports');
await visit('/careers?tab=我的机会',scenarioState('PT05'));await next();assert.equal(new URL(page.url()).searchParams.get('tab'),'岗位简历');await next();assert.equal(new URL(page.url()).searchParams.get('tab'),'我的机会');
const ai=scenarioState('PT05');ai.aiReturn='/assessment?tab=原文确认';await visit('/assistant',ai);assert.equal(await bar().count(),0);await page.getByRole('navigation',{name:'AI 工作台页面操作'}).getByRole('link',{name:'返回原工作页'}).click();assert.equal(new URL(page.url()).searchParams.get('tab'),'原文确认');console.log('PASS canceled tasks, manual stage, report detail, resume/job branch and AI return');
for(const size of [{width:1440,height:900},{width:1000,height:600},{width:390,height:844}]){
await page.setViewportSize(size);await visit('/reports',scenarioState('PT05'));await page.waitForTimeout(80);let box=await bar().boundingBox();assert.ok(box.y>=0&&box.y+box.height<=size.height+1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(size.width>720){const main=await page.locator('main').boundingBox();assert.ok(main.y+main.height<=box.y+1);}await page.screenshot({path:`检查记录/统一流程导航/报告-${size.width}.png`});
await visit('/assessment',scenarioState('PT01'));await page.locator('main').evaluate(el=>el.scrollTop=el.scrollHeight);if(size.width<=720)await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(80);box=await bar().boundingBox();const footer=await page.locator('main>footer').boundingBox();assert.ok(footer.y+footer.height<=box.y+1,'last page content accessible above navigation');await page.screenshot({path:`检查记录/统一流程导航/经历-${size.width}.png`});}
console.log('PASS persistent bar, no content occlusion and responsive layouts');
for(const route of ['/admin/data','/settings','/onboarding','/']){await page.goto('http://127.0.0.1:5174'+route);assert.equal(await bar().count(),0);}assert.deepEqual(errors,[]);console.log('PASS navigation limited to student flow, no runtime errors');
await fs.writeFile('检查记录/统一流程导航/验证结果.txt','通过：首次无资料探索、草稿返回保留、差距未知、无任务分流、任务子步骤不自动提交、取消任务、S1执行、报告返回、求职简历、AI返回、1440/1000/390布局与底部不遮挡、范围限制、无运行时错误。\n');
}finally{await browser.close();}
