import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {KEY, scenarioState} from '../src/model.js';

const origin = process.env.CAREER_PREVIEW_ORIGIN || 'http://127.0.0.1:5184';
const output = 'checks/assessment-navigation-20261107';
const order = ['assessment-review', 'assessment-profile', 'assessment-analysis', 'assessment-resumes'];
const mapReturn = '/career-map?career=ops&node=skill:linux';
const browser = await chromium.launch({channel: process.env.CAREER_BROWSER_CHANNEL || 'msedge', headless: true});
const results = [], errors = [];
await mkdir(output, {recursive: true});

try {
  for (const width of [1440, 390]) for (const scene of ['PT01', 'PT05', 'PT03']) {
    const context = await browser.newContext({viewport: {width, height: width < 700 ? 844 : 1000}, reducedMotion: 'reduce'});
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.on('pageerror', error => errors.push(error.message));
    const name = `${scene}/${width}`;
    try {
      await page.goto(origin);
      await page.evaluate(({key, state}) => {
        localStorage.setItem(key, JSON.stringify(state));
        localStorage.setItem('career-prototype-language', 'zh');
        localStorage.setItem('career-prototype-operation-guide-v1', JSON.stringify({enabled: false, neverPrompt: true}));
      }, {key: KEY, state: scenarioState(scene)});
      await page.goto(origin + '/assessment?tab=准备总览&mapReturn=' + encodeURIComponent(mapReturn));
      const review = page.locator('#assessment-review');
      await review.waitFor();
      const originalNode = await review.elementHandle();
      const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
      const checkOrder = async () => {
        assert.deepEqual(await page.locator('.assessment-hub > .hub-section').evaluateAll(elements => elements.map(element => element.id)), order);
        assert.equal(await review.count(), 1);
        assert.equal(await originalNode.evaluate(element => element.isConnected), true, 'Background section must keep the same DOM node.');
      };
      const focus = id => page.waitForFunction(id => document.activeElement?.id === id, id);
      const jumps = page.locator('.assessment-hub-jumps > a');

      await checkOrder();
      await jumps.nth(0).click();
      await focus('assessment-review');
      await page.getByRole('button', {name: '收起全部材料', exact: true}).click();
      await jumps.nth(1).click();
      await focus('assessment-profile');
      await checkOrder();
      await jumps.nth(2).click();
      await focus('assessment-analysis');
      await checkOrder();

      await jumps.nth(0).click();
      await focus('assessment-review');
      await jumps.nth(0).click();
      await focus('assessment-review');
      await checkOrder();
      assert.equal(new URL(page.url()).searchParams.get('mapReturn'), mapReturn);
      assert.equal(new URL(page.url()).hash, '#assessment-review');
      if (scene === 'PT05' || width === 390 && scene === 'PT01') {
        await page.screenshot({path: `${output}/after-${scene}-${width}.png`, animations: 'disabled'});
      }

      await jumps.nth(1).click();
      await focus('assessment-profile');
      assert.equal(await page.locator('#profile-evidence').count(), 0);
      await page.evaluate(() => {location.hash = 'profile-evidence';});
      await focus('profile-evidence');
      await page.goBack();
      await focus('assessment-profile');
      assert.equal(await page.locator('#profile-evidence').count(), 0);
      await page.goForward();
      await focus('profile-evidence');
      await checkOrder();

      await jumps.nth(0).click();
      await focus('assessment-review');
      await jumps.nth(3).click();
      await page.locator('.assessment-detail-drawer').waitFor();
      await page.locator('.assessment-detail-drawer').getByRole('button', {name: '关闭详情', exact: true}).click();
      await page.goBack();
      await focus('assessment-review');
      await checkOrder();

      await page.reload();
      await focus('assessment-review');
      assert.deepEqual(await page.locator('.assessment-hub > .hub-section').evaluateAll(elements => elements.map(element => element.id)), order);
      const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
      for (const key of ['claims', 'tasks', 'preferences', 'goal', 'budget', 'analysis', 'resumes']) {
        assert.deepEqual(after[key], before[key], `${key} must remain unchanged by navigation.`);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      results.push({name, status: 'pass'});
      console.log('PASS', name);
    } catch (error) {
      results.push({name, status: 'fail', error: error.message});
      await page.screenshot({path: `${output}/failure-${scene}-${width}.png`, fullPage: true});
      console.error('FAIL', name, error.message);
    } finally {
      await context.close();
    }
  }
} finally {
  await writeFile(output + '/verification.json', JSON.stringify({results, pageErrors: errors}, null, 2));
  await browser.close();
}
if (results.some(result => result.status === 'fail') || errors.length) process.exitCode = 1;
