// m*x'' + c*x' + k*(x-target) = 0. Critical damping c=2*sqrt(k*m).
// Substeps make the solution stable across 30/60/120 Hz and after long frames.
export function springStep({position,velocity},target,elapsed,{mass=1,stiffness=196,damping=28}={}){
 const time=Math.min(Math.max(elapsed,0),.05),steps=Math.max(1,Math.ceil(time/(1/240))),dt=time/steps;
 for(let i=0;i<steps;i++){
  const acceleration=(stiffness*(target-position)-damping*velocity)/mass;
  velocity+=acceleration*dt;position+=velocity*dt;
 }
 return {position,velocity};
}
