import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const dir='检查记录/卡片松手居中吸附_v29',frames=dir+'/演示帧';await fs.mkdir(frames,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await b.newPage({viewport:{width:1280,height:720}});
try{
 await p.goto('http://127.0.0.1:5184/');await p.waitForTimeout(1400);await p.mouse.move(30,350);
 let frame=0;
 for(const id of ['#how','#directions']){
  const g=await p.locator(id).evaluate(el=>({start:scrollY+el.getBoundingClientRect().top-42,step:Number(el.dataset.snapRange)/(Number(el.dataset.snapCount)-1)}));
  await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),g.start+g.step);await p.waitForTimeout(1100);
  const started=Date.now();
  for(let i=0;i<30;i++){
   if(i===5)await p.mouse.wheel(0,g.step*.65);
   await p.screenshot({path:frames+`/frame-${String(frame++).padStart(3,'0')}.png`});
   await p.waitForTimeout(Math.max(1,started+(i+1)*100-Date.now()));
  }
 }
 execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','10','-i',frames+'/frame-%03d.png','-c:v','libvpx-vp9','-crf','32','-b:v','0',dir+'/松手最近卡片吸附.webm']);
 console.log('录制完成');
}finally{await b.close();}
