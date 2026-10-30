import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
const out=new URL('../checks/AI业务闭环_20261028/production/',import.meta.url),root=fileURLToPath(new URL('../',import.meta.url)),workspace=path.resolve(root,'../..');
const reportPath=new URL('browser-report.json',out),original=JSON.parse(await fs.readFile(reportPath,'utf8'));
await fs.writeFile(new URL('browser-report.initial.json',out),JSON.stringify(original,null,2)+'\n');
// Repair only the URL-to-Windows-path representation used for the first screenshots.
for(const name of original.screenshots){
 assert.ok(/^[a-z0-9-]+\.png$/.test(name));
 const url=new URL(name,out),old=path.resolve(url.pathname.replace(/^\/([A-Za-z]:)/,'$1')),dest=fileURLToPath(url);
 assert.ok(old.startsWith(workspace+path.sep)&&dest.startsWith(workspace+path.sep));
 try{await fs.access(dest);}catch{await fs.copyFile(old,dest);}
}
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://47.250.133.180/',{waitUntil:'domcontentloaded'});await page.locator('.career-tile-face').first().waitFor();
 const material=await page.evaluate(()=>{const header=document.querySelector('header'),card=document.querySelector('.career-tile-face');return {rootBlur:getComputedStyle(document.documentElement).getPropertyValue('--lg-blur').trim(),careerMaterial:card?getComputedStyle(card).getPropertyValue('--lg-material').trim():null,headerBackdrop:header?getComputedStyle(header).backdropFilter:null,reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,smallViewport:matchMedia('(max-width:720px)').matches};});
 assert.equal(material.rootBlur,material.reducedMotion||material.smallViewport?'12px':'18px');assert.equal(material.careerMaterial,'glass');assert.deepEqual(errors,[]);
 await page.screenshot({path:fileURLToPath(new URL('06-production-material-confirmed.png',out)),fullPage:false});
 const proof={passed:true,production:true,accountCreated:false,realProviderCalls:0,material,pageErrors:errors,correction:'The initial probe used a nonexistent --liquiglass prefix. The actual --lg properties use 12px for reduced motion or narrow screens, 18px otherwise; this matches the existing stylesheet. Screenshot path conversion uses fileURLToPath.'};
 await fs.writeFile(new URL('material-report.json',out),JSON.stringify(proof,null,2)+'\n');
 original.material={...material,materialStylePresent:true};original.materialVerification='material-report.json';original.screenshots.push('06-production-material-confirmed.png');await fs.writeFile(reportPath,JSON.stringify(original,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{await browser?.close();}
