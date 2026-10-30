// A deliberate small movement can leave a settled frame without crossing half
// the distance to the next one. Tiny movements and free reading stay native.
export function directionalRelease(stops,origin,y,direction){
 if(!direction||origin===null)return null;
 const current=stops.findIndex(stop=>Math.abs(stop.target-origin)<=16);
 if(current<0)return null;
 const next=stops[current+direction];if(!next)return null;
 if(stops[current].scene&&next.scene&&stops[current].id===next.id)return null;
 const distance=(next.target-stops[current].target)*direction;
 const movement=(y-origin)*direction;
 const threshold=Math.min(72,Math.max(40,distance*.16));
 return distance>0&&movement>=threshold&&movement<distance?next:null;
}
