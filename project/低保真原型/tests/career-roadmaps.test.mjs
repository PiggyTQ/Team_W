import test from 'node:test';
import assert from 'node:assert/strict';
import {careers,fresh,makeTask,checkStart} from '../src/model.js';
import {mapSkills} from '../src/map-data.js';
import {careerRoadmaps,roadmapSourcesFor} from '../src/career-roadmaps.js';
import {atlasView,atlasAction,atlasTasks,atlasPracticeKey} from '../src/career-atlas-model.js';
const view=(career,node='',range='全部阶段')=>atlasView(new URLSearchParams({career,node,range}),'data');
const action=(career,node)=>atlasAction(view(career,'skill:'+node),`/career-map?career=${career}&node=skill:${node}`);

test('every career opens a real selectable route and every reference remains externally inspectable',()=>{
 assert.equal(Object.keys(careerRoadmaps).length,9);
 for(const {id} of careers){
  const current=view(id);assert.ok(current.node);assert.equal(current.selected,'skill:'+current.node.id);
  assert.equal(current.visible.length,id==='data'?5:7);
  const sources=roadmapSourcesFor(id);assert.equal(sources.sources.length,2);
  for(const source of sources.sources){assert.equal(new URL(source.url).protocol,'https:');assert.ok(source.scope);}
 }
 assert.deepEqual(view('data').visible,mapSkills);
});

test('deep links and stage filters recover within the selected career and point to the right phase',()=>{
 for(const [career,roadmap] of Object.entries(careerRoadmaps)){
  for(const node of roadmap.nodes){
   const current=view(career,'skill:'+node.id);assert.equal(current.node.id,node.id);
   assert.equal(current.phase,{基础:0,工具:1,产物:2}[node.stage]);
  }
  for(const [stage,count] of [['基础',2],['工具',3],['产物',2]]){
   const current=view(career,'skill:missing',stage);assert.equal(current.visible.length,count);assert.equal(current.node.stage,stage);
  }
  assert.equal(view(career,'skill:missing').node.id,roadmap.nodes[0].id);
 }
});

test('all suggested predecessors exist and routes have no cycles or unreachable nodes',()=>{
 for(const roadmap of Object.values(careerRoadmaps)){
  const seen=new Set([roadmap.nodes[0].id]);
  for(const node of roadmap.nodes.slice(1)){assert.ok(node.prerequisites.length);for(const id of node.prerequisites)assert.ok(seen.has(id),id);seen.add(node.id);}
  assert.equal(seen.size,7);
 }
});

test('each node drafts an isolated practice while retaining budget preflight and unknown ability status',()=>{
 const s=fresh(),before=structuredClone(s),keys=new Set();
 for(const [career,roadmap] of Object.entries(careerRoadmaps))for(const node of roadmap.nodes){
  const draft=action(career,node.id);keys.add(draft.atlas.key);
  assert.equal(draft.career,career);assert.equal(draft.atlas.node,'skill:'+node.id);assert.equal(draft.atlas.tool,null);assert.equal(draft.atlas.skill,'未知');
  assert.equal(draft.template,'external');assert.equal(draft.steps.length,3);assert.ok(draft.product.includes(node.standard));
  assert.equal(checkStart(s,draft),'');assert.match(checkStart({...s,budget:0},draft),/总预算/);
  const task=makeTask(s,draft);assert.equal(task.mode,'S1');assert.deepEqual(atlasTasks([task],draft).map(t=>t.id),[task.id]);
 }
 assert.equal(keys.size,63);assert.deepEqual(s,before);
 const a=action('security','network'),b=action('frontend','web');assert.equal(atlasTasks([makeTask(s,a)],b).length,0);
});

test('former generic exploration tasks are recoverable from the first node without rewriting saved records',()=>{
 for(const [career,roadmap] of Object.entries(careerRoadmaps)){
  const draft=action(career,roadmap.nodes[0].id),task={...makeTask(fresh(),draft),atlas:{...draft.atlas,key:'career:'+career,node:'career'}};
  const before=structuredClone(task);assert.equal(atlasPracticeKey(task.atlas),draft.atlas.key);assert.equal(atlasTasks([task],draft).length,1);assert.deepEqual(task,before);
 }
});
