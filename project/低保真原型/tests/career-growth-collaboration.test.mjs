import test from 'node:test';
import assert from 'node:assert/strict';
import cases from '../src/content/career-growth-collaboration-20261127.json' with {type:'json'};
import roles from '../src/content/career-exploration.json' with {type:'json'};
import {careerGrowthCase,careerGrowthIds,CAREER_GROWTH_VERSION} from '../src/career-growth-collaboration.js';

test('all ten careers have distinct scope artifacts, decisions and complete reviewable handoffs',()=>{
 assert.deepEqual(careerGrowthIds.sort(),Object.keys(roles).sort());
 const excerpts=new Set();
 function pair(value,path){assert.equal(value.length,2,path);assert.ok(value.every(s=>typeof s==='string'&&s.trim()),path);assert.doesNotMatch(value[1],/[\u3400-\u9fff]/,path);}
 for(const [id,c] of Object.entries(cases)){
  pair(c.caseTitle,id);pair(c.caseContext,id);assert.equal(c.stages.length,3,id);
  for(const s of c.stages){for(const key of ['title','task','authority','evidence'])pair(s[key],id+':'+key);pair(s.artifact.title,id);pair(s.artifact.excerpt,id);excerpts.add(s.artifact.excerpt[0]);}
  pair(c.handoff.title,id);pair(c.handoff.input,id);pair(c.handoff.acceptance,id);assert.equal(c.handoff.steps.length,4,id);
  c.handoff.steps.forEach(s=>Object.values(s).forEach(v=>pair(v,id)));Object.values(c.handoff.rework).forEach(v=>pair(v,id));
  assert.ok(c.sources.length,id);c.sources.forEach(s=>{pair(s.title,id);pair(s.supports,id);assert.equal(new URL(s.url).protocol,'https:',id);});
  const zh=careerGrowthCase(id),en=careerGrowthCase(id,'en');assert.equal(zh.version,CAREER_GROWTH_VERSION);assert.equal(en.stages[2].artifact.excerpt,c.stages[2].artifact.excerpt[1]);assert.equal(zh.handoff.acceptance,c.handoff.acceptance[0]);
 }
 assert.equal(excerpts.size,30);
});
test('localized cases are independent public examples and cannot mutate existing careers',()=>{
 const before=JSON.stringify(roles.data),one=careerGrowthCase('data');one.stages[0].artifact.excerpt='A local rendering edit';
 assert.notEqual(careerGrowthCase('data').stages[0].artifact.excerpt,one.stages[0].artifact.excerpt);assert.equal(JSON.stringify(roles.data),before);
 assert.equal(careerGrowthCase('missing'),null);assert.equal(careerGrowthCase('__proto__'),null);
});
