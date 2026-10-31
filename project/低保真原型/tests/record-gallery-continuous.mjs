import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const dir='检查记录/职业卡片连续慢滑_v33',frames=dir+'/演示帧';await fs.mkdir(frames,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage({viewport:{width:1280,height:720}});
try{
 await p.goto('http://127.0.0.1:5184/');await p.waitForTimeout(1200);await p.mouse.move(25,350);await p.locator('#directions').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-24,behavior:'instant'}));
 const start=Date.now();for(let i=0;i<100;i++){await p.screenshot({path:frames+`/frame-${String(i).padStart(3,'0')}.png`});await p.waitForTimeout(Math.max(1,start+(i+1)*100-Date.now()));}
 execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','10','-i',frames+'/frame-%03d.png','-c:v','libvpx-vp9','-crf','32','-b:v','0',dir+'/无停顿连续慢速横移.webm']);console.log('自动播放录像已保存');
}finally{await b.close();}

