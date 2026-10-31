import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {KEY,scenarioState} from '../src/model.js';import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';
const root='检查记录/登录引导_v53',base='http://127.0.0.1:5184';await fs.mkdir(root,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']}),p=await b.newPage({viewport:{width:1440,height:1000}}),results=[],errors=[];p.setDefaultTimeout(6500);p.on('pageerror',e=>errors.push(e.message));
const guide=()=>p.locator('.operation-guide'),stored=()=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),OPERATION_GUIDE_KEY);
async function seed(value={active:null,seen:['home','explore'],enabled:false}){await p.goto(base);const s=scenarioState('PT01');s.logged=false;s.onboard=true;await p.evaluate(({KEY,s,OPERATION_GUIDE_KEY,value})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem(OPERATION_GUIDE_KEY,JSON.stringify(value));localStorage.setItem('career-prototype-guidance-v1','{"auto":true}');localStorage.setItem('career-prototype-language','zh');},{KEY,s,OPERATION_GUIDE_KEY,value});await p.goto(base);}
async function login(){await p.getByRole('button',{name:'登录 / 开始',exact:true}).click();await p.getByLabel('示例邮箱',{exact:true}).fill('guide-session@example.com');await p.getByLabel('模拟密码',{exact:true}).fill('demo-pass');await p.getByRole('button',{name:'模拟登录并恢复入口',exact:true}).click();await p.locator('.home-hub').waitFor();}
async function logout(){if(await guide().count())await guide().getByRole('button',{name:'暂停操作引导'}).click();await p.locator('.workspace-utilities>summary').click();await p.getByRole('button',{name:'退出',exact:true}).click();await p.locator('dialog[open]').getByRole('button',{name:'确认操作',exact:true}).click();await p.getByRole('button',{name:'登录 / 开始',exact:true}).waitFor();}
async function at(id){await p.locator('.operation-guide[data-step="'+id+'"]').waitFor();}
async function noAuto(){await p.waitForTimeout(450);assert.equal(await guide().count(),0);}
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message.slice(0,650));await p.screenshot({path:root+'/失败-'+results.length+'.png'});}}
try{
 await check('旧跳过在成功登录后恢复引导，暂停与跳过只影响当次登录',async()=>{
  await seed();await login();await at('home.start');assert.deepEqual((await stored()).seen,[]);assert.equal((await stored()).enabled,true);
  await guide().getByRole('button',{name:'暂停操作引导'}).click();await p.reload();await noAuto();assert.equal((await stored()).active.paused,true);
  await logout();await login();await at('home.start');await guide().getByRole('button',{name:'跳过引导'}).click();assert.equal((await stored()).enabled,false);assert.equal((await stored()).neverPrompt,false);await p.goto(base+'/careers');await noAuto();
  await logout();await login();await at('home.start');assert.equal((await stored()).enabled,true);
 });
 await check('显式不再提示跨退出登录及刷新保留，手动重播仍可用并可取消该偏好',async()=>{
  await seed();await login();await at('home.start');await guide().getByLabel('不再提示',{exact:true}).click();await noAuto();assert.equal((await stored()).neverPrompt,true);await logout();await login();await noAuto();await p.reload();await noAuto();assert.equal((await stored()).enabled,false);
  await p.getByRole('button',{name:'开始本页操作引导'}).click();await at('home.start');assert.equal(await guide().getByLabel('不再提示',{exact:true}).isChecked(),true);await guide().getByLabel('不再提示',{exact:true}).uncheck();assert.equal((await stored()).enabled,true);assert.equal((await stored()).neverPrompt,false);await logout();await login();await at('home.start');
 });
 await check('已完成引导每次登录重新开始，刷新保留当前真实步骤且不改业务材料',async()=>{
  await seed();await login();await at('home.start');const before=await p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);await p.locator('.home-compare').getByRole('checkbox',{name:'数据分析',exact:true}).check();await p.locator('.home-compare').getByRole('checkbox',{name:'人工智能',exact:true}).check();await at('home.compare');await p.locator('[data-operation-guide-target="home.compare"]').click();await at('explore.save');assert.ok((await stored()).seen.includes('home'));await p.reload();await at('explore.save');assert.equal((await stored()).active.index,5);
  await logout();await login();await at('home.compare');assert.deepEqual((await stored()).seen,[]);const after=await p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);for(const key of ['claims','tasks','goal','reports','resumes'])assert.deepEqual(after[key],before[key]);
 });
 await check('认证失败与取消不会重置引导进度或长期选择',async()=>{
  await logout();const before=await stored();await p.getByRole('button',{name:'登录 / 开始',exact:true}).click();await p.locator('.auth-demo-details summary').click();await p.getByRole('button',{name:'模拟认证失败',exact:true}).click();await p.getByRole('alert').waitFor();assert.deepEqual(await stored(),before);await p.getByRole('button',{name:'取消认证，回公开首页',exact:true}).click();assert.deepEqual(await stored(),before);
 });
 await check('手机与英文偏好控件可操作，提示未超出视口',async()=>{
  await seed();await p.setViewportSize({width:390,height:844});await login();await at('home.start');await p.getByRole('button',{name:'Use English',exact:true}).click();const checkbox=guide().getByRole('checkbox',{name:'Do not show again',exact:true});await checkbox.waitFor();assert.ok(!/[\u3400-\u9fff]/.test(await guide().innerText()));const r=await guide().boundingBox();assert.ok(r.x>=15&&r.x+r.width<=375&&r.y>=15&&r.y+r.height<=829);await p.screenshot({path:root+'/390-英文登录引导.png'});await checkbox.click();assert.equal((await stored()).neverPrompt,true);
 });
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});await fs.writeFile(root+'/登录行为验证.json',JSON.stringify(results,null,2));
}finally{await b.close();}if(results.some(r=>r.status==='fail'))process.exitCode=1;
