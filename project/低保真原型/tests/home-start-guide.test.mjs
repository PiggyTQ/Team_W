import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarioState} from '../src/model.js';
import {operationSteps,initialOperationStep,readOperationGuide,OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';

const home=s=>({s,path:'/app',tab:'',search:'',modal:null});
test('first-use guide points to current work without requiring career selection',()=>{
 const c=home(scenarioState('PT01')),before=structuredClone(c.s),steps=operationSteps('home',c);
 assert.equal(steps.length,1);
 assert.equal(steps[0].done(c),false);
 c.s.compare=['data','data','gone'];
 assert.equal(steps[0].satisfied(c),false);
 assert.equal(initialOperationStep('home',c),0);
 c.s.compare=['data','ai'];
 assert.equal(steps[0].done(c),false);
 assert.equal(initialOperationStep('home',c),0);
 assert.equal(steps[0].done({...c,path:'/assessment',tab:'资料经历'}),true);
 assert.equal(steps[0].handoff,'route');
 assert.deepEqual({...c.s,compare:[]},before);
});
test('secondary entries can hand off without requiring comparison or changing business state',()=>{
 const c=home(scenarioState('PT01')),steps=operationSteps('home',c),away={...c,path:'/assessment',tab:'资料经历'},before=structuredClone(c.s);
 assert.equal(steps[0].satisfied(away),true);
 assert.equal(steps[0].satisfied({...c,path:'/learning'}),true);
 assert.deepEqual(c.s,before);
});
test('saved comparison guide checkpoint migrates without resetting other guide flows',()=>{
 const storage=value=>({getItem:key=>key===OPERATION_GUIDE_KEY?JSON.stringify(value):null});
 const old={active:{flow:'home',index:1,paused:true,baseline:{compare:2}},seen:['explore'],enabled:true};
 const migrated=readOperationGuide(storage(old));
 assert.equal(migrated.active.index,0);
 assert.equal(migrated.active.paused,true);
 assert.deepEqual(migrated.active.baseline,{compare:2});
 assert.deepEqual(migrated.seen,['explore']);
 assert.equal(readOperationGuide(storage({...old,active:{flow:'materials',index:4}})).active.index,4);
});
test('existing records use the current action rather than requiring career selection',()=>{
 for(const scene of ['PT03','PT04','PT07']){
  const c=home(scenarioState(scene)),before=structuredClone(c.s),steps=operationSteps('home',c);
  assert.equal(steps.length,1,scene);
  assert.equal(initialOperationStep('home',c),0,scene);
  assert.equal(steps[0].done(c),false,scene);
  assert.equal(steps[0].done({...c,path:'/assessment'}),true,scene);
  assert.deepEqual(c.s,before);
 }
});
