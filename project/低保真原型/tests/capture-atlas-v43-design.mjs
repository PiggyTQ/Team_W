import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{const p=await b.newPage({viewport:{width:1280,height:800}});await p.setContent('<style>body{margin:0}</style>'+await readFile('../设计参考与同步/设计稿/U06_工具选择与草稿恢复_v43.svg','utf8'));await p.screenshot({path:'../设计参考与同步/设计稿/U06_工具选择与草稿恢复_v43.png'});}finally{await b.close();}
