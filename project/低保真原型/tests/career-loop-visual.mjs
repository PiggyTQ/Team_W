import {chromium} from '@playwright/test';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await b.newPage({viewport:{width:1440,height:1000}});
await p.goto('http://127.0.0.1:5186');await p.locator('#directions').evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:'instant'}));await p.mouse.move(0,0);await p.waitForTimeout(800);
console.log(await p.locator('.career-loop-toolbar').evaluate(e=>({scrollX,rect:e.getBoundingClientRect().toJSON(),children:[...e.querySelectorAll('*')].map(n=>({tag:n.tagName,text:n.textContent,rect:n.getBoundingClientRect().toJSON(),position:getComputedStyle(n).position,display:getComputedStyle(n).display}))})));
await p.screenshot({path:'检查记录/十职业紧凑循环_20261023/普通动态-桌面.png'});
await b.close();
