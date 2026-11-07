import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';

const origin=process.env.CAREER_PREVIEW_ORIGIN||'http://127.0.0.1:5184';
const output=process.env.PLAN_CARD_OUTPUT||'../设计参考与同步/目标与行动计划双分区_20261107/模块与双色卡片装饰';
const ids=['week','month','year','undated','actions','review'];
const actions=['查看周目标','查看月目标','查看年目标','去排期','去行动','去审查'];
const browser=await chromium.launch({channel:process.env.CAREER_BROWSER_CHANNEL||'msedge',headless:true});
const results=[],errors=[];
await mkdir(output+'/实际截图',{recursive:true});

async function setup({width=1440,language='zh',reducedMotion='no-preference',planned=false}={}){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion});
 const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
 const state=scenarioState(planned?'PT04':'PT01');
 if(planned){const t=state.tasks[0];state.tasks=[t,{...t,id:'overdue',due:'2000-01-01',status:'待开始'},{...t,id:'blocked',due:'2099-01-01',status:'受阻'},{...t,id:'done',status:'完成',completed:true}];}
 await page.evaluate(({KEY,state,language})=>{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem('career-prototype-language',language);localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));},{KEY,state,language});
 await page.goto(origin+'/plan');await page.locator('.plan-wave-card').first().waitFor();await page.evaluate(()=>document.fonts.ready);return{context,page};
}
const card=(page,id)=>page.locator(`[data-plan-card="${id}"]>.plan-wave-card`);
const neutral=page=>page.locator('.plan-context-heading h2').first().hover();
const geometry=page=>page.locator('.plan-context').evaluate(el=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};return{module:rect(el),cards:[...el.querySelectorAll('.plan-summary-row')].map(rect),icons:[...el.querySelectorAll('.plan-context-illustration')].map(rect),buttons:[...el.querySelectorAll('.plan-context-button')].map(rect)};});
const read=page=>page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
const unchanged=(a,b)=>{for(const key of ['goal','backup','decision','tasks','planVersion'])assert.deepEqual(b[key],a[key],key);};
const settled=(control,yellow)=>control.evaluate((el,yellow)=>new Promise((resolve,reject)=>{const until=performance.now()+2500;const check=()=>{const cover=el.querySelector('.plan-wave-cover'),m=new DOMMatrixReadOnly(getComputedStyle(cover).transform),expected=yellow?0:-cover.getBoundingClientRect().width;if(Math.abs(m.e-expected)<.01)resolve();else if(performance.now()>until)reject(Error('Wave did not settle'));else requestAnimationFrame(check);};check();}),yellow);
async function halfway(control){
 return control.evaluate(async el=>{
  const cover=el.querySelector('.plan-wave-cover'),content=el.querySelector('.plan-wave-content');
  const animations=[cover,content].map(e=>e.getAnimations().find(a=>a.transitionProperty==='transform'));
  if(animations.some(a=>!a))throw Error('Missing cover/content transitions');
  for(const a of animations){a.pause();await a.ready;}el.sampledWave=animations;
  const duration=Number(animations[0].effect.getTiming().duration);
  const seek=t=>{animations.forEach(a=>a.currentTime=t);return new DOMMatrixReadOnly(getComputedStyle(cover).transform).e;};
  const start=seek(0),end=seek(duration),target=(start+end)/2,increasing=start<end;let lo=0,hi=duration;
  for(let i=0;i<18;i++){const t=(lo+hi)/2,current=seek(t);if(increasing?current<target:current>target)lo=t;else hi=t;}seek((lo+hi)/2);
  const a=new DOMMatrixReadOnly(getComputedStyle(cover).transform),b=new DOMMatrixReadOnly(getComputedStyle(content).transform);
  return{duration,start,end,offset:a.e,counterOffset:b.e,is2D:a.is2D&&b.is2D,scaleX:a.a,scaleY:a.d,verticalOffset:a.f,counterError:Math.abs(a.e+b.e),mask:getComputedStyle(cover).maskImage};
 });
}
const resume=control=>control.evaluate(el=>el.sampledWave?.forEach(a=>a.play()));
async function check(name,options,run){
 if(process.env.PLAN_CARD_CASE&&!name.includes(process.env.PLAN_CARD_CASE))return;
 const{context,page}=await setup(options);
 try{const detail=await run(page);results.push({name,status:'pass',...detail});console.log('PASS '+name);}
 catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL '+name,error.message);await page.screenshot({path:output+'/实际截图/失败-'+name+'.png',fullPage:true});}
 finally{await context.close();await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));}
}

try{
 await check('扁平基色与小波浪遮罩',{},async page=>{
  const baseline=JSON.parse(await readFile(output+'/修改前尺寸.json','utf8'));assert.deepEqual(await geometry(page),baseline);
  assert.equal(await page.locator('.plan-wave-card').count(),6);assert.equal(await page.locator('.plan-flip-inner,.plan-flip-face,.plan-flip-edge').count(),0);
  assert.deepEqual(await page.locator('.plan-goal-periods .plan-summary-count strong').allTextContents(),['0','0','0']);
  const styles=await page.locator('.plan-wave-card').evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el),c=getComputedStyle(el.querySelector('.plan-wave-cover'));return{background:s.backgroundColor,image:s.backgroundImage,shadow:s.boxShadow,perspective:s.perspective,transform:s.transform,cover:c.backgroundColor,coverImage:c.backgroundImage};}));
  for(const s of styles)assert.deepEqual(s,{background:'rgb(232, 241, 250)',image:'none',shadow:'none',perspective:'none',transform:'none',cover:'rgb(246, 223, 145)',coverImage:'none'});
  const mask=await page.evaluate(async()=>{const img=new Image();img.src='/illustrations/plan-wave-mask.svg';await img.decode();const canvas=document.createElement('canvas');canvas.width=320;canvas.height=48;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,320,48);const pixels=ctx.getImageData(0,0,320,48).data;const edges=[2,8,12,18,24,30,36,42,46].map(y=>{for(let x=319;x>=0;x--)if(pixels[(y*320+x)*4+3]>=128)return x;return-1;});return{edges,amplitude:Math.max(...edges)-Math.min(...edges)};});
  assert.ok(mask.amplitude>=4&&mask.amplitude<=12,'Wave must remain visible but small');await page.locator('.plan-context').screenshot({path:output+'/实际截图/六卡扁平默认.png'});return{styles,mask,geometry:baseline};
 });
 await check('模块与蓝黄纹样',{},async page=>{
  const background=page.locator('.plan-context-decoration');assert.equal(await background.count(),1);assert.equal(await background.getAttribute('aria-hidden'),'true');assert.equal(await background.locator('svg').count(),2);
  assert.equal(await background.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  const patterns=[];
  for(const id of ids){
   const control=card(page,id);assert.equal(await control.locator('.plan-card-pattern').count(),2);
   for(const tone of ['blue','yellow']){
    const pattern=control.locator('.plan-card-pattern-'+tone);
    const info=await pattern.evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return{hidden:el.getAttribute('aria-hidden'),focusable:el.getAttribute('focusable'),pointer:s.pointerEvents,shapeCount:el.querySelectorAll('circle,path').length,fill:getComputedStyle(el.querySelector('circle')).fill,contained:r.width<=p.width+1&&r.height<=p.height+1};});
    assert.equal(info.hidden,'true');assert.equal(info.focusable,'false');assert.equal(info.pointer,'none');assert.ok(info.shapeCount>0);assert.ok(info.contained);patterns.push({id,tone,...info});
   }
   assert.notEqual(patterns.at(-1).fill,patterns.at(-2).fill,'Both states must use their own visible palette');
   await control.hover();await settled(control,true);
   assert.equal(await control.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.plan-wave-card')===el;}),true,'Decoration intercepted the control');
   await neutral(page);await settled(control,false);
  }
  const footer=await page.locator('.plan-context-button').evaluateAll(els=>els.map(el=>({before:getComputedStyle(el,'::before').content,after:getComputedStyle(el,'::after').content})));for(const item of footer){assert.notEqual(item.before,'none');assert.notEqual(item.after,'none');}
  await page.locator('.plan-context').screenshot({path:output+'/实际截图/模块装饰-蓝色状态.png'});await card(page,'week').hover();await settled(card(page,'week'),true);await page.locator('.plan-context').screenshot({path:output+'/实际截图/模块装饰-黄色状态.png'});return{patterns,footer};
 });
 await check('六卡独立推进与退回',{},async page=>{
  const before=await geometry(page),samples=[];
  for(let i=0;i<6;i++){
   const control=card(page,ids[i]);await control.hover();const sample=await halfway(control);
   assert.equal(sample.duration,600);assert.ok(sample.start<sample.end);assert.ok(sample.offset<0&&sample.offset>sample.start);assert.equal(sample.is2D,true);assert.equal(sample.scaleX,1);assert.equal(sample.scaleY,1);assert.equal(sample.verticalOffset,0);assert.ok(sample.counterError<.02,'Action text slid with the wave');assert.ok(sample.mask.includes('plan-wave-mask.svg'));
   for(const other of ids.filter(id=>id!==ids[i]))assert.ok(await card(page,other).locator('.plan-wave-cover').evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).e< -200),'Another card moved');
   assert.deepEqual(await geometry(page),before);if(i===0)await page.locator('.plan-context').screenshot({path:output+'/实际截图/周目标-小波浪半覆盖.png',animations:'allow'});
   await resume(control);await settled(control,true);assert.equal(await control.locator('.plan-wave-action').innerText(),actions[i]);await page.locator('.plan-context').screenshot({path:output+`/实际截图/${ids[i]}-黄色操作.png`});
   await neutral(page);const reverse=await halfway(control);assert.ok(reverse.start>reverse.end);assert.ok(reverse.counterError<.02);await resume(control);await settled(control,false);assert.deepEqual(await geometry(page),before);samples.push({id:ids[i],sample,reverse});
  }return{samples};
 });
 await check('覆盖中点击与三种目标查看',{},async page=>{
  const before=await read(page),week=card(page,'week');await week.hover();await halfway(week);await week.click();await page.getByRole('dialog',{name:'周目标',exact:true}).waitFor();assert.equal(await page.locator('.plan-period-total strong').innerText(),'0');await resume(week);await settled(week,true);await page.screenshot({path:output+'/实际截图/周目标查看.png'});await page.keyboard.press('Escape');assert.equal(await week.evaluate(el=>el===document.activeElement),true);
  for(const[id,label]of[['month','月目标'],['year','年目标']]){await card(page,id).click();await page.getByRole('dialog',{name:label,exact:true}).waitFor();assert.equal(await page.locator('.plan-period-empty p').innerText(),'还没有'+label+'。');await page.keyboard.press('Escape');assert.equal(await card(page,id).evaluate(el=>el===document.activeElement),true);}unchanged(before,await read(page));
 });
 await check('原计划入口与真实数量',{planned:true},async page=>{
  assert.deepEqual(await page.locator('.plan-context-records .plan-summary-count strong').allTextContents(),['1','3','2']);const before=await read(page);await card(page,'undated').hover();await settled(card(page,'undated'),true);await card(page,'undated').click();await page.locator('#schedule-undated').waitFor({state:'visible'});await card(page,'review').click();await page.locator('#schedule-overdue').waitFor({state:'visible'});unchanged(before,await read(page));await card(page,'actions').click();await page.locator('.action-execution').waitFor();
 });
 await check('键盘与快速移入移出',{},async page=>{
  const control=card(page,'week');await control.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await settled(control,true);assert.notEqual(await control.evaluate(el=>getComputedStyle(el).outlineStyle),'none');await page.keyboard.press('Enter');await page.getByRole('dialog',{name:'周目标',exact:true}).waitFor();await page.keyboard.press('Escape');await page.locator('.plan-context-heading h2').first().click();
  for(const id of ['week','year','month','review','actions','week']){await card(page,id).hover();await page.waitForTimeout(70);}await neutral(page);for(const id of ids)await settled(card(page,id),false);
 });
 for(const[name,width,language]of[['中文窄桌面',1024,'zh'],['英文窄桌面',1024,'en'],['宽桌面',1920,'zh']])await check(name,{width,language,planned:true},async page=>{
  const before=await geometry(page);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);for(const id of ids){const el=card(page,id);assert.ok(await el.locator('.plan-wave-base').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert.ok(await el.locator('.plan-wave-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
  await card(page,'month').hover();const sample=await halfway(card(page,'month'));assert.ok(sample.counterError<.02);await resume(card(page,'month'));await settled(card(page,'month'),true);assert.deepEqual(await geometry(page),before);await page.locator('.plan-context').screenshot({path:output+'/实际截图/'+name+'.png'});
  if(language==='en'){assert.ok(!/[\u3400-\u9fff]/.test(await card(page,'month').getAttribute('aria-label')));await card(page,'month').click();await page.getByRole('dialog',{name:'Monthly goal',exact:true}).waitFor();assert.equal(await page.locator('.plan-period-empty p').innerText(),'No monthly goals yet.');}return{geometry:before,sample};
 });
 await check('减少动态效果',{reducedMotion:'reduce'},async page=>{
  const before=await geometry(page);for(const id of ids){const el=card(page,id);await el.hover();await settled(el,true);assert.equal(await el.locator('.plan-wave-cover').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');await neutral(page);await settled(el,false);}assert.deepEqual(await geometry(page),before);await card(page,'week').hover();await page.locator('.plan-context').screenshot({path:output+'/实际截图/减少动态效果.png'});await card(page,'week').click();await page.getByRole('dialog',{name:'周目标',exact:true}).waitFor();
 });
}finally{await writeFile(output+'/页面检查结果.json',JSON.stringify({results,errors},null,2));await browser.close();}
assert.deepEqual(errors,[]);assert.ok(results.length>0);assert.ok(results.every(r=>r.status==='pass'),'Some summary-card cases failed');
