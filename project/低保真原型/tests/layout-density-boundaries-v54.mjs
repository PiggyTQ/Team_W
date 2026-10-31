import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';
import {freezeReport} from '../src/alignment-model.js';
const root='检查记录/板块空间重组_v54/边界',base='http://127.0.0.1:5184';await fs.mkdir(root,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const p=await b.newPage(),results=[],errors=[];
p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('career-prototype-operation-guide-v1','{"enabled":false,"seen":[],"active":null}');localStorage.setItem('career-prototype-guidance-v1','{"auto":false}');});
async function load(route,s){await p.goto(base);await p.evaluate(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s});await p.goto(base+route);await p.locator('main').waitFor();}
try{
 for(const width of [1440,1024,390]){
  await p.setViewportSize({width,height:900});
  const s=scenarioState('PT07'),body='目标与理由：'+('合成测试中的长文本与选择说明。'.repeat(70))+'\n\n补充记录：自定义章节保留原文。';
  const r=freezeReport(s,'合成测试报告',body);s.reports=[r];await load('/reports/'+r.id,s);
  const g=await p.locator('.report-topic-panel').evaluateAll(es=>es.map(e=>({width:e.getBoundingClientRect().width,parent:e.parentElement.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
  console.log(width,g);for(const x of g)assert.ok(Math.abs(x.width-x.parent)<2,'单独章节不应预留空白栏');
  await p.locator('.report-outline>a').last().click();assert.ok(await p.locator('.report-topic-panel').last().isVisible());
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await p.screenshot({path:`${root}/${width}-长内容与独立章节.png`});results.push({width,savedReport:g});
  await load('/plan',scenarioState('PT07'));
  await p.getByRole('button',{name:'编辑阶段顺序',exact:true}).click();await p.getByRole('textbox',{name:'阶段1名称',exact:true}).fill('理解与准备（测试）');await p.getByRole('button',{name:'保存阶段顺序',exact:true}).click();
  assert.match(await p.locator('.phase-columns').innerText(),/理解与准备（测试）/);
  await p.getByRole('button',{name:'调整阶段与优先级',exact:true}).first().click();await p.getByRole('combobox',{name:'所属阶段',exact:true}).selectOption('practice');await p.getByRole('textbox',{name:'安排理由',exact:true}).fill('合成测试：将任务放入实践阶段');await p.getByRole('button',{name:'保存阶段安排',exact:true}).click();
  assert.match(await p.locator('.phase-columns').innerText(),/合成测试：将任务放入实践阶段/);
  await p.locator('.phased-plan').scrollIntoViewIfNeeded();await p.screenshot({path:`${root}/${width}-有任务阶段.png`});
 }
 await p.goto('file:///C:/Users/tsnbx/Desktop/team/project/设计参考与同步/设计稿/板块空间重组_v54.svg');await p.setViewportSize({width:1440,height:1020});await p.screenshot({path:'../设计参考与同步/设计稿/板块空间重组_v54.png'});
 assert.deepEqual(errors,[]);await fs.writeFile(root+'/验证.json',JSON.stringify({results,errors},null,2));console.log('Saved report long/partial chapters and stage editing passed at 3 widths');
}finally{await b.close();}
