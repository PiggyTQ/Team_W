import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/地图支线_v42';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});
 await p.setContent('<style>body{margin:0}</style>'+await readFile(path.resolve('../设计参考与同步/设计稿/U06_地图支线闭环_v42.svg'),'utf8'));
 await p.screenshot({path:'../设计参考与同步/设计稿/U06_地图支线闭环_v42.png'});
 await p.goto('http://127.0.0.1:5184/');await p.evaluate(({KEY,s})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language','zh');},{KEY,s:scenarioState('PT04')});
 await p.goto('http://127.0.0.1:5184/career-map?career=frontend&tab=职业关系&relation=细分方向&node=branch:interface');await p.locator('.atlas-practice-steps summary').click();
 await p.locator('.atlas-dock').screenshot({path:dir+'/1440-支线内容.png'});
 await p.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);document.querySelector('main')?.scrollTo(0,0);});await p.screenshot({path:dir+'/1440-支线首屏.png'});
 await p.setViewportSize({width:390,height:844});await p.reload();await p.locator('.atlas-practice-steps summary').click();await p.locator('.atlas-dock').screenshot({path:dir+'/390-支线内容.png'});
 await p.setViewportSize({width:1440,height:1000});await p.goto('http://127.0.0.1:5184/career-map?node=skill:sheet');await p.locator('.atlas-dock-actions .primary').click();await p.locator('dialog[open]').screenshot({path:dir+'/1440-保留地图来源的预检.png'});
 console.log('v42先行线框PNG和实际支线、手机、来源预检截图已保存。');
}finally{await browser.close();}
