import test from 'node:test';import assert from 'node:assert/strict';
import {magneticPanel,panelSnapTarget,wheelPixels} from '../src/scroll-boundary-model.js';

test('下一完整板块露出三分之一时触发，之前保持原生滚动',()=>{
 const panel={id:'panel',top:1000,bottom:1720,target:844};
 assert.equal(magneticPanel([panel],350,30,900),null);
 assert.equal(magneticPanel([panel],390,20,900).id,'panel');
});
test('可放入一屏的板块底边对齐视口底线',()=>{
 const target=panelSnapTarget({top:1000,bottom:1720},900);
 assert.equal(target,844);assert.equal(1720-target,900-24);
});
test('长板块吸附只进入首个可读画面，不跳过其中的内容',()=>{
 assert.equal(panelSnapTarget({top:1000,bottom:4200,opening:1088},900),1040);
});
test('单次输入选最近板块，已吸附板块不要求再次解锁',()=>{
 const panels=[{id:'a',top:1000,target:844},{id:'b',top:2000,target:1844}];
 assert.equal(magneticPanel(panels,390,5000,900).id,'a');
 assert.equal(magneticPanel(panels,850,100,900,new Set(['a'])),null);
});
test('案例内部滚动输入不被子主题拦截，松手归位独立处理',()=>{
 const panels=[{id:'case-study',top:1000,target:1040},{id:'before-start',top:4300,target:4200}];
 for(const y of [1200,1900,2600,3300])assert.equal(magneticPanel(panels,y,100,900,new Set(['case-study'])),null);
 assert.equal(magneticPanel(panels,390,-100,900),null);
});
test('底部目标限定在文档滚动范围内',()=>{
 assert.equal(panelSnapTarget({top:50,bottom:500},900),0);
 assert.equal(panelSnapTarget({top:1200,bottom:1700},900,600),600);
});
test('行与页滚轮单位转换保持一致',()=>{
 assert.equal(wheelPixels(3,1,800),54);assert.equal(wheelPixels(1,2,800),800);assert.equal(wheelPixels(-80,0,800),-80);
});
