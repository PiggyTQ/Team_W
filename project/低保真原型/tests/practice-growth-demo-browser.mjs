import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';
import {fresh,KEY} from '../src/model.js';
const projects=JSON.parse(await fs.readFile('course-packs/growth/catalog.json','utf8')).projects;
const initial={...fresh(),logged:true,onboard:true,budget:168};
const vite=await createServer({mode:'development',logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await vite.listen();
const base='http://127.0.0.1:'+vite.httpServer.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']}),context=await browser.newContext({viewport:{width:1616,height:960},reducedMotion:'reduce'}),page=await context.newPage();
page.setDefaultTimeout(25000);const report={localOnly:true,syntheticOnly:true,mode:'browser-local-demo',passed:false,projects:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
await context.addInitScript(({key,initial})=>{if(window.top!==window)return;if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(initial));localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true}));},{key:KEY,initial});
try{
 for(const p of projects){
  await page.goto(base+'/learning/projects/'+p.id);
  if(p.legacy){await page.locator('[data-project="'+p.id+'"]').waitFor();report.projects.push({id:p.id,overview:true,retained:true});continue;}
  await page.locator('.growth-heading h1').waitFor();await page.getByRole('button',{name:'预览预算并安排实践',exact:true}).click();await page.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();await page.locator('#growth-editor').waitFor();
  const artifact=JSON.parse(await fs.readFile('course-packs/growth/'+p.id+'/1/reference/artifact.json','utf8'));
  for(const [name,body] of Object.entries(artifact.files)){await page.locator('.growth-workspace .growth-file-tabs button').filter({hasText:name}).click();await page.locator('#growth-editor').fill(body);}
  await page.getByLabel('本人贡献',{exact:true}).fill('Synthetic local demo reproduction; no real learner or employment claim.');
  await page.getByRole('button',{name:'检查文件与结果',exact:true}).click();await page.getByRole('heading',{name:'文件与结果核对通过',exact:true}).waitFor();
  await page.getByRole('button',{name:'提交本次产物',exact:true}).click();await page.getByRole('button',{name:'记录本人复核',exact:true}).click();await page.getByRole('button',{name:'确认本次范围并归档',exact:true}).click();await page.getByRole('heading',{name:'本次产物已归档',exact:true}).waitFor();report.projects.push({id:p.id,overview:true,checkSubmitReviewArchive:true});
 }
 await page.waitForTimeout(900);await page.reload();await page.getByRole('heading',{name:'本次产物已归档',exact:true}).waitFor();report.refreshRestored=true;
 await page.screenshot({path:'docs/releases/images/practice-growth-20261126/actual/demo-archive-1616x960.png'});
 assert.deepEqual(report.errors,[]);assert.equal(report.projects.length,36);report.passed=true;
}catch(e){report.failure={message:e.message,stack:e.stack};process.exitCode=1;}
finally{await browser.close();await vite.close();await fs.writeFile('checks/practice-growth-20261126/demo-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,projects:report.projects.length,failure:report.failure}));}
