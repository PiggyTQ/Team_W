import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {KEY,scenarioState,fresh} from '../src/model.js';

const root='检查记录/板块对齐与全链路_v52',base='http://127.0.0.1:5184';
const phase=process.argv.includes('--after')?'调整后':'调整前';
const views=[
 ['公开首页','/','public'],['首次设置','/onboarding','PT01'],['工作区','/app','PT01'],['工作区续办','/app','PT06'],
 ['职业','/careers','PT06'],['比较','/careers?tab=比较','PT05'],['企业岗位','/careers?tab=企业与岗位','PT05'],['我的机会','/careers?tab=我的机会','PT05'],['薪酬','/careers?tab=薪酬参考','PT05'],
 ['经历','/assessment','PT03'],['确认','/assessment?tab=原文确认','PT03'],['分析','/assessment?tab=四维与差距','PT05'],['材料档案','/assessment?tab=成果档案','PT06'],
 ['地图','/career-map','PT06'],['计划','/plan','PT04'],['调整','/plan?tab=方案调整','PT04'],['执行','/plan?tab=执行','PT06'],['日程','/plan?tab=日程','PT06'],['复盘','/plan?tab=复盘','PT06'],
 ['学习','/learning','PT06'],['项目','/learning?tab=综合项目','PT06'],['任务','/work/task-demo','PT06'],['尝试','/work/task-demo?tab=尝试与反馈','PT06'],['完成','/work/task-demo?tab=完成回执','PT06'],
 ['报告','/reports','PT07'],['简历','/reports?tab=岗位简历','PT05'],['AI','/assistant','PT06'],['检索','/assistant?tab=自然语言检索','PT05'],
 ['设置','/settings','PT05'],['授权','/settings?tab=资料授权','PT05'],['反馈','/settings?tab=反馈状态','PT05'],
 ['质量后台','/admin/quality','quality'],['来源后台','/admin/data','data'],['内容后台','/admin/content','content']
];
await fs.mkdir(root+'/'+phase,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.setDefaultTimeout(3500);page.on('pageerror',e=>errors.push({url:page.url(),error:e.message}));
page.on('dialog',async d=>{nativeDialogs++;await d.dismiss();});let nativeDialogs=0,downloads=0,popups=0;
page.on('download',()=>downloads++);page.on('popup',async p=>{popups++;await p.close();});
await page.addInitScript(()=>{localStorage.setItem('career-prototype-operation-guide-v1','{"enabled":false,"seen":[],"active":null}');localStorage.setItem('career-prototype-guidance-v1','{"auto":false}');});
async function load([name,route,scene]){
 if(!page.url().startsWith(base))await page.goto(base);
 const state=scene==='public'?fresh():scenarioState(/^PT/.test(scene)?scene:'PT06');
 if(['quality','data','content'].includes(scene))state.role=scene;
 if(name==='比较')state.compare=['data','ai'];
 await page.evaluate(({KEY,state})=>{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem('career-prototype-language','zh');},{KEY,state});
 await page.goto(base+route);await page.locator('main').waitFor();
}
const signature=()=>page.evaluate(KEY=>JSON.stringify({url:location.href,state:localStorage.getItem(KEY),html:document.querySelector('main')?.outerHTML,dialogs:[...document.querySelectorAll('dialog[open],.guidance-bubble:popover-open,.operation-guide,.workspace-search-results')].map(e=>e.outerHTML),status:[...document.querySelectorAll('.toast,[role=alert]')].map(e=>e.outerHTML),expanded:[...document.querySelectorAll('[aria-expanded],details')].map(e=>[e.getAttribute('aria-expanded'),e.open])}),KEY);
try{
 if(process.argv.includes('--click')){
  const records=[],inventory=JSON.parse(await fs.readFile(root+'/'+phase+'/入口与控件清单.json','utf8'));
  for(const item of inventory){
   if(item.scene==='public')continue;
   if(process.env.AUDIT_FILTER&&!item.name.includes(process.env.AUDIT_FILTER))continue;
   for(const control of item.buttons.filter(b=>!b.disabled&&b.inMain)){
    await load(views.find(v=>v[0]===item.name));
    const button=page.locator('button,[role="button"]').nth(control.index);
    try{
     if(!await button.isVisible())continue;
     await button.scrollIntoViewIfNeeded();
     const before=await signature(),events=[nativeDialogs,downloads,popups],selected=await button.getAttribute('aria-pressed')==='true';
     const validation=await button.evaluate(e=>!!e.form&&!e.form.checkValidity());
     await button.click();await page.waitForTimeout(160);
     const after=await signature(),changed=before!==after||events.some((n,i)=>n!==[nativeDialogs,downloads,popups][i]);
     records.push({...control,name:item.name,route:item.route,result:changed?'有响应':selected?'当前已选中':validation?'表单缺项校验':'待人工核对无变化'});
    }catch(error){records.push({...control,name:item.name,route:item.route,result:'点击受阻',error:error.message.slice(0,500)});}
   }
   console.log(item.name+': 按钮检查完成');
   await fs.writeFile(root+'/'+phase+'/按钮点击结果.json',JSON.stringify({records,errors},null,2));
  }
 }else{
  const inventory=[],layout=[];
  for(const view of views){
   await load(view);
   const buttons=await page.locator('button,[role="button"]').evaluateAll(nodes=>nodes.map((e,index)=>({index,text:(e.innerText||e.getAttribute('aria-label')||e.title||'').trim().slice(0,100),disabled:!!e.disabled||e.getAttribute('aria-disabled')==='true',inMain:!!e.closest('main'),title:e.title,visible:!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'})).filter(e=>e.visible));
   const links=await page.locator('a').evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length).map(e=>({text:e.innerText.trim().slice(0,90),href:e.getAttribute('href'),target:e.target})));
   inventory.push({name:view[0],route:view[1],scene:view[2],buttons,links});
   console.log(view[0]+': '+buttons.length+' 按钮 / '+links.length+' 链接');
  }
  for(const width of [1440,1024,390]){
   await page.setViewportSize({width,height:width===390?844:1000});
   for(const view of views.filter(v=>v[2]!=='public')){
    await load(view);
    layout.push(await page.evaluate(({name,width})=>{
     const rect=selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
     return {name,width,overflow:document.documentElement.scrollWidth>innerWidth+1,main:rect('.page-surface'),head:rect('.pagehead'),tabs:rect('.tabs'),panel:rect('.page-surface .panel'),h1:rect('main h1')};
    },{name:view[0],width}));
    if(['工作区','职业','经历','计划','报告','简历','AI','地图','内容后台'].includes(view[0])&&width!==1024){await page.screenshot({path:root+'/'+phase+'/'+width+'-'+view[0]+'.png',fullPage:false});}
   }
  }
  await fs.writeFile(root+'/'+phase+'/入口与控件清单.json',JSON.stringify(inventory,null,2));
  await fs.writeFile(root+'/'+phase+'/布局测量.json',JSON.stringify({layout,errors},null,2));
 }
}finally{await browser.close();}
if(errors.length)process.exitCode=1;
