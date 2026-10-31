import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {KEY,scenarioState} from '../src/model.js';
const root='检查记录/板块对齐与全链路_v52',b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']}),p=await b.newPage(),results=[],errors=[];
p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>localStorage.setItem('career-prototype-operation-guide-v1','{"enabled":false,"active":null,"seen":[]}'));
async function load(route,lang='zh'){await p.goto('http://127.0.0.1:5184');await p.evaluate(({KEY,s,lang})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang);},{KEY,s:scenarioState('PT05'),lang});await p.goto('http://127.0.0.1:5184'+route);await p.locator('.page-surface').waitFor();}
try{
 for(const width of [360,701,720,721,1024])for(const route of ['/careers','/assessment','/plan','/reports','/reports?tab=岗位简历','/assistant','/career-map']){
  await p.setViewportSize({width,height:844});await load(route,'en');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+route);results.push({width,route,language:'en',status:'pass'});
 }
 await p.setViewportSize({width:390,height:844});await load('/assessment');assert.equal(await p.locator('.assessment-source-group').evaluate(e=>e.open),false);assert.ok(await p.getByLabel('经历标题',{exact:true}).isVisible());await p.locator('.assessment-source-group>summary').click();await p.getByRole('button',{name:'添加简历联系资料',exact:true}).click();await p.getByLabel('简历姓名',{exact:true}).fill('合成联系资料');await p.getByRole('button',{name:'取消编辑',exact:true}).click();
 await load('/assessment?resumeSection=profile');assert.equal(await p.locator('.assessment-source-group').evaluate(e=>e.open),true);await p.getByRole('button',{name:'添加简历联系资料',exact:true}).click();await p.getByLabel('简历姓名',{exact:true}).fill('手机合成姓名');await p.getByLabel('我已核对这些联系资料，允许选入自己的简历').check();await p.getByRole('button',{name:'确认并保存联系资料',exact:true}).click();assert.equal(await p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).resumeProfile.name,KEY),'手机合成姓名');
 results.push({name:'手机可选资料默认收起、展开/取消/本人保存和简历深链接打开',status:'pass'});
 await load('/careers');await p.locator('.workspace-search input[role=combobox]').fill('SQL');for(const selector of ['.search-clear','.search-submit']){const box=await p.locator('.workspace-search '+selector).boundingBox();assert.ok(box.width>=44&&box.height>=44,selector+JSON.stringify(box));}
 results.push({name:'手机搜索与清空按钮触摸区域至少44像素',status:'pass'});
 results.push({name:'运行时错误',status:errors.length?'fail':'pass',errors});
}finally{await fs.writeFile(root+'/断点英文与手机资料.json',JSON.stringify(results,null,2));await b.close();}
if(errors.length)process.exitCode=1;console.log('PASS',results.length,'responsive and interactive cases');
