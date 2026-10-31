import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const dir='../参考调研_20261023/Mirage_收尾';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({viewport:{width:1440,height:960}});
await page.goto('https://studiomirage.io/works/sopra-banking',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(7000);
await page.screenshot({path:dir+'/入口.png'});
await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
await page.waitForTimeout(4000);
await page.screenshot({path:dir+'/页尾.png'});
console.log(await page.evaluate(()=>({height:document.documentElement.scrollHeight,y:scrollY,body:document.body.innerText.slice(-4500),end:[...document.querySelectorAll('footer,[class*="footer"],[class*="next"]')].map(e=>({tag:e.tagName,class:e.className,rect:e.getBoundingClientRect().toJSON(),text:e.innerText?.slice(0,500)}))})));
await fs.writeFile(dir+'/reference.html',await page.content());
for(const y of [7800,8400,9000]){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(1200);await page.screenshot({path:dir+`/滚动-${y}.png`});}
await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(1500);await page.locator('.NextPageZone').hover();await page.waitForTimeout(1200);await page.screenshot({path:dir+'/下一页悬停.png'});
await fs.writeFile(dir+'/styles.json',JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('.PageEnd,.Footer,.Footer-arabic,.NextPage,.NextPageZone,canvas')].map(e=>({tag:e.tagName,class:e.className,rect:e.getBoundingClientRect().toJSON(),styles:{position:getComputedStyle(e).position,transform:getComputedStyle(e).transform,background:getComputedStyle(e).background}}))),null,2));
await browser.close();
