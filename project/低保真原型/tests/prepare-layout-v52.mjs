import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const root='检查记录/板块对齐与全链路_v52';
await fs.mkdir(root+'/修改前源文件',{recursive:true});
for(const file of ['main.jsx','experience.jsx','workspace-search-model.js','SegmentedControl.jsx','ResumeProfileEditor.jsx','CompletionPanels.jsx'])await fs.copyFile('src/'+file,root+'/修改前源文件/'+file);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{const page=await browser.newPage();for(const width of [1440,390])for(const view of ['plan','assessment']){
 await page.setViewportSize({width,height:width===390?844:1000});
 await page.goto('file:///C:/Users/tsnbx/Desktop/team/project/设计参考与同步/设计稿/板块对齐与全链路_v52.html?view='+view);
 await page.screenshot({path:'../设计参考与同步/设计稿/板块对齐与全链路_v52_'+view+'_'+width+'.png',fullPage:true});
}}finally{await browser.close();}
