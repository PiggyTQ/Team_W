import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {KEY, makeAnalysis, scenarioState} from '../src/model.js';
import {capabilitySkills} from '../src/capability-puzzle-model.js';

const origin = process.env.CAREER_PREVIEW_ORIGIN || 'http://127.0.0.1:5184';
const output = 'checks/capability-puzzle-20261107';
await mkdir(output, {recursive: true});
const browser = await chromium.launch({channel: process.env.CAREER_BROWSER_CHANNEL || 'msedge', headless: true});
const results = [], errors = [];
const piece = (page, skill) => page.locator(`.capability-piece[data-capability-id="${skill}"]`);
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);

async function check(name, {scene = 'PT03', width = 1440, language = 'zh', saved = false} = {}, run) {
  if (process.env.CAPABILITY_CASE && !name.includes(process.env.CAPABILITY_CASE)) return;
  const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
  const page = await context.newPage(); page.setDefaultTimeout(7000);
  page.on('pageerror', error => errors.push(error.message));
  try {
    const state = scenarioState(scene);
    if (saved) {state.preferences.capabilityMastery = {'表格处理': true, SQL: true, '数据质量': true}; state.analysis = makeAnalysis(state);}
    await page.goto(origin);
    await page.evaluate(({key, state, language}) => {
      localStorage.setItem(key, JSON.stringify(state)); localStorage.setItem('career-prototype-language', language);
      localStorage.setItem('career-prototype-operation-guide-v1', JSON.stringify({enabled: false, neverPrompt: true}));
    }, {key: KEY, state, language});
    await page.goto(origin + '/assessment?tab=准备总览#assessment-analysis');
    await page.locator('.capability-piece').first().waitFor(); await page.evaluate(() => document.fonts.ready);
    await run(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    results.push({name, status: 'pass'}); console.log('PASS', name);
  } catch (error) {
    results.push({name, status: 'fail', error: error.stack}); console.error('FAIL', name, error.message);
    await page.screenshot({animations: 'disabled', fullPage: true, path: `${output}/failure-${name}.png`});
  } finally {await context.close();}
}

try {
  await check('explicit-mastery-save-reload-and-reverse', {scene: 'PT01'}, async page => {
    const before = await read(page);
    assert.equal(await page.locator('.capability-piece').count(), 9);
    assert.equal(await page.locator('.capability-piece[data-mastered="true"]').count(), 0);
    assert.equal(before.preferences.capabilityMastery, undefined);
    await piece(page, 'SQL').focus(); await page.keyboard.press('Enter');
    assert.equal(await piece(page, 'SQL').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-mastery-choice="true"]').click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).preferences.capabilityMastery?.SQL === true, KEY);
    assert.equal(await piece(page, 'SQL').getAttribute('data-mastered'), 'true');
    assert.equal(await piece(page, 'SQL').locator('.capability-piece-shape').evaluate(el => getComputedStyle(el).fill), 'rgb(247, 215, 124)');
    await page.reload(); await piece(page, 'SQL').waitFor();
    assert.equal(await piece(page, 'SQL').getAttribute('data-mastered'), 'true');
    await piece(page, 'SQL').click(); await page.locator('[data-mastery-choice="false"]').click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).preferences.capabilityMastery?.SQL === false, KEY);
    assert.equal(await piece(page, 'SQL').locator('.capability-piece-shape').evaluate(el => getComputedStyle(el).fill), 'rgb(148, 182, 214)');
    const after = await read(page);
    for (const key of ['claims', 'analysis', 'analysisStale', 'tasks', 'resumes', 'goal', 'budget']) assert.deepEqual(after[key], before[key]);
    const {capabilityMastery, ...preferences} = after.preferences; assert.deepEqual(preferences, before.preferences);
  });

  await check('confirmed-records-stay-unmarked-and-existing-actions-remain', {}, async page => {
    const before = await read(page);
    assert.ok(before.claims.some(claim => claim.status === '已确认' && claim.skill === 'SQL'));
    assert.equal(await page.locator('.capability-piece[data-mastered="true"]').count(), 0);
    await page.locator('.hub-capability-gaps > summary').click();
    assert.ok(await page.locator('.hub-capability-gaps a').count() > 0);
    await page.getByRole('button', {name: '查看职业要求与产物', exact: true}).click();
    await page.locator('.information-drawer').waitFor();
    await page.getByRole('button', {name: '关闭详情', exact: true}).click();
    assert.deepEqual(await read(page), before);
    assert.deepEqual(await page.locator('.assessment-hub > .hub-section').evaluateAll(elements => elements.map(el => el.id)), ['assessment-review', 'assessment-profile', 'assessment-analysis', 'assessment-resumes']);
  });

  await check('career-switch-keeps-shared-skill-and-snapshot', {saved: true}, async page => {
    const before = await read(page), select = page.locator('.hub-direction select');
    assert.equal(await page.locator('.capability-piece[data-mastered="true"]').count(), 3);
    await piece(page, 'SQL').click();
    await page.locator('#assessment-analysis').screenshot({animations: 'disabled', path: `${output}/yellow-blue-puzzle.png`});
    await select.selectOption('engineering');
    assert.deepEqual(await page.locator('.capability-piece').evaluateAll(elements => elements.sort((a,b) => Number(a.dataset.pieceIndex)-Number(b.dataset.pieceIndex)).map(el => el.dataset.capabilityId)), capabilitySkills('engineering').map(skill => skill.id));
    assert.equal(await piece(page, 'SQL').getAttribute('data-mastered'), 'true');
    await select.selectOption('frontend');
    assert.equal(await page.locator('.capability-piece').count(), 9);
    await select.selectOption('data');
    assert.equal(await piece(page, 'SQL').getAttribute('data-mastered'), 'true');
    const after = await read(page);
    assert.deepEqual(after.preferences, before.preferences); assert.deepEqual(after.analysis, before.analysis); assert.deepEqual(after.claims, before.claims);
  });

  await check('english-desktop-text-and-piece-size', {width: 1280, language: 'en', saved: true}, async page => {
    assert.equal(await page.locator('.capability-legend').innerText(), 'Mastered\nNot mastered');
    assert.equal(/[\u3400-\u9fff]/.test(await page.locator('.capability-puzzle').innerText()), false);
    const labels = await page.locator('.capability-piece-copy').evaluateAll(elements => elements.map(el => ({overflowX: el.scrollWidth > el.clientWidth + 1, overflowY: el.scrollHeight > el.clientHeight + 1})));
    assert.ok(labels.every(label => !label.overflowX && !label.overflowY));
    await page.locator('.capability-puzzle').screenshot({animations: 'disabled', path: `${output}/english-puzzle-1280.png`});
    await piece(page, 'SQL').focus(); await page.keyboard.press('Space');
    assert.equal(await piece(page, 'SQL').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-mastery-choice="false"]').click();
    assert.equal(await piece(page, 'SQL').getAttribute('data-mastered'), 'false');
  });
} finally {
  await writeFile(`${output}/verification.json`, JSON.stringify({results, pageErrors: errors}, null, 2)); await browser.close();
}
if (results.some(result => result.status !== 'pass') || errors.length) process.exitCode = 1;
