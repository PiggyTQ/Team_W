import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const dir='检查记录/竖向轻滚切换_v37',frames=dir+'/演示帧';await fs.mkdir(frames,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage({viewport:{width:1350,height:800}});
try{
 await p.goto('http://127.0.0.1:5184/');await p.waitForTimeout(1300);await p.mouse.move(25,350);
 await p.locator('#ai').evaluate(el=>{const r=el.getBoundingClientRect();scrollTo({top:r.top+scrollY-(innerHeight-r.height)/2,behavior:'instant'});});await p.waitForTimeout(1100);
 const before=await p.evaluate(()=>scrollY),start=Date.now();for(let i=0;i<40;i++){
  if(i===7)await p.mouse.wheel(0,80);
  await p.screenshot({path:frames+`/frame-${String(i).padStart(3,'0')}.png`});await p.waitForTimeout(Math.max(1,start+(i+1)*100-Date.now()));
 }
 const after=await p.evaluate(()=>scrollY);await fs.writeFile(dir+'/轻滚取样.json',JSON.stringify({wheelInput:80,before,after,completedDistance:after-before},null,2));
 execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','10','-i',frames+'/frame-%03d.png','-c:v','libvpx-vp9','-crf','32','-b:v','0',dir+'/80px轻滚进入下一部分.webm']);console.log(JSON.stringify({before,after,wheelInput:80}));
}finally{await b.close();}
