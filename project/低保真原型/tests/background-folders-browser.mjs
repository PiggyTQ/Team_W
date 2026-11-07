import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {KEY, scenarioState} from '../src/model.js';

const origin = process.env.CAREER_PREVIEW_ORIGIN || 'http://127.0.0.1:5184';
const output = 'checks/gray-folder-entry-20261107';
const browser = await chromium.launch({channel: process.env.CAREER_BROWSER_CHANNEL || 'msedge', headless: true});
const results = [], errors = [];
await mkdir(output, {recursive: true});

async function setup({width = 1440, reducedMotion = 'no-preference', language = 'zh', scene = 'PT01', many = false} = {}) {
  const context = await browser.newContext({viewport: {width, height: width < 700 ? 844 : 1000}, reducedMotion});
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  const state = scenarioState(scene);
  if (many) state.claims = Array.from({length: 10}, (_, index) => ({...state.claims[index % state.claims.length],
    id: 'claim-long-' + index, title: `第${index + 1}份经历：课程协作与资料核对的完整记录（合成测试，含较长标题）`}));
  await page.evaluate(({key, state, language}) => {
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem('career-prototype-language', language);
    localStorage.setItem('career-prototype-operation-guide-v1', JSON.stringify({enabled: false, neverPrompt: true}));
  }, {key: KEY, state, language});
  await page.goto(origin + '/assessment?tab=原文确认#assessment-review');
  await page.locator('.folder-stage').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.activeElement?.id === 'assessment-review');
  return {context, page};
}
const trigger = (page, id) => page.locator(id.includes(':') ? `.folder-trigger[data-folder="${id}"]` : `.folder-entry-button[data-action="${id}"]`);
const sheet = page => page.locator('.folder-document:visible');
const phase = (page, value) => page.waitForFunction(value => document.querySelector('.folder-stage')?.dataset.phase === value, value);
async function choose(page) {
  if (!await page.locator('.folder-entry-chooser').evaluate(el => el.open)) await page.locator('.folder-create-trigger').click();
  await page.locator('.folder-entry-chooser:modal').waitFor();
}
async function open(page, id) {if (!id.includes(':')) await choose(page); await trigger(page, id).click(); await phase(page, 'open');}
async function close(page) {await sheet(page).locator('.folder-return').click(); await phase(page, 'closed');}
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
const geometry = page => page.locator('#assessment-review').evaluate(el => {
  return {x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight};
});
const sameGeometry = (a, b) => {
  for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(a[key] - b[key]) < 1, `${key} changed: ${a[key]} -> ${b[key]}`);
};

async function check(name, options, run) {
  if (process.env.FOLDERS_CASE && !name.includes(process.env.FOLDERS_CASE)) return;
  const {context, page} = await setup(options);
  try {
    await run(page);
    results.push({name, status: 'pass'}); console.log('PASS', name);
  } catch (error) {
    results.push({name, status: 'fail', error: error.stack}); console.error('FAIL', name, error.message);
    await page.screenshot({animations: 'disabled', path: `${output}/failure-${name}.png`, fullPage: true});
  } finally {await context.close();}
}

try {
  await check('gray-folder-chooser-hover-cancel-keyboard', {}, async page => {
    const before = await read(page), bounds = await geometry(page), add = page.locator('.folder-create-trigger');
    assert.equal(await page.locator('.folder-desk-heading .folder-entry-button').count(), 0);
    assert.equal(await page.locator('.folder-entry-chooser:visible').count(), 0);
    await page.locator('#assessment-review').screenshot({animations: 'disabled', path: `${output}/gray-folder-closed.png`});
    const gray = await add.boundingBox(), last = await page.locator('.folder-trigger').last().boundingBox();
    assert.ok(gray.x > last.x + last.width);
    assert.ok(await add.locator('.folder-assembly').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).b < 0));
    await add.hover();
    assert.equal(await add.locator('.folder-create-tooltip').count(), 0);
    assert.equal(await add.getAttribute('title'), null);
    await page.locator('#assessment-review').screenshot({animations: 'disabled', path: `${output}/gray-folder-hover.png`});
    await add.click(); await page.locator('.folder-entry-chooser:modal').waitFor();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.folder-shelf')).filter === 'blur(4px)');
    assert.equal(await page.locator('.folder-entry-chooser .folder-entry-button').count(), 2);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.action), 'manual');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.action), 'import');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.folder-chooser-close')), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.action), 'manual');
    await page.locator('#assessment-review').screenshot({animations: 'disabled', path: `${output}/entry-chooser.png`});
    await page.keyboard.press('Escape');
    await page.locator('.folder-entry-chooser').waitFor({state: 'hidden'});
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.folder-create-trigger')), true);
    sameGeometry(bounds, await geometry(page));
    await add.press('Enter'); await page.locator('.folder-entry-chooser:modal').waitFor();
    const frame = await page.locator('.folder-stage').boundingBox();
    await page.mouse.click(frame.x + 10, frame.y + 20);
    await page.locator('.folder-entry-chooser').waitFor({state: 'hidden'});
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.folder-create-trigger')), true);
    await choose(page); await page.locator('.folder-chooser-close').click();
    await page.locator('.folder-entry-chooser').waitFor({state: 'hidden'});
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.folder-shelf')).filter === 'none');
    assert.deepEqual(await read(page), before);
  });

  await check('demo-default-actions-draft-save', {}, async page => {
    const before = await read(page), bounds = await geometry(page);
    const left = await page.locator('.background-review-sidebar').boundingBox();
    const right = await page.locator('.background-folders').boundingBox();
    assert.ok(Math.abs(right.width / left.width - 2) < .05);
    assert.ok(bounds.height < 550);
    assert.equal(await page.locator('.folder-trigger[data-demo="true"]').count(), 4);
    assert.equal(await page.locator('.folder-trigger .binder-ring').count(), 4);
    assert.equal(await page.locator('.folder-create-trigger .binder-ring').count(), 1);
    const practice = await page.locator('.folder-practice-link').boundingBox();
    assert.ok(practice.x > right.x + right.width / 2 && practice.y > right.y + right.height - 60);
    assert.equal(await page.getByText('记录自己的部分，未知也可以先留空。', {exact: true}).count(), 0);
    await page.locator('#assessment-review').screenshot({animations: 'disabled', path: `${output}/four-demo-binders.png`});
    await choose(page);
    await trigger(page, 'manual').click();
    await phase(page, 'opening');
    assert.equal(await page.locator('dialog:modal').count(), 0);
    await phase(page, 'open'); sameGeometry(bounds, await geometry(page));
    await page.locator('#assessment-review').screenshot({animations: 'disabled', path: `${output}/side-manual-start.png`});
    await sheet(page).getByRole('button', {name: '粘贴原文', exact: true}).click();
    await page.locator('#experience-raw').fill('测试记录：本人整理了活动报名表，并核对重复数据。');
    await page.locator('#experience-title').fill('档案袋交互验证');
    await close(page);
    await page.waitForFunction(() => document.activeElement?.matches('.folder-create-trigger'));
    sameGeometry(bounds, await geometry(page));
    await open(page, 'manual');
    assert.equal(await page.locator('#experience-title').inputValue(), '档案袋交互验证');
    assert.match(await page.locator('#experience-raw').inputValue(), /本人整理/);
    await page.locator('#assessment-review').screenshot({animations: 'disabled', path: `${output}/side-manual-final.png`});
    await sheet(page).getByRole('button', {name: '保存并核对经历', exact: true}).dblclick();
    await phase(page, 'closed');
    await page.waitForFunction(() => document.activeElement?.id === 'assessment-review');
    const after = await read(page);
    assert.equal(after.claims.length, before.claims.length + 1);
    assert.equal(after.claims.at(-1).status, '待确认');
    assert.equal(await page.locator('.folder-trigger').count(), 1);
    await open(page, 'claim:' + after.claims.at(-1).id);
    assert.equal(await sheet(page).locator('.folder-document-title').innerText(), '档案袋交互验证');
    assert.match(await sheet(page).locator('.folder-experience').innerText(), /本人整理了活动报名表/);
    await close(page);
    for (const key of ['tasks', 'preferences', 'goal', 'budget', 'resumes']) assert.deepEqual(after[key], before[key]);
    const filter = page.locator('.background-review-sidebar select');
    await filter.selectOption('已确认');
    assert.equal(await page.locator('.background-review-sidebar .record').count(), 0);
    await page.locator('.background-review-sidebar').getByRole('button', {name: '查看操作步骤', exact: true}).click();
    assert.ok(await page.locator('[popover]:popover-open').count() + await page.getByText('准备一段课程项目、作品或实际经历。', {exact: true}).count() > 0);
    await page.keyboard.press('Escape');
    await filter.selectOption('全部');
    assert.equal(await page.locator('.background-review-sidebar .record').count(), 1);
  });

  await check('four-readonly-demo-experiences', {}, async page => {
    const before = await read(page), bounds = await geometry(page);
    const examples = [['demo:campus-web', '校园活动网站'], ['demo:data-course', '数据分析课程'],
      ['demo:club-event', '社团活动策划'], ['demo:product-intern', '产品设计实习']];
    for (const [id, title] of examples) {
      await open(page, id); sameGeometry(bounds, await geometry(page));
      assert.equal(await sheet(page).locator('.folder-document-title').innerText(), title);
      assert.equal(await sheet(page).locator('.folder-demo-content dd').count(), 4);
      assert.ok((await sheet(page).locator('.folder-demo-content dd').allTextContents()).every(text => text.length > 20));
      assert.equal(await sheet(page).locator('.folder-experience,form').count(), 0);
      assert.match(await sheet(page).locator('.folder-demo-notice').innerText(), /不计入个人评估/);
      if (id === 'demo:campus-web') await page.locator('#assessment-review').screenshot({animations: 'disabled', path: `${output}/demo-experience-details.png`});
      await close(page);
      await page.waitForFunction(id => document.activeElement?.dataset.folder === id, id);
    }
    assert.deepEqual(await read(page), before, 'Demo browsing must not create claims or change assessment data.');
  });

  await check('existing-records-hover-details-confirm', {scene: 'PT03'}, async page => {
    const before = await read(page), bounds = await geometry(page);
    assert.equal(await page.locator('.folder-trigger').count(), before.claims.length);
    const target = 'claim:' + before.claims[0].id, binder = await trigger(page, target).boundingBox();
    assert.ok(binder.width / binder.height < .5);
    await page.locator('#assessment-review').screenshot({animations: 'disabled', path: `${output}/experience-folders.png`});
    await trigger(page, target).hover(); await page.waitForTimeout(400);
    assert.ok(await trigger(page, target).locator('.folder-assembly').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42 < -10));
    await page.locator('#assessment-review').screenshot({animations: 'disabled', path: `${output}/hover.png`});
    await page.mouse.move(200, 150); await page.waitForTimeout(400);
    assert.ok(await trigger(page, target).locator('.folder-assembly').evaluate(el => Math.abs(new DOMMatrix(getComputedStyle(el).transform).m42) < .1));
    for (const claim of before.claims) {
      await open(page, 'claim:' + claim.id); sameGeometry(bounds, await geometry(page));
      assert.equal(await sheet(page).locator('.folder-document-title').innerText(), claim.title);
      assert.equal(await sheet(page).locator('.folder-experience p[translate="no"]').innerText(), claim.text);
      assert.match(await sheet(page).innerText(), new RegExp(claim.contribution));
      assert.equal(await sheet(page).locator('.experience-writer').count(), 0);
      if (claim.id === 'claim-demo') await page.locator('#assessment-review').screenshot({animations: 'disabled', path: `${output}/experience-details.png`});
      await close(page);
      await page.waitForFunction(id => document.activeElement?.dataset.folder === id, 'claim:' + claim.id);
    }
    assert.deepEqual(await read(page), before, 'Opening folders must not change records.');
    await open(page, 'claim:claim-conflict');
    await sheet(page).getByRole('button', {name: '修正 / 确认此项', exact: true}).click();
    const modal = page.locator('dialog:modal');
    assert.equal(await modal.locator('blockquote').innerText(), before.claims.find(c => c.id === 'claim-conflict').text);
    await modal.getByRole('button', {name: '确认这一项并查看回执', exact: true}).click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).claims.find(c => c.id === 'claim-conflict').status === '已确认', KEY);
    const after = await read(page);
    assert.deepEqual(after.claims.filter(c => c.id !== 'claim-conflict'), before.claims.filter(c => c.id !== 'claim-conflict'));
    assert.match(await sheet(page).locator('.section-head').innerText(), /已确认/);
    await close(page);
    assert.equal(await trigger(page, 'claim:claim-conflict').locator('.folder-stamp').innerText(), '已确认');
    const saved = await read(page);
    await page.locator('.folder-collection-toggle').click();
    assert.equal(await page.locator('.folder-trigger[data-demo="true"]').count(), 4);
    await open(page, 'demo:campus-web'); await close(page);
    await page.locator('.folder-collection-toggle').click();
    assert.equal(await page.locator('.folder-trigger[data-demo="false"]').count(), saved.claims.length);
    assert.deepEqual(await read(page), saved);
  });

  await check('import-cancel-dedupe-practice', {}, async page => {
    const before = await read(page);
    await open(page, 'import');
    await sheet(page).locator('input[type="checkbox"]').check();
    await sheet(page).locator('input[type="file"]').setInputFiles({name: 'folder-demo.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nDemo fixture')});
    await sheet(page).getByRole('button', {name: '开始 / 重试模拟解析', exact: true}).click();
    await close(page); await page.waitForTimeout(650);
    assert.equal((await read(page)).claims.length, before.claims.length);
    await open(page, 'import');
    assert.equal(await sheet(page).locator('input[type="checkbox"]').isChecked(), true);
    assert.match(await sheet(page).innerText(), /作业已取消/);
    assert.equal(await sheet(page).getByRole('button', {name: '保存合成候选并逐项确认', exact: true}).count(), 0);
    for (let i = 0; i < 2; i++) {
      if (i) await open(page, 'import');
      await sheet(page).getByRole('button', {name: '开始 / 重试模拟解析', exact: true}).click();
      await sheet(page).getByRole('button', {name: '保存合成候选并逐项确认', exact: true}).waitFor();
      if (!i) await page.locator('#assessment-review').screenshot({animations: 'disabled', path: `${output}/side-import.png`});
      await sheet(page).getByRole('button', {name: '保存合成候选并逐项确认', exact: true}).dblclick();
      await phase(page, 'closed');
      assert.equal((await read(page)).claims.filter(item => item.importKey === 'folder-demo.pdf').length, 1);
    }
    assert.equal(await page.locator('.folder-trigger').count(), 1);
    const imported = (await read(page)).claims.find(c => c.importKey === 'folder-demo.pdf');
    await open(page, 'claim:' + imported.id);
    assert.equal(await sheet(page).locator('.folder-experience p[translate="no"]').innerText(), imported.text);
    await close(page);
    const activity = page.locator('.folder-practice-link');
    const target = new URL(await activity.getAttribute('href'), origin);
    await activity.click();
    await page.waitForURL(url => url.pathname === target.pathname && url.search === target.search);
    assert.equal((await read(page)).tasks.length, before.tasks.length);
  });

  await check('interrupted-animation-keyboard-switch', {}, async page => {
    await choose(page);
    await trigger(page, 'manual').focus();
    await page.keyboard.press('Enter'); await phase(page, 'opening');
    await page.keyboard.press('Escape'); await phase(page, 'closed');
    await page.waitForTimeout(650);
    assert.equal(await page.locator('.folder-stage').getAttribute('data-phase'), 'closed');
    await choose(page); await trigger(page, 'manual').focus(); await page.keyboard.press('Space'); await phase(page, 'open');
    await sheet(page).getByRole('button', {name: '导入文件（模拟解析）', exact: true}).click();
    await page.waitForFunction(() => document.querySelector('.folder-stage')?.dataset.folder === 'import' && document.querySelector('.folder-stage')?.dataset.phase === 'open');
    await sheet(page).getByRole('button', {name: '改用手填', exact: true}).click();
    await page.waitForFunction(() => document.querySelector('.folder-stage')?.dataset.folder === 'manual' && document.querySelector('.folder-stage')?.dataset.phase === 'open');
    await page.keyboard.press('Escape'); await phase(page, 'closed');
    await page.evaluate(() => {
      for (const id of ['manual', 'import', 'manual']) document.querySelector(`.folder-entry-button[data-action="${id}"]`).click();
    });
    await page.waitForFunction(() => document.querySelector('.folder-stage')?.dataset.folder === 'manual' && document.querySelector('.folder-stage')?.dataset.phase === 'open');
    assert.equal(await sheet(page).count(), 1);
    await close(page); await page.waitForTimeout(650);
    assert.equal(await sheet(page).count(), 0);
    await choose(page); await trigger(page, 'manual').click(); await phase(page, 'opening');
    await page.locator('.assessment-hub-jumps > a').nth(1).click();
    await phase(page, 'closed'); await page.waitForTimeout(650);
    assert.equal(await page.locator('#assessment-review').count(), 1);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'assessment-profile');
    assert.equal(await sheet(page).count(), 0);
  });

  // The current product scope is desktop web. Keep earlier mobile checks opt-in.
  for (const width of process.env.CAREER_TEST_MOBILE === '1' ? [390, 320] : []) for (const language of ['zh', 'en']) {
    await check(`responsive-${width}-${language}`, {width, language, reducedMotion: 'reduce', scene: 'PT03', many: true}, async page => {
      const before = await read(page), bounds = await geometry(page);
      const noOverflow = async () => {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(await page.locator('.background-folders').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
      };
      await noOverflow();
      assert.equal(await page.locator('.folder-trigger').count(), 10);
      assert.equal(await page.locator('.folder-row').evaluate(el => el.scrollWidth > el.clientWidth), true);
      if (width === 390) {
        await page.locator('.background-folders').evaluate(el => el.scrollIntoView({block: 'center'}));
        await page.locator('.background-folders').screenshot({animations: 'disabled', path: `${output}/mobile-closed-${language}.png`});
      }
      for (const id of ['manual', 'import', 'claim:claim-long-9']) {
        await open(page, id); await noOverflow(); sameGeometry(bounds, await geometry(page));
        assert.equal(await sheet(page).count(), 1);
        if (id.startsWith('claim:')) {
          assert.equal(await sheet(page).locator('.folder-document-title').innerText(), before.claims[9].title);
          if (width === 390) {
            await sheet(page).evaluate(el => el.scrollIntoView({block: 'center'}));
            await sheet(page).screenshot({animations: 'disabled', path: `${output}/mobile-experience-${language}.png`});
          }
        }
        if (id === 'manual' && width === 390) {
          await sheet(page).evaluate(el => el.scrollIntoView({block: 'center'}));
          await sheet(page).screenshot({animations: 'disabled', path: `${output}/mobile-manual-${language}.png`});
        }
        await close(page); sameGeometry(bounds, await geometry(page));
      }
      await page.locator('.folder-collection-toggle').click();
      assert.equal(await page.locator('.folder-trigger[data-demo="true"]').count(), 4);
      await noOverflow();
      if (width === 390) {
        await page.locator('.background-folders').evaluate(el => el.scrollIntoView({block: 'center'}));
        await page.locator('.background-folders').screenshot({animations: 'disabled', path: `${output}/mobile-demo-binders-${language}.png`});
      }
      await open(page, 'demo:product-intern'); await noOverflow();
      assert.equal(await sheet(page).locator('.folder-demo-content dd').count(), 4);
      if (width === 390) {
        await sheet(page).evaluate(el => el.scrollIntoView({block: 'center'}));
        await sheet(page).screenshot({animations: 'disabled', path: `${output}/mobile-demo-details-${language}.png`});
      }
      await close(page);
      assert.deepEqual(await read(page), before);
    });
  }
} finally {
  await writeFile(output + '/verification.json', JSON.stringify({results, pageErrors: errors}, null, 2));
  await browser.close();
}
if (results.some(result => result.status === 'fail') || errors.length) process.exitCode = 1;
