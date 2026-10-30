import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const dir='../设计参考与同步/设计稿';
const html=await fs.readFile(dir+'/工作区与本页指南_v39.html','utf8');
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{const p=await b.newPage({viewport:{width:1400,height:1000}});await p.setContent(html);for(const id of ['desktop','guide','mobile'])await p.locator('#'+id).screenshot({path:dir+`/工作区与本页指南_v39_${id}.png`});}finally{await b.close();}
