import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {KEY,scenarioState,learning} from '../src/model.js';
const root='检查记录/学习资源阅读导航_v58';await fs.mkdir(root,{recursive:true});const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage(),errors=[],results=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{localStorage.setItem('career-prototype-operation-guide-v1','{"enabled":false,"active":null,"seen":[]}');localStorage.setItem('career-prototype-guidance-v1','{"auto":false}');});
try{for(const width of [1920,1440,1024,390]){
 await p.setViewportSize({width,height:1000});await p.goto('http://127.0.0.1:5184');await p.evaluate(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s:scenarioState('PT01')});await p.goto('http://127.0.0.1:5184/learning');
 assert.equal(await p.locator('.learning-reading-guide').count(),4);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await p.locator('.learning-card').first().scrollIntoViewIfNeeded();await p.screenshot({path:root+`/${width}-资源介绍与导航.png`});
 if(width===1440)for(const unit of learning)for(let chapter=0;chapter<unit.chapters.length;chapter++){
  await p.getByRole('button',{name:'阅读'+unit.title+'：'+unit.chapters[chapter],exact:true}).click();const d=p.locator('dialog[open]');await d.waitFor();assert.match(await d.innerText(),new RegExp(unit.chapters[chapter].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));await p.keyboard.press('Escape');
 }
 if(width===1440){const card=p.locator('.learning-card').first();await card.getByRole('button',{name:'收藏数据质量小项目',exact:true}).click();await card.getByRole('button',{name:'预览范围与成果',exact:true}).click();await card.getByRole('combobox',{name:'数据质量小项目的实践范围',exact:true}).selectOption('标准范围');await card.getByRole('button',{name:'选择范围并开始预检',exact:true}).click();await p.locator('dialog[open]').waitFor();await p.keyboard.press('Escape');}
 const state=await p.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);assert.equal(state.tasks.length,0);results.push({width,overflow:false});
}
 await p.goto('file:///C:/Users/tsnbx/Desktop/team/project/设计参考与同步/设计稿/学习资源阅读导航_v58.svg');await p.setViewportSize({width:1280,height:620});await p.screenshot({path:'../设计参考与同步/设计稿/学习资源阅读导航_v58.png'});assert.deepEqual(errors,[]);await fs.writeFile(root+'/验证.json',JSON.stringify({results,chapterLinks:16,errors},null,2));console.log('PASS 4 widths and 16 chapter reading links; no tasks created');
}finally{await b.close();}
