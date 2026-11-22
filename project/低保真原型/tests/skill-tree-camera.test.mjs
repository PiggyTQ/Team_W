import test from 'node:test';
import assert from 'node:assert/strict';
import {sharedTreeCamera} from '../src/skill-tree-camera.js';
import {growthFrame,botanicalBoughs} from '../src/skill-growth-geometry.js';

test('shared camera keeps the complete tree frame and all skill stems in view without stretching',()=>{
  for(const width of [350,410,545,620,1120])for(const height of [360,480,540,630])for(const branch of [0,1,2,3])for(const wide of [false,true]){
    const camera=sharedTreeCamera({width,height},{learning:true,focus:'branch',branch,wide}),r=camera.frame;
    assert.ok(r.x>=0&&r.y>=0);
    assert.ok(r.x+r.width<=width+camera.bleed+.001);
    assert.ok(r.y+r.height<=height+.001);
    assert.ok(camera.bleed<=96);
    assert.ok(Math.abs(r.width/r.height-growthFrame.width/growthFrame.height)<.00001);
    for(const pose of botanicalBoughs[branch].forks){
      const x=r.x+(pose.point[0]-growthFrame.x)*camera.sourceScale;
      const y=r.y+(pose.point[1]-growthFrame.y)*camera.sourceScale;
      assert.ok(x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height);
    }
    const root={x:r.x+(555-growthFrame.x)*camera.sourceScale,y:r.y+(866-growthFrame.y)*camera.sourceScale};
    assert.ok(root.x>=0&&root.x<=width+camera.bleed&&root.y>=0&&root.y<=height);
  }
});
test('overview stays inside its own area and completion keeps the same visual anchor without hiding the roots',()=>{
 const box={width:545,height:540};
 const current=sharedTreeCamera(box,{learning:true,focus:'branch',branch:3});
 const completed=sharedTreeCamera(box,{learning:true,focus:'branch',branch:3,wide:true});
 const overview=sharedTreeCamera({width:1120,height:630});
 assert.equal(overview.bleed,0);assert.ok(overview.frame.width<=1120&&overview.frame.height<=630);
 assert.deepEqual(completed,current);
 assert.ok(completed.frame.y+completed.frame.height<=box.height);
});
