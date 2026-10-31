import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/登录小栖迎接窗口_20261023';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:false,args:['--no-proxy-server']});
try {
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const page=await context.newPage();await page.goto('http://127.0.0.1:5187/');
 const state=scenarioState('PT01');state.logged=false;
 await page.evaluate(({KEY,state})=>{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem('career-prototype-language','zh');},{KEY,state});
 await page.reload({waitUntil:'networkidle'});
 await page.locator('.publicnav button').filter({hasText:/登录/}).click();
 await page.locator('.auth-dialog[open]').waitFor();
 await page.screenshot({path:`${dir}/before-desktop.png`});
 console.log(JSON.stringify({browser:browser.version(),url:page.url(),open:true}));
}finally{await browser.close();}
