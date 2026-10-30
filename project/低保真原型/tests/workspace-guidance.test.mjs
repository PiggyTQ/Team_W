import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarioState} from '../src/model.js';
import {workspaceGuide,workspacePath,workspaceStarts,activeWorkspaceTask,pendingMaterials} from '../src/workspace-guidance.js';

test('first-use offers three optional starts without claiming confirmed material',()=>{
 const s=scenarioState('PT01'),before=JSON.stringify(s);
 assert.deepEqual(workspaceStarts.map(x=>x.id),['explore','goal','work']);
 assert.equal(workspacePath(s)[1].status,'还没有确认材料');
 assert.match(workspaceGuide(s,'/learning').note,/不会自动建任务/);
 assert.equal(JSON.stringify(s),before);
});
test('pending, duplicate and conflicting materials remain reviewable, not confirmed',()=>{
 const s=scenarioState('PT03');assert.equal(pendingMaterials(s).length,2);
 assert.equal(workspacePath(s)[1].status,'有材料待核对');
 assert.match(workspaceGuide(s,'/assessment','原文确认').note,/未确认内容暂不参与评估/);
});
test('changed evidence is called out before planning or exporting a new report',()=>{
 const s=scenarioState('PT07');assert.match(workspaceGuide(s,'/assessment','四维与差距').note,/已有依据发生变化/);
 assert.equal(workspaceGuide(s,'/reports').to,'/assessment?tab=四维与差距');
});
test('resume prefers in-progress work, ignores completed and stopped tasks, preserves task identity',()=>{
 const s=scenarioState('PT04'),t=s.tasks[0];s.tasks=[{...t,id:'paused',status:'延期'},{...t,id:'new',status:'待开始'},{...t,id:'done',completed:true},t];
 assert.equal(activeWorkspaceTask(s),t);assert.equal(workspaceGuide(s,'/learning').to,'/work/task-demo');
});
test('S1 practice stays in the external action route',()=>{
 const s=scenarioState('PT04');s.stage='S1';
 assert.equal(workspaceGuide(s,'/learning').to,'/plan?tab=执行&practice=task-demo');
});
test('missing and paused tasks route back to the plan; blockers offer adjustment',()=>{
 const s=scenarioState('PT04');s.tasks[0].status='受阻';assert.match(workspaceGuide(s,'/work/task-demo').note,/记录困难/);
 s.tasks[0].status='取消';assert.equal(workspaceGuide(s,'/work/task-demo').to,'/plan?tab=执行');
 assert.equal(workspaceGuide(s,'/work/absent').to,'/plan?tab=执行');
});
test('unknown weekly time keeps draft-first guidance and does not invent a budget',()=>{
 const s=scenarioState('PT01');s.budget=null;
 assert.match(workspaceGuide(s,'/plan').note,/先保存草稿/);assert.equal(s.budget,null);
});
test('all student workspace areas have a guide and independent exploration remains optional',()=>{
 const s=scenarioState('PT01'),before=JSON.stringify(s);
 for(const path of ['/careers','/assessment','/plan','/learning','/work/absent','/reports','/reports/saved','/assistant','/career-map','/settings']){
  const g=workspaceGuide(s,path);assert.ok(g?.purpose&&g.input&&g.output&&g.note&&g.to.startsWith('/'),path);
 }
 assert.equal(workspaceGuide(s,'/admin/data'),null);assert.equal(workspaceGuide(s,'/'),null);assert.equal(JSON.stringify(s),before);
});
