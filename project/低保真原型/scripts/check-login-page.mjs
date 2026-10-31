import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';

const base='http://127.0.0.1:5184';
const out=path.resolve('检查记录/登录同质3D场景_20261023');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const results=[],errors=[];
async function freshPage({width=1440,height=900,language='zh',reducedMotion='no-preference',webgl=true}={}){
  const context=await browser.newContext({viewport:{width,height},reducedMotion});
  const state=scenarioState('PT01');state.logged=false;state.onboard=true;
  await context.addInitScript(({KEY,state,language})=>{
    if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify(state));
    if(!localStorage.getItem('career-prototype-language'))localStorage.setItem('career-prototype-language',language);
  },{KEY,state,language});
  if(!webgl)await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/.test(kind)?null:original.call(this,kind,...args);};});
  const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/auth');await page.locator('.auth-page').waitFor();
  if(webgl){await page.locator('.auth-scene[data-renderer=ready] canvas').waitFor();await page.waitForTimeout(450);}else{await page.locator('.auth-scene[data-renderer=fallback] img').waitFor();await page.locator('.auth-scene-poster').evaluate(image=>image.decode());}
  return {page,context};
}
async function test(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL',name,error.message);}}
try{
  await test('中英五种尺寸：3D加载、表单可达、无横向溢出',async()=>{
    for(const config of [{width:1440,height:900},{width:1280,height:720},{width:820,height:1180},{width:390,height:844},{width:320,height:740,language:'en'}]){
      const {page,context}=await freshPage(config);
      await page.locator('.auth-heading-dot').click();
      const geometry=await page.evaluate(()=>{
        const dialog=document.querySelector('.auth-dialog'),submit=document.querySelector('.auth-submit');
        const d=dialog.getBoundingClientRect(),s=submit.getBoundingClientRect();
        return {innerWidth,innerHeight,dialogWidth:d.width,scrollWidth:dialog.scrollWidth,clientWidth:dialog.clientWidth,submit:{x:s.x,y:s.y,right:s.right,bottom:s.bottom},art:document.querySelector('.auth-scene canvas').width,pose:document.querySelector('.auth-scene').dataset.pose};
      });
      assert.ok(geometry.scrollWidth<=geometry.clientWidth+1,JSON.stringify(geometry));assert.ok(geometry.submit.right<=geometry.innerWidth);assert.ok(geometry.art>0);
      assert.equal(geometry.pose,'open','The scene stays idle until a greeting is requested');
      if(config.width>=760)assert.ok(geometry.submit.bottom<=config.height,JSON.stringify(geometry));
      if(config.language==='en')assert.ok(!/[\u3400-\u9fff]/.test((await page.locator('.auth-world').innerText())+(await page.locator('.auth-form-region').innerText())));
      await page.screenshot({path:path.join(out,`${config.width}-${config.language||'zh'}.png`)});
      if(config.width===1440)await page.locator('.auth-scene').screenshot({path:path.resolve('public/login-scene-poster.png')});
      if(config.width<760){await page.locator('.auth-demo-details summary').scrollIntoViewIfNeeded();await page.locator('.auth-demo-details summary').click();await page.locator('.auth-demo-details').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`${config.width}-${config.language||'zh'}-bottom.png`)});}
      results.push({viewport:config,geometry});await context.close();
    }
  });
  await test('邮箱注视、密码遮眼、显示切换与打招呼',async()=>{
    const {page,context}=await freshPage();
    await page.getByLabel('示例邮箱',{exact:true}).fill('explorer@example.com');
    assert.equal(await page.locator('.auth-page').getAttribute('data-focus'),'email');
    await page.getByLabel('模拟密码',{exact:true}).fill('demo-pass');
    assert.equal(await page.locator('.auth-page').getAttribute('data-secret'),'true');
    assert.match(await page.locator('.auth-speech').innerText(),/不看/);
    await page.getByRole('button',{name:'显示密码',exact:true}).click();
    assert.equal(await page.getByLabel('模拟密码',{exact:true}).getAttribute('type'),'text');
    assert.equal(await page.locator('.auth-page').getAttribute('data-secret'),'true');
    await page.locator('.auth-scene[data-pose=covered]').waitFor();
    await page.locator('.auth-scene').screenshot({path:path.resolve('public/login-scene-private.png')});
    await page.screenshot({path:path.join(out,'1440-密码遮眼.png'),fullPage:true});
    await page.getByRole('button',{name:'隐藏密码',exact:true}).click();
    await page.getByRole('button',{name:'和探索伙伴打个招呼',exact:true}).click();
    assert.match(await page.locator('.auth-speech').innerText(),/嗨/);await context.close();
  });
  await test('失败保留输入和引导状态，重试登录恢复请求路径',async()=>{
    const {page,context}=await freshPage();
    await page.getByLabel('示例邮箱',{exact:true}).fill('retry@example.com');
    await page.getByLabel('模拟密码',{exact:true}).fill('demo-pass');
    const previous=await page.evaluate(key=>localStorage.getItem(key),OPERATION_GUIDE_KEY);
    await page.locator('.auth-demo-details summary').click();
    await page.getByRole('button',{name:'模拟认证失败',exact:true}).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByLabel('示例邮箱',{exact:true}).inputValue(),'retry@example.com');
    assert.equal(await page.getByLabel('模拟密码',{exact:true}).inputValue(),'demo-pass');
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),OPERATION_GUIDE_KEY),previous);
    await page.getByRole('button',{name:'模拟登录并恢复入口',exact:true}).click();
    await page.locator('.home-hub').waitFor();assert.equal(new URL(page.url()).pathname,'/app');
    const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);assert.equal(stored.logged,true);
    await context.close();
    const target=await freshPage();await target.page.goto(base+'/careers?career=frontend');await target.page.getByLabel('示例邮箱',{exact:true}).fill('intent@example.com');await target.page.getByLabel('模拟密码',{exact:true}).fill('demo-pass');await target.page.getByRole('button',{name:'模拟登录并恢复入口',exact:true}).click();await target.page.locator('.auth-dialog').waitFor({state:'detached'});assert.equal(new URL(target.page.url()).search,'?career=frontend');await target.context.close();
  });
  await test('注册同意校验、模式切换保留邮箱、找回不建立会话',async()=>{
    const {page,context}=await freshPage();
    await page.getByLabel('示例邮箱',{exact:true}).fill('new@example.com');
    await page.getByRole('button',{name:'注册',exact:true}).click();assert.equal(await page.getByLabel('示例邮箱',{exact:true}).inputValue(),'new@example.com');
    await page.getByLabel('模拟密码',{exact:true}).fill('demo-pass');
    await page.getByRole('button',{name:'模拟注册并恢复入口',exact:true}).click();await page.getByRole('alert').waitFor();
    assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)).logged,false);
    await page.getByRole('button',{name:'忘记密码？',exact:true}).click();await page.getByRole('button',{name:'模拟找回（不发邮件）',exact:true}).click();
    await page.locator('.auth-feedback').waitFor({state:'visible'});assert.match(await page.locator('.auth-feedback').innerText(),/没有发送邮件/);assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)).logged,false);
    await page.screenshot({path:path.join(out,'1440-找回结果.png')});
    await page.getByRole('button',{name:'注册',exact:true}).click();await page.getByLabel('模拟密码',{exact:true}).fill('demo-pass');await page.getByLabel('我已阅读并同意原型使用说明',{exact:true}).check();await page.getByRole('button',{name:'模拟注册并恢复入口',exact:true}).click();await page.locator('.home-hub').waitFor();await context.close();
  });
  await test('Esc退出恢复首页，已登录直达auth仍可展示',async()=>{
    const {page,context}=await freshPage();await page.keyboard.press('Escape');await page.locator('.auth-dialog').waitFor({state:'detached'});assert.equal(new URL(page.url()).pathname,'/');
    await page.goto(base+'/auth');await page.getByLabel('示例邮箱',{exact:true}).fill('session@example.com');await page.getByLabel('模拟密码',{exact:true}).fill('demo-pass');await page.getByRole('button',{name:'模拟登录并恢复入口',exact:true}).click();await page.locator('.home-hub').waitFor();await page.goto(base+'/auth');await page.locator('.auth-page').waitFor();await page.keyboard.press('Escape');assert.equal(new URL(page.url()).pathname,'/');await context.close();
  });
  await test('减少动态效果保留遮眼反馈，取消时不保存密码',async()=>{
    const {page,context}=await freshPage({reducedMotion:'reduce'});await page.getByLabel('模拟密码',{exact:true}).fill('never-store-this-password');
    assert.equal(await page.locator('.auth-page').getAttribute('data-secret'),'true');await page.locator('.auth-scene[data-pose=covered]').waitFor();await page.screenshot({path:path.join(out,'1440-减少动态遮眼.png')});
    await page.getByRole('button',{name:'取消认证，回公开首页',exact:true}).click();
    const contents=await page.evaluate(()=>JSON.stringify({...localStorage})+JSON.stringify({...sessionStorage}));assert.ok(!contents.includes('never-store-this-password'));await context.close();
  });
  await test('无WebGL以同场景实拍回退，密码状态切换遮眼图',async()=>{
    const {page,context}=await freshPage({webgl:false});assert.match(await page.locator('.auth-scene-poster').getAttribute('src'),/poster/);
    await page.getByLabel('模拟密码',{exact:true}).fill('fallback-pass');assert.match(await page.locator('.auth-scene-poster').getAttribute('src'),/private/);
    await page.locator('.auth-scene-poster').evaluate(image=>image.decode());await page.screenshot({path:path.join(out,'1440-无WebGL遮眼回退.png')});await context.close();
  });
  assert.deepEqual(errors,[]);results.push({name:'运行时错误',status:'pass',errors});
}finally{await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(results,null,2));await browser.close();}
if(results.some(result=>result.status==='fail'))process.exitCode=1;
