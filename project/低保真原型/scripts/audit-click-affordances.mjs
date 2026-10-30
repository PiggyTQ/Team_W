import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';

const phase=process.argv[2]||'before',dir=`检查记录/控件可操作性_20261022/${phase}`;
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),rows=[],errors=[];
page.setDefaultTimeout(6000);
let current='';page.on('pageerror',e=>errors.push({route:current,message:e.message}));
const groups=[
 ['/',[''],'PT01'],['/onboarding',[''],'PT01'],['/app',[''],'PT01'],['/app',[''],'PT05'],
 ['/careers',['','比较','企业与岗位','我的机会'],'PT05'],
 ['/assessment',['','资料经历','原文确认','四维与差距','成果档案','当前简历'],'PT05'],
 ['/career-map',['技能先修','职业关系'],'PT05'],
 ['/plan',['','执行','复盘'],'PT01'],['/plan',['','执行','复盘'],'PT05'],
 ['/plan?view=calendar',['执行'],'PT05'],
 ['/learning',['','短体验','综合项目'],'PT05'],['/learning?collection=我的学习',[''],'PT05'],
 ['/work/task-demo',['','笔记与阅读','尝试与反馈','贡献与表达','完成回执'],'PT06'],
 ['/reports',['','岗位简历'],'PT05'],['/reports/report-demo',[''],'PT07'],
 ['/assistant',['','自然语言检索'],'PT05'],['/settings',['','资料与隐私'],'PT05'],
 ['/admin/quality',['','质量与服务','权限审计'],'quality'],
 ['/admin/data',['','语义与条件','发布与撤回'],'data'],
 ['/admin/content',['','关系先修','学习项目','发布历史'],'content']
];
try {
 await page.goto('http://127.0.0.1:5184/plan');
 for(const [path,tabs,scene] of groups)for(const tab of tabs){
  const state=scenarioState(scene.startsWith('PT')?scene:'PT05');if(!scene.startsWith('PT'))state.role=scene;
  await page.evaluate(({state,key})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('career-prototype-language','zh');localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));},{state,key:KEY});
  const url=new URL(path,'http://127.0.0.1:5184');if(tab)url.searchParams.set('tab',tab);current=url.pathname+url.search;
  try{
   await page.goto(url.href);await page.locator('main').waitFor();
   if(phase!=='before')for(let depth=0;depth<2;depth++)await page.locator('main details:not([open])').evaluateAll(list=>list.forEach(el=>{el.open=true;}));
   const data=await page.evaluate(()=>{
    const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
    const props=e=>e[Object.keys(e).find(k=>k.startsWith('__reactProps$'))]||{};
    const path=e=>{let out=[];for(let n=e;n&&out.length<4;n=n.parentElement)out.unshift(n.tagName.toLowerCase()+(n.id?'#'+n.id:n.classList.length?'.'+[...n.classList].slice(0,2).join('.'):''));return out.join(' > ');};
    const info=e=>({text:(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,100),path:path(e),html:e.outerHTML.slice(0,350)});
    const ownsHandler=e=>['onClick','onPointerDown','onMouseDown','onKeyDown'].some(k=>typeof props(e)[k]==='function');
    const responds=e=>{let depth=0;for(let n=e;n&&n!==document.body&&depth<3;n=n.parentElement,depth++){if(n.tagName==='MAIN')break;if(ownsHandler(n))return true;if(n.matches('summary,label'))return true;}return false;};
    const inert=[],links=[],lookalikes=[],disabled=[];
    for(const e of document.querySelectorAll('button,[role=button]'))if(visible(e)){
     if(e.disabled){disabled.push(info(e));continue;}
     const form=e.form,submit=e.tagName==='BUTTON'&&e.type==='submit'&&form&&(typeof props(form).onSubmit==='function'||form.method==='dialog');
     if(!responds(e)&&!submit&&!e.hasAttribute('popovertarget')&&!e.hasAttribute('commandfor'))inert.push(info(e));
     const handler=props(e).onClick;
     if(typeof handler==='function'&&/^(?:\(.*?\)|\w+)\s*=>\s*\{\s*\}$/.test(handler.toString()))inert.push({...info(e),reason:'empty handler'});
    }
    for(const e of document.querySelectorAll('a'))if(visible(e)){
     const href=e.getAttribute('href');
     if((!href||href==='#'||/^javascript:/i.test(href))&&!ownsHandler(e))links.push({...info(e),reason:'missing destination'});
     else if(href?.startsWith('#')&&href.length>1){try{if(!document.getElementById(decodeURIComponent(href.slice(1))))links.push({...info(e),reason:'missing anchor '+href});}catch{links.push({...info(e),reason:'invalid anchor'});}}
    }
    for(const e of document.querySelectorAll('main span,main div,main p,main li,main strong'))if(visible(e)&&!e.closest('button,a,summary,label,[role=button],input,select,textarea')&&!e.querySelector('button,a,summary,input,select,textarea,[role=button]')&&!responds(e)){
     const text=e.textContent.trim();if(!text||text.length>32||e.children.length>2)continue;
     const s=getComputedStyle(e),r=e.getBoundingClientRect(),border=parseFloat(s.borderTopWidth)>0&&parseFloat(s.borderBottomWidth)>0&&parseFloat(s.borderLeftWidth)>0&&parseFloat(s.borderRightWidth)>0;
     if(s.cursor==='pointer'||(border&&parseFloat(s.borderTopLeftRadius)>0&&r.height>=28&&r.height<=90&&r.width<=240))lookalikes.push({...info(e),cursor:s.cursor,width:Math.round(r.width),height:Math.round(r.height)});
    }
    return {buttons:document.querySelectorAll('button,[role=button]').length,inert,links,lookalikes,disabled};
   });
   rows.push({route:current,scene,...data});
  }catch(e){rows.push({route:current,scene,error:e.message});}
 }
 // Preserve the screenshot's affected region at both breakpoints.
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:1000});
  await page.goto('http://127.0.0.1:5184/plan');
  await page.evaluate(({key,state})=>{localStorage.setItem(key,JSON.stringify(state));},{key:KEY,state:scenarioState('PT01')});
  await page.goto('http://127.0.0.1:5184/app');
  const area=page.locator('.home-map-entry');await area.scrollIntoViewIfNeeded();
  await page.screenshot({path:`${dir}/${width}-工作区地图入口.png`});await area.screenshot({path:`${dir}/${width}-地图入口局部.png`});
 }
}finally{await browser.close();}
await fs.writeFile(`${dir}/全站控件审查.json`,JSON.stringify({rows,errors},null,2));
console.log(JSON.stringify({routes:rows.length,buttons:rows.reduce((n,r)=>n+(r.buttons||0),0),inert:rows.filter(r=>r.inert?.length).map(({route,scene,inert})=>({route,scene,inert})),links:rows.filter(r=>r.links?.length).map(({route,links})=>({route,links})),lookalikes:rows.filter(r=>r.lookalikes?.length).map(({route,lookalikes})=>({route,lookalikes})),failed:rows.filter(r=>r.error),errors},null,2));
if(rows.some(r=>r.error)||errors.length)process.exitCode=1;
