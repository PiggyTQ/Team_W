import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';
const browser=await chromium.launch({channel:'msedge',headless:false,args:['--no-proxy-server','--start-maximized']});
const context=await browser.newContext({viewport:null});
const state=scenarioState('PT01');state.logged=false;
await context.addInitScript(({KEY,state,guideKey})=>{
 localStorage.setItem(KEY,JSON.stringify(state));
 localStorage.setItem('career-prototype-language','zh');
 localStorage.setItem(guideKey,JSON.stringify({enabled:false,neverPrompt:true,seen:[],active:null}));
},{KEY,state,guideKey:OPERATION_GUIDE_KEY});
const page=await context.newPage();
await page.goto('http://127.0.0.1:5187/',{waitUntil:'networkidle'});
await page.locator('.publicnav').getByRole('button',{name:'登录 / 开始',exact:true}).click();
await page.locator('.auth-nook-scene[data-renderer=ready],.auth-nook-scene[data-renderer=fallback]').waitFor({timeout:60000});
console.log(JSON.stringify({ready:true,browser:'Microsoft Edge '+browser.version(),url:page.url(),dialog:'小栖迎接窗口',isolated:true}));
await new Promise(resolve=>browser.once('disconnected',resolve));
