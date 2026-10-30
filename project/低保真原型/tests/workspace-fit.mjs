import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';
const dir='检查记录/伸缩与图形修正_20261023',base='http://127.0.0.1:5187';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:false,args:['--no-proxy-server']});
const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
const results=[],checks=[],errors=[];
const aiOnly=process.argv.includes('--ai-only');
page.on('pageerror',e=>errors.push(e.message));
const quick=process.argv.includes('--quick');
const viewports=quick?[[1280,650],[820,900]]:[[1440,900],[1366,768],[1280,650],[1024,768],[820,900],[390,844],[320,720]];
const active=scenarioState('PT04'),fresh=scenarioState('PT01'),long=scenarioState('PT04'),mixed=scenarioState('PT04');
long.tasks[0].title='ExtremelyLongProjectIdentifierWithoutSpaces'.repeat(4);
mixed.tasks=['待开始','进行中','受阻','完成','延期'].map((status,i)=>({...active.tasks[0],id:'mixed-'+i,status,completed:status==='完成'}));
const conversation=structuredClone(active);
conversation.conversations[0].title='项目经历与职业准备讨论 · 合成测试';
conversation.conversations[0].messages=[{id:'q1',role:'user',text:'请帮我比较方向，并保留不确定的部分。',scope:['职业原创知识'],claimRefs:[]},{id:'a1',role:'assistant',text:('这是预录合成测试回答。先比较工作内容，再核对已有经历与未验证的问题。').repeat(12)+' LongUnbrokenAnswerIdentifier'.repeat(7),scope:['职业原创知识'],claimRefs:[]}];
async function load(route,state,viewport,lang='zh',collapsed=false){
 await page.setViewportSize({width:viewport[0],height:viewport[1]});
 if(!page.url().startsWith(base))await page.goto(base+'/app');
 await page.evaluate(({KEY,state,lang,collapsed,guideKey})=>{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem('career-prototype-language',lang);localStorage.setItem('career-prototype-sidebar-v1',collapsed?'collapsed':'expanded');localStorage.setItem(guideKey,JSON.stringify({enabled:false,neverPrompt:true,seen:[],active:null}));},{KEY,state,lang,collapsed,guideKey:OPERATION_GUIDE_KEY});
 await page.goto(base+route,{waitUntil:'networkidle'});await page.locator('#main.student-workspace').waitFor();
}
async function inspect(name,capture=false){
 const r=await page.evaluate(()=>{
  const main=document.querySelector('#main'),mr=main.getBoundingClientRect();
  const visible=el=>{const r=el.getBoundingClientRect(),c=getComputedStyle(el);if(!r.width||!r.height||c.visibility==='hidden'||!el.checkVisibility()||el.closest('svg,.sr-only,[aria-hidden=true]'))return false;for(let a=el;a&&a!==main;a=a.parentElement)if(a.tagName==='DETAILS'&&!a.open&&!a.querySelector(':scope>summary')?.contains(el))return false;return r.bottom>Math.max(0,mr.top)&&r.top<Math.min(innerHeight,mr.bottom);};
  const clipText=(b,p)=>{let x=b.x,y=b.y,right=b.right,bottom=b.bottom;for(let a=p.parentElement;a;a=a.parentElement){const c=getComputedStyle(a),r=a.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(c.overflowX)){x=Math.max(x,r.x);right=Math.min(right,r.right);}if(/auto|scroll|hidden|clip/.test(c.overflowY)){y=Math.max(y,r.y);bottom=Math.min(bottom,r.bottom);}if(a===main)break;}return {x,y,right,bottom};};
  const overflow=[...main.querySelectorAll('*')].filter(e=>visible(e)&&e.scrollWidth>e.clientWidth+3&&getComputedStyle(e).overflowX==='visible'&&!e.matches('.atlas-station')).map(e=>({cls:typeof e.className==='string'?e.className:'',text:e.textContent.slice(0,45),px:e.scrollWidth-e.clientWidth}));
  const walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT),text=[];let n;
  while(n=walker.nextNode()){const p=n.parentElement;if(!n.textContent.trim()||!visible(p)||p.matches('script,style'))continue;const range=document.createRange();range.selectNodeContents(n);for(const raw of range.getClientRects()){const b=clipText(raw,p);if(b.right-b.x>2&&b.bottom-b.y>2&&b.bottom>Math.max(0,mr.top)&&b.y<Math.min(innerHeight,mr.bottom))text.push({node:n,text:n.textContent.trim().slice(0,36),...b});}}
  const overlap=[];
  for(let i=0;i<text.length;i++)for(let j=i+1;j<text.length;j++){const a=text[i],b=text[j];if(a.node===b.node)continue;const w=Math.min(a.right,b.right)-Math.max(a.x,b.x),h=Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y);if(w>3&&h>4)overlap.push({a:a.text,b:b.text,w:Math.round(w),h:Math.round(h)});}
  const diagramOverlap=[];
  if(main.matches('.workbench-home'))for(const e of main.querySelectorAll('.workbench-grid svg')){const b=e.getBoundingClientRect();for(const t of text){if(Math.min(b.right,t.right)-Math.max(b.left,t.x)>3&&Math.min(b.bottom,t.bottom)-Math.max(b.top,t.y)>4)diagramOverlap.push(t.text);}}
  const boxes=Object.fromEntries(['.workbench-grid','.dashboard-main-column','.dashboard-side-column','.workbench-focus','.workbench-preparation','.workbench-week','.workbench-status','.workbench-record-grid','.empty-chat-home','.chat-composer','.chat-stream','.assistant-main','.empty-prompt-starts'].map(q=>{const e=main.querySelector(q);if(!e)return [q,null];const b=e.getBoundingClientRect();return[q,{x:Math.round(b.x),y:Math.round(b.y),width:Math.round(b.width),height:Math.round(b.height),bottom:Math.round(b.bottom)}]}));
  const send=main.querySelector('.has-messages .chat-send')?.getBoundingClientRect();
  return {width:innerWidth,height:innerHeight,collapsed:document.querySelector('#workspace-sidebar')?.dataset.collapsed,mainHeight:main.clientHeight,mainScrollHeight:main.scrollHeight,documentOverflow:document.documentElement.scrollWidth-innerWidth,mainOverflow:main.scrollWidth-main.clientWidth,sendBottom:send?Math.round(send.bottom):null,overflow:overflow.slice(0,12),overlap:overlap.slice(0,12),diagramOverlap:[...new Set(diagramOverlap)],boxes};
 });results.push({name,...r});
 if(capture){await page.screenshot({path:`${dir}/${name}.png`});await page.evaluate(()=>{const m=document.querySelector('#main');if(innerWidth<=720)window.scrollTo(0,document.documentElement.scrollHeight);else m.scrollTop=m.scrollHeight;});await page.screenshot({path:`${dir}/${name}-bottom.png`});}
}
try{
 if(!aiOnly)for(const lang of ['zh','en'])for(const viewport of viewports)for(const [stateName,state]of Object.entries({active,fresh,long,mixed})){await load('/app',state,viewport,lang);await inspect(`dashboard-${stateName}-${viewport[0]}x${viewport[1]}-${lang}`,lang==='zh'&&['active','mixed'].includes(stateName)&&[1440,1366,390].includes(viewport[0]));}
 for(const lang of ['zh','en'])for(const viewport of viewports)for(const [stateName,state]of Object.entries({empty:active,messages:conversation})){await load('/assistant',state,viewport,lang);await inspect(`assistant-${stateName}-${viewport[0]}x${viewport[1]}-${lang}`,lang==='zh'&&[1440,1366,1280,390].includes(viewport[0]));}
 for(const route of aiOnly?['/assistant']:['/app','/assistant'])for(const viewport of [[1440,900],[1280,650],[1024,768]]){await load(route,route==='/app'?active:conversation,viewport);await page.locator('.sidebar-toggle').click();await inspect(`${route.slice(1)}-collapsed-${viewport[0]}`,true);}
 if(!aiOnly)for(const [name,route]of [['assessment','/assessment'],['careers','/careers'],['plan','/plan'],['reports','/reports'],['resume','/reports?tab=岗位简历'],['settings','/settings']])for(const viewport of [[1440,900],[1024,768],[390,844]]){await load(route,active,viewport);await inspect(`${name}-${viewport[0]}`,true);}
 if(!aiOnly){
 await load('/app',mixed,[1440,900]);assert.equal(await page.locator('.workbench-donut,.dashboard-preparation-chart').count(),0);assert.equal(await page.locator('.dashboard-dimension-links a').count(),4);assert.equal(await page.locator('.preparation-symbol').count(),4);assert.equal(await page.locator('.dashboard-status-strip>span').count(),5);checks.push('四类独立图标与五状态分布带使用记录计数，旧环图已移除');
 const before=await page.evaluate(KEY=>localStorage.getItem(KEY),KEY);for(let i=0;i<4;i++){await page.locator('.dashboard-dimension-links a').nth(i).click();assert.notEqual(new URL(page.url()).pathname,'/app');await page.goto(base+'/app');}assert.equal(await page.evaluate(KEY=>localStorage.getItem(KEY),KEY),before);checks.push('四类图标均可进入原详情且不修改本人状态');
 }
 await load('/assistant',active,[1440,900]);await page.locator('.empty-prompt-starts button').first().click();assert.ok((await page.locator('#assistant-question').inputValue()).length>0);await page.locator('.chat-send').click();await page.locator('.has-messages .chat-stream').waitFor();assert.equal(await page.locator('.chat-message').count(),2);checks.push('起点写入问题、发送并进入会话，原模拟行为保留');
 await page.locator('#assistant-question').fill('请保留这个未发送的问题');await page.locator('.chat-demo-menu summary').click();await page.getByRole('button',{name:'模拟 AI 失败',exact:true}).click();assert.equal(await page.locator('#assistant-question').inputValue(),'请保留这个未发送的问题');await inspect('assistant-error',true);checks.push('模拟失败保留草稿，错误区域参与布局');
 await load('/assistant',conversation,[1024,768]);await page.locator('.assistant-management-menu>summary').click();await page.locator('.assistant-management-menu button').nth(1).click();await page.locator('.chat-history-drawer[open]').waitFor();await page.locator('.chat-history-drawer header button').click();assert.equal(await page.locator('.assistant-management-menu>summary').evaluate(el=>el===document.activeElement),true);checks.push('窄栏讨论管理可打开历史，关闭后焦点返回菜单');
 await page.locator('.assistant-management-menu>summary').click();await page.locator('.assistant-management-menu button').nth(2).click();assert.equal(await page.locator('.has-messages').count(),0);assert.equal(await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).conversations.length,KEY),2);checks.push('窄栏新建讨论保留原会话');
 const problems=results.filter(r=>r.documentOverflow>3||r.mainOverflow>3||r.overflow.length||r.overlap.length||r.diagramOverlap.length);
 const sendOffscreen=results.filter(r=>r.name.startsWith('assistant-messages')&&r.width>720&&r.sendBottom>r.height);
 console.log(JSON.stringify({cases:results.length,checks,errors,sendOffscreen:sendOffscreen.map(r=>({name:r.name,bottom:r.sendBottom,height:r.height})),problems:problems.map(r=>({name:r.name,overflow:r.overflow,overlap:r.overlap,diagramOverlap:r.diagramOverlap}))},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(problems,[]);assert.deepEqual(sendOffscreen,[]);
}finally{await fs.writeFile(`${dir}/${quick?'ai-quick-results':aiOnly?'ai-results':'results'}.json`,JSON.stringify({browser:browser.version(),results,checks,errors},null,2));await browser.close();}
