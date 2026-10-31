import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/工作区控件_v45';await fs.mkdir(dir+'/参考',{recursive:true});await fs.mkdir(dir+'/调整前',{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const p=await b.newPage({viewport:{width:1440,height:1000}});p.setDefaultTimeout(6000);
 for(const [name,url]of [['Craft搜索','https://www.craft.do/blog/craft-update-3-1-6'],['Jimo清单','https://jimo.ai/product/checklist'],['Jimo切换','https://jimo.ai/'],['Wope工具界面','https://wope.com/']]){
  try{await p.goto(url,{waitUntil:'domcontentloaded',timeout:20000});await p.waitForTimeout(1800);if(name==='Craft搜索')await p.locator('h3').filter({hasText:/搜索|Search/}).first().scrollIntoViewIfNeeded();else await p.evaluate(y=>scrollTo(0,y),name==='Jimo切换'?650:name==='Wope工具界面'?450:700);await p.screenshot({path:`${dir}/参考/${name}.png`});console.log('REF',name);}catch(e){console.log('REF-FAILED',name,e.message.split('\n')[0]);} 
 }
 for(const width of [1440,390]){
  await p.setViewportSize({width,height:width===390?844:1000});
  await p.goto('file:///C:/Users/tsnbx/Desktop/team/project/设计参考与同步/设计稿/工作区控件_v45.html');await p.screenshot({path:`../设计参考与同步/设计稿/工作区控件_v45_${width}.png`,fullPage:true});
  for(const [label,route]of [['计划','/plan'],['任务','/work/task-demo'],['搜索','/careers']]){await p.goto('http://127.0.0.1:5184');await p.evaluate(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s:scenarioState('PT04')});await p.goto('http://127.0.0.1:5184'+route);await p.screenshot({path:`${dir}/调整前/${width}-${label}.png`});}
 }
}finally{await b.close();}
