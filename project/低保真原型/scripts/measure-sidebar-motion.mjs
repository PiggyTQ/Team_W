import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/伸缩侧栏_20261022/after';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']}),p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'}),results=[];
try{
 await p.goto('http://127.0.0.1:5184/plan');await p.evaluate(({key,s})=>{localStorage.setItem(key,JSON.stringify(s));localStorage.setItem('career-prototype-sidebar-v1','expanded');localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));localStorage.setItem('career-prototype-language','zh');},{key:KEY,s:scenarioState('PT07')});
 await p.goto('http://127.0.0.1:5184/assessment');await p.evaluate(()=>document.fonts.ready);
 const cdp=await p.context().newCDPSession(p);await cdp.send('Performance.enable');
 for(const rate of [1,4]){
  await cdp.send('Emulation.setCPUThrottlingRate',{rate});
  for(const name of ['收起侧栏','展开侧栏']){
   const before=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
   const sampling=p.evaluate(()=>new Promise(resolve=>{const samples=[],properties=new Set();let start;
    const frame=t=>{start??=t;const e=document.getElementById('main');samples.push({time:t,left:e.getBoundingClientRect().left});for(const a of e.getAnimations())for(const k of Object.keys(a.effect.getKeyframes()[0]||{}))if(!['offset','computedOffset','easing','composite'].includes(k))properties.add(k);if(t-start<550)requestAnimationFrame(frame);else resolve({samples,properties:[...properties]});};requestAnimationFrame(frame);
   }));
   await p.getByRole('button',{name,exact:true}).click();const capture=await sampling;
   const after=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
   const gaps=capture.samples.slice(1).map((x,i)=>x.time-capture.samples[i].time).sort((a,b)=>a-b);
   results.push({cpuThrottling:rate,action:name,animatedProperties:capture.properties,frameSamples:capture.samples.length,medianFrameIntervalMs:Math.round(gaps[Math.floor(gaps.length/2)]*10)/10,maxFrameIntervalMs:Math.round(Math.max(...gaps)*10)/10,layoutCount:after.LayoutCount-before.LayoutCount,layoutDurationMs:Math.round((after.LayoutDuration-before.LayoutDuration)*1000),positions:capture.samples});
  }
 }
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
}finally{await browser.close();}
await fs.writeFile(dir+'/动效取样.json',JSON.stringify({results,note:'本机桌面Chromium及CDP 4倍CPU减速取样，不代表物理低端设备或所有页面的帧率保证。'},null,2));
console.log(JSON.stringify(results.map(({positions,...rest})=>rest),null,2));
