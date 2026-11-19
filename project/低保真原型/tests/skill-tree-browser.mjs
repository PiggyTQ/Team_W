import assert from 'node:assert/strict';
import {randomBytes, randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium, expect as playwrightExpect} from '@playwright/test';
import {localBusinessHarness} from './helpers/local-business-harness.mjs';
import {AUTH_POLICY} from '../src/auth-contract.js';
import {careers} from '../src/model.js';
import {skillStudyKey, skillTreeRoute} from '../src/skill-tree-model.js';
import {getSkillTree, gradeSkillCheck} from '../server/skill-trees/index.mjs';

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const liveUrl = process.env.SKILL_TREE_TEST_ORIGIN;
const harness = liveUrl ? {base:liveUrl, close:async () => {}} : await localBusinessHarness();
const browser = await chromium.launch({channel:'msedge', headless:true, args:['--no-proxy-server']});
const context = await browser.newContext({viewport:{width:1440,height:1000},locale:'zh-CN',reducedMotion:'reduce'});
const page = await context.newPage();
page.setDefaultTimeout(liveUrl ? 24000 : 15000);
const expect = playwrightExpect.configure({timeout:liveUrl ? 18000 : 6000});

const out = path.resolve('checks/skill-tree-botanical-20261114', liveUrl ? 'production' : '');
await fs.mkdir(out,{recursive:true});
const report = {origin:liveUrl || 'local', passed:false, checks:[], errors:[]};
page.on('pageerror',error => report.errors.push(error.message));
await context.addInitScript(() => {
  localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true}));
});
await context.route('**/*', route => new URL(route.request().url()).origin === harness.base ? route.continue() : route.abort());

const email = 'skill-tree-test-' + randomUUID() + '@example.invalid';
const password = 'Skill check ' + randomBytes(18).toString('base64url') + '!';
let csrf, owner;
let registered = false;
async function api(route, {method = 'GET', data, status = 200} = {}) {
  const response = await context.request.fetch(harness.base + route,{method,data,headers:{Origin:harness.base,
    ...(csrf ? {'X-CSRF-Token':csrf} : {}), ...(owner ? {'X-Account-Id':owner} : {})}});
  assert.equal(response.status(),status,route + ' ' + (await response.text()).slice(0,300));
  const body = await response.json();
  csrf = body.csrfToken || csrf;
  owner = body.user?.id || owner;
  return body;
}

const map = page.locator('.skill-map');
const pathView = map.locator('.skill-path');
const study = map.locator('.skill-study');
const treeLeaf = id => map.locator(`[data-skill-leaf="${id}"]`);
const branch = id => map.locator(`[data-skill-branch="${id}"]`);
const routeLeaf = id => map.locator(`[data-path-leaf="${id}"]`);
const button = name => study.getByRole('button',{name,exact:true});
const go = route => page.goto(harness.base + route,{waitUntil:'domcontentloaded'});
const mark = message => {
  report.checks.push(message);
  console.log('PASS ' + message);
};
const screenshot = async name => {
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve,1300))]));
  await page.screenshot({path:path.join(out,name + '.png'),animations:'disabled'});
};

function answer(career, leaf, question, pass) {
  return question.options.find(option => {
    const answers = Object.fromEntries(leaf.questions.map(item => [item.id,item.options[0].id]));
    answers[question.id] = option.id;
    return gradeSkillCheck(career,leaf.id,leaf.version,answers).questions.find(item => item.id === question.id).correct === pass;
  }).id;
}

const selections = (leaf,pass) => Object.fromEntries(leaf.questions.map(question => [question.id,answer('data',leaf,question,pass)]));

async function submitCheck(leaf, pass, {alreadyOnCheck = false, recover = false} = {}) {
  if (!alreadyOnCheck) await button('成果检验').click();
  await expect(study).toHaveAttribute('data-study-step','check');
  for (const [questionId,choice] of Object.entries(selections(leaf,pass))) {
    await study.locator(`[name="${questionId}"][value="${choice}"]`).check();
  }
  await button('提交检验').click();
  if (recover) {
    await expect(study.getByRole('alert')).toContainText('网络连接失败或超时');
    await button('重试保存检验').click();
  }
  await expect(study.locator('.skill-check-result')).toHaveAttribute('data-passed',String(pass));
}

try {
  await api('/api/auth/session');
  await api('/api/catalog/skill-trees/data',{status:401});
  await api('/api/auth/register',{method:'POST',status:201,data:{email,password,agree:true,termsVersion:AUTH_POLICY.termsVersion}});
  registered = true;
  const initial = await api('/api/workspace');
  await api('/api/workspace',{method:'PUT',data:{actorId:owner,baseVersion:initial.revision,mutationId:randomUUID(),
    state:{...initial.state,onboard:true,budget:5,goal:'data',mapNodeStatus:{'data:foundation':'已学习'}}}});
  const data = getSkillTree('data');
  const [first,second,third] = data.branches[0].leaves;
  await go('/career-map');
  await expect(treeLeaf(first.id)).toBeVisible();
  await expect(map.getByRole('heading',{name:'职业与技能地图'})).toBeVisible();
  await expect(map.locator('.skill-root')).toContainText('0/13');
  await expect(map.locator('[data-skill-branch]')).toHaveCount(4);
  await expect(map.locator('[data-skill-leaf]')).toHaveCount(13);
  await expect(map.locator('.skill-ash-tree')).toBeVisible();
  await expect.poll(() => map.locator('.skill-ash-tree').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  await expect(map.locator('.skill-water-pearl')).toHaveCount(13);
  await expect(map.locator('.skill-branch-lettering textPath')).toHaveText(data.branches.map(row => row.title[0]));
  await expect(map.locator('[data-growth-ring]')).toHaveCount(13);
  await expect(map.locator('[data-growth-ring][data-grown="true"]')).toHaveCount(0);
  await expect(map.locator('[data-growth-leaf]')).toHaveCount(0);
  await expect(pathView.locator('.skill-path-progress strong')).toHaveText('0%');
  await expect(map.locator('[data-branch-connector="metrics"]')).toHaveAttribute('data-progress','0');
  await map.getByText('技能依据',{exact:true}).click();
  await expect(map.locator('.skill-map-basis').getByRole('link',{name:/PL-300 Data Analyst study guide/})).toBeVisible();
  await map.getByText('技能依据',{exact:true}).click();
  await screenshot('01-empty-tree');
  mark('The authenticated tree starts at 0% and names the official framework sources');

  await treeLeaf(first.id).focus();
  await page.keyboard.press('Enter');
  await expect(pathView.getByRole('heading',{level:2})).toBeFocused();
  await button('标记已读并去练习').click();
  const note = '退款率用已支付订单作分母，分开记录支付取消和退款。';
  await study.locator('textarea').fill(note);
  await button('保存练习记录').click();
  await expect(study.getByRole('status')).toContainText('练习记录已保存。');
  await button('安排本节点练习').click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog.getByRole('link',{name:/返回技能节点/})).toBeVisible();
  await dialog.getByRole('button',{name:'确认预算并创建任务',exact:true}).click();
  await dialog.waitFor({state:'hidden',timeout:15000});
  await page.waitForURL(url => url.pathname === '/plan' && url.searchParams.has('practice'));
  await expect(page.getByRole('link',{name:/返回技能节点/})).toBeVisible();
  await page.getByRole('link',{name:/返回技能节点/}).click();
  const toast = page.locator('.toast.show').getByRole('button',{name:'关闭提示',exact:true});
  if (await toast.isVisible()) await toast.click();
  await expect(study).toHaveAttribute('data-study-step','practice');
  await expect(study.locator('textarea')).toHaveValue(note);
  mark('A keyboard-opened leaf saves notes, creates a budgeted task and restores the practice on return');

  await button('进入成果检验').click();
  await button('提交检验').click();
  await expect(study.getByRole('alert')).toBeVisible();
  await submitCheck(first,false,{alreadyOnCheck:true});
  await expect(pathView.locator('.skill-path-progress strong')).toHaveText('0%');
  await expect(map.locator('[data-branch-connector="metrics"]')).toHaveAttribute('data-progress','0');
  await expect(map.locator('[data-growth-leaf]')).toHaveCount(0);
  await expect(treeLeaf(first.id).locator('.skill-water-pearl')).toHaveCount(1);
  await expect(map.locator('[data-growth-ring][data-grown="true"]')).toHaveCount(0);
  await button('再做一次').click();
  if (!liveUrl) {
    await page.route('**/api/commands',async route => {
      const response = await route.fetch();
      assert.equal(response.status(),200);
      await response.dispose();
      await route.abort('connectionreset');
    },{times:1});
  }
  await submitCheck(first,true,{alreadyOnCheck:true,recover:!liveUrl});
  await expect(pathView.locator('.skill-path-progress strong')).toHaveText('33%');
  await expect(map.locator('[data-branch-connector="metrics"]')).toHaveAttribute('data-progress','33');
  await expect(treeLeaf(first.id).locator('..')).toHaveAttribute('data-passed','true');
  await expect(routeLeaf(first.id).locator('..')).toHaveAttribute('data-passed','true');
  await expect(map.locator('.skill-root')).toContainText('1/13');
  const firstLeaves = map.locator('[data-growth-leaf="' + first.id + '"]');
  await expect(firstLeaves).toBeVisible();
  await expect(treeLeaf(first.id).locator('.skill-water-pearl')).toHaveCount(0);
  await expect(map.locator('[data-growth-ring][data-grown="true"]')).toHaveCount(1);
  await study.locator('.skill-quiz').scrollIntoViewIfNeeded();
  await screenshot('03-check');
  await button('回到树上').click();
  await expect(treeLeaf(first.id)).toBeFocused();
  await expect(firstLeaves).toHaveAttribute('data-unfurl','true');
  assert.equal(await firstLeaves.evaluate(img => getComputedStyle(img).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(await firstLeaves.evaluate(img => getComputedStyle(img).animationName),'skill-leaves-open');
  assert.equal(await map.locator('.skill-watering-pearl').evaluate(img => getComputedStyle(img).animationName),'skill-pearl-soak');
  assert.equal(await map.locator('.skill-new-bud').evaluate(img => getComputedStyle(img).animationName),'skill-bud-open');
  await page.emulateMedia({reducedMotion:'reduce'});
  await screenshot('02-progress');
  await go(skillTreeRoute('data',{skill:first.id,step:'practice'}));
  await expect(study.locator('textarea')).toHaveValue(note);
  await expect(pathView.locator('.skill-path-progress strong')).toHaveText('33%');
  await expect(firstLeaves).toHaveAttribute('data-unfurl','false');
  const saved = (await api('/api/workspace')).state.skillStudy[skillStudyKey('data',first)];
  assert.equal(saved.draft,note);
  assert.equal(saved.assessment.attempts,2);
  assert.ok(saved.assessment.passedAt);
  mark('An incorrect attempt earns no progress, a passing attempt fills the branch and refresh restores both progress and notes');

  await go('/career-map?career=data&branch=metrics&step=check');
  await expect(study).toHaveAttribute('data-skill-study',second.id);
  await submitCheck(second,true,{alreadyOnCheck:true});
  await expect(pathView.locator('.skill-path-progress strong')).toHaveText('67%');
  await expect(study).toHaveAttribute('data-skill-study',second.id);
  await button('下一个技能').click();
  await expect(study).toHaveAttribute('data-skill-study',third.id);
  await submitCheck(third,true);
  await expect(pathView.locator('.skill-path-progress strong')).toHaveText('100%');
  await expect(map.locator('[data-branch-connector="metrics"]')).toHaveAttribute('data-progress','100');
  await expect(map.locator('[data-branch-connector="quality"]')).toHaveAttribute('data-progress','0');
  await expect(map.locator('[data-growth-leaf]')).toHaveCount(3);
  await expect(map.locator('.skill-sprout:not([data-growth-leaf])')).toHaveCount(2);
  await expect(map.locator('[data-growth-ring][data-grown="true"]')).toHaveCount(3);
  await button('回到树上').click();
  await screenshot('05-mature-branch');
  mark('Passing all skills completes one branch independently, including a direct check link');

  await go('/career-map?career=security&node=skill:logs');
  await expect(study).toHaveAttribute('data-skill-study','event-logs');
  await expect(pathView.locator('.skill-path-progress strong')).toHaveText('0%');
  await expect(map.locator('[data-growth-leaf]')).toHaveCount(0);
  const careerSelect = map.getByLabel('职业方向',{exact:true});
  for (const {id,name} of careers) {
    await careerSelect.selectOption(id);
    await expect(map.locator('.skill-root h2')).toHaveText(name);
    await expect(map.locator('[data-skill-branch]')).toHaveCount(4);
    const expected = getSkillTree(id);
    await expect(map.locator('[data-skill-leaf]')).toHaveCount(expected.branches.flatMap(row => row.leaves).length);
    if (expected.assessment) await expect(study.locator(`a[href="${expected.assessment.url}"]`)).toBeVisible();
  }
  mark('All ten careers load with separate progress and official assessments where provided');

  await page.setViewportSize({width:390,height:844});
  await go('/career-map?career=data');
  await expect(treeLeaf(first.id)).toBeVisible();
  await branch('communication').click();
  await expect(pathView).toHaveAttribute('data-skill-path','communication');
  await expect(treeLeaf('pivot-tables')).toBeVisible();
  await expect(treeLeaf(first.id)).toBeHidden();
  await expect(branch('metrics')).toHaveAttribute('data-complete','true');
  await expect(map.locator('[data-growth-leaf]')).toHaveCount(3);
  await treeLeaf('pivot-tables').click({trial:true});
  await map.locator('.skill-tree-board').evaluate(element => element.scrollIntoView({block:'start',behavior:'instant'}));
  await page.mouse.move(1,1);
  await screenshot('04-mobile');
  await page.setViewportSize({width:320,height:812});
  await page.evaluate(() => localStorage.setItem('career-prototype-language','en'));
  await go('/career-map?career=data&branch=communication&skill=pivot-tables&step=practice');
  await expect(map.getByRole('heading',{name:'Career & skills map'})).toBeVisible();
  await expect(study.getByRole('heading',{name:'Pivot tables and reconciliation'})).toBeVisible();
  await expect(map.locator('.skill-path-steps > li')).toHaveCount(4);
  for (const direction of getSkillTree('data').branches) {
    await branch(direction.id).click();
    for (const skill of direction.leaves) await treeLeaf(skill.id).click({trial:true});
  }
  assert.ok(await page.evaluate(() => [document.documentElement,document.querySelector('#main'),document.querySelector('.skill-map')]
    .every(element => element.scrollWidth <= element.clientWidth + 1)));
  assert.deepEqual(report.errors,[]);
  mark('The narrow-screen tree expands the selected branch, stays within its container and supports English');
  for (const width of [1024,1440]) {
    await page.setViewportSize({width,height:900});
    for (const {id} of careers) {
      await map.getByLabel('Career direction',{exact:true}).selectOption(id);
      await expect(map.locator('[data-skill-leaf]')).toHaveCount(getSkillTree(id).branches.flatMap(item => item.leaves).length);
      for (const leafButton of await map.locator('[data-skill-leaf]:visible').all()) await leafButton.click({trial:true,timeout:2500});
      for (const branchButton of await map.locator('[data-skill-branch]').all()) await branchButton.click({trial:true,timeout:2500});
      const longLabels = await map.locator('.skill-branch-lettering text').evaluateAll(labels => labels.flatMap(label => {
        const text = label.querySelector('textPath');
        const path = document.getElementById(text.getAttribute('href').slice(1));
        const width = text.getComputedTextLength();
        const available = path.getTotalLength();
        return width > available ? [{title:text.textContent,width,available}] : [];
      }));
      assert.deepEqual(longLabels,[],id + ' branch names fit their bark paths');
    }
  }
  mark('All 123 skill markers are pointer-accessible at 1024px and 1440px in English');
  let fullRevision = (await api('/api/workspace')).revision;
  for (const leaf of data.branches.slice(1).flatMap(row => row.leaves)) {
    const command = await api('/api/commands',{method:'POST',data:{type:'skill.check',baseVersion:fullRevision,
      mutationId:randomUUID(),payload:{career:'data',skill:leaf.id,version:leaf.version,answers:selections(leaf,true)}}});
    assert.equal(command.refs.grade.passed,true);
    fullRevision = command.revision;
  }
  await page.evaluate(() => localStorage.setItem('career-prototype-language','zh'));
  await page.setViewportSize({width:1440,height:1000});
  await go('/career-map?career=data');
  await expect(map.locator('.skill-root')).toContainText('13/13');
  await expect(map.locator('[data-growth-leaf]')).toHaveCount(13);
  await expect(map.locator('.skill-sprout:not([data-growth-leaf])')).toHaveCount(10);
  await expect(map.locator('.skill-water-pearl')).toHaveCount(0);
  await expect(map.locator('[data-growth-ring][data-grown="true"]')).toHaveCount(13);
  await expect(map.locator('[data-branch-connector][data-progress="100"]')).toHaveCount(4);
  const clippedLeaves = await map.locator('.skill-growth-stage').evaluate(async stage => {
    const leaves = [...stage.querySelectorAll('.skill-sprout')];
    await Promise.all(leaves.map(leaf => leaf.decode()));
    const frame = stage.getBoundingClientRect();
    return leaves.flatMap((leaf,index) => {
      const bounds = leaf.getBoundingClientRect();
      return bounds.top < frame.top - 1 || bounds.left < frame.left - 1 || bounds.right > frame.right + 1
        ? [{leaf:leaf.dataset.growthLeaf ?? index,top:bounds.top-frame.top,left:bounds.left-frame.left,right:frame.right-bounds.right}] : [];
    });
  });
  assert.deepEqual(clippedLeaves,[],'The complete canopy fits within the illustration');
  await map.locator('.skill-tree-board').evaluate(element => element.scrollIntoView({block:'start',behavior:'instant'}));
  await screenshot('06-full-canopy');
  mark('All checks completed: thirteen leaves and growth rings, four fully colored branches, no remaining pearls');
  report.passed = true;
} catch (error) {
  report.failure = error.message;
  await screenshot('failure').catch(() => {});
  throw error;
} finally {
  if (registered) {
    try {
      await api('/api/auth/delete-account',{method:'POST',data:{currentPassword:password,email,confirmation:'DELETE_ACCOUNT'}});
    } catch (error) {
      report.cleanupError = error.message;
      console.error('Test account cleanup failed',error.message);
      process.exitCode = 1;
    }
  }
  await fs.writeFile(path.join(out,'browser-result.json'),JSON.stringify(report,null,2));
  await browser.close();
  await harness.close();
}
