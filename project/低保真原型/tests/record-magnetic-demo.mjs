import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const dir='检查记录/完整板块轻吸附_v28';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage();
try{
 await page.goto('http://127.0.0.1:5184/');await page.locator('#starting-points').waitFor();await page.waitForTimeout(1200);
 const panel=await page.locator('#starting-points').evaluate(el=>{const style=getComputedStyle(el);return {top:el.getBoundingClientRect().top+scrollY+parseFloat(style.paddingTop),bottom:el.getBoundingClientRect().bottom+scrollY-parseFloat(style.paddingBottom)};});
 const arrival=panel.bottom-900+24,from=panel.top-900*2/3-18;
 await page.mouse.click(30,300);await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),from);await page.mouse.move(30,450);await page.waitForTimeout(900);
 const before=await page.evaluate(()=>scrollY),frames=dir+'/演示帧';await fs.mkdir(frames,{recursive:true});
 const started=Date.now();
 for(let i=0;i<40;i++){
  if(i===8)await page.mouse.wheel(0,30);
  await page.screenshot({path:frames+`/frame-${String(i).padStart(3,'0')}.png`});
  await page.waitForTimeout(Math.max(1,started+(i+1)*100-Date.now()));
 }
 await fs.copyFile(frames+'/frame-007.png',dir+'/吸附前_尚未对齐.png');
 const after=await page.evaluate(()=>scrollY);assert.ok(Math.abs(after-arrival)<2);assert.ok(after-before>200);
 await page.screenshot({path:dir+'/吸附后_自动对齐.png'});await page.waitForTimeout(800);
 await fs.writeFile(dir+'/吸附取样.json',JSON.stringify({viewport:{width:1280,height:900},before,wheelInput:30,after,alignmentTarget:arrival,bottomInViewport:panel.bottom-after,automaticDistance:after-before-30},null,2));
 await context.close();
 execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','10','-i',frames+'/frame-%03d.png','-c:v','libvpx-vp9','-crf','32','-b:v','0',dir+'/自动吸附演示.webm']);
 console.log(JSON.stringify({before,wheelInput:30,after,automaticDistance:after-before-30}));
}finally{await browser.close();}
