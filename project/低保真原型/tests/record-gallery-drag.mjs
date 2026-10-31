import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const dir='检查记录/职业循环卡片鼠标拖动_v35',frames=dir+'/演示帧';await fs.mkdir(frames,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage({viewport:{width:1280,height:720}});
try{
 await p.goto('http://127.0.0.1:5184/');await p.waitForTimeout(1100);await p.locator('#directions').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-24,behavior:'instant'}));await p.waitForTimeout(300);
 const box=await p.locator('.direction-gallery-viewport').boundingBox(),x=box.x+box.width*.6,y=box.y+180;await p.mouse.move(x,y);
 const start=Date.now();for(let i=0;i<65;i++){
  if(i===10)await p.mouse.down();if(i>=12&&i<=24)await p.mouse.move(x-(i-11)*20,y);if(i===30)await p.mouse.up();
  await p.screenshot({path:frames+`/frame-${String(i).padStart(3,'0')}.png`});await p.waitForTimeout(Math.max(1,start+(i+1)*100-Date.now()));
 }
 execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','10','-i',frames+'/frame-%03d.png','-c:v','libvpx-vp9','-crf','32','-b:v','0',dir+'/鼠标拖动后松手继续循环.webm']);console.log('拖动与松手续播录像已保存');
}finally{await b.close();}
