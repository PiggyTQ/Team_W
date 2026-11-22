import {growthFrame} from './skill-growth-geometry.js';

// Fit the complete source frame into the shared scene. The small extension
// occupies the reading column's empty edge, never a clipped magnifying window.
export function sharedTreeCamera({width,height},{learning=false,focus='whole',branch=0,wide=false}={}) {
  width=Math.max(1,width);height=Math.max(1,height);
  const bleed=0;
  const available=width+bleed;
  const fullFit=Math.min(available/growthFrame.width,height/growthFrame.height);
  const fraction=learning ? .99 : 1;
  const sourceScale=fullFit*fraction;
  const align=.5;
  const x=(available-growthFrame.width*sourceScale)/2;
  const y=(height-growthFrame.height*sourceScale)*align;
  return {scale:sourceScale/(width/growthFrame.width),x,y,bleed,sourceScale,
    frame:{x,y,width:growthFrame.width*sourceScale,height:growthFrame.height*sourceScale}};
}
