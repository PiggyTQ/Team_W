import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';
// Isolated synthetic preview: never overwrite the user's normal browser data.
const browser=await chromium.launch({channel:'msedge',headless:false,args:['--no-proxy-server','--start-maximized']});
const context=await browser.newContext({viewport:null});
const page=await context.newPage();
await page.goto('http://127.0.0.1:5187/app');
await page.evaluate(({KEY,state,guideKey})=>{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(guideKey,JSON.stringify({enabled:false,neverPrompt:true,seen:[],active:null}));},{KEY,state:scenarioState('PT04'),guideKey:OPERATION_GUIDE_KEY});
await page.reload({waitUntil:'networkidle'});
await page.locator('.dashboard-dimension-links a').first().waitFor();
console.log(JSON.stringify({ready:true,browser:'Microsoft Edge '+browser.version(),url:page.url(),title:await page.title(),scenario:'PT04 · 合成演示，未修改日常浏览器资料'}));
await new Promise(resolve=>browser.once('disconnected',resolve));
