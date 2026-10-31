import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const phase=process.argv[2]||'before',dir='检查记录/可视化与报告_20261022/'+phase;
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']}),p=await browser.newPage({reducedMotion:'reduce'});
try{for(const width of [1440,390])for(const scene of ['PT01','PT05'])for(const [id,route,selector]of [['四维','/assessment?tab=成果档案','.profile-insight-layout'],['预算','/plan','.weekly-budget'],['报告','/reports','.output-report-desk'],['简历','/reports?tab=岗位简历','.output-resume']]){
 await p.setViewportSize({width,height:1000});await p.goto('http://127.0.0.1:5184/plan');const s=scenarioState(scene);if(scene==='PT05')s.resumeTarget='job-a';
 await p.evaluate(({s,key})=>{localStorage.setItem(key,JSON.stringify(s));localStorage.setItem('career-prototype-sidebar-v1','expanded');localStorage.setItem('career-prototype-language','zh');localStorage.setItem('career-prototype-operation-guide-v1','{"enabled":false,"neverPrompt":true}');},{s,key:KEY});
 await p.goto('http://127.0.0.1:5184'+route);await p.locator(selector).waitFor();await p.screenshot({path:`${dir}/${width}-${scene}-${id}-视口.png`});
 const r=await p.locator(selector).boundingBox();await p.setViewportSize({width,height:Math.min(4600,Math.ceil(r.height+650))});await p.locator(selector).screenshot({path:`${dir}/${width}-${scene}-${id}-区域.png`});
}}finally{await browser.close();}
