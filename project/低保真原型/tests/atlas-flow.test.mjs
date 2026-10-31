import test from 'node:test';
import assert from 'node:assert/strict';
import {careers,fresh,makeTask,checkStart} from '../src/model.js';
import {atlasView,atlasAction,atlasTasks,atlasReturn,atlasReading,branchesFor,atlasTaskSkill} from '../src/career-atlas-model.js';
const view=query=>atlasView(new URLSearchParams(query),'data');
const action=query=>atlasAction(view(query),'/career-map?'+query);

test('all 20 career branches have distinct questions, actionable steps and correctly scoped templates',()=>{
 const keys=new Set(),questions=new Set();
 for(const c of careers){
  assert.equal(branchesFor(c.id).length,2);
  for(const b of branchesFor(c.id)){
   const a=action(`career=${c.id}&tab=职业关系&relation=细分方向&node=branch:${b.id}`);
   assert.equal(a.career,c.id);assert.equal(a.atlas.branch,b.id);assert.equal(a.steps.length,3);
   assert.ok(a.product);keys.add(a.atlas.key);questions.add(a.purpose);
   const t=makeTask(fresh(),a);assert.deepEqual(t.atlas,a.atlas);assert.notEqual(t.atlas,a.atlas);
   assert.notEqual(t.atlas.steps,a.atlas.steps);assert.equal(t.mode,b.template==='external'?'S1':'S2');
  }
 }
 assert.equal(keys.size,20);assert.equal(questions.size,20);
});
test('invalid deep links recover to available content; legacy branch titles still select the correct branch',()=>{
 const v=view('career=missing&relation=missing&range=missing&node=skill:missing&tool=bad');
 assert.equal(v.career,'data');assert.equal(v.range,'全部阶段');assert.equal(v.node.id,'foundation');
 assert.equal(view('career=ai&tab=职业关系&relation=细分方向&node=branch:评估').branch.id,'evaluation');
 assert.equal(view('range=产物&node=skill:sql').node.id,'quality');
 assert.equal(view('tab=职业关系&career=ops&node=neighbor').selected,'relation');
 assert.equal(action('tab=职业关系&career=ops'),null);
});
test('OR tools remain alternatives and AND delivery standards cannot be lost when drafting from a node',()=>{
 const a=action('node=skill:limits&tool=sheet');assert.equal(a.atlas.tool,'sheet');assert.equal(a.atlas.skill,'表格工具');
 assert.match(a.purpose,/表格/);assert.match(a.product,/问题清单/);assert.match(a.product,/处理理由/);assert.match(a.product,/限制说明/);
 assert.notEqual(a.atlas.key,action('node=skill:limits&tool=sql').atlas.key);
 assert.equal(action('node=dependency:or&tool=sheet').atlas.skill,'表格工具');
});
test('related task recovery isolates branch, tool and career, excludes stopped tasks, and orders unfinished first',()=>{
 const a=action('node=skill:sql'),s=fresh(),t=makeTask(s,a);
 const done={...t,id:'done',completed:true,status:'完成'};
 assert.deepEqual(atlasTasks([makeTask(s,action('node=skill:sheet')),done,{...t,id:'stop',status:'延期'},t],a).map(t=>t.id),[t.id,'done']);
 assert.equal(atlasTasks([{...t,atlas:undefined,source:'/careers'}],a).length,0);
});
test('map practice preserves budget preflight and S1 routing contract without changing goals or claims',()=>{
 const s=fresh(),a=action('node=skill:sheet'),before=structuredClone(s);
 assert.equal(checkStart(s,a),'');assert.deepEqual(s,before);
 assert.match(checkStart({...s,budget:0},a),/总预算/);
 assert.match(checkStart({...s,budget:.5},a),/超过/);
 assert.equal(makeTask({...s,stage:'S1'},a).mode,'S1');
 assert.equal(makeTask(s,a).atlas.skill,'表格工具');
});
test('reading resumes existing chapter and preserves the exact map action; returns reject external URLs',()=>{
 const a=action('node=skill:sheet');assert.equal(atlasReading(a,{quality:{chapter:2}}).chapter,2);
 assert.equal(atlasReading(a,{quality:{chapter:999}}).chapter,3);
 assert.equal(atlasReading(a,{}).atlasDraft,a);
 assert.equal(atlasReturn(makeTask(fresh(),a)),a.source);
 for(const source of ['https://example.com/career-map','//evil.test/career-map','/assistant','javascript:alert(1)'])assert.equal(atlasReturn({atlas:{},source}),null);
});
test('legacy map tasks survive canonical URL changes without importing unrelated template tasks or rewriting old records',()=>{
 const legacy={id:'old-map',career:'data',template:'quality',purpose:'验证 SQL 的已有材料与未知',source:'/career-map?tab=技能先修&node=skill:sql',status:'进行中',standard:'旧标准'};
 const a=action('career=data&tab=技能先修&node=skill:sql&tool=sql&range=全部阶段');
 const before=structuredClone(legacy);assert.equal(atlasTasks([legacy],a)[0].id,'old-map');assert.deepEqual(legacy,before);
 assert.equal(atlasTaskSkill(legacy),'SQL');assert.equal(atlasTaskSkill({...legacy,source:'/career-map?node=skill:sheet'}),'表格工具');
 assert.equal(atlasTasks([{...legacy,source:'/careers?career=data'}],a).length,0);
 assert.equal(decodeURI(atlasReturn(legacy)),legacy.source);
});
