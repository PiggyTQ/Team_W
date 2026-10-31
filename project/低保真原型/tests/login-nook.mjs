import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';

// Uses the installed, visible Microsoft Edge and the running local web app.
// Each case gets its own browser storage; the user's normal profile is untouched.
const base='http://127.0.0.1:5187';
const phase=process.argv.includes('--first-pass')?'first-pass':process.argv.includes('--final-pass')?'final-pass':'';
const closeFinal=process.argv.includes('--close-final');
const out=path.resolve('检查记录/登录小栖迎接窗口_20261023',phase);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:false,args:['--no-proxy-server']});
const layouts=[],checks=[],errors=[],contexts=new Set();
const initialGuide={enabled:false,neverPrompt:true,seen:['home','explore'],active:null};

async function fresh({width=1440,height=900,language='zh',route='/',onboard=true,reducedMotion='reduce',webgl=true}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion});
  contexts.add(context);
  const state=scenarioState('PT01');state.logged=false;state.onboard=onboard;
  await context.addInitScript(({KEY,state,language,guideKey,guide})=>{
    if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify(state));
    if(!localStorage.getItem('career-prototype-language'))localStorage.setItem('career-prototype-language',language);
    if(!localStorage.getItem(guideKey))localStorage.setItem(guideKey,JSON.stringify(guide));
  },{KEY,state,language,guideKey:OPERATION_GUIDE_KEY,guide:initialGuide});
  if(!webgl)await context.addInitScript(()=>{
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:getContext.call(this,kind,...args);};
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push({route:page.url(),message:error.message}));
  await page.goto(base+route,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  page.authBackgroundBefore=await page.evaluate(()=>{
    const root=document.documentElement;
    return {innerWidth,clientWidth:root.clientWidth,scrollWidth:root.scrollWidth,overflow:getComputedStyle(root).overflow,documentOverflow:root.scrollWidth-innerWidth,layoutOverflow:root.scrollWidth-root.clientWidth,problemCards:[...document.querySelectorAll('.problem-card')].map(el=>{const box=el.getBoundingClientRect();return {right:box.right,width:box.width};})};
  });
  const trigger=page.locator('.publicnav').getByRole('button',{name:/登录\s*\/\s*开始|Sign in\s*\/\s*Get started/i});
  if(route==='/')await trigger.click();
  await page.locator('.auth-dialog[open]').waitFor();
  await page.locator('.auth-page').waitFor();
  const loading=await page.locator('.auth-nook-scene').getAttribute('data-renderer')==='loading';
  if(loading){
    assert.equal(await page.locator('.nook-fallback').isVisible(),true,'loading must retain the CSS companion');
    await page.locator('#auth-email').fill('loading-check@example.com');
    assert.equal(await page.locator('#auth-email').inputValue(),'loading-check@example.com','scene loading must not block input');
    await page.locator('#auth-email').fill('');await page.locator('#auth-heading').focus();
  }
  const rendererStart=Date.now();
  await page.locator('.auth-nook-scene[data-renderer="ready"],.auth-nook-scene[data-renderer="fallback"]').waitFor({state:'attached',timeout:30000});
  page.authSceneLoading={wasLoading:loading,rendererWaitMs:Date.now()-rendererStart};
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  return {page,context,trigger};
}

async function dispose(context){await context.close();contexts.delete(context);}
const stateOf=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const guideOf=page=>page.evaluate(key=>localStorage.getItem(key),OPERATION_GUIDE_KEY);
const screenshot=(page,name)=>page.screenshot({path:path.join(out,`${name}.png`)});
const translatedBody=page=>page.locator('.auth-page').evaluate(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('.language-switch').forEach(node=>node.remove());return copy.textContent;});

async function inspect(page,name){
  const metrics=await page.evaluate(()=>{
    const dialog=document.querySelector('.auth-dialog'),box=dialog.getBoundingClientRect();
    const submit=document.querySelector('.auth-submit').getBoundingClientRect();
    const textOverflow=[],elementOverflow=[];
    const walker=document.createTreeWalker(dialog,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode,parent=node.parentElement;
      if(!node.textContent.trim()||!parent||!parent.checkVisibility()||parent.closest('svg,canvas,[aria-hidden="true"],.sr-only,style,script'))continue;
      const range=document.createRange();range.selectNodeContents(node);
      for(const r of range.getClientRects()){
        if(r.width&&r.height&&(r.left<Math.max(0,box.left)-2||r.right>Math.min(innerWidth,box.right)+2)){
          textOverflow.push({tag:parent.tagName,className:typeof parent.className==='string'?parent.className:'',text:node.textContent.trim().slice(0,65),left:r.left,right:r.right});break;
        }
      }
    }
    // Check real text containers, not the intentionally overflowing 3D art.
    for(const el of dialog.querySelectorAll('h1,h2,h3,p,label,button,summary,nav,li')){
      if(!el.checkVisibility()||el.closest('svg,canvas,[aria-hidden="true"],.auth-nook-scene'))continue;
      const style=getComputedStyle(el),rect=el.getBoundingClientRect();
      if(rect.width&&el.clientWidth>0&&el.scrollWidth>el.clientWidth+2&&style.overflowX!=='auto')elementOverflow.push({tag:el.tagName,className:typeof el.className==='string'?el.className:'',text:el.textContent.trim().slice(0,65),px:el.scrollWidth-el.clientWidth});
    }
    const sample=selector=>{const el=dialog.querySelector(selector);return el?{font:getComputedStyle(el).fontSize,lineHeight:getComputedStyle(el).lineHeight}:null;};
    const luminance=color=>{
      const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(value=>{const channel=value/255;return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4;});
      return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
    };
    const contrast=(text,background)=>{const a=luminance(text),b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
    const input=document.querySelector('#auth-email'),password=document.querySelector('#auth-password'),hint=document.querySelector('.auth-nook-caption>span');
    const placeholderColor=getComputedStyle(input,'::placeholder').color,inputBackground=getComputedStyle(input).backgroundColor;
    const hintColor=getComputedStyle(hint).color,hintBackground=getComputedStyle(document.querySelector('.auth-nook-world')).backgroundColor;
    const controlVisualChecks={placeholder:{color:placeholderColor,background:inputBackground,contrast:contrast(placeholderColor,inputBackground)},hint:{color:hintColor,background:hintBackground,contrast:contrast(hintColor,hintBackground)},nativeReveal:password?getComputedStyle(password,'::-ms-reveal').display:null,nativeClear:getComputedStyle(input,'::-ms-clear').display};
    return {url:location.pathname+location.search,width:innerWidth,height:innerHeight,zoom:getComputedStyle(document.documentElement).zoom,rootOverflow:getComputedStyle(document.documentElement).overflow,documentClientWidth:document.documentElement.clientWidth,dialog:{x:box.x,y:box.y,width:box.width,height:box.height,scrollWidth:dialog.scrollWidth,clientWidth:dialog.clientWidth,scrollHeight:dialog.scrollHeight,clientHeight:dialog.clientHeight},documentOverflow:document.documentElement.scrollWidth-innerWidth,documentLayoutOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,submit:{x:submit.x,y:submit.y,right:submit.right,bottom:submit.bottom},scene:{renderer:document.querySelector('.auth-nook-scene').dataset.renderer,pose:document.querySelector('.auth-nook-scene').dataset.pose},heading:sample('#auth-heading'),input:sample('#auth-email'),controlVisualChecks,textOverflow,elementOverflow};
  });
  metrics.backgroundBeforeOpen=page.authBackgroundBefore;
  metrics.sceneLoading=page.authSceneLoading;
  layouts.push({name,...metrics});
  await screenshot(page,name);
  // Scroll locking removes the native scrollbar. Compare against the actual
  // layout viewport (clientWidth) and retain innerWidth measurements separately.
  assert.ok(metrics.documentLayoutOverflow<=Math.max(2,metrics.backgroundBeforeOpen.layoutOverflow+2),`${name}: modal added layout overflow (before ${metrics.backgroundBeforeOpen.layoutOverflow}px, after ${metrics.documentLayoutOverflow}px)`);
  assert.equal(metrics.rootOverflow,'hidden',`${name}: background scrolling must be locked`);
  assert.ok(metrics.dialog.scrollWidth<=metrics.dialog.clientWidth+2,`${name}: dialog overflow`);
  assert.ok(metrics.dialog.x>=-1&&metrics.dialog.x+metrics.dialog.width<=metrics.width+1,`${name}: dialog exceeds viewport width`);
  assert.deepEqual(metrics.textOverflow,[],`${name}: visible text exceeds viewport`);
  assert.deepEqual(metrics.elementOverflow,[],`${name}: text container overflow`);
  assert.ok(metrics.controlVisualChecks.placeholder.contrast>=4.5,`${name}: placeholder contrast is below 4.5`);
  assert.ok(metrics.controlVisualChecks.hint.contrast>=4.5,`${name}: companion hint contrast is below 4.5`);
  // Edge exposes these native shadow pseudo-elements as the input's display
  // value even after a direct display:none!important rule. Retain that reading
  // as diagnostic data; verify the actual password control in the screenshots.
  assert.equal(metrics.zoom,'1',`${name}: browser/page zoom must remain 100%`);
  assert.ok(metrics.submit.x>=0&&metrics.submit.right<=metrics.width,`${name}: submit is horizontally clipped`);
  if(metrics.width>=1024)assert.ok(metrics.submit.y>=0&&metrics.submit.bottom<=metrics.height,`${name}: desktop submit is below screen`);
  else{
    await page.locator('.auth-submit').scrollIntoViewIfNeeded();
    const button=await page.locator('.auth-submit').boundingBox();
    assert.ok(button.y>=0&&button.y+button.height<=metrics.height,`${name}: submit cannot be reached by natural scrolling`);
    await page.locator('.auth-close').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.auth-close').isVisible(),true,`${name}: close is unreachable`);
  }
  return metrics;
}

async function check(name,run){
  const previous=new Set(contexts);
  try{await run();checks.push({name,status:'pass'});console.log('PASS',name);}
  catch(error){checks.push({name,status:'fail',error:error.stack});console.error('FAIL',name,error.message);for(const context of contexts)if(!previous.has(context))for(const page of context.pages())await screenshot(page,`failure-${checks.length}`).catch(()=>{});}
  finally{for(const context of [...contexts])if(!previous.has(context))await dispose(context);}
}

try{
  if(closeFinal){
    for(const language of ['zh','en'])for(const width of [320,390]){
      await check(`手机关闭补验 ${width} ${language}`,async()=>{
        const {page}=await fresh({width,height:844,language});
        await inspect(page,`close-final-${width}-${language}`);
        if(width===390&&language==='zh'){
          await page.locator('.auth-nook-copy').click();
          await screenshot(page,'show-mobile');
        }
        await page.locator('.auth-demo-details summary').click();
        await page.locator('.auth-demo-details').evaluate(el=>el.scrollIntoView({block:'end'}));
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const geometry=await page.locator('.auth-close').boundingBox();
        assert.ok(geometry.width>=44&&geometry.height>=44,'close target must remain at least 44px');
        assert.ok(geometry.y>=0&&geometry.y+geometry.height<=844,'sticky close must remain visible at the bottom');
        assert.equal(await page.locator('.auth-close').evaluate(el=>{const box=el.getBoundingClientRect();return el.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));}),true,'sticky close target must remain clickable');
        layouts[layouts.length-1].stickyClose=geometry;
        await screenshot(page,`close-final-${width}-${language}-scroll-bottom`);
        await page.locator('.auth-close').click();await page.locator('.auth-dialog').waitFor({state:'detached'});
        assert.equal(new URL(page.url()).pathname,'/');
        assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');
      });
    }
    const {page,context}=await fresh();
    await page.locator('.auth-nook-copy').click();
    await screenshot(page,'show-desktop');
    await dispose(context);
  }else{
  const sizes=[[1440,900],[1366,768],[1280,650],[1024,768],[820,1180],[390,844],[320,740]];
  for(const language of ['zh','en'])for(const [width,height]of sizes){
    await check(`布局 ${width}×${height} ${language} 登录`,async()=>{
      const {page}=await fresh({width,height,language});
      assert.equal(new URL(page.url()).pathname,'/','homepage modal must keep its original URL');
      assert.equal(await page.locator('.auth-dialog').getAttribute('aria-labelledby'),'auth-heading');
      await inspect(page,`after-login-${width}-${language}`);
      if(width===320&&language==='en'){
        await page.locator('.auth-demo-details summary').click();
        await page.locator('.auth-demo-details').evaluate(el=>el.scrollIntoView({block:'end'}));
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const close=await page.locator('.auth-close').boundingBox();
        assert.ok(close.y>=0&&close.y+close.height<=height,'sticky close must remain visible at the bottom');
        assert.ok(close.width>=44&&close.height>=44,'close target must remain at least 44px');
        assert.equal(await page.locator('.auth-close').evaluate(el=>{const box=el.getBoundingClientRect();return el.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));}),true,'sticky close target must remain clickable');
        await screenshot(page,'after-login-320-en-scroll-bottom');
      }
      if(language==='en')assert.ok(!/[\u3400-\u9fff]/.test(await translatedBody(page)),'English auth contains untranslated Chinese');
      if(width<761)assert.ok(Number.parseFloat(await page.locator('#auth-email').evaluate(el=>getComputedStyle(el).fontSize))>=16,'phone input must avoid automatic text zoom');
    });
  }
  await check('布局 1280×650 中文注册',async()=>{
    const {page}=await fresh({width:1280,height:650});
    await page.locator('.auth-modes button').nth(1).click();
    assert.equal(await page.locator('.auth-page').getAttribute('data-mode'),'register');
    await inspect(page,'after-register-1280-zh');
  });
  await check('布局 320×740 英文找回',async()=>{
    const {page}=await fresh({width:320,height:740,language:'en'});
    await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
    assert.equal(await page.locator('.auth-page').getAttribute('data-mode'),'recovery');
    await inspect(page,'after-recovery-320-en');
    assert.ok(!/[\u3400-\u9fff]/.test(await translatedBody(page)));
  });

  await check('原生邮箱及模拟密码校验阻止空值和短密码',async()=>{
    const {page}=await fresh();
    await page.locator('.auth-submit').click();
    assert.equal(await page.locator('#auth-email').evaluate(el=>el.validity.valueMissing),true);
    await page.locator('#auth-email').fill('invalid-email');
    await page.locator('.auth-submit').click();
    assert.equal(await page.locator('#auth-email').evaluate(el=>el.validity.typeMismatch),true);
    await page.locator('#auth-email').fill('native-validation@example.com');
    await page.locator('#auth-password').fill('abc');
    await page.locator('.auth-submit').click();
    assert.equal(await page.locator('#auth-password').evaluate(el=>el.validity.tooShort),true);
    assert.equal((await stateOf(page)).logged,false);
    assert.equal(await page.locator('.auth-dialog[open]').count(),1);
  });
  await check('邮箱反馈、密码遮眼及显示密码时继续遮眼',async()=>{
    const {page}=await fresh({reducedMotion:'no-preference'});
    await page.locator('#auth-email').fill('hello@example.com');
    assert.equal(await page.locator('.auth-page').getAttribute('data-focus'),'email');
    await page.locator('#auth-password').fill('made-up-pass');
    assert.equal(await page.locator('.auth-page').getAttribute('data-secret'),'true');
    await page.locator('.auth-nook-scene[data-pose="covered"]').waitFor({state:'attached'});
    await page.waitForTimeout(400);
    await screenshot(page,'after-password-input');
    await page.getByRole('button',{name:'显示密码',exact:true}).click();
    assert.equal(await page.locator('#auth-password').getAttribute('type'),'text');
    assert.equal(await page.locator('.auth-page').getAttribute('data-secret'),'true');
    await page.locator('.auth-nook-scene[data-pose="covered"]').waitFor({state:'attached'});
    // Capture the end of the intentional paw transition, not its first frame.
    await page.waitForTimeout(400);
    await screenshot(page,'after-password-covered');
    await page.getByRole('button',{name:'隐藏密码',exact:true}).click();
    assert.equal(await page.locator('#auth-password').getAttribute('type'),'password');
  });
  await check('点击和键盘可以向小栖打招呼',async()=>{
    const {page}=await fresh({reducedMotion:'no-preference'}),scene=page.locator('.auth-nook-scene');
    assert.equal(await scene.evaluate(el=>el.tagName),'BUTTON');
    await scene.click();await page.locator('.auth-nook-scene[data-pose="greeting"]').waitFor({state:'attached'});
    await screenshot(page,'after-greeting');
    await scene.focus();await scene.press('Enter');
    await page.locator('.auth-nook-scene[data-pose="greeting"]').waitFor({state:'attached'});
    assert.equal(await scene.evaluate(el=>document.activeElement===el),true);
  });
  await check('模式切换保留邮箱、重置可见密码并聚焦标题',async()=>{
    const {page}=await fresh();
    await page.locator('#auth-email').fill('modes@example.com');
    await page.locator('#auth-password').fill('mode-pass');
    await page.getByRole('button',{name:'显示密码',exact:true}).click();
    await page.locator('.auth-modes button').nth(1).click();
    assert.equal(await page.locator('#auth-email').inputValue(),'modes@example.com');
    assert.equal(await page.locator('#auth-password').getAttribute('type'),'password');
    assert.equal(await page.locator('#auth-heading').evaluate(el=>document.activeElement===el),true);
    await page.getByRole('button',{name:'忘记密码？',exact:true}).click();
    assert.equal(await page.locator('#auth-email').inputValue(),'modes@example.com');
    assert.equal(await page.locator('#auth-password').count(),0);
    await page.locator('.auth-modes button').first().click();
    assert.equal(await page.locator('#auth-email').inputValue(),'modes@example.com');
  });
  await check('注册必须本人勾选说明、成功后恢复入口',async()=>{
    const {page}=await fresh();
    await page.locator('.auth-modes button').nth(1).click();
    await page.locator('#auth-email').fill('signup@example.com');
    await page.locator('#auth-password').fill('signup-demo-pass');
    await page.locator('.auth-submit').click();
    await page.locator('.auth-error[role="alert"]').waitFor();
    assert.equal((await stateOf(page)).logged,false);
    assert.equal(await page.locator('.auth-agree input').isChecked(),false);
    await screenshot(page,'after-register-validation');
    await page.locator('.auth-agree input').check();
    await page.locator('.auth-submit').click();
    await page.locator('.auth-dialog').waitFor({state:'detached'});
    assert.equal(new URL(page.url()).pathname,'/app');
    assert.equal((await stateOf(page)).logged,true);
  });
  await check('找回仅提供模拟回执、不登录也不修改引导',async()=>{
    const {page}=await fresh(),before=await guideOf(page);
    await page.getByRole('button',{name:'忘记密码？',exact:true}).click();
    await page.locator('#auth-email').fill('recover@example.com');
    await page.locator('.auth-submit').click();
    await page.locator('.auth-feedback[role="status"]').waitFor();
    assert.match(await page.locator('.auth-feedback').innerText(),/没有发送邮件/);
    assert.equal((await stateOf(page)).logged,false);
    assert.equal(await guideOf(page),before);
    await screenshot(page,'after-recovery-feedback');
  });
  await check('模拟失败保留输入和引导，重试可进入工作区',async()=>{
    const {page}=await fresh(),before=await guideOf(page);
    await page.locator('#auth-email').fill('retry@example.com');
    await page.locator('#auth-password').fill('retry-made-up-pass');
    await page.locator('.auth-demo-details summary').click();
    await page.getByRole('button',{name:'模拟认证失败',exact:true}).click();
    await page.locator('.auth-error').waitFor();
    assert.equal(await page.locator('#auth-email').inputValue(),'retry@example.com');
    assert.equal(await page.locator('#auth-password').inputValue(),'retry-made-up-pass');
    assert.equal((await stateOf(page)).logged,false);
    assert.equal(await guideOf(page),before);
    await screenshot(page,'after-auth-failure');
    await page.locator('.auth-submit').click();
    await page.locator('.auth-dialog').waitFor({state:'detached'});
    assert.equal(new URL(page.url()).pathname,'/app');
    assert.equal((await stateOf(page)).logged,true);
    const guide=JSON.parse(await guideOf(page));
    assert.deepEqual(guide.seen,[]);assert.equal(guide.neverPrompt,true);assert.equal(guide.enabled,false);
  });
  await check('请求的职业详情路径和查询参数在登录后恢复',async()=>{
    const route='/careers?career=frontend', {page}=await fresh({route});
    await page.locator('#auth-email').fill('intent@example.com');
    await page.locator('#auth-password').fill('intent-made-up-pass');
    await page.locator('.auth-submit').click();
    await page.locator('.auth-dialog').waitFor({state:'detached'});
    assert.equal(new URL(page.url()).pathname+new URL(page.url()).search,route);
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('intent')),route);
  });
  await check('首次登录先设置，跳过设置后仍恢复原入口',async()=>{
    const route='/careers?career=data', {page}=await fresh({route,onboard:false});
    await page.locator('#auth-email').fill('onboard@example.com');
    await page.locator('#auth-password').fill('onboard-made-up-pass');
    await page.locator('.auth-submit').click();
    await page.waitForURL(base+'/onboarding');
    assert.equal((await stateOf(page)).onboard,false);
    await page.getByRole('button',{name:'跳过全部，继续探索',exact:true}).click();
    await page.waitForURL(base+route);
    assert.equal((await stateOf(page)).onboard,true);
  });
  await check('Escape关闭后恢复首页按钮焦点、滚动及未登录状态',async()=>{
    const {page,trigger}=await fresh(),before=await guideOf(page);
    assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'hidden');
    // Native dialog must retain keyboard focus while it is open.
    for(let n=0;n<3;n++)await page.keyboard.press('Tab');
    assert.equal(await page.locator('.auth-dialog').evaluate(el=>el.contains(document.activeElement)),true);
    await page.keyboard.press('Escape');await page.locator('.auth-dialog').waitFor({state:'detached'});
    assert.equal(new URL(page.url()).pathname,'/');
    assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');
    assert.equal(await trigger.evaluate(el=>document.activeElement===el),true);
    assert.equal((await stateOf(page)).logged,false);assert.equal(await guideOf(page),before);
  });
  await check('减少动态模式仍能遮眼、打招呼、取消且不保存密码',async()=>{
    const {page}=await fresh({reducedMotion:'reduce'});
    const password='DO-NOT-PERSIST-login-nook-20261023';
    await page.locator('#auth-email').fill('privacy@example.com');
    await page.locator('#auth-password').fill(password);
    await page.locator('.auth-nook-scene[data-pose="covered"]').waitFor({state:'attached'});
    await screenshot(page,'after-reduced-motion-covered');
    await page.locator('#auth-heading').click();
    await page.locator('.auth-nook-scene').click();
    await page.locator('.auth-nook-scene[data-pose="greeting"]').waitFor({state:'attached'});
    await page.locator('.auth-close').click();await page.locator('.auth-dialog').waitFor({state:'detached'});
    const contents=await page.evaluate(()=>JSON.stringify({...localStorage})+JSON.stringify({...sessionStorage}));
    assert.ok(!contents.includes(password),'password leaked to browser storage');
  });
  await check('WebGL不可用时猫回退仍有遮眼、招呼和登录操作',async()=>{
    const {page}=await fresh({webgl:false});
    await page.locator('.auth-nook-scene[data-renderer="fallback"]').waitFor({state:'attached'});
    await page.locator('#auth-email').fill('fallback@example.com');
    await page.locator('#auth-password').fill('fallback-demo-pass');
    await page.locator('.auth-nook-scene[data-pose="covered"]').waitFor({state:'attached'});
    await screenshot(page,'after-fallback-covered');
    await page.locator('#auth-heading').click();
    await page.locator('.auth-nook-scene').click();
    await page.locator('.auth-nook-scene[data-pose="greeting"]').waitFor({state:'attached'});
    await page.locator('.auth-submit').click();
    await page.locator('.auth-dialog').waitFor({state:'detached'});
    assert.equal((await stateOf(page)).logged,true);
  });
  await check('认证恢复链接保留待恢复入口，取消返回公开首页',async()=>{
    const route='/careers?career=frontend', {page}=await fresh({route});
    await page.locator('.auth-demo-details summary').click();
    await page.getByRole('button',{name:'认证恢复地址',exact:true}).click();
    await page.waitForURL(base+'/auth');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('intent')),route);
    await page.locator('.auth-close').click();await page.locator('.auth-dialog').waitFor({state:'detached'});
    assert.equal(new URL(page.url()).pathname,'/');assert.equal((await stateOf(page)).logged,false);
  });
  }
  console.log(JSON.stringify({browser:browser.version(),base,layouts:layouts.length,checks:checks.length,failed:checks.filter(check=>check.status==='fail'),errors},null,2));
}finally{
  await fs.writeFile(path.join(out,closeFinal?'close-final-results.json':'verification.json'),JSON.stringify({browser:browser.version(),base,layouts,checks,errors},null,2));
  for(const context of [...contexts])await dispose(context);
  await browser.close();
}
if(checks.some(check=>check.status==='fail')||errors.length)process.exitCode=1;
