import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';

const dir='检查记录/评估主页面整合_20261022';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage(),results=[],errors=[];
page.setDefaultTimeout(7000);
page.on('pageerror',e=>errors.push(e.message));
const mapReturn='/career-map?career=ops';
async function load(route,width=1440,scene='PT05'){
  await page.setViewportSize({width,height:width<700?844:1000});
  await page.goto('http://127.0.0.1:5184/plan');
  await page.evaluate(({state,key})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('career-prototype-language','zh');localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));},{state:scenarioState(scene),key:KEY});
  await page.goto('http://127.0.0.1:5184'+route);
  await page.locator('.assessment-hub').waitFor();
}
const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const position=()=>page.locator('#profile-evidence').evaluate(el=>({focused:document.activeElement===el,top:el.getBoundingClientRect().top,titleBottom:el.querySelector('h2').getBoundingClientRect().bottom,height:innerHeight}));
async function check(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(error){results.push({name,status:'fail',error:error.message});console.log('FAIL',name,error.message);await page.screenshot({path:dir+'/复核修正失败-'+results.length+'.png'});}}
try{
  await check('R1：带地图返回实际点击四个入口，同时保留href、URL锚点与区块焦点',async()=>{
    for(const [index,id] of ['assessment-review','assessment-profile','assessment-analysis','assessment-resumes'].entries()){
      await load('/assessment?mapReturn='+encodeURIComponent(mapReturn));
      const a=page.locator('.assessment-hub-jumps>a').nth(index),href=new URL(await a.getAttribute('href'),'http://127.0.0.1:5184');
      assert.equal(href.searchParams.get('mapReturn'),mapReturn);
      assert.equal(href.hash,'#'+id);
      await a.click();
      await page.waitForFunction(id=>document.activeElement?.id===id,id);
      const url=new URL(page.url());
      assert.equal(url.hash,'#'+id);
      assert.equal(url.searchParams.get('mapReturn'),mapReturn);
    }
  });
  await check('R1：已有地图返回上下文的画像档案锚点仍可点击定位',async()=>{
    await load('/assessment?mapReturn='+encodeURIComponent(mapReturn));
    await page.locator('.assessment-hub-jumps>a').nth(1).click();
    const a=page.locator('#assessment-profile a[href="#profile-evidence"]');
    assert.equal(await a.count(),1);
    await a.click();
    await page.waitForFunction(()=>document.activeElement?.id==='profile-evidence');
    assert.equal(new URL(page.url()).hash,'#profile-evidence');
    assert.equal(new URL(page.url()).searchParams.get('mapReturn'),mapReturn);
  });
  for(const [width,activation] of [[1440,'mouse'],[390,'keyboard']]){
    await check('R2：'+width+'宽度首击/键盘一次展开并聚焦档案，查看不改变业务记录',async()=>{
      await load('/assessment',width);
      const before=await state();
      assert.equal(await page.locator('#profile-evidence').count(),0);
      const button=page.getByRole('button',{name:'查看全部材料 ↓',exact:true});
      if(activation==='keyboard'){await button.focus();await button.press('Enter');}else await button.click();
      await page.waitForFunction(()=>document.activeElement?.id==='profile-evidence');
      const pos=await position();
      assert.equal(pos.focused,true);
      assert.ok(pos.top>=-1&&pos.titleBottom<pos.height,'档案标题应在视口内');
      const after=await state();
      for(const key of ['claims','goal','analysis','resumes','currentResumeByTarget','tasks','budget'])assert.deepEqual(after[key],before[key],key+'应保持');
      await page.screenshot({path:dir+'/实际截图/复核修正-'+width+'-档案定位-视口.png'});
    });
  }
  await check('R1/R2同范围：刷新后原桌面/手机总览仍显示两主模式与四区块',async()=>{
    for(const [width,scene,file] of [[1440,'PT05','desktop'],[390,'PT01','mobile']]){
      await load('/assessment',width,scene);
      assert.equal(await page.locator('.assessment-mode-tabs>a').count(),2);
      for(const id of ['assessment-review','assessment-profile','assessment-analysis','assessment-resumes'])assert.equal(await page.locator('#'+id).count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:'.impeccable/review/'+file+'.png'});
      await page.screenshot({path:dir+'/实际截图/复核修正-'+width+'-总览-视口.png'});
    }
  });
  assert.deepEqual(errors,[]);
}finally{
  await fs.writeFile(dir+'/独立复核修正确认.json',JSON.stringify({results,errors,note:'仅对独立复核R1/R2及直接回归定向执行，不是全站复测。'},null,2));
  await browser.close();
}
if(errors.length||results.some(r=>r.status==='fail'))process.exitCode=1;
