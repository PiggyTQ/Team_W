import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';
import {fresh,KEY} from '../src/model.js';

// Small computed-style check. The root task owns the complete account/screenshot matrix.
const out='checks/career-growth-jobs-20261127/typography';
await fs.mkdir(out,{recursive:true});
const vite=await createServer({mode:'development',logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});
await vite.listen();
const base='http://127.0.0.1:'+vite.httpServer.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1616,height:960},reducedMotion:'reduce'}),page=await context.newPage();
const report={passed:false,localOnly:true,checks:[],types:[],errors:[]};
page.on('pageerror',error=>report.errors.push(error.message));
await context.addInitScript(({key,state})=>{if(window.top!==window)return;if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true,active:null,seen:[]}));},{key:KEY,state:{...fresh(),logged:true,onboard:true,goal:'data',jobs:[]}});
const size=async(selector,expected)=>{
 const el=page.locator(selector).first();await el.waitFor();
 const actual=await el.evaluate(el=>getComputedStyle(el).fontSize);
 report.types.push({selector,expected,actual});assert.equal(actual,expected+'px',selector);
};
const fit=async()=>assert.ok(await page.locator('#main').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'No content overflow');
try {
 await page.goto(base+'/careers?tab='+encodeURIComponent('企业与岗位'));
 await size('.jobs-research-card h3',23);await size('.jobs-research-excerpt h4',16);await size('.jobs-research-excerpt blockquote',16);await size('.jobs-card-facts dt',13);await size('.jobs-card-facts dd',14);await size('.jobs-research-card .status-chip',13);await size('.jobs-querybar input',16);await fit();
 await page.locator('.career-workspace').evaluate(el=>el.style.width='760px');
 assert.equal(await page.locator('.jobs-research-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);
 await page.locator('.career-workspace').evaluate(el=>el.style.width='');
 for(const button of await page.locator('.jobs-card-compare').all())await button.click();
 await page.getByRole('button',{name:'比较所选岗位',exact:true}).click();
 await size('.job-field-comparison td',16);await size('.job-field-comparison tbody th[scope="row"]',13);
 await page.getByRole('button',{name:'关闭字段比较',exact:true}).click();
 await page.getByRole('button',{name:'查看岗位详情',exact:true}).first().click();
 await size('body>.job-discovery-drawer .information-drawer-heading h2',24);await size('body>.job-discovery-drawer .facts dt',13);await size('body>.job-discovery-drawer .facts dd',16);
 await page.keyboard.press('Escape');
 report.checks.push('Demo jobs, comparison and portalled detail use distinct computed text roles; 760px content collapses the result grid.');
 await page.goto(base+'/careers?tab='+encodeURIComponent('我的机会'));
 await size('.opportunity-start h2',28);await size('.opportunity-start h3',22);await size('.opportunity-start h4',18);await size('.opportunity-example-findings p',16);await size('.opportunity-example-findings small',13);
 await page.locator('.career-workspace').evaluate(el=>el.style.width='620px');
 assert.equal(await page.locator('.opportunity-example-findings').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);await fit();
 await page.locator('.career-workspace').evaluate(el=>el.style.width='');
 await page.getByRole('button',{name:'添加岗位研究卡',exact:true}).click();
 const dialog=page.locator('dialog[open]');
 await size('dialog[open] input[aria-label="岗位研究标题"]',16);
 await dialog.getByLabel('岗位研究标题',{exact:true}).fill('Synthetic typography review');
 await dialog.getByLabel('本人允许处理的要求原文',{exact:true}).fill('Synthetic original text for local type review.');
 await dialog.locator('input[type=checkbox]').check();await dialog.getByRole('button',{name:'保存本人研究卡',exact:true}).click();
 await page.locator('.opportunity-detail').waitFor();await size('.opportunity-detail>header h2',26);await size('.opportunity-content h3',22);await size('.opportunity-content p',16);await size('.opportunity-progress strong',15);await size('.opportunity-progress small',13);await fit();
 await page.locator('.career-workspace').evaluate(el=>el.style.width='760px');
 assert.equal(await page.locator('.opportunities-layout').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);
 assert.equal(await page.locator('.opportunity-record-toggle').evaluate(el=>getComputedStyle(el).display),'flex');
 await page.getByRole('button',{name:'切换岗位与筛选',exact:false}).click();await page.locator('.opportunity-list').waitFor({state:'visible'});await fit();
 report.checks.push('Empty and saved opportunities keep a readable 28/22/18/16/13 hierarchy; narrow private workspace exposes the record switch instead of squeezing two columns.');
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure={message:error.message,stack:error.stack};await page.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));await browser.close();await vite.close();console.log(JSON.stringify(report));}
