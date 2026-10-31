import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';

const out = path.resolve('检查记录/芝识分子动作细修_20261025');
await fs.mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--no-proxy-server']});
const report = {frames: [], eyes: [], errors: []};
const context = await browser.newContext({viewport: {width: 900, height: 900}, reducedMotion: 'no-preference'});
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
try {
  await page.route('**/cheese-choreography', route => route.fulfill({contentType: 'text/html', body: '<body style="margin:0;background:#fff9ed"><div id="host" style="width:900px;height:900px"></div></body>'}));
  await page.route('**/src/login-cheese-motion.js*', async route => {
    const response = await route.fetch(); let code = await response.text();
    // Expose real scene objects only in this isolated verification page. All
    // geometry, motion and materials are the production modules, unchanged.
    code = code.replace('let renderer, environment', 'globalThis.cheeseParts = {book, arms, eyelids, avatar};\n  let renderer, environment');
    code = code.replace('eyelids.pose(eyesClosed);', 'eyelids.pose(globalThis.eyeTestAmount ?? eyesClosed);');
    await route.fulfill({response, body: code});
  });
  await page.goto('http://127.0.0.1:5187/cheese-choreography');
  await page.evaluate(async () => {
    const {createLoginCheeseScene} = await import('/src/login-cheese-motion.js');
    window.cheeseScene = createLoginCheeseScene(document.getElementById('host'), {instant: true, activity: 'rest'});
  });
  await page.waitForFunction(() => document.getElementById('host').dataset.modelLoaded === 'true');
  await page.waitForTimeout(2300);
  for (const amount of [0, .25, .5, .75, 1]) {
    await page.evaluate(amount => {
      window.eyeTestAmount = amount;
      window.cheeseScene.update({instant: true, activity: 'rest', secret: false, focus: null, reactionActive: false});
    }, amount);
    await page.waitForTimeout(90);
    await page.screenshot({path: path.join(out, `eyelid-${amount * 100}.png`)});
    const metric = await page.evaluate(() => {
      const mesh = window.cheeseParts.eyelids.object.getObjectByName('Upper_Lid_Skin');
      return {amount: window.eyeTestAmount, edgeY: mesh.material.userData.upperLidBoundary.value, scaleY: mesh.scale.y};
    });
    report.eyes.push(metric);
  }
  for (let i = 1; i < report.eyes.length; i++) {
    assert.ok(report.eyes[i].edgeY < report.eyes[i - 1].edgeY, 'upper lid must move downward while closing');
    assert.equal(report.eyes[i].scaleY, 1, 'eye surface must not shrink around its center');
  }
  await page.evaluate(() => {window.eyeTestAmount = undefined;});
  let reaction = 0;
  for (const [name, state, duration] of [
    ['reading', {focus: 'email'}, 1100],
    ['privacy', {focus: 'password', secret: true}, 1100],
    ['reopen', {focus: 'email'}, 1700],
    ['impact', {focus: 'email', reaction: ++reaction, reactionActive: true}, 1250],
    ['recover', {focus: 'email'}, 1700],
    ['close-interrupted', {focus: 'password', secret: true}, 180],
    ['reopen-interrupted', {focus: 'email'}, 1600],
    ['dance', {activity: 'dance'}, 1100],
  ]) {
    await page.evaluate(state => window.cheeseScene.update({instant: false, secret: false, focus: null, activity: 'idle', reactionActive: false, ...state}), state);
    const frames = await page.evaluate(async duration => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const {book, arms, avatar} = window.cheeseParts;
      const samples = [], start = performance.now();
      const torso = new THREE.Box3(new THREE.Vector3(-.335, .15, -.25), new THREE.Vector3(.335, .85, .24));
      do {
        await new Promise(requestAnimationFrame);
        avatar.updateMatrixWorld(true);
        const inverse = avatar.matrixWorld.clone().invert(), overlaps = [];
        if (book.object.visible) book.object.traverse(mesh => {
          if (!mesh.isMesh || !mesh.visible) return;
          mesh.geometry.computeBoundingBox();
          const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
          const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
          if (bounds.intersectsBox(torso)) overlaps.push(mesh.geometry.type);
        });
        let maximumArmError = 0;
        arms.object.traverse(mesh => {
          if (mesh.name === 'Upper_Arm') maximumArmError = Math.max(maximumArmError, Math.abs(mesh.scale.y - .10));
          if (mesh.name === 'Forearm') maximumArmError = Math.max(maximumArmError, Math.abs(mesh.scale.y - .12));
        });
        samples.push({time: performance.now() - start, overlaps, maximumArmError, state: {...document.getElementById('host').dataset}});
      } while (performance.now() - start < duration);
      return samples;
    }, duration);
    for (const frame of frames) {
      assert.equal(frame.overlaps.length, 0, `${name}: book intersects the torso`);
      assert.ok(frame.maximumArmError < 1e-6, `${name}: arm length changes`);
    }
    report.frames.push({name, count: frames.length, samples: frames});
    await page.screenshot({path: path.join(out, `${name}-900.png`)});
  }
  assert.equal(report.errors.length, 0);
  const images = await Promise.all([0, 25, 50, 75, 100].map(async value => ({value, data: (await fs.readFile(path.join(out, `eyelid-${value}.png`))).toString('base64')})));
  await page.setContent(`<html lang="zh"><style>body{margin:0;background:#fff9ed;color:#173f5c;font:18px Arial,"Microsoft YaHei",sans-serif}h1{font-size:24px;margin:24px 28px}main{display:flex;gap:14px;padding:0 28px 24px}figure{margin:0}figcaption{margin:0 0 10px;font-size:16px}.eye{width:228px;height:230px;overflow:hidden;position:relative}img{width:450px;position:absolute;left:-90px;top:-110px}</style><h1>上眼皮向下闭合，睁眼沿原路径向上恢复</h1><main>${images.map(({value,data})=>`<figure><figcaption>闭合 ${value}%</figcaption><div class="eye"><img src="data:image/png;base64,${data}"></div></figure>`).join('')}</main></html>`);
  await page.setViewportSize({width: 1252, height: 330});
  await page.evaluate(async () => {await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode()));});
  await page.screenshot({path: path.join(out, 'upper-eyelid-sequence.png')});
  report.sourceHashes = Object.fromEntries(await Promise.all(['arms', 'eyelids', 'book', 'motion'].map(async name => [name, createHash('sha256').update(await fs.readFile(`src/login-cheese-${name}.js`)).digest('hex')])));
  console.log(JSON.stringify({states: report.frames.length, sampledFrames: report.frames.reduce((n, item) => n + item.count, 0), eyes: report.eyes, errors: report.errors}));
} finally {
  await fs.writeFile(path.join(out, 'choreography-verification.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
