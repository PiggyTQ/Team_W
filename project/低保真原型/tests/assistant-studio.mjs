import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {KEY, scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';

// Real Microsoft Edge, isolated synthetic data, browser zoom 100%.
const base = 'http://127.0.0.1:5187';
const dir = '检查记录/AI工作台视觉重设计_20261023';
const companionKey = 'career-prototype-sidebar-companion-v1';
const englishOnly = process.argv.includes('--en-final-only');
const results = [], checks = [], errors = [];
const empty = scenarioState('PT04');
empty.conversations = [{id:'studio-conv-1', title:'职业规划讨论', messages:[], mode:'职业咨询'}];
empty.conversationId = 'studio-conv-1';
empty.aiDraft = '';
empty.proposal = null;
const messages = structuredClone(empty);
messages.conversations[0].messages = [
  {id:'studio-q-1', role:'user', text:'请帮我比较不同方向，并保留还没有验证的问题。', scope:['职业原创知识'], claimRefs:[]},
  {id:'studio-a-1', role:'assistant', text:'这是预录合成测试回答。可以先比较工作任务，再核对已有材料与待验证问题。每周预算、先修与实际产物仍需在业务页确认；没有记录的部分保持未知。', scope:['职业原创知识'], claimRefs:[]},
];
const long = structuredClone(messages);
long.conversations[0].title = '职业方向与项目经历的长期讨论记录 · 合成排版检查标题';
long.conversations[0].messages[1].text = ('先缩小讨论范围，再确认已有记录。不能据此推断个人能力或实际完成进度。').repeat(15) + ' LongUnbrokenSyntheticIdentifier'.repeat(8);
long.aiDraft = '这是一段尚未发送的长问题。'.repeat(20) + ' SyntheticUnbrokenDraftIdentifier'.repeat(5);

await fs.mkdir(dir, {recursive:true});
const browser = await chromium.launch({channel:'msedge', headless:false, args:['--no-proxy-server']});
const context = await browser.newContext({deviceScaleFactor:1, reducedMotion:'reduce'});
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror', error => errors.push(error.message));

async function load(state=empty, viewport=[1440,900], lang='zh', collapsed=false) {
  await page.setViewportSize({width:viewport[0], height:viewport[1]});
  if (!page.url().startsWith(base)) await page.goto(`${base}/app`);
  await page.evaluate(({KEY, state, guideKey, companionKey, lang, collapsed}) => {
    localStorage.setItem(KEY, JSON.stringify(state));
    localStorage.setItem('career-prototype-language', lang);
    localStorage.setItem('career-prototype-sidebar-v1', collapsed?'collapsed':'expanded');
    localStorage.setItem(guideKey, JSON.stringify({enabled:false, neverPrompt:true, seen:[], active:null}));
    localStorage.setItem(companionKey, JSON.stringify({hidden:false, sleeping:false}));
  }, {KEY, state, guideKey:OPERATION_GUIDE_KEY, companionKey, lang, collapsed});
  await page.goto(`${base}/assistant`, {waitUntil:'networkidle'});
  await page.locator('#main.student-workspace .ai-chat-surface').waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function inspect(name, {capture=true, layout=true}={}) {
  const result = await page.evaluate(() => {
    const main = document.querySelector('#main'), mainRect = main.getBoundingClientRect();
    const roots = [main, ...document.querySelectorAll('dialog[open]')];
    const visible = element => {
      if (!element.checkVisibility() || element.closest('svg,.sr-only,[aria-hidden="true"]')) return false;
      const r = element.getBoundingClientRect(), css = getComputedStyle(element);
      if (!r.width || !r.height || css.visibility==='hidden') return false;
      for (let ancestor=element; ancestor; ancestor=ancestor.parentElement) {
        if (ancestor.tagName==='DETAILS' && !ancestor.open && !ancestor.querySelector(':scope > summary')?.contains(element)) return false;
        const ar = ancestor.getBoundingClientRect(), ac = getComputedStyle(ancestor);
        if (/hidden|clip|scroll|auto/.test(ac.overflowX) && (r.right<=ar.left || r.left>=ar.right)) return false;
        if (/hidden|clip|scroll|auto/.test(ac.overflowY) && (r.bottom<=ar.top || r.top>=ar.bottom)) return false;
      }
      return r.right>0 && r.left<innerWidth && r.bottom>0 && r.top<innerHeight;
    };
    const isNativeField = element => element.matches('input,textarea,select,option');
    const horizontalOverflow = roots.flatMap(root => [...root.querySelectorAll('*')])
      .filter(element => visible(element) && !isNativeField(element) && getComputedStyle(element).overflowX==='visible' && element.scrollWidth>element.clientWidth+3)
      .slice(0,16).map(element => ({className:typeof element.className==='string'?element.className:'', text:element.textContent.trim().slice(0,55), pixels:element.scrollWidth-element.clientWidth}));
    const controlTextOverflow = [];
    const controls = [...document.querySelectorAll('#main button,#main summary,dialog[open] button,dialog[open] summary,.sidebar-companion button')];
    for (const control of controls.filter(visible)) {
      const box = control.getBoundingClientRect(), walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT);
      let node;
      while ((node=walker.nextNode())) {
        if (!node.textContent.trim() || !visible(node.parentElement)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const text of range.getClientRects()) {
          if (text.width>0 && (text.left<box.left-3 || text.right>box.right+3 || text.top<box.top-3 || text.bottom>box.bottom+3)) {
            controlTextOverflow.push({className:control.className, text:node.textContent.trim().slice(0,55), control:{x:box.x,y:box.y,width:box.width,height:box.height}, textBox:{x:text.x,y:text.y,width:text.width,height:text.height}});
          }
        }
      }
    }
    const boxes = Object.fromEntries(['.assistant-page','.assistant-section-bar','.ai-chat-surface','.empty-chat-home','.empty-chat-intro','.chat-toolbar','.chat-scope-summary','.chat-composer','.empty-prompt-starts','.chat-stream','.chat-send','.sidebar-companion'].map(selector => {
      const element = document.querySelector(selector);
      if (!element) return [selector,null];
      const box = element.getBoundingClientRect();
      return [selector,{x:Math.round(box.x),y:Math.round(box.y),width:Math.round(box.width),height:Math.round(box.height),bottom:Math.round(box.bottom)}];
    }));
    const heading = main.querySelector('h1'), field = main.querySelector('#assistant-question');
    const send = main.querySelector('.has-messages .chat-send');
    const sendRect = send?.getBoundingClientRect();
    const demoSummary = main.querySelector('.chat-demo-menu > summary');
    let demoMenu = null;
    if (demoSummary) {
      const rect = demoSummary.getBoundingClientRect(), range = document.createRange();
      range.selectNodeContents(demoSummary);
      demoMenu = {width:rect.width,height:rect.height,whiteSpace:getComputedStyle(demoSummary).whiteSpace,textLines:new Set([...range.getClientRects()].filter(rect=>rect.width>0).map(rect=>Math.round(rect.top))).size};
    }
    const sidebar = document.querySelector('#workspace-sidebar'), nav = sidebar?.querySelector('.sidebar-links');
    const selected = nav?.querySelector('a[aria-current=page]');
    let selectedNavigation = null, companionMaterial = null;
    if (innerWidth>720 && nav && selected) {
      const viewport = nav.getBoundingClientRect(), item = selected.getBoundingClientRect();
      selectedNavigation = {label:selected.getAttribute('aria-label'),scrollTop:nav.scrollTop,viewport:{top:viewport.top,bottom:viewport.bottom},item:{top:item.top,bottom:item.bottom},inView:item.top>=viewport.top-2 && item.bottom<=viewport.bottom+2};
    }
    const companion = document.querySelector('.sidebar-companion'), pet = companion?.querySelector('.sidebar-companion-pet');
    if (innerWidth>720 && pet?.checkVisibility()) {
      const css = getComputedStyle(pet);
      companionMaterial = {color:css.color,background:css.backgroundColor,controls:[...companion.querySelectorAll('.sidebar-companion-controls button')].map(button=>getComputedStyle(button).backgroundColor)};
    }
    return {
      url:location.href, width:innerWidth, height:innerHeight, zoom:getComputedStyle(document.documentElement).zoom,
      language:localStorage.getItem('career-prototype-language'), collapsed:document.querySelector('#workspace-sidebar')?.dataset.collapsed,
      mainOverflow:main.scrollWidth-main.clientWidth, documentOverflow:document.documentElement.scrollWidth-innerWidth,
      mainScrollHeight:main.scrollHeight, mainViewportHeight:Math.round(mainRect.height),
      headingFont:heading?getComputedStyle(heading).fontSize:null, inputFont:field?getComputedStyle(field).fontSize:null,
      horizontalOverflow, controlTextOverflow:controlTextOverflow.slice(0,16),
      sendOutsideViewport:!!sendRect && innerWidth>720 && (sendRect.bottom>innerHeight+2 || sendRect.right>innerWidth+2),
      demoMenu,selectedNavigation,companionMaterial,
      boxes,
    };
  });
  results.push({name, layout, ...result});
  if (capture) {
    await page.screenshot({path:`${dir}/${name}.png`});
    if (result.width<=720) await page.screenshot({path:`${dir}/${name}-full.png`,fullPage:true});
  }
  return result;
}

const readState = () => page.evaluate(KEY => JSON.parse(localStorage.getItem(KEY)), KEY);
const businessState = state => JSON.stringify(Object.fromEntries(['tasks','claims','goal','budget','planVersion','profileVersion','analysis','learningStages'].map(key => [key,state[key]])));
async function managementButton(pattern) {
  const bar = page.locator('.assistant-section-bar');
  const button = bar.getByRole('button', {name:pattern});
  if (!(await button.isVisible())) await bar.locator('.assistant-management-menu > summary').click();
  return button;
}

try {
  if (!englishOnly) {
  // 20 layout cases: empty, conversation, small laptop, English, sidebar collapse and long data.
  for (const [width,height] of [[1440,900],[1366,768],[1280,650],[1024,768],[390,844],[320,720]]) {
    for (const [stateName,state] of [['empty',empty],['messages',messages]]) {
      await load(state,[width,height]);
      await inspect(`${stateName}-${width}x${height}-zh`);
    }
  }
  for (const viewport of [[1440,900],[1024,768],[390,844]]) {
    await load(empty,viewport,'en');
    await inspect(`empty-${viewport.join('x')}-en`);
  }
  for (const viewport of [[1024,768],[390,844]]) {
    await load(messages,viewport,'en');
    await inspect(`messages-${viewport.join('x')}-en`);
  }
  await load(empty,[1440,900],'zh',true);
  await inspect('empty-1440x900-collapsed');
  await load(messages,[1024,768],'zh',true);
  await inspect('messages-1024x768-collapsed');
  await load(long,[1280,650]);
  await inspect('long-data-1280x650-zh');
  for (const viewport of [[1440,900],[390,844]]) {
    await load(empty,viewport);
    await page.goto(`${base}/assistant?tab=${encodeURIComponent('自然语言检索')}`,{waitUntil:'networkidle'});
    await page.locator('#main').waitFor();
    await inspect(`search-${viewport.join('x')}-zh`);
  }

  await load();
  const initialBusiness = businessState(await readState());
  const initialCount = (await readState()).conversations[0].messages.length;
  await page.locator('.empty-prompt-starts button').first().click();
  const promptDraft = await page.locator('#assistant-question').inputValue();
  assert.ok(promptDraft.length>0, 'A prompt starter should populate the draft.');
  assert.equal((await readState()).conversations[0].messages.length,initialCount, 'A prompt starter must not send a question.');
  checks.push('问题起点仅填写草稿，点击后未发送');

  const mode = page.locator('.composer-controls select');
  assert.equal(await mode.locator('option').count(),6, 'All six existing consultation modes remain available.');
  await mode.selectOption('计划推演');
  assert.equal((await readState()).conversations[0].mode,'计划推演');
  assert.equal(await page.locator('#assistant-question').inputValue(),promptDraft);
  checks.push('六种咨询模式保留，切换模式不丢失问题');

  await page.locator('.chat-toolbar button').click();
  const scope = page.locator('dialog[open]').filter({has:page.locator('#dialog-title')});
  await scope.waitFor();
  assert.match(await scope.locator('#dialog-title').innerText(),/资料/);
  await inspect('behavior-scope-open',{layout:false});
  await scope.getByRole('button',{name:'关闭面板',exact:true}).click();
  await scope.waitFor({state:'hidden'});
  assert.equal(await page.locator('#assistant-question').inputValue(),promptDraft);
  checks.push('资料范围面板可打开关闭，关闭后草稿保留');

  await page.locator('.chat-send').click();
  await page.locator('.has-messages .chat-stream').waitFor();
  assert.equal(await page.locator('.chat-message').count(),2);
  const sent = await readState();
  assert.equal(sent.conversations[0].messages[0].text,promptDraft);
  assert.equal(sent.conversations[0].messages[1].role,'assistant');
  assert.equal(sent.aiDraft,'');
  assert.equal(businessState(sent),initialBusiness, 'A simulated answer must not mutate business records.');
  await inspect('behavior-sent-answer',{layout:false});
  checks.push('实际发送生成原模拟问答并清空已发送草稿，任务与材料状态保持原值');

  const draft = '保留这个未发送的问题：我想先比较两种项目范围。';
  await page.locator('#assistant-question').fill(draft);
  await (await managementButton(/历史讨论/)).click();
  await page.locator('.chat-history-drawer[open]').waitFor();
  await inspect('behavior-history-open',{layout:false});
  await page.locator('.chat-history-drawer header button').click();
  await page.locator('.chat-history-drawer').waitFor({state:'hidden'});
  assert.equal(await page.locator('#assistant-question').inputValue(),draft);
  const focusReturned = await page.evaluate(() => !!document.activeElement?.closest('.assistant-section-bar'));
  assert.equal(focusReturned,true, 'Closing history should return focus to its originating toolbar.');
  checks.push('历史抽屉开关保留草稿，关闭后焦点回到管理工具');

  await (await managementButton(/新建讨论/)).click();
  await page.locator('.is-empty').waitFor();
  assert.equal(await page.locator('#assistant-question').inputValue(),draft);
  assert.equal((await readState()).conversations.length,2);
  assert.equal((await readState()).conversations[0].messages.length,2);
  checks.push('新建讨论保留原会话与未发送草稿');

  await page.locator('.chat-demo-menu > summary').click();
  await page.getByRole('button',{name:'模拟 AI 失败',exact:true}).click();
  await page.locator('.chat-inline-error').waitFor();
  assert.equal(await page.locator('#assistant-question').inputValue(),draft);
  assert.equal(await page.locator('.chat-demo-menu').evaluate(element => element.open),false);
  await inspect('behavior-failure-draft',{layout:false});
  checks.push('模拟失败显示错误并关闭演示菜单，未发送草稿保留');

  // Companion state belongs only to UI preferences, with direct keyboard controls.
  await load();
  const pet = page.getByTestId('companion-pet'), companion = page.locator('.sidebar-companion');
  const petBusiness = businessState(await readState());
  await pet.scrollIntoViewIfNeeded();
  await pet.focus();
  await pet.press('Enter');
  assert.match(await companion.getByRole('status').innerText(),/摸摸收到/);
  await pet.click();
  await page.waitForFunction(() => document.querySelector('.sidebar-companion')?.dataset.petting==='true');
  assert.equal(await pet.locator('.sidebar-companion-tail').evaluate(element=>getComputedStyle(element).transform),'none','Reduced motion keeps the companion still.');
  const rest = page.getByTestId('companion-rest');
  await rest.focus();
  await rest.press('Enter');
  assert.equal(await companion.getAttribute('data-sleeping'),'true');
  await rest.press('Enter');
  assert.equal(await companion.getAttribute('data-sleeping'),'false');
  const hide = page.getByTestId('companion-hide');
  await hide.focus();
  await hide.press('Enter');
  assert.equal(await companion.getAttribute('data-hidden'),'true');
  const restore = page.getByTestId('companion-restore');
  await restore.focus();
  await restore.press('Enter');
  assert.equal(await companion.getAttribute('data-hidden'),'false');
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).hidden,companionKey),false);
  assert.equal(businessState(await readState()),petBusiness);
  checks.push('侧栏伙伴支持键盘摸摸、休息/唤醒、隐藏/恢复；只保存界面偏好');
  await rest.focus();
  await rest.press('Enter');
  assert.equal(await companion.getAttribute('data-sleeping'),'true');
  await page.locator('.sidebar-toggle').click();
  await pet.scrollIntoViewIfNeeded();
  await pet.focus();
  await pet.press('Enter');
  assert.equal(await companion.getAttribute('data-sleeping'),'false');
  const collapsedPet = await pet.boundingBox();
  assert.ok(collapsedPet && collapsedPet.width>=40 && collapsedPet.height>=40, 'Collapsed companion remains a reachable button.');
  checks.push('侧栏收起后保留可键盘操作的伙伴入口');
  await inspect('behavior-companion-collapsed',{layout:false});

  await load(empty,[390,844]);
  assert.equal(await page.locator('#assistant-question').evaluate(element => getComputedStyle(element).fontSize),'16px');
  await page.locator('#assistant-question').fill('手机宽度下的合成发送检查');
  await page.locator('.chat-send').scrollIntoViewIfNeeded();
  await page.locator('.chat-send').click();
  await page.locator('.has-messages .chat-stream').waitFor();
  assert.equal(await page.locator('.chat-message').count(),2);
  await inspect('behavior-mobile-sent',{layout:false});
  checks.push('手机输入框为16px，真实点击发送后原模拟会话正常显示');
  } else {
    for (const viewport of [[1440,900],[1024,768],[390,844]]) {
      await load(empty,viewport,'en');
      assert.equal(await page.locator('#assistant-question').getAttribute('placeholder'),'Describe what you want to work through. For example: I have three hours a week. Where should I start?');
      assert.equal(await page.locator('.assistant-section-bar button').filter({hasText:/History/}).count(),1);
      await inspect(`empty-${viewport.join('x')}-en`);
    }
    checks.push('最终英文翻译更新后，3种宽度的输入提示与历史工具均为英文');
  }

  const problems = results.filter(result => result.documentOverflow>3 || result.mainOverflow>3 || result.horizontalOverflow.length || result.controlTextOverflow.length || result.sendOutsideViewport || result.zoom!=='1'
    || (result.width<=720 && result.demoMenu && (result.demoMenu.width<70 || result.demoMenu.textLines!==1))
    || result.selectedNavigation?.inView===false
    || (result.companionMaterial && (result.companionMaterial.color!=='rgb(250, 247, 237)' || !['rgb(86, 119, 98)','rgb(72, 105, 83)'].includes(result.companionMaterial.background) || result.companionMaterial.controls.some(color=>color!=='rgba(0, 0, 0, 0)'))));
  console.log(JSON.stringify({browser:browser.version(),layoutCases:results.filter(result=>result.layout).length,behaviorScreenshots:results.filter(result=>!result.layout).length,checks,errors,problems},null,2));
  assert.deepEqual(errors,[],'No page runtime errors.');
  assert.deepEqual(problems,[],'No visible horizontal overflow, escaped control text or inaccessible desktop send button.');
} finally {
  await fs.writeFile(`${dir}/${englishOnly?'en-final-results':'results'}.json`,JSON.stringify({browser:browser.version(),results,checks,errors},null,2));
  await browser.close();
}
