import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']}),p=await b.newPage();
const results=[];
try{
 for(const width of [1440,390])for(const lang of ['zh','en']){
  await p.setViewportSize({width,height:width===390?844:1000});await p.goto('http://127.0.0.1:5184/');await p.evaluate(({KEY,s,lang})=>{localStorage.setItem(KEY,JSON.stringify(s));localStorage.setItem('career-prototype-language',lang)},{KEY,s:scenarioState('PT04'),lang});await p.goto('http://127.0.0.1:5184/career-map?tab=职业关系&node=relation');await p.locator('.atlas-bridge').waitFor();
  const hero=await p.locator('.atlas-hero').boundingBox(),common=await p.locator('.atlas-bridge-common').boundingBox();assert.ok(hero.y+hero.height<=common.y+2,`${width} ${lang} heading overlap`);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:`检查记录/工作透镜_v41/${width}-${lang}-关系最终.png`});results.push({width,lang,status:'pass',headingClear:true});
 }
 await p.setViewportSize({width:1440,height:1000});await p.goto('http://127.0.0.1:5184/career-map?tab=技能先修');await p.locator('.atlas-step-range input').waitFor();
 const box=await p.locator('.atlas-step-range input').boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width-5,box.y+box.height/2,{steps:8});await p.mouse.up();assert.equal(await p.locator('.atlas-visual').getAttribute('data-step'),'2');
 const dt=await p.evaluateHandle(()=>{const t=new DataTransfer();t.setData('application/x-career-material','claim-sql');return t});await p.locator('.atlas-visual').dispatchEvent('drop',{dataTransfer:dt});assert.equal(await p.locator('.atlas-station.has-evidence').count(),1);assert.equal(await p.locator('.atlas-station.has-evidence').getAttribute('data-skill'),'sql');
 const projection=await p.locator('.atlas-projection').boundingBox(),quality=await p.locator('[data-skill="quality"] .atlas-station-label').boundingBox();assert.ok(projection.y+projection.height<quality.y||projection.x+projection.width<quality.x||projection.x>quality.x+quality.width,'projection must not cover quality label');results.push({name:'实际鼠标游标拖动、材料拖放与投影避让',status:'pass'});
 await fs.writeFile('检查记录/工作透镜_v41/最终确认.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await b.close();}
