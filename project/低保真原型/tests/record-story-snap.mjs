import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const dir='检查记录/案例章节松手吸附_v31',frames=dir+'/演示帧';await fs.mkdir(frames,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage({viewport:{width:1350,height:800}});
try{
 await p.goto('http://127.0.0.1:5184/');await p.waitForTimeout(1200);await p.mouse.move(30,350);
 const g=await p.locator('#report-preview').evaluate(el=>{const r=el.getBoundingClientRect();return {target:r.top+scrollY-(innerHeight-r.height)/2};});
 await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),g.target);await p.waitForTimeout(1000);
 const start=Date.now();for(let i=0;i<35;i++){
  if(i===5)await p.mouse.wheel(0,-350);
  await p.screenshot({path:frames+`/frame-${String(i).padStart(3,'0')}.png`});await p.waitForTimeout(Math.max(1,start+(i+1)*100-Date.now()));
 }
 execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','10','-i',frames+'/frame-%03d.png','-c:v','libvpx-vp9','-crf','32','-b:v','0',dir+'/案例章节松手归位.webm']);console.log('案例归位实录已保存');
}finally{await b.close();}
