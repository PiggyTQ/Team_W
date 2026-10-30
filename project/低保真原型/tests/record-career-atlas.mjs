import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/工作透镜_v41',frames=dir+'/演示帧';await fs.mkdir(frames,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const context=await b.newContext({viewport:{width:1440,height:1050}});
await context.addInitScript(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s:scenarioState('PT04')});
const p=await context.newPage();
try{
 await p.goto('http://127.0.0.1:5184/career-map?tab=技能先修');await p.locator('.work-atlas').waitFor();await p.waitForTimeout(500);
 const start=Date.now();for(let i=0;i<125;i++){
  if([8,22,36,50].includes(i))await p.locator('.atlas-phase-buttons button').nth(({8:1,22:2,36:0,50:1})[i]).click();
  if(i===64)await p.locator('.atlas-material-picker>summary').click();
  if(i===76)await p.locator('.atlas-material-content>button').filter({hasText:'SQL 报告'}).click();
  if(i===96)await p.getByRole('button',{name:'比较方向',exact:true}).click();
  if(i===115)await p.getByRole('button',{name:'透视工作',exact:true}).click();
  await p.screenshot({path:frames+'/frame-'+String(i).padStart(3,'0')+'.png'});await p.waitForTimeout(Math.max(1,start+(i+1)*100-Date.now()));
 }
 execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','10','-i',frames+'/frame-%03d.png','-c:v','libvpx-vp9','-crf','32','-b:v','0',dir+'/工作透镜_实际交互.webm']);
 console.log('实际工作步骤、本人材料投影与方向对比录像已保存。');
}finally{await context.close();await b.close();}
