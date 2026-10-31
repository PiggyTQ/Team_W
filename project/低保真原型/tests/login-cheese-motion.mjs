import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {inflateSync} from 'node:zlib';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';

// Run against the existing dev server. Every case uses a fresh, isolated
// browser context; this script never opens or changes the user's browser profile.
const base=process.env.CHEESE_PREVIEW_URL||'http://127.0.0.1:5187';
const out=path.resolve('检查记录/芝识分子登录动作_20261025/motion-verification');
const only=process.argv.find(value=>value.startsWith('--only='))?.slice(7);
const checks=[],errors=[],evidence=[],contexts=new Set();
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
const initialGuide={enabled:false,neverPrompt:true,seen:['home','explore'],active:null};
const host='.auth-nook-canvas',scene='.auth-nook-scene';
const results={browser:browser.version(),base,isolatedContexts:true,checks,errors,evidence};

// Decode the actual browser pixels, rather than comparing compressed PNG bytes
// or accepting an animation solely because a data attribute changed.
function pixels(png){
  assert.equal(png.subarray(1,4).toString(),'PNG');
  let width,height,channels;const parts=[];
  for(let cursor=8;cursor<png.length;){
    const length=png.readUInt32BE(cursor),type=png.subarray(cursor+4,cursor+8).toString(),data=png.subarray(cursor+8,cursor+8+length);
    if(type==='IHDR'){
      width=data.readUInt32BE(0);height=data.readUInt32BE(4);
      assert.equal(data[8],8,'screenshot must have eight-bit channels');
      channels=data[9]===6?4:data[9]===2?3:0;
      assert.ok(channels,'screenshot must be RGB or RGBA');assert.equal(data[12],0,'interlaced PNG is unsupported');
    }
    if(type==='IDAT')parts.push(data);
    cursor+=length+12;
  }
  const raw=inflateSync(Buffer.concat(parts)),stride=width*channels,data=Buffer.alloc(stride*height);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)];
    for(let x=0;x<stride;x++){
      const left=x>=channels?data[y*stride+x-channels]:0,up=y?data[(y-1)*stride+x]:0,upperLeft=y&&x>=channels?data[(y-1)*stride+x-channels]:0;
      const prediction=filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):filter===4?paeth(left,up,upperLeft):NaN;
      assert.ok(Number.isFinite(prediction),'unknown PNG filter');
      data[y*stride+x]=(raw[y*(stride+1)+1+x]+prediction)&255;
    }
  }
  return {width,height,channels,data};
}
function difference(a,b){
  const A=pixels(a),B=pixels(b);assert.equal(A.width,B.width);assert.equal(A.height,B.height);
  let changed=0,total=0,minX=A.width,minY=A.height,maxX=-1,maxY=-1;
  for(let y=0;y<A.height;y++)for(let x=0;x<A.width;x++){
    const i=(y*A.width+x)*A.channels,j=(y*B.width+x)*B.channels;
    const delta=Math.max(...[0,1,2].map(c=>Math.abs(A.data[i+c]-B.data[j+c])));total+=delta;
    if(delta>18){changed++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  }
  return {width:A.width,height:A.height,changedPixels:changed,fraction:changed/(A.width*A.height),meanDelta:total/(A.width*A.height),bounds:changed?{minX,minY,maxX,maxY}:null};
}
async function capture(page,name,{full=false}={}){
  const png=await(full?page:page.locator(scene)).screenshot({path:path.join(out,`${name}.png`)});
  return png;
}
async function data(page){return page.locator(host).evaluate(el=>({...el.dataset,poseSnapshot:el.dataset.poseSnapshot?JSON.parse(el.dataset.poseSnapshot):null}));}
async function waitState(page,state,timeout=8000){
  await page.waitForFunction(({host,state})=>document.querySelector(host)?.dataset.motionState===state,{host,state},{timeout});
  return data(page);
}
async function waitValue(page,key,predicate,timeout=5000){
  const start=Date.now();
  while(Date.now()-start<timeout){const current=await data(page);if(predicate(Number(current[key]),current))return current;await page.waitForTimeout(40);}
  throw new Error(`Timed out waiting for ${key}: ${JSON.stringify(await data(page))}`);
}
async function fresh({width=1280,height=720,language='zh',reducedMotion='no-preference',webgl=true,home=false}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion});contexts.add(context);
  const state=scenarioState('PT01');state.logged=false;state.onboard=true;
  await context.addInitScript(({KEY,state,language,guideKey,guide})=>{
    localStorage.setItem(KEY,JSON.stringify(state));
    localStorage.setItem('career-prototype-language',language);
    localStorage.setItem(guideKey,JSON.stringify(guide));
  },{KEY,state,language,guideKey:OPERATION_GUIDE_KEY,guide:initialGuide});
  if(!webgl)await context.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:original.call(this,kind,...args);};
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push({url:page.url(),message:error.message}));
  await page.goto(base+(home?'/':'/auth'),{waitUntil:'networkidle'});
  let trigger;
  if(home){trigger=page.locator('.publicnav').getByRole('button',{name:/登录\s*\/\s*开始|Sign in\s*\/\s*Get started/i});await trigger.click();}
  await page.locator('.auth-dialog[open]').waitFor();
  await page.locator(`${scene}[data-renderer="${webgl?'ready':'fallback'}"]`).waitFor({timeout:45000});
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  return {page,context,trigger};
}
async function dispose(context){await context.close();contexts.delete(context);}
async function check(name,run){
  if(only&&!name.includes(only))return;
  const previous=new Set(contexts),start=Date.now();
  try{await run();checks.push({name,status:'pass',durationMs:Date.now()-start});console.log('PASS',name);}
  catch(error){
    checks.push({name,status:'fail',durationMs:Date.now()-start,error:error.stack});console.error('FAIL',name,error.message);
    for(const context of contexts)if(!previous.has(context))for(const page of context.pages()){
      await page.screenshot({path:path.join(out,`failure-${checks.length}.png`)}).catch(()=>{});
      evidence.push({name:`failure-${name}`,data:await data(page).catch(()=>null),focus:await page.evaluate(()=>({tag:document.activeElement?.tagName,className:document.activeElement?.className,label:document.activeElement?.getAttribute('aria-label')})).catch(()=>null)});
    }
  }
  finally{for(const context of [...contexts])if(!previous.has(context))await dispose(context);}
}

try{
  await check('welcome-reading-password-reaction',async()=>{
    const {page}=await fresh();
    const welcome=await data(page);
    assert.equal(welcome.motionState,'welcome','opening the dialog must greet automatically');
    assert.ok(Number(welcome.modelMeshCount)>0,'approved GLB geometry must be loaded');
    assert.ok(welcome.poseSnapshot,'rendered transforms must be inspectable');
    await capture(page,'desktop-01-welcome',{full:true});
    await page.locator('#auth-email').fill('reading-motion@example.com');
    await waitState(page,'reading');await waitValue(page,'bookOpen',value=>value>.9);
    const readingA=await capture(page,'desktop-02-reading-a');
    const readPose=await data(page);
    assert.ok(readPose.poseSnapshot.sit>.7&&readPose.poseSnapshot.read>.7,'reading must sit down and articulate the arms');
    const startTurn=Number(readPose.pageTurn);let readingB;
    await waitValue(page,'pageTurn',value=>Math.abs(value-startTurn)>.25,6000);
    readingB=await capture(page,'desktop-03-reading-page-turn');
    const readDifference=difference(readingA,readingB);
    assert.ok(readDifference.changedPixels>30,'the rendered book/page must visibly change over time');
    evidence.push({name:'reading-turn',before:readPose,after:await data(page),pixelDifference:readDifference});

    // Pointer taps preserve the input focus. Recovery must return to reading.
    await page.locator(scene).click();
    await waitState(page,'recoil');
    await waitValue(page,'bookOpen',(_,current)=>['retreat','clutch'].includes(current.reactionPhase)&&current.poseSnapshot.clutch>.3&&(Math.abs(current.poseSnapshot.rootZ)>.005||Math.abs(current.poseSnapshot.rootX)>.005));
    const reaction=await data(page),impact=await capture(page,'desktop-04-hit-retreat');
    assert.ok(reaction.poseSnapshot.clutch>.3,'tap must put a real hand near the head');
    assert.ok(Math.abs(reaction.poseSnapshot.rootZ)>.005||Math.abs(reaction.poseSnapshot.rootX)>.005,'tap must physically step back');
    assert.ok(difference(readingB,impact).changedPixels>250,'tap must visibly change the model pose');
    assert.equal(await page.locator('#auth-email').evaluate(el=>document.activeElement===el),true);
    await page.locator(scene).click();await waitState(page,'recoil');
    await page.waitForTimeout(80);assert.notEqual((await data(page)).reactionPhase,'none','a second tap must restart the reaction');
    await waitState(page,'reading');await waitValue(page,'bookOpen',value=>value>.9);
    await capture(page,'desktop-05-recovered-reading');
    evidence.push({name:'tap-reaction',pose:reaction,recovered:await data(page)});

    const privacyStart=Date.now();
    await page.locator('#auth-password').fill('DO-NOT-PERSIST-cheese-motion-20261025');
    await waitState(page,'privacy');
    const closed=await waitValue(page,'eyesClosed',(value,current)=>value>.95&&Number(current.bookOpen)<.03&&current.poseSnapshot.cover>.9);
    assert.ok(Number(closed.bookOpen)<.03,'password must close the book');
    assert.ok(closed.poseSnapshot.cover>.9,'password must actually move the arms to privacy pose');
    await capture(page,'desktop-06-password-eyes-closed',{full:true});
    assert.ok(difference(readingA,await page.locator(scene).screenshot()).changedPixels>250,'privacy pose must differ from reading pixels');
    evidence.push({name:'password-transition',settledMs:Date.now()-privacyStart,pose:closed});
    await page.getByRole('button',{name:'显示密码',exact:true}).click();
    assert.equal(await page.locator('#auth-password').getAttribute('type'),'text');
    await waitState(page,'privacy');
    await page.locator(scene).click();await page.waitForTimeout(150);
    const privateTap=await data(page);
    assert.equal(privateTap.motionState,'privacy','password privacy must win over tap reaction');
    assert.ok(Number(privateTap.eyesClosed)>.95&&Number(privateTap.bookOpen)<.03);
    await capture(page,'desktop-07-password-visible-still-private');
    await page.getByRole('button',{name:'隐藏密码',exact:true}).click();
    await page.locator('#auth-heading').click();
    const stored=await page.evaluate(()=>JSON.stringify({...localStorage})+JSON.stringify({...sessionStorage}));
    assert.ok(!stored.includes('DO-NOT-PERSIST-cheese-motion-20261025'));
    assert.ok(!stored.includes('reading-motion@example.com'),'unsubmitted email must not be persisted by the companion');
  });

  await check('idle-dance-think-rest-and-keyboard',async()=>{
    const {page}=await fresh();
    await waitState(page,'idle');
    const idle=await page.locator(scene).screenshot();
    await waitValue(page,'eyesClosed',value=>value>.4);
    const blinking=await capture(page,'desktop-10-idle-blink');
    assert.ok(difference(idle,blinking).changedPixels>20,'idle blinking must visibly change the eyes');
    const visited=new Set(['idle']),start=Date.now();
    while(Date.now()-start<22000&&(!visited.has('dance')||!visited.has('think'))){
      const current=await data(page);
      if(current.motionState==='dance'&&!visited.has('dance')){
        await page.waitForTimeout(250);const danceA=await capture(page,'desktop-11-idle-dance-a');
        await page.waitForTimeout(250);const danceB=await capture(page,'desktop-12-idle-dance-b');
        const movement=difference(danceA,danceB);
        assert.ok(movement.changedPixels>50,'idle dance must visibly move the real model');
        evidence.push({name:'idle-dance-pixels',movement,pose:await data(page)});
      }
      visited.add(current.motionState);await page.waitForTimeout(180);
    }
    assert.ok(visited.has('dance'),'idle choreography must include a visible dance');
    assert.ok(visited.has('think'),'idle choreography must include thinking');
    evidence.push({name:'idle-sequence',states:[...visited]});
    await page.getByRole('button',{name:'想一想',exact:true}).click();
    await waitState(page,'think');await waitValue(page,'bookOpen',(_,current)=>current.poseSnapshot.think>.85);
    const think=await capture(page,'desktop-08-thinking',{full:true});
    await page.getByRole('button',{name:'休息 / 唤醒',exact:true}).click();await waitState(page,'rest');
    await waitValue(page,'eyesClosed',value=>value>.9);await page.waitForTimeout(450);
    await capture(page,'desktop-09-resting');
    assert.ok(difference(think,await page.screenshot()).changedPixels>500,'rest and think must visibly differ');
    await page.getByRole('button',{name:'休息 / 唤醒',exact:true}).click();
    await waitState(page,'idle');
    await page.getByRole('button',{name:'打个招呼',exact:true}).click();await waitState(page,'welcome');
    const greet=await waitValue(page,'bookOpen',(_,current)=>current.poseSnapshot.wave>.1);
    assert.ok(greet.poseSnapshot.wave>.1,'greeting button must wave an actual arm');
    await page.locator(scene).focus();await page.locator(scene).press('Enter');
    await waitState(page,'recoil');
    assert.equal(await page.locator(scene).evaluate(el=>document.activeElement===el),true,'keyboard activation must retain button focus');
  });

  await check('reduced-motion-static-rendered-poses',async()=>{
    const {page}=await fresh({reducedMotion:'reduce'});
    const welcome=await capture(page,'reduced-01-welcome');
    await page.waitForTimeout(500);const staticWelcome=difference(welcome,await page.locator(scene).screenshot());
    assert.equal(staticWelcome.changedPixels,0,'reduced motion must stop welcome/idle movement');
    await page.locator('#auth-email').fill('reduced-motion@example.com');await waitState(page,'reading');
    await waitValue(page,'bookOpen',value=>value>.95);const reading=await capture(page,'reduced-02-reading');
    await page.waitForTimeout(500);assert.equal(difference(reading,await page.locator(scene).screenshot()).changedPixels,0,'reduced reading must not keep turning pages');
    assert.ok(difference(welcome,reading).changedPixels>250,'reduced motion must still provide a real reading pose');
    await page.locator('#auth-password').fill('reduced-demo-pass');await waitState(page,'privacy');
    const privacy=await data(page);assert.ok(Number(privacy.eyesClosed)>.95&&Number(privacy.bookOpen)<.03);
    const covered=await capture(page,'reduced-03-privacy');
    assert.ok(difference(reading,covered).changedPixels>250,'reduced motion must still provide a real privacy pose');
    await page.waitForTimeout(500);assert.equal(difference(covered,await page.locator(scene).screenshot()).changedPixels,0,'reduced privacy must stay static');
    evidence.push({name:'reduced-motion',staticWelcome,privacy});
  });

  await check('keyboard-reaction-renders-and-recovers',async()=>{
    const {page}=await fresh();
    await page.locator(scene).focus();
    for(const key of ['Enter','Space','Enter']){
      await page.locator(scene).press(key);await waitState(page,'recoil');
      const reaction=await data(page);
      assert.ok(reaction.poseSnapshot.clutch>.5,'keyboard activation must render its static head-holding pose');
      const rendered=await page.locator(scene).screenshot();await page.waitForTimeout(150);
      assert.equal(difference(rendered,await page.locator(scene).screenshot()).changedPixels,0,'keyboard reaction must avoid automatic motion');
      await waitState(page,'idle');
      assert.equal(await page.locator(scene).evaluate(el=>document.activeElement===el),true);
      evidence.push({name:`keyboard-${key}`,reaction,recovered:await data(page)});
    }
    await capture(page,'keyboard-reaction-recovered');
  });

  await check('no-webgl-fallback-poses',async()=>{
    const {page}=await fresh({webgl:false});
    const fallback=page.locator('.cheese-scene-fallback img');
    const ready=async name=>{await fallback.waitFor();await page.waitForFunction(selector=>{const image=document.querySelector(selector);return image?.complete&&image.naturalWidth>0;},'.cheese-scene-fallback img');assert.match(await fallback.getAttribute('src'),new RegExp(`/${name}\\.png$`));};
    await ready('welcome');const welcome=await capture(page,'fallback-01-welcome');
    await page.locator('#auth-email').fill('fallback@example.com');await ready('read');const reading=await capture(page,'fallback-02-reading');
    assert.ok(difference(welcome,reading).changedPixels>250,'fallback must change its actual image for reading');
    await page.locator('#auth-password').fill('fallback-demo-pass');await ready('privacy');
    const privacy=await capture(page,'fallback-03-privacy');
    assert.ok(difference(reading,privacy).changedPixels>250,'fallback must change its actual image for privacy');
    await page.getByRole('button',{name:'显示密码',exact:true}).click();await ready('privacy');
    await page.locator(scene).click();await ready('privacy');
    await page.locator('.auth-submit').click();await page.locator('.auth-dialog').waitFor({state:'detached'});
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).logged,KEY),true,'fallback must preserve login usability');
  });

  for(const [width,height,language]of [[1280,720,'zh'],[1280,720,'en'],[390,844,'zh'],[390,844,'en'],[320,740,'en']]){
    await check(`layout-${width}-${language}`,async()=>{
      const {page}=await fresh({width,height,language,reducedMotion:'reduce'});
      const metric=await page.locator('.auth-dialog').evaluate(dialog=>{
        const r=dialog.getBoundingClientRect(),overflow=[];
        for(const el of dialog.querySelectorAll('button,input,h1,h2,p,label')){
          if(!el.checkVisibility()||el.closest('.auth-nook-scene'))continue;
          const rect=el.getBoundingClientRect();
          if(rect.left<-.5||rect.right>innerWidth+.5)overflow.push({tag:el.tagName,text:el.textContent.slice(0,45),left:rect.left,right:rect.right});
        }
        return {width:innerWidth,height:innerHeight,rootOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,dialog:{left:r.left,right:r.right,width:r.width,scrollWidth:dialog.scrollWidth,clientWidth:dialog.clientWidth},overflow};
      });
      assert.ok(metric.rootOverflow<=2,`root overflows ${metric.rootOverflow}px`);
      assert.ok(metric.dialog.left>=0&&metric.dialog.right<=width,'dialog must fit viewport');
      assert.ok(metric.dialog.scrollWidth<=metric.dialog.clientWidth+2,'dialog content must fit viewport');
      assert.deepEqual(metric.overflow,[],'visible form controls must fit horizontally');
      await page.locator('#auth-email').fill('mobile@example.com');await waitState(page,'reading');
      await capture(page,`layout-${width}-${language}-reading`,{full:true});
      await page.locator('#auth-password').fill('layout-demo-pass');await waitState(page,'privacy');
      await page.locator('.auth-submit').scrollIntoViewIfNeeded();
      const submit=await page.locator('.auth-submit').boundingBox();
      assert.ok(submit.y>=0&&submit.y+submit.height<=height,'submit must be reachable');
      if(width>=1024)assert.ok(submit.y+submit.height<=height,'desktop submit must fit');
      await capture(page,`layout-${width}-${language}-privacy`,{full:true});
      await page.locator('.auth-demo-details summary').click();await page.locator('.auth-demo-details').evaluate(el=>el.scrollIntoView({block:'end'}));
      const close=await page.locator('.auth-close').boundingBox();
      assert.ok(close.width>=44&&close.height>=44&&close.y>=0&&close.y+close.height<=height,'close control must remain visible and touchable');
      evidence.push({name:`layout-${width}-${language}`,metric,submit,close});
    });
  }

  await check('failed-login-keeps-input-and-close-restores-focus',async()=>{
    const {page,trigger}=await fresh({home:true,reducedMotion:'reduce'});
    await page.locator('#auth-email').fill('retry@example.com');await page.locator('#auth-password').fill('retry-demo-pass');
    await page.locator('.auth-demo-details summary').click();await page.getByRole('button',{name:'模拟认证失败',exact:true}).click();
    await page.locator('.auth-error[role="alert"]').waitFor();
    assert.equal(await page.locator('#auth-email').inputValue(),'retry@example.com');
    assert.equal(await page.locator('#auth-password').inputValue(),'retry-demo-pass');
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).logged,KEY),false);
    await capture(page,'failed-login-fields-retained',{full:true});
    await page.keyboard.press('Escape');await page.locator('.auth-dialog').waitFor({state:'detached'});
    assert.equal(new URL(page.url()).pathname,'/');
    assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');
    assert.equal(await trigger.evaluate(el=>document.activeElement===el),true);
  });

  await check('source-keeps-credentials-out-of-engine',async()=>{
    const component=await fs.readFile('src/LoginNookScene.jsx','utf8'),engineFiles=['src/login-cheese-engine.js','src/login-cheese-motion.js','src/login-cheese-book.js'];
    const engine=(await Promise.all(engineFiles.map(file=>fs.readFile(file,'utf8')))).join('\n'),page=await fs.readFile('src/LoginPage.jsx','utf8');
    const forwarded=component.match(/latest\.current\s*=\s*\{([^}]+)\}/)?.[1];
    assert.ok(forwarded,'scene state forwarding must be inspectable');
    assert.ok(!/password|email|value|credential|form/i.test(forwarded),'engine state must contain booleans/actions, never form values');
    const invocation=page.match(/<LoginNookScene\b[^>]*\/>/)?.[0];
    assert.ok(invocation&&!/form\.|\.value|password=|email=|credentials=/i.test(invocation));
    assert.ok(!/localStorage|sessionStorage|indexedDB|\.fetch\(|XMLHttpRequest/.test(engine),'engine must not persist or transmit credentials');
    evidence.push({name:'source-privacy',engineFiles,forwardedKeys:forwarded.split(',').map(value=>value.trim()),credentialValuesPassed:false,engineStorageAccess:false});
  });

  if(process.argv.includes('--video'))await check('motion-demo-video',async()=>{
    const {page}=await fresh(),frames=path.join(out,'demo-frames');
    await fs.mkdir(frames,{recursive:true});
    const fps=12,start=Date.now(),segments=[];let count=0;
    async function recordFrames(number,label){
      const segmentStart=Date.now();segments.push({label,firstFrame:count,frames:number});
      for(let index=0;index<number;index++){
        const delay=segmentStart+index*1000/fps-Date.now();if(delay>0)await page.waitForTimeout(delay);
        await page.locator(scene).screenshot({path:path.join(frames,`demo-frame-${String(count++).padStart(3,'0')}.png`)});
      }
    }
    await recordFrames(24,'welcome');
    await page.locator('#auth-email').fill('motion-demo@example.com');await recordFrames(42,'read-and-turn-page');
    await page.locator(scene).click();await recordFrames(34,'tap-retreat-hold-head-recover');
    await page.locator('#auth-password').fill('made-up-demo-pass');await recordFrames(24,'close-book-and-eyes');
    await page.locator('#auth-heading').click();await waitState(page,'dance',14000);await recordFrames(30,'automatic-idle-dance');
    await page.getByRole('button',{name:'想一想',exact:true}).click();await recordFrames(24,'think-from-one-question');
    async function encode(args){
      await new Promise((resolve,reject)=>{
        const child=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:['ignore','ignore','pipe'],windowsHide:true});
        let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk.toString();});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-2000)}`)));
      });
    }
    const input=path.join(frames,'demo-frame-%03d.png');
    await encode(['-framerate',String(fps),'-i',input,'-frames:v',String(count),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p',path.join(out,'login-cheese-motion-demo.mp4')]);
    await encode(['-framerate',String(fps),'-i',input,'-frames:v',String(count),'-filter_complex','split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',path.join(out,'login-cheese-motion-demo.gif')]);
    evidence.push({name:'motion-demo-video',fps,frames:count,segments,actualCaptureMs:Date.now()-start,mp4:'login-cheese-motion-demo.mp4',gif:'login-cheese-motion-demo.gif'});
  });
}finally{
  results.completedAt=new Date().toISOString();results.failed=checks.filter(check=>check.status==='fail').length;
  await fs.writeFile(path.join(out,`verification${only?`-${only.replace(/[^a-z0-9-]/gi,'_')}`:''}.json`),JSON.stringify(results,null,2));
  for(const context of [...contexts])await dispose(context);
  await browser.close();
}
console.log(JSON.stringify({checks:checks.length,failed:results.failed,pageErrors:errors.length,evidence:out}));
if(results.failed||errors.length)process.exitCode=1;
