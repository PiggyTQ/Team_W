import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const dir='检查记录/首页文字入场全检_v38',frames=dir+'/演示帧';await fs.mkdir(frames,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage({viewport:{width:1350,height:800}});
try{
 await p.goto('http://127.0.0.1:5184/');await p.waitForTimeout(1200);await p.mouse.move(25,350);await p.locator('#how').evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-Number(el.dataset.snapTop),behavior:'instant'}));await p.waitForTimeout(1100);
 const start=Date.now();for(let i=0;i<100;i++){
  if([8,38,68].includes(i))await p.mouse.wheel(0,80);
  await p.screenshot({path:frames+`/frame-${String(i).padStart(3,'0')}.png`});await p.waitForTimeout(Math.max(1,start+(i+1)*100-Date.now()));
 }
 execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','10','-i',frames+'/frame-%03d.png','-c:v','libvpx-vp9','-crf','32','-b:v','0',dir+'/四个流程节点_到达后文字浮现.webm']);console.log('四个节点到达后浮现实录已保存');
}finally{await b.close();}
