import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const root='检查记录/分区与文字层级_v55/参考';await fs.mkdir(root,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{
 const results=await Promise.all([['Craft','https://www.craft.do/zh-CN'],['Wope','https://wope.com/'],['FigurePlot','https://www.figureandplot.com/'],['Jimo','https://jimo.ai/']].map(async([name,url])=>{
  const p=await b.newPage({viewport:{width:1440,height:1000}});
  try{await p.goto(url,{waitUntil:'domcontentloaded',timeout:35000});await p.waitForTimeout(1500);
   const data=await p.evaluate(()=>{const sample=e=>{const s=getComputedStyle(e);return {tag:e.tagName,text:e.textContent.trim().slice(0,80),family:s.fontFamily,size:s.fontSize,line:s.lineHeight,weight:s.fontWeight,tracking:s.letterSpacing};};return {url:location.href,body:sample(document.body),headings:[...document.querySelectorAll('h1,h2,h3')].filter(e=>e.getClientRects().length&&e.textContent.trim()).slice(0,18).map(sample),paragraphs:[...document.querySelectorAll('p')].filter(e=>e.getClientRects().length&&e.textContent.trim()).slice(0,6).map(sample),fontFaces:[...document.fonts].map(f=>({family:f.family,status:f.status,weight:f.weight})).slice(0,18)};});
   await p.screenshot({path:root+'/'+name+'.png'});return {name,...data};
  }catch(e){return {name,url,error:e.message};}finally{await p.close();}
 }));
 await fs.writeFile(root+'/实际字体取样.json',JSON.stringify(results,null,2));for(const r of results)console.log(r.name,JSON.stringify(r.error||{body:r.body,headings:r.headings.slice(0,5)}));
}finally{await b.close();}
