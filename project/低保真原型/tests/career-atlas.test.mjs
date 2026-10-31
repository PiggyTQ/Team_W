import test from 'node:test';
import assert from 'node:assert/strict';
import {supportsForMaterial,phaseForNode,atlasRelation,demoAtlasMaterial} from '../src/career-atlas-model.js';
test('material projection only uses confirmed exact skill support, never infers adjacent skills',()=>{
 assert.deepEqual(supportsForMaterial(demoAtlasMaterial),['sql']);
 assert.deepEqual(supportsForMaterial({...demoAtlasMaterial,status:'待确认'}),[]);
 assert.deepEqual(supportsForMaterial({...demoAtlasMaterial,skill:'Python'}),[]);
 assert.deepEqual(supportsForMaterial(null),[]);
});
test('work phase follows actual skill or deliverable and unknown selection stays at the start',()=>{
 assert.equal(phaseForNode('sql'),1);assert.equal(phaseForNode('sheet'),1);
 assert.equal(phaseForNode('limits'),2);assert.equal(phaseForNode('unknown'),0);
});
test('only existing synthetic career bridge and responsibility examples are exposed',()=>{
 assert.equal(atlasRelation('data','学习桥接').neighbor,'ai');
 assert.equal(atlasRelation('security','学习桥接').available,false);
 assert.equal(atlasRelation('ai','责任进阶').available,false);
 assert.equal(atlasRelation('data','责任进阶').available,true);
});
