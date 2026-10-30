import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const root='检查记录/首页全屏舞台_v60';await fs.mkdir(root,{recursive:true});const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const p=await b.newPage(),results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
try{for(const [width,height]of [[2514,1399],[1920,1080],[1440,900],[1024,720],[390,844]]){
 await p.setViewportSize({width,height});await p.goto('http://127.0.0.1:5184');await p.waitForTimeout(700);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 for(const [name,selector]of [['成果','.outcome-pinned-panel'],['起点','#starting-points'],['流程','.sj-stage'],['职业','.career-gallery-stage'],['案例','.story-scene'],['说明','#before-start'],['结尾','.tail-closing']]){
  const el=p.locator(selector).first();await el.evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY-24,behavior:'instant'}));await p.waitForTimeout(800);
  const box=await el.boundingBox();if(width>=1024&&height>=850&&name!=='案例')assert.ok(box.height>=height-66,name+JSON.stringify(box));
  results.push({width,height,name,box});if(width!==1024)await p.screenshot({path:root+`/${width}-${name}.png`});
 }
 if(width>=1024){await p.locator('#outcomes').evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY-16,behavior:'instant'}));await p.waitForTimeout(700);await p.getByRole('button',{name:'下一个展示步骤',exact:true}).click();await p.waitForTimeout(650);assert.match(await p.locator('.outcome-counter').innerText(),/02/);}
}assert.deepEqual(errors,[]);await fs.writeFile(root+'/验证.json',JSON.stringify({results,errors},null,2));await p.goto('file:///C:/Users/tsnbx/Desktop/team/project/设计参考与同步/设计稿/首页全屏舞台_v60.svg');await p.setViewportSize({width:1440,height:880});await p.screenshot({path:'../设计参考与同步/设计稿/首页全屏舞台_v60.png'});console.log('PASS 5 screen sizes and 7 home stages');}finally{await b.close();}
