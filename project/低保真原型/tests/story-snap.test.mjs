import test from 'node:test';import assert from 'node:assert/strict';
import {storyStops,nearestStoryStop} from '../src/story-snap-model.js';
test('短章节停止点居中，间隙选择距离最近的一张',()=>{
 const scenes=[{id:'a',top:1000,bottom:1600},{id:'b',top:1680,bottom:2280}];
 assert.equal(storyStops(scenes,900)[0].start,850);
 assert.equal(nearestStoryStop(scenes,1300,900).id,'b');
 assert.equal(nearestStoryStop(scenes,1150,900).id,'a');
 assert.equal(nearestStoryStop(scenes,850,900),null);
});
test('长章节内部可自由阅读，卡片交界松手归位且不越出案例',()=>{
 const scenes=[{id:'a',top:1000,bottom:2300},{id:'b',top:2380,bottom:3680}];
 assert.equal(nearestStoryStop(scenes,1200,900),null);
 assert.equal(nearestStoryStop(scenes,2000,900).id,'b');
 assert.equal(nearestStoryStop(scenes,1700,900).target,1424);
 assert.equal(nearestStoryStop(scenes,200,900),null);
 assert.equal(nearestStoryStop(scenes,3500,900),null);
});
