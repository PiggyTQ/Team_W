import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';
const dir='检查记录/Dashboard参考深化_20261023';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:false,args:['--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();
await page.goto('http://127.0.0.1:5187/app');
await page.evaluate(({KEY,state,guideKey})=>{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(guideKey,JSON.stringify({enabled:false,neverPrompt:true,seen:[],active:null}));},{KEY,state:scenarioState('PT04'),guideKey:OPERATION_GUIDE_KEY});
await page.reload();
await page.locator('.workbench-metrics').waitFor();
await page.screenshot({path:`${dir}/after-edge.png`,fullPage:true});
console.log(JSON.stringify({browser:browser.version(),url:page.url(),title:await page.title()}));
await browser.close();


