import test from 'node:test';import assert from 'node:assert/strict';
import {springStep} from '../src/scroll-physics.js';
test('质量弹簧阻尼在30/60/120Hz均收敛且不越过滚动目标',()=>{
 for(const fps of [30,60,120]){
  let state={position:0,velocity:0};
  for(let i=0;i<fps*3;i++){state=springStep(state,500,1/fps);assert.ok(state.position>=0&&state.position<=500);}
  assert.ok(Math.abs(state.position-500)<.01);assert.ok(Math.abs(state.velocity)<.05);
 }
});
test('长帧积分保持有限，吸附可回到目标位置',()=>{
 let state={position:42,velocity:150};
 for(let i=0;i<180;i++)state=springStep(state,0,i===0?.8:1/60);
 assert.ok(Number.isFinite(state.position)&&Math.abs(state.position)<.01);
 assert.ok(Math.abs(state.velocity)<.05);
});
