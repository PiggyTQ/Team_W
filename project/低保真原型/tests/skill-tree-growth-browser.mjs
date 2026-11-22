import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
import {AUTH_POLICY} from '../src/auth-contract.js';
import {getSkillTree,gradeSkillCheck} from '../server/skill-trees/index.mjs';
import {botanicalBoughs,waterRoute,growthTiming} from '../src/skill-growth-geometry.js';
import {localBusinessHarness} from './helpers/local-business-harness.mjs';

const out=path.resolve('checks/skill-tree-roots-20261119');
await fs.mkdir(out,{recursive:true});
const harness=await localBusinessHarness();
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
const context=await browser.newContext({viewport:{width:1700,height:1100},locale:'en-US',reducedMotion:'no-preference'});
const page=await context.newPage();
page.setDefaultTimeout(15000);
const report={origin:'isolated local authenticated test account',checks:[],errors:[],measurements:[],routes:[]};
page.on('pageerror',error=>report.errors.push(error.message));
await context.addInitScript(()=>localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true})));
await context.route('**/*',route=>new URL(route.request().url()).origin===harness.base?route.continue():route.abort());
let csrf,owner;
async function api(route,{method='GET',data}={}) {
  const response=await context.request.fetch(harness.base+route,{method,data,headers:{Origin:harness.base,...(csrf?{'X-CSRF-Token':csrf}:{}),...(owner?{'X-Account-Id':owner}:{})}});
  const result=await response.json();
  assert.ok(response.ok(),route+' '+JSON.stringify(result));
  csrf=result.csrfToken||csrf;owner=result.user?.id||owner;return result;
}
const mark=text=>{report.checks.push(text);console.log('PASS '+text);};
const map=page.locator('.skill-map'),board=page.locator('[data-botanical-tree]');
async function screenshot(name){await page.screenshot({path:path.join(out,name+'.png')});}
function choices(leaf){return Object.fromEntries(leaf.questions.map(question=>[question.id,question.options.find(option=>{
  const trial=Object.fromEntries(leaf.questions.map(row=>[row.id,row.options[0].id]));trial[question.id]=option.id;
  return gradeSkillCheck('data',leaf.id,leaf.version,trial).questions.find(row=>row.id===question.id).correct;
}).id]));}
async function passLeaf(leaf) {
  await page.goto(harness.base+'/career-map?career=data&skill='+leaf.id+'&step=check');
  const quiz=page.locator('.skill-quiz');await quiz.waitFor();
  await quiz.scrollIntoViewIfNeeded();
  for(const [q,value]of Object.entries(choices(leaf)))await quiz.locator(`[name="${q}"][value="${value}"]`).check();
  await quiz.locator('button[type="submit"]').click();
  await page.locator('.skill-check-result[data-passed="true"]').waitFor();
  await page.getByRole('button',{name:/^(回到树上|Back to the tree)$/}).click();
  const pulse=board.locator('[data-growth-event="'+leaf.id+'"]');
  await pulse.waitFor({state:'attached'});
  const kind=await pulse.getAttribute('data-growth-kind');
  const details=await page.evaluate(()=>document.getAnimations().map(animation=>({name:animation.animationName,target:animation.effect.target.className?.baseVal||animation.effect.target.className,...animation.effect.getTiming()})).filter(row=>/botanical/.test(row.name)));
  assert.ok(details.some(row=>row.name==='botanical-water-travel'&&row.duration===490&&row.delay===80));
  assert.ok(details.some(row=>row.name==='botanical-leaf-unfold'&&row.delay===560&&row.duration===330));
  assert.ok(details.some(row=>row.name==='botanical-bud-unfurl'&&row.delay===540));
  if(kind==='branch'){
    assert.ok(details.some(row=>row.name==='botanical-bough-green'&&row.delay===900));
    assert.ok(details.filter(row=>row.name==='botanical-leaf-unfold').some(row=>row.delay>=970));
  }
  report.checks.push({skill:leaf.id,kind,timing:details});
  if(leaf.id==='metric-definition'){
    await page.waitForTimeout(180);await screenshot('06-single-water-pulse');
  }else if(kind==='branch'){
    await page.waitForTimeout(1080);await screenshot('07-branch-unfolding');
  }
  await pulse.waitFor({state:'detached'});
  assert.equal(await board.locator('[data-growth-leaf="'+leaf.id+'"]').count(),1);
  return kind;
}

try {
  await api('/api/auth/session');
  await api('/api/auth/register',{method:'POST',data:{email:'tree-animation-'+randomUUID()+'@example.invalid',password:'Only a local synthetic test '+randomUUID()+'!',agree:true,termsVersion:AUTH_POLICY.termsVersion}});
  const initial=await api('/api/workspace');
  await api('/api/workspace',{method:'PUT',data:{actorId:owner,baseVersion:initial.revision,mutationId:randomUUID(),state:{...initial.state,onboard:true,goal:'data'}}});
  await page.goto(harness.base+'/career-map');
  await board.waitFor();await board.locator('.skill-ash-tree').evaluate(img=>img.decode());
  assert.equal(await board.locator('[data-skill-leaf]').count(),13);
  assert.equal(await board.locator('.skill-closed-bud').count(),13);
  assert.equal(await board.locator('.skill-water-pearl').count(),0);
  assert.equal(await board.locator('[data-growth-event]').count(),0);
  mark('Authenticated empty tree has 13 natural buds and no idle animation');
  await board.locator('[data-skill-leaf]').first().focus();
  await page.keyboard.press('Enter');
  assert.ok(new URL(page.url()).searchParams.has('skill'));
  assert.equal(await page.locator('#skill-path-title').evaluate(el=>document.activeElement===el),true);
  await page.goto(harness.base+'/career-map');await board.waitFor();
  mark('Keyboard activation preserves the skill route and moves focus to its learning path');
  for(const width of [1366,1700,1920]){
    await page.setViewportSize({width,height:1100});
    const boxes=await board.evaluate(root=>{
      const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
      return {board:rect(root),stage:rect(root.querySelector('.skill-growth-stage')),art:rect(root.querySelector('.skill-ash-tree')),horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(boxes.horizontalOverflow,false);
    assert.ok(boxes.art.width/boxes.board.width>.78&&boxes.art.width/boxes.board.width<.9);
    report.measurements.push({width,...boxes});
  }
  mark('1366 / 1700 / 1920 desktop layouts fit without horizontal overflow');
  await page.setViewportSize({width:1700,height:1100});
  await screenshot('01-empty-tree');
  // Measure the actual raster alpha under every curve; these are diagnostic
  // image reads, not a substitute for visual verification of bark/leaf joins.
  const routes=botanicalBoughs.flatMap((branch,bough)=>branch.forks.map((pose,index)=>({bough,index,point:pose.point,d:waterRoute(bough,index)})));
  report.routes=await board.evaluate(async(root,routes)=>{
    const img=root.querySelector('.skill-ash-tree'),canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const opaque=(x,y,r=5)=>{for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){
      const px=Math.round(x+a),py=Math.round(y+b);if(px>=0&&py>=0&&px<canvas.width&&py<canvas.height&&data[(py*canvas.width+px)*4+3]>90)return true;
    }return false;};
    return routes.map(route=>{const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',route.d);const length=path.getTotalLength(),miss=[];
      for(let n=0;n<=100;n++){const p=path.getPointAtLength(length*n/100);if(!opaque(p.x,p.y))miss.push([Math.round(p.x),Math.round(p.y)]);}
      return {...route,coverage:(101-miss.length)/101,anchor:opaque(...route.point,8),miss};
    });
  },routes);
  for(const route of report.routes){
    assert.ok(route.anchor,'Detached leaf stem '+route.bough+':'+route.index);
    assert.ok(route.coverage>=.99,'Water route leaves the wood '+route.bough+':'+route.index+' '+route.coverage);
  }
  mark('All 16 reusable leaf anchors meet the wood and at least 99% of route samples follow the artwork within 5 source pixels');
  const data=getSkillTree('data'),[first,second,third]=data.branches[0].leaves;
  assert.equal(await passLeaf(first),'single');await screenshot('02-single-grown');
  assert.equal(await board.locator('.skill-branch-cluster').count(),0);
  const afterFirst=await api('/api/workspace');assert.ok(afterFirst.state.skillStudy['data:'+first.id+':v'+first.version].assessment.passedAt);
  mark('First check triggers one root-to-target pulse and keeps exactly two tender leaves');
  await page.getByRole('button',{name:/^(回到树上|Back to the tree)$/}).click();
  await page.waitForTimeout(1100);assert.equal(await board.locator('[data-growth-event]').count(),0);
  await page.reload();await board.waitFor();assert.equal(await board.locator('[data-growth-event]').count(),0);
  assert.equal(await board.locator('[data-growth-leaf]').count(),1);
  mark('Repeated return and refresh do not replay saved progress');
  assert.equal(await passLeaf(second),'single');
  assert.equal(await passLeaf(third),'branch');await screenshot('03-branch-grown');
  assert.equal(await board.locator('.skill-branch-cluster').count(),botanicalBoughs[0].clusters.length);
  assert.equal(await board.locator('[data-growth-leaf]').count(),3);
  assert.equal(await board.locator('.skill-bough-green').count(),1);
  mark('Last bud opens before staggered leaf clusters and only its completed branch greens');
  await page.emulateMedia({reducedMotion:'reduce'});
  const fourth=data.branches[1].leaves[0];
  await page.goto(harness.base+'/career-map?career=data&skill='+fourth.id+'&step=check');
  await page.locator('.skill-quiz').scrollIntoViewIfNeeded();
  for(const [q,value]of Object.entries(choices(fourth)))await page.locator(`[name="${q}"][value="${value}"]`).check();
  await page.locator('.skill-quiz button[type="submit"]').click();await page.locator('.skill-check-result[data-passed="true"]').waitFor();
  await page.getByRole('button',{name:/^(回到树上|Back to the tree)$/}).click();
  await board.locator('[data-growth-leaf="'+fourth.id+'"]').waitFor();
  assert.equal(await board.locator('[data-growth-event]').count(),0);
  assert.equal(await board.locator('[data-growth-leaf="'+fourth.id+'"]').evaluate(img=>getComputedStyle(img).animationName),'none');
  mark('Reduced motion presents final leaves directly without traveling light');
  await page.getByRole('button',{name:'Use English',exact:true}).click();
  await screenshot('04-english-tree');
  for(const career of ['ai','security','ops','frontend','backend','engineering','testing','software','delivery']){
    await page.goto(harness.base+'/career-map?career='+career);await board.waitFor();
    assert.equal(await board.locator('[data-skill-leaf]').count(),getSkillTree(career).branches.flatMap(row=>row.leaves).length);
    assert.equal(await board.locator('[data-growth-leaf]').count(),0);
  }
  mark('All ten career trees keep their own node counts and independent account progress');
  for(const leaf of data.branches.flatMap(row=>row.leaves)){
    const current=await api('/api/workspace');
    if(current.state.skillStudy?.['data:'+leaf.id+':v'+leaf.version]?.assessment?.passedAt)continue;
    await api('/api/commands',{method:'POST',data:{type:'skill.check',baseVersion:current.revision,mutationId:randomUUID(),payload:{career:'data',skill:leaf.id,version:leaf.version,answers:choices(leaf)}}});
  }
  await page.goto(harness.base+'/career-map?career=data');await board.waitFor();
  assert.equal(await board.locator('[data-growth-leaf]').count(),13);
  assert.equal(await board.locator('.skill-branch-cluster').count(),botanicalBoughs.reduce((n,branch)=>n+branch.clusters.length,0));
  assert.equal(await board.locator('[data-growth-event]').count(),0);
  const clips=await board.locator('.skill-sprout').evaluateAll(images=>images.map(img=>({leaf:img.dataset.growthLeaf,box:img.getBoundingClientRect(),card:img.closest('.skill-tree-board').getBoundingClientRect()})).filter(({box,card})=>box.left<card.left||box.right>card.right||box.top<card.top));
  assert.deepEqual(clips,[]);
  await page.mouse.move(20,20);await screenshot('05-full-grown');
  mark('Fully completed tree restores all 13 pairs and 17 retained clusters inside the card without replay');
  assert.deepEqual(report.errors,[]);report.passed=true;
} finally {
  await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2));
  await context.close();await browser.close();await harness.close();
}
