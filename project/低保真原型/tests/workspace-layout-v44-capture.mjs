import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const phase=process.argv[2]||'调整前';
const dir=`检查记录/工作区空间_v44/${phase}`;
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{
 const page=await browser.newPage();
 if(phase==='参考'){
  for(const [name,url] of [['Wope','https://wope.com/'],['Craft','https://www.craft.do/zh-CN'],['FigurePlot','https://www.figureandplot.com/'],['Jimo','https://jimo.ai/']]){
   try{await page.setViewportSize({width:1440,height:1000});await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});await page.screenshot({path:`${dir}/${name}.png`,timeout:10000});console.log(name,await page.title());}catch(e){console.log(name,e.message.split('\n')[0]);}
  }
 }else{
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:1000});
   for(const [name,route,scene]of [['工作台','/app','PT04'],['职业','/careers','PT01'],['经历','/assessment','PT02'],['依据','/assessment?tab=四维与差距','PT07'],['计划','/plan','PT04'],['日程','/plan?tab=执行&view=calendar','PT04'],['学习','/learning','PT01'],['报告','/reports','PT07'],['设置','/settings','PT04'],['AI','/assistant','PT01'],['地图','/career-map?career=data','PT04']]){
    await page.goto('http://127.0.0.1:5184/');
    await page.evaluate(({KEY,state})=>localStorage.setItem(KEY,JSON.stringify(state)),{KEY,state:scenarioState(scene)});
    await page.goto('http://127.0.0.1:5184'+route);
    await page.locator('.page-surface').waitFor();
    await page.screenshot({path:`${dir}/${width}-${name}.png`});
    console.log(width,name,await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})));
   }
  }
 }
}finally{await browser.close();}
