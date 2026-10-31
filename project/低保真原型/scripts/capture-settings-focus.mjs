import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {KEY,scenarioState} from '../src/model.js';

const phase=process.argv[2]||'before';
const dir=`检查记录/链路与布局聚焦_20261022/${phase}`;
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const context=await browser.newContext({reducedMotion:'reduce'});
const p=await context.newPage(),errors=[],results=[];
const measurements=[];
p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
const state=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
async function load(width=1440,lang='zh',route='/settings'){
  await p.setViewportSize({width,height:width<720?844:900});
  await p.goto('http://127.0.0.1:5184/plan');
  const s=scenarioState('PT01');
  await p.evaluate(({s,k,lang})=>{
    localStorage.setItem(k,JSON.stringify(s));
    localStorage.setItem('career-prototype-language',lang);
    localStorage.setItem('career-prototype-sidebar-v1','expanded');
    localStorage.setItem('career-prototype-operation-guide-v1','{"enabled":false,"neverPrompt":true}');
  },{s,k:KEY,lang});
  await p.goto('http://127.0.0.1:5184'+route);
  await p.locator('#main .screen-heading h1').waitFor();
}
try{
  if(phase==='before'){
    for(const width of [1440,390]){await load(width);await p.screenshot({path:`${dir}/${width}-设置.png`,fullPage:true});}
  }else{
    await load();
    const initial=await state();
    assert.equal(await p.locator('.settings-focus-editor').count(),0);
    assert.equal(await p.locator('.settings-focus-summary>div').count(),5);
    await p.screenshot({path:`${dir}/1440-设置.png`,fullPage:true});
    await p.getByRole('button',{name:'编辑长期偏好',exact:true}).focus();await p.keyboard.press('Space');
    assert.equal(await p.locator('.settings-focus-editor input,.settings-focus-editor select,.settings-focus-editor textarea').count(),5);
    await p.getByLabel('兴趣（自述）').fill('数据分析与可视化');
    await p.getByLabel('地域偏好（可保持未知）').fill('上海；可接受远程');
    await p.getByLabel('地域 / 时间 / 值守约束').fill('工作日晚上可学习，每周不固定');
    await p.getByLabel('长期探索意图').selectOption('目标已定');
    await p.getByLabel('当前学习阶段').selectOption('研究生在读');
    await p.screenshot({path:`${dir}/1440-设置展开.png`,fullPage:true});
    await p.getByRole('switch').uncheck();
    await p.waitForTimeout(100);
    const changed=await state();
    assert.equal(changed.preferences.interest,'数据分析与可视化');assert.equal(changed.preferences.location,'上海；可接受远程');
    assert.equal(changed.preferences.intent,'目标已定');assert.equal(changed.preferences.stage,'研究生在读');assert.equal(changed.notifications,false);
    assert.deepEqual(changed.tasks,initial.tasks);assert.equal(changed.analysis,initial.analysis);
    await p.reload();await p.locator('.settings-focus-summary').waitFor();
    assert.equal(await p.locator('.settings-focus-editor').count(),0);
    assert.match(await p.locator('.settings-focus-summary').innerText(),/数据分析与可视化/);assert.equal(await p.getByRole('switch').isChecked(),false);
    await p.getByRole('button',{name:'查看保存回执',exact:true}).click();assert.match(await p.locator('.toast').innerText(),/偏好已保存/);
    await p.getByRole('link',{name:'预览对计划的影响',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/plan');
    results.push('五字段按需展开、键盘、实时保存、刷新恢复、回执和计划链接通过；不改任务或评估');
    await load(1440,'zh','/settings?section=feedback');assert.equal(await p.locator('#settings-feedback').getAttribute('open')!==null,true);
    await p.getByRole('link',{name:'资料与隐私',exact:true}).click();assert.equal(await p.locator('#settings-authorization').isVisible(),true);assert.equal(await p.locator('#settings-data').isVisible(),true);
    results.push('反馈深链与资料隐私入口保留');
    for(const width of [390,320]){
      await load(width);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await p.screenshot({path:`${dir}/${width}-设置.png`,fullPage:true});
      measurements.push({width,language:'zh',...(await p.locator('.settings-focus-page').evaluate(e=>({pageHeight:Math.round(document.documentElement.scrollHeight),settingsHeight:Math.round(e.getBoundingClientRect().height),visibleInputs:[...e.querySelectorAll('input,select,textarea')].filter(x=>x.getBoundingClientRect().height>0).length,tabDirection:getComputedStyle(e.querySelector('.tabs')).flexDirection,tabNames:[...e.querySelectorAll('.tabs a')].map(x=>x.innerText)})))});
      await p.getByRole('button',{name:'编辑长期偏好',exact:true}).click();
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const fields=await p.locator('.settings-focus-editor input,.settings-focus-editor select,.settings-focus-editor textarea').evaluateAll(es=>es.map(e=>({font:parseFloat(getComputedStyle(e).fontSize),height:e.getBoundingClientRect().height})));
      assert.ok(fields.every(f=>f.font>=16&&f.height>=44));
      await p.screenshot({path:`${dir}/${width}-设置展开.png`,fullPage:true});
    }
    results.push('390 / 320 手机无横向溢出；输入字号至少 16px，控件至少 44px');
    for(const width of [1440,390,320]){
      await load(width,'en');
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const text=await p.locator('.settings-focus-preferences,.settings-focus-notifications').allInnerTexts();
      assert.doesNotMatch(text.join('\n'),/[\u3400-\u9fff]/);
      await p.screenshot({path:`${dir}/${width}-en-设置.png`,fullPage:true});
      await p.locator('.settings-focus-title button').click();
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      if(width===390)await p.screenshot({path:`${dir}/${width}-en-设置展开.png`,fullPage:true});
    }
    results.push('1440 / 390 / 320 英文默认与展开布局无横向溢出，新增静态文案无中文遗漏');
  }
}finally{
  if(phase!=='before')await fs.writeFile(`${dir}/设置验收.json`,JSON.stringify({results,errors,measurements},null,2));
  await browser.close();
}
console.log(JSON.stringify({phase,results,errors}));if(errors.length)process.exitCode=1;
