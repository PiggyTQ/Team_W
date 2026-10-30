import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {KEY,scenarioState} from '../src/model.js';
const root='检查记录/板块对齐与全链路_v52',source=JSON.parse(await fs.readFile(root+'/调整后/按钮点击结果.json','utf8')),inventory=JSON.parse(await fs.readFile(root+'/调整后/入口与控件清单.json','utf8'));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']}),p=await browser.newPage({viewport:{width:1440,height:1000}}),results=[];p.setDefaultTimeout(5000);
await p.addInitScript(()=>{localStorage.setItem('career-prototype-operation-guide-v1','{"enabled":false,"active":null,"seen":[]}');localStorage.setItem('career-prototype-guidance-v1','{"auto":false}');window.scrollCalls=[];const original=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(...args){window.scrollCalls.push({id:this.id,tag:this.tagName});return original.apply(this,args);};});
try{
 await p.goto('http://127.0.0.1:5184');
 for(const item of source.records.filter(r=>r.result==='待人工核对无变化')){
  const view=inventory.find(v=>v.name===item.name),s=scenarioState(view.scene);if(item.name==='比较')s.compare=['data','ai'];
  await p.evaluate(({KEY,s})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language','zh');},{KEY,s});await p.goto('http://127.0.0.1:5184'+item.route);
  const button=p.locator('button,[role=button]').nth(item.index);await button.scrollIntoViewIfNeeded();await p.evaluate(()=>window.scrollCalls=[]);await button.click();await p.waitForTimeout(400);
  const calls=await p.evaluate(()=>window.scrollCalls),dock=await p.locator('.operation-guide-dock,.operation-guide').count();let reason='';
  if(item.text==='操作引导'){assert.ok(dock>0);reason='引导显示在独立浮层；目标不在当前模式时提供继续该步骤入口。';}
  else if(calls.length){reason='滚动定位到已存在的内容：'+calls.map(c=>c.id||c.tag).join('、');for(const call of calls.filter(c=>c.id))assert.ok(await p.locator('[id="'+call.id+'"]').count());}
  else if(item.name==='我的机会'){assert.equal(await p.getByLabel('研究准备状态',{exact:true}).inputValue(),'全部');reason='当前已经是全部研究卡；重复选择保留原状态。';}
  else if(item.text==='Python'){assert.match(await p.locator('.resume-annotation').innerText(),/Python/);reason='这项技能对应当前已经展示的事实，依据批注保持可读。';}
  else throw Error('未解释的无响应：'+item.text);
  results.push({name:item.name,button:item.text,status:'pass',reason});console.log('PASS',item.name,item.text.replaceAll('\n',' '),reason);
 }
}finally{await fs.writeFile(root+'/按钮待核对项复核.json',JSON.stringify(results,null,2));await browser.close();}
