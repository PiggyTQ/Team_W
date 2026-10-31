import {chromium} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{const p=await b.newPage({viewport:{width:1500,height:1020}});await p.goto(pathToFileURL(path.resolve('../设计参考与同步/设计稿/U06_工作透镜_v41.svg')).href);await p.screenshot({path:'../设计参考与同步/设计稿/U06_工作透镜_v41.png'});}finally{await b.close();}
