import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {KEY,scenarioState} from '../src/model.js';

const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:5184';
const dir='检查记录/全链路再审_20261022';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),checks=[],errors=[];
page.setDefaultTimeout(10000);
page.on('pageerror',error=>errors.push({url:page.url(),message:error.message}));
const check=(name,details={})=>{checks.push({name,status:'pass',...details});console.log('PASS '+name);};
const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
try{
 await page.goto(base+'/app');
 const sample=scenarioState('PT03');sample.claimDraft.title='跨页面返回草稿';sample.claimDraft.text='本人尚未完成的草稿';
 await page.evaluate(({sample,key})=>{localStorage.setItem(key,JSON.stringify(sample));localStorage.setItem('career-prototype-language','zh');localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));},{sample,key:KEY});
 await page.goto(base+'/careers');
 await page.getByRole('combobox',{name:'候选来源',exact:true}).selectOption('兴趣探索');
 await page.locator('.sidebar a[href="/assessment"]').click();
 await page.locator('a[href*="tab=原文确认"]').first().click();
 const review=page.locator('#assessment-review');
 assert.equal(await review.locator('select').inputValue(),'全部');
 assert.equal(await review.locator('.record').count(),4);
 assert.equal((await state()).claims.length,4);
 check('职业筛选不会隐藏材料队列',{careerFilter:'兴趣探索',claimFilter:'全部',visibleMaterials:4});
 await review.evaluate(el=>el.scrollIntoView({block:'start'}));
 await page.screenshot({path:dir+'/材料队列_筛选隔离.png'});
 await review.locator('select').selectOption('矛盾');
 assert.equal(await review.locator('.record').count(),1);
 await page.locator('.sidebar a[href="/careers"]').click();
 assert.equal(await page.getByRole('combobox',{name:'候选来源',exact:true}).inputValue(),'兴趣探索');
 assert.equal(await page.locator('.occupation-grid article').count(),10);
 await page.locator('.sidebar a[href="/assessment"]').click();
 await page.locator('a[href*="tab=原文确认"]').first().click();
 assert.equal(await review.locator('select').inputValue(),'矛盾');
 assert.equal(await review.locator('.record').count(),1);
 check('职业与材料筛选分别保留自己的选择');
 const originalClaims=JSON.stringify((await state()).claims);
 await review.getByRole('button',{name:'修正 / 确认此项',exact:true}).click();
 await page.getByRole('dialog').waitFor();
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('dialog').count(),0);
 assert.equal(JSON.stringify((await state()).claims),originalClaims);
 assert.equal(await review.locator('.record').count(),1);
 check('取消材料确认返回原队列且不改确认状态');
 assert.equal(await page.locator('.flow-back').getAttribute('href'),'/assessment?tab=资料经历');
 await page.locator('.flow-back').click();
 assert.equal(new URL(page.url()).searchParams.get('tab'),'资料经历');
 assert.equal(await page.locator('.experience-writer').count(),1);
 assert.equal(await page.getByRole('textbox',{name:'经历标题（必填）',exact:true}).inputValue(),'跨页面返回草稿');
 check('核对页返回资料填写页并恢复草稿');
 await page.locator('.experience-writer').evaluate(el=>el.scrollIntoView({block:'start'}));
 await page.screenshot({path:dir+'/返回资料填写_草稿保留.png'});
 const oldRoute=new URL('/assessment?tab=我的画像&mapReturn=%2Fcareer-map%3Fcareer%3Dops%26node%3Dbranch%253Aops#profile-evidence',base);
 await page.goto(oldRoute.href);
 await page.waitForURL(url=>url.searchParams.get('tab')==='成果档案');
 assert.equal(new URL(page.url()).searchParams.get('tab'),'成果档案');
 assert.ok(await page.locator('#profile-evidence').isVisible());
 assert.equal(await page.getByRole('link',{name:'返回刚才的地图位置 →',exact:true}).getAttribute('href'),'/career-map?career=ops&node=branch%3Aops');
 check('旧画像链接保留材料档案锚点及地图返回对象');
 for(const [route,title,returnTo] of [
  ['/work/missing-task','任务不存在或不属于当前示例账户','/plan'],
  ['/reports/missing-report','找不到这份报告','/reports'],
  ['/plan?tab=执行&practice=missing-task','未找到这项实践行动','/plan?tab=执行'],
  ['/careers?tab=我的机会&job=missing-job','找不到这条岗位记录','/careers?tab=我的机会']
 ]){
  await page.goto(base+route);assert.ok(await page.getByRole('heading',{name:title,exact:true}).isVisible());
  assert.ok(await page.locator('main a').evaluateAll((links,to)=>links.some(a=>a.getAttribute('href')===to),returnTo));
  check('失效对象保留恢复入口',{route,returnTo});
 }
 assert.deepEqual(errors,[]);
}finally{
 await browser.close();
 await fs.writeFile(dir+'/跨页链路回归.json',JSON.stringify({checks,errors},null,2));
}
