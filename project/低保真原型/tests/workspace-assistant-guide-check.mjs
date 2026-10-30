import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';
const dir='检查记录/工作区改进_v39/调整后';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await b.newPage(),result=[];
try{
 for(const width of [1440,1024,390]){
  await p.setViewportSize({width,height:width===390?844:1000});await p.goto('http://127.0.0.1:5184/');
  await p.evaluate(({KEY,s})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language','en');},{KEY,s:scenarioState('PT01')});await p.goto('http://127.0.0.1:5184/assistant');
  const summary=p.locator('.workspace-guide>summary');await summary.click();
  const toolbar=await p.locator('.chat-scope-summary').boundingBox(),intro=await p.locator('.empty-chat-home>div').first().boundingBox(),form=await p.locator('.chat-composer').boundingBox();
  assert.ok(intro.y>=toolbar.y+toolbar.height-1,width+' intro must be below toolbar');assert.ok(form.y>=intro.y+intro.height-1,width+' composer must be below intro');
  const input=p.locator('#assistant-question');await input.fill('Guide layout check — synthetic');await summary.click();assert.equal(await input.inputValue(),'Guide layout check — synthetic');await summary.click();await input.scrollIntoViewIfNeeded();
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:`${dir}/${width}-AI指南展开修正.png`});result.push({width,status:'pass',introBelowToolbar:true,composerBelowIntro:true,draftPreserved:true});
 }
 console.log(JSON.stringify(result));await fs.writeFile('检查记录/工作区改进_v39/AI指南检查.json',JSON.stringify(result,null,2));
}finally{await b.close();}
