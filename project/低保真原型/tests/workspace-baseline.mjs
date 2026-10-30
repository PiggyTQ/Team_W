import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/工作区改进_v39/调整前';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{
 const page=await browser.newPage();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:1000});
  for(const [name,route,scene]of [['首页初次','/app','PT01'],['首页进行中','/app','PT04'],['经历','/assessment','PT02'],['计划','/plan','PT04'],['学习','/learning','PT01'],['报告','/reports','PT01']]){
   await page.goto('http://127.0.0.1:5184/');
   await page.evaluate(({KEY,state})=>localStorage.setItem(KEY,JSON.stringify(state)),{KEY,state:scenarioState(scene)});
   await page.goto('http://127.0.0.1:5184'+route);
   await page.locator('.page-surface').waitFor();
   await page.screenshot({path:`${dir}/${width}-${name}.png`});
  }
 }
}finally{await browser.close();}
