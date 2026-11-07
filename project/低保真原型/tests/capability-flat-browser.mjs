import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {KEY, scenarioState} from '../src/model.js';
import {capabilitySkills, puzzlePiecePath} from '../src/capability-puzzle-model.js';

const origin = process.env.CAREER_PREVIEW_ORIGIN || 'http://127.0.0.1:5184';
const output = 'checks/capability-flat-20261107', results = [], errors = [];
await mkdir(output, {recursive: true});
const browser = await chromium.launch({channel: process.env.CAREER_BROWSER_CHANNEL || 'msedge', headless: true});
const piece = (page, name) => page.locator(`.capability-piece[data-capability-id="${name}"]`);
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);

async function check(name, {language = 'zh', motion = 'reduce'} = {}, run) {
  const context = await browser.newContext({viewport: {width:1440,height:1000},reducedMotion:motion});
  const page = await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',error=>errors.push(error.message));
  try {
    const state=scenarioState('PT03');state.preferences.capabilityMastery={'表格处理':true,SQL:true,'数据质量':true};
    await page.goto(origin);await page.evaluate(({key,state,language})=>{
      localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('career-prototype-language',language);
      localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({enabled:false,neverPrompt:true}));
    },{key:KEY,state,language});
    await page.goto(origin+'/assessment?tab=准备总览#assessment-analysis');await page.locator('.capability-piece').first().waitFor();await page.evaluate(()=>document.fonts.ready);
    await run(page);results.push({name,status:'pass'});console.log('PASS',name);
  }catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL',name,error.message);await page.screenshot({fullPage:true,path:`${output}/failure-${name}.png`});}
  finally{await context.close();}
}

try{
  await check('flat-colors-icons-decoration-and-hover',{motion:'no-preference'},async page=>{
    const before=await read(page);
    assert.equal(await page.locator('.capability-board linearGradient,.capability-board radialGradient,.capability-board filter').count(),0);
    assert.equal(await page.locator('.capability-piece').count(),9);
    assert.equal(await page.locator('.capability-level-rail,.capability-piece-selection-dot').count(),0);
    assert.equal(await page.locator('.capability-skill-icon svg[aria-hidden="true"]').count(),9);
    assert.equal(await page.locator('.capability-piece-decoration[aria-hidden="true"]').count(),9);
    const icons=await page.locator('.capability-skill-icon svg').evaluateAll(elements=>elements.map(el=>el.innerHTML));
    assert.ok(new Set(icons).size>=6);
    for(const name of ['SQL','描述统计'])assert.equal(await piece(page,name).locator('.capability-piece-shape').evaluate(el=>getComputedStyle(el).fill),name==='SQL'?'rgb(247, 215, 124)':'rgb(148, 182, 214)');
    const target=piece(page,'描述统计'),bounds=await target.boundingBox();await target.hover();
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.capability-piece[data-capability-id="描述统计"] .capability-piece-wash')).opacity)>.09);
    const hoverBounds=await target.boundingBox();assert.ok(Math.abs(bounds.y-hoverBounds.y)<.1);assert.ok(Math.abs(bounds.x-hoverBounds.x)<.1);
    assert.equal(await target.evaluate(el=>getComputedStyle(el).filter),'none');
    await target.click();assert.equal(await page.locator('.capability-detail h3').innerText(),'描述统计');
    assert.equal(await target.getAttribute('aria-pressed'),'true');
    await page.mouse.move(20,20);await page.locator('.capability-puzzle').screenshot({animations:'disabled',path:`${output}/flat-icons-desktop.png`});
    assert.deepEqual(await read(page),before);
    await page.locator('.hub-direction select').selectOption('ai');await piece(page,'错误分析').click();
    assert.equal(await page.locator('.capability-skill-icon svg').count(),9);
    await page.locator('.capability-puzzle').screenshot({animations:'disabled',path:`${output}/flat-ai-icons.png`});
  });

  await check('selected-zoom-stacking-and-right-column-centering',{motion:'no-preference'},async page=>{
    const before=await read(page);
    for(const width of [1440,1920]){
      await page.setViewportSize({width,height:1080});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const layout=await page.evaluate(()=>{
        const row=document.querySelector('.capability-puzzle-layout'),bounds=row.getBoundingClientRect(),detail=row.querySelector('.capability-detail').getBoundingClientRect(),board=row.querySelector('.capability-board').getBoundingClientRect();
        const rightStart=detail.right+parseFloat(getComputedStyle(row).columnGap);
        return {centerError:Math.abs((rightStart+bounds.right)/2-(board.left+board.right)/2),separate:board.left>detail.right};
      });
      assert.ok(layout.separate);assert.ok(layout.centerError<1,`${width}: puzzle must be centered in the right column`);
    }
    const zoom=await page.evaluate(async()=>{
      const target=document.querySelector('.capability-piece[data-capability-id="SQL"]'),visual=target.querySelector('.capability-piece-visual');target.focus();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const animation=visual.getAnimations().find(item=>item.animationName==='capability-piece-zoom');
      if(!animation)return {found:false};
      animation.pause();const samples=[];
      for(const time of [0,160,320]){animation.currentTime=time;samples.push(new DOMMatrix(getComputedStyle(visual).transform).a);}
      animation.finish();return {found:true,samples,focused:document.activeElement?.dataset.capabilityId,last:target.parentNode.lastElementChild.dataset.capabilityId};
    });
    assert.equal(zoom.found,true);assert.ok(zoom.samples[0]<1);assert.ok(zoom.samples[1]>zoom.samples[0]&&zoom.samples[1]<zoom.samples[2]);assert.ok(Math.abs(zoom.samples[2]-1.14)<.001);
    assert.equal(zoom.focused,'SQL');assert.equal(zoom.last,'SQL');
    await piece(page,'SQL').hover();await page.mouse.down();
    await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('.capability-piece[data-capability-id="SQL"] .capability-piece-visual')).transform).a<1.02);
    await page.mouse.up();
    await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('.capability-piece[data-capability-id="SQL"] .capability-piece-visual')).transform).a>1.139);
    await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowLeft');await page.keyboard.press('Home');await page.keyboard.press('End');
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.capabilityId),'领域分析');
    assert.equal(await piece(page,'领域分析').getAttribute('aria-pressed'),'true');
    await page.waitForFunction(()=>Math.abs(new DOMMatrix(getComputedStyle(document.querySelector('.capability-piece[data-capability-id="SQL"] .capability-piece-visual')).transform).a-1)<.001);
    assert.equal(await page.locator('.capability-piece[aria-pressed="true"]').count(),1);
    await page.mouse.move(20,20);await page.locator('.capability-puzzle').screenshot({animations:'disabled',path:`${output}/selected-zoom-centered-1920.png`});
    assert.deepEqual(await read(page),before);
  });

  await check('flat-keyboard-and-state-persistence',{},async page=>{
    await piece(page,'表格处理').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.capabilityId),'数据质量');
    assert.equal(await piece(page,'数据质量').locator('.capability-keyboard-focus').evaluate(el=>getComputedStyle(el).opacity),'1');
    assert.equal(await piece(page,'数据质量').locator('.capability-piece-visual').evaluate(el=>getComputedStyle(el).animationName),'none');
    assert.equal(await piece(page,'数据质量').locator('.capability-piece-visual').evaluate(el=>getComputedStyle(el).transform),'none');
    await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement?.dataset.capabilityId),'领域分析');
    await page.keyboard.press('Enter');await page.locator('[data-mastery-choice="true"]').click();
    await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).preferences.capabilityMastery?.['领域分析']===true,KEY);
    await page.reload();await piece(page,'领域分析').waitFor();assert.equal(await piece(page,'领域分析').getAttribute('data-mastered'),'true');
  });

  for(const language of ['zh','en'])await check(`flat-responsive-${language}`,{language},async page=>{
    const before=await read(page);
    for(const width of [1440,1280,1024,768,390,375,320]){
      await page.setViewportSize({width,height:1000});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const cells=await page.locator('.capability-piece').evaluateAll(elements=>elements.map(el=>{const copy=el.querySelector('.capability-piece-copy');return {index:Number(el.dataset.pieceIndex),name:el.dataset.capabilityId,path:el.querySelector('.capability-piece-shape').getAttribute('d'),overflow:copy.scrollWidth>copy.clientWidth+1||copy.scrollHeight>copy.clientHeight+1,font:parseFloat(getComputedStyle(copy.querySelector('strong')).fontSize)*el.getScreenCTM().a};}).sort((a,b)=>a.index-b.index));
      assert.deepEqual(cells.map(cell=>cell.name),capabilitySkills('data').map(skill=>skill.id));
      for(const cell of cells){assert.equal(cell.path,puzzlePiecePath(Math.floor(cell.index/3),cell.index%3));assert.equal(cell.overflow,false,`${language} ${width} ${cell.name} text overflow`);assert.ok(cell.font>=11);}
      if(width===390||width===1280){await page.locator('.capability-board').evaluate(el=>el.scrollIntoView({block:'center'}));await page.locator(width===390?'.capability-board':'.capability-puzzle').screenshot({animations:'disabled',path:`${output}/flat-${language}-${width}.png`});}
    }
    assert.deepEqual(await read(page),before);
  });
}finally{await writeFile(`${output}/verification.json`,JSON.stringify({results,pageErrors:errors},null,2));await browser.close();}
if(results.some(result=>result.status!=='pass')||errors.length)process.exitCode=1;
