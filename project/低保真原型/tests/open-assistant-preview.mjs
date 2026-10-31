import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';
const browser=await chromium.launch({channel:'msedge',headless:false,args:['--no-proxy-server','--start-maximized']});
const context=await browser.newContext({viewport:null});
const page=await context.newPage();
await page.goto('http://127.0.0.1:5187/assistant');
await page.evaluate(({KEY,state,guideKey})=>{
 localStorage.setItem(KEY,JSON.stringify(state));
 localStorage.setItem('career-prototype-sidebar-v1','expanded');
 localStorage.setItem(guideKey,JSON.stringify({enabled:false,neverPrompt:true,seen:[],active:null}));
},{KEY,state:scenarioState('PT04'),guideKey:OPERATION_GUIDE_KEY});
await page.reload({waitUntil:'networkidle'});
await page.locator('#assistant-question').waitFor();
console.log(JSON.stringify({ready:true,browser:'Microsoft Edge '+browser.version(),url:page.url(),scenario:'PT04 · 合成预览，独立浏览器上下文'}));
await new Promise(resolve=>browser.once('disconnected',resolve));
