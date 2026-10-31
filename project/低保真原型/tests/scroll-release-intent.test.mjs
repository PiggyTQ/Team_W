import test from 'node:test';import assert from 'node:assert/strict';import {directionalRelease} from '../src/scroll-release-intent.js';
const stops=[{id:'a',target:1000},{id:'b',target:1800},{id:'c',target:2600}];
test('80px轻滚即可前进或后退，不再需要跨过400px中点',()=>{
 assert.equal(directionalRelease(stops,1000,1080,1)?.id,'b');
 assert.equal(directionalRelease(stops,1800,1720,-1)?.id,'a');
});
test('微小输入与长内容中途阅读不触发跳页',()=>{
 assert.equal(directionalRelease(stops,1000,1020,1),null);
 assert.equal(directionalRelease(stops,1300,1380,1),null);
 assert.equal(directionalRelease(stops,1000,920,1),null);
 assert.equal(directionalRelease(stops,2600,2680,1),null);
 assert.equal(directionalRelease([{id:'long',target:1000,scene:true},{id:'long',target:1800,scene:true}],1000,1080,1),null);
});
