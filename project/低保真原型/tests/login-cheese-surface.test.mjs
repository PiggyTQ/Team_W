import test from 'node:test';
import assert from 'node:assert/strict';
import {synchronizeSplitVertexWeights} from '../src/login-cheese-surface.js';

const surface=(xyz,channels,part=0)=>({base:new Float32Array(xyz),weights:new Float32Array(channels),seamGroups:new Float32Array(xyz.length/3).fill(part)});

test('eyelid and skin copies share displacement while detached arms keep their own domain',()=>{
  const skin=surface([.2,.5,.1],[0,0,0,0,0]);
  const eye=surface([.2,.5,.1],[0,0,.8,0,0]);
  const arm=surface([.2,.5,.1],[1,0,0,0,0],1);
  const armUvCopy=surface([.2,.5,.1],[0,0,0,0,0],1);
  synchronizeSplitVertexWeights([skin,eye,arm,armUvCopy]);
  assert.deepEqual([...skin.weights],[...eye.weights]);
  assert.equal(skin.weights[0],0);
  assert.ok(skin.weights[2]>.79);
  assert.deepEqual([...arm.weights],[...armUvCopy.weights]);
  assert.equal(arm.weights[0],1);
  assert.equal(arm.weights[2],0);
});

test('nearby surfaces remain independent instead of being fuzzy welded',()=>{
  const fingertip=surface([0,0,0],[1,0,0,0,0]);
  const frame=surface([.000001,0,0],[0,0,0,0,0]);
  synchronizeSplitVertexWeights([fingertip,frame]);
  assert.equal(fingertip.weights[0],1);
  assert.equal(frame.weights[0],0);
});
