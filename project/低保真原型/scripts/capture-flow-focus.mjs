import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const phase=process.argv[2]||'before',dir=`检查记录/链路与布局聚焦_20261022/${phase}`;
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await browser.newPage({reducedMotion:'reduce'});p.setDefaultTimeout(10000);
const measurements=[];
async function measure(width,mode){let fields=0;for(const role of ['textbox','combobox','spinbutton','checkbox'])fields+=await p.getByRole('dialog').getByRole(role).count();const height=await p.getByRole('dialog').evaluate(e=>e.scrollHeight);const row={width,mode,height,fields};measurements.push(row);console.log(JSON.stringify(row));}
try{
for(const width of [1440,390]){
 await p.setViewportSize({width,height:width===390?844:900});
 await p.goto('http://127.0.0.1:5184/plan');
 const s=scenarioState('PT01');s.budget=5;
 await p.evaluate(({s,KEY})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language','zh');localStorage.setItem('career-prototype-operation-guide-v1','{"enabled":false,"neverPrompt":true}');},{s,KEY});
 await p.goto('http://127.0.0.1:5184/careers?tab=我的机会');await p.locator('.opportunity-toolbar').waitFor();
 await p.getByRole('button',{name:'手动添加岗位',exact:true}).click();
 await p.screenshot({path:`${dir}/${width}-岗位录入.png`});
 await measure(width,'job');
 await p.getByRole('button',{name:'关闭面板',exact:true}).click();
 await p.goto('http://127.0.0.1:5184/plan?precheck=1');await p.getByRole('dialog').waitFor();
 await p.screenshot({path:`${dir}/${width}-任务预检.png`});
 await measure(width,'precheck');
}
}finally{await fs.writeFile(dir+'/录入布局量测.json',JSON.stringify(measurements,null,2));await browser.close();}
