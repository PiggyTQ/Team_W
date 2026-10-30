import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const results=[],errors=[],base='http://127.0.0.1:5184';
page.on('pageerror',error=>errors.push(error.message));
try{
  await page.goto(base);
  await page.evaluate(({KEY,s,OPERATION_GUIDE_KEY})=>{
    localStorage.setItem(KEY,JSON.stringify(s));
    localStorage.setItem(OPERATION_GUIDE_KEY,JSON.stringify({enabled:true,seen:[],active:null}));
    localStorage.setItem('career-prototype-language','zh');
  },{KEY,s:scenarioState('PT01'),OPERATION_GUIDE_KEY});
  await page.goto(base+'/careers');
  await page.locator('.operation-guide[data-step="explore.open"]').waitFor();
  await page.locator('.operation-guide').getByRole('button',{name:'跳过引导'}).click();
  await page.goto(base+'/learning');
  await page.locator('.page-surface').waitFor();
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.operation-guide').count(),0);
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).enabled,OPERATION_GUIDE_KEY),false);
  await page.getByRole('button',{name:'开始本页操作引导'}).click();
  await page.locator('.operation-guide[data-step="learning.preview"]').waitFor();
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).enabled,OPERATION_GUIDE_KEY),false);
  results.push({name:'跳过停止后续页面自动提示，手动重播仍可用且不重新开启自动提示',status:'pass'});
}catch(error){results.push({name:'跳过与手动重播',status:'fail',error:error.message});process.exitCode=1;}
finally{
  results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
  await fs.writeFile('检查记录/功能按键逐步引导_v51/跳过与重播.json',JSON.stringify(results,null,2));
  await browser.close();
}
if(errors.length)process.exitCode=1;
console.log(JSON.stringify(results));
