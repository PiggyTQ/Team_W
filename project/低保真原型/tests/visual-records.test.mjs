import test from 'node:test';import assert from 'node:assert/strict';
import {scenarioState} from '../src/model.js';
import {budgetVisual,reportVisual} from '../src/visual-records-model.js';
test('budget segments use the same active task scope as planning, including blocked tasks',()=>{
 const s=scenarioState('PT05'),before=structuredClone(s);s.tasks.push({...s.tasks[0],id:'blocked',status:'受阻',hours:0.5},{...s.tasks[0],id:'deferred',status:'延期',hours:9},{...s.tasks[0],id:'done',status:'完成',hours:8});
 const data=budgetVisual(s);assert.equal(data.used,2.5);assert.equal(data.segments.length,2);assert.equal(data.remaining,0.5);assert.equal(data.segments.reduce((n,g)=>n+g.hours,0),2.5);assert.ok(Math.abs(data.segments.reduce((n,g)=>n+g.share,0)-2.5/3)<1e-10);assert.deepEqual(s.tasks[0],before.tasks[0]);
});
test('overspend moves the budget marker rather than drawing an impossible percentage or changing tasks',()=>{
 const s=scenarioState('PT05');s.budget=1;const before=structuredClone(s),data=budgetVisual(s);assert.equal(data.scale,2);assert.equal(data.budgetPosition,0.5);assert.equal(data.excess,1);assert.equal(data.segments[0].share,1);assert.deepEqual(s,before);
});
test('unknown and zero budget do not display capacity ratios or invented availability',()=>{
 for(const budget of [undefined,null,0,'unknown']){const s=scenarioState('PT05');s.budget=budget;const data=budgetVisual(s);assert.equal(data.known,false);assert.equal(data.scale,null);assert.equal(data.remaining,null);assert.equal(data.segments[0].share,null);assert.equal(data.used,2);}
});
test('report categories partition actual records and do not expose private review bodies',()=>{
 const s=scenarioState('PT05');s.claims.push({...s.claims[0],id:'pending',status:'矛盾'},{...s.claims[0],id:'withdrawn',status:'已撤回'});s.tasks.push({...s.tasks[0],id:'done',status:'完成'},{...s.tasks[0],id:'stopped',status:'取消'},{...s.tasks[0],id:'other',status:'待核实'});s.reviews=[{result:'PRIVATE_RESULT',next:'PRIVATE_NEXT'}];const before=structuredClone(s),data=reportVisual(s);
 assert.equal(data.materialTotal,4);assert.deepEqual(data.materials.map(g=>g.count),[2,1,1]);assert.equal(data.actions.reduce((n,g)=>n+g.count,0),4);assert.equal(data.actions.find(g=>g.id==='other').count,1);assert.doesNotMatch(JSON.stringify(data),/PRIVATE_|score|percent/);assert.deepEqual(s,before);
});
