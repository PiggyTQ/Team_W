// A short chapter has one centered stop. A tall chapter has a readable interval:
// the visitor can read its middle freely, but cannot rest in the gap between cards.
export function storyStops(scenes,viewport){
 return scenes.map(scene=>{
  const height=scene.bottom-scene.top;
  if(scene.fullScreen)return {...scene,start:scene.top,end:Math.max(scene.top,scene.bottom-viewport)};
  const start=height<=viewport-48?scene.top-(viewport-height)/2:scene.top-24;
  const end=height<=viewport-48?start:scene.bottom-viewport+24;
  return {...scene,start,end};
 });
}

export function nearestStoryStop(scenes,y,viewport){
 const stops=storyStops(scenes,viewport);
 if(!stops.length||y<stops[0].start-viewport/3||y>stops.at(-1).end+viewport/3)return null;
 if(stops.some(stop=>y>=stop.start-1&&y<=stop.end+1))return null;
 return stops.map(stop=>{
  const edge=y<stop.start?'start':'end',target=stop[edge];
  return {id:stop.id,target,edge,distance:Math.abs(y-target)};
 }).sort((a,b)=>a.distance-b.distance)[0];
}
