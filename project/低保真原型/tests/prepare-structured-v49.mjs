import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/报告重组与完整简历_v49/调整前';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{const p=await b.newPage();for(const width of [1440,390]){await p.setViewportSize({width,height:width===390?844:1000});for(const view of ['report','resume']){await p.goto('file:///C:/Users/tsnbx/Desktop/team/project/设计参考与同步/设计稿/主题报告与完整简历_v49.html?view='+view);await p.screenshot({path:`../设计参考与同步/设计稿/主题报告与完整简历_v49_${view}_${width}.png`,fullPage:true});}if(process.argv.includes('--design-only'))continue;for(const [name,route]of [['报告','/reports'],['简历','/reports?tab=岗位简历'],['阅读','/reports/report-demo']]){await p.goto('http://127.0.0.1:5184');await p.evaluate(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s:scenarioState(name==='简历'?'PT05':'PT07')});await p.goto('http://127.0.0.1:5184'+route);await p.screenshot({path:`${dir}/${width}-${name}.png`});}}}finally{await b.close();}
