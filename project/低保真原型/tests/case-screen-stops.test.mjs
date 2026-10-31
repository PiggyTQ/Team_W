import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storyStops,nearestStoryStop} from '../src/story-snap-model.js';

test('full-screen case scenes stop at their outer boundary and long scenes retain a reading interval',()=>{
 const scenes=[{id:'one',top:1000,bottom:1900,fullScreen:true},{id:'two',top:1940,bottom:3140,fullScreen:true}];
 const stops=storyStops(scenes,900);
 assert.deepEqual(stops.map(s=>[s.start,s.end]),[[1000,1000],[1940,2240]]);
 assert.equal(nearestStoryStop(scenes,2100,900),null);
 assert.equal(nearestStoryStop(scenes,1935,900).target,1940);
});
