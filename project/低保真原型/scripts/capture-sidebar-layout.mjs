import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import {KEY,scenarioState} from '../src/model.js';
const phase=process.argv[2]||'before',dir=`检查记录/伸缩侧栏_20261022/${phase}`;await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']}),p=await browser.newPage();
try{for(const [width,route,name] of [[1440,'/careers','职业探索'],[1024,'/plan?tab=执行','任务执行'],[390,'/careers','手机']]){
 await p.setViewportSize({width,height:width===390?844:1000});await p.goto('http://127.0.0.1:5184/plan');await p.evaluate(({key,s})=>{localStorage.setItem(key,JSON.stringify(s));localStorage.setItem('career-prototype-language','zh');localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));},{key:KEY,s:scenarioState('PT05')});await p.goto('http://127.0.0.1:5184'+route);await p.locator('#workspace-sidebar').waitFor({state:'attached'});await p.screenshot({path:`${dir}/${width}-${name}.png`});
}}finally{await browser.close();}
