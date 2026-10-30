import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage({reducedMotion:'reduce'}),checks=[];
const inspect=async(name)=>{const fonts=await p.locator('dialog[open]').evaluate(e=>[...new Set([...e.querySelectorAll('*')].filter(n=>!n.closest('svg')&&n.getClientRects().length&&[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())).map(n=>getComputedStyle(n).fontSize))]);assert.ok(fonts.every(f=>['12px','13px','14px','15px','16px','18px','20px','22px','24px','26px','30px','32px','36px'].includes(f)));checks.push({name,fonts});};
try{await p.goto('http://127.0.0.1:5187');await p.evaluate(({KEY,s})=>{s.logged=false;localStorage.setItem(KEY,JSON.stringify(s));},{KEY,s:scenarioState('PT04')});await p.reload();
for(const width of [1440,320]){await p.setViewportSize({width,height:960});await p.locator('.publicnav>button').click();await inspect('auth-'+width);await p.screenshot({path:`检查记录/四档字体_20261023/${width}-登录弹窗.png`});await p.keyboard.press('Escape');await p.locator('#before-start>footer button').click();await inspect('legal-'+width);await p.keyboard.press('Escape');}
await p.evaluate(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s:scenarioState('PT04')});
for(const route of ['/careers?tab=比较','/plan?tab=执行','/assistant?tab=自然语言检索']){await p.goto('http://127.0.0.1:5187'+route);const fonts=await p.locator('#main').evaluate(e=>[...new Set([...e.querySelectorAll('*')].filter(n=>!n.closest('svg')&&n.getClientRects().length&&[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())).map(n=>getComputedStyle(n).fontSize))]);assert.ok(fonts.every(f=>['12px','13px','14px','15px','16px','18px','20px','22px','24px','26px','30px','32px','36px'].includes(f)));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push({name:route,fonts});}
console.log(JSON.stringify(checks));await fs.writeFile('检查记录/四档字体_20261023/dialogs.json',JSON.stringify(checks,null,2));}finally{await b.close();}



