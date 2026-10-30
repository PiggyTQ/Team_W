export const wheelPixels=(delta,mode,height)=>delta*(mode===1?18:mode===2?height:1);

// A complete panel begins snapping when its first third of the viewport is shown.
// Short panels align their bottom edge; a long reading panel stays at its opening
// viewport so automatic movement never skips its unread middle.
export function panelSnapTarget({top,bottom,opening=top},viewport,maximum=Infinity){
 const target=bottom-top<=viewport-48?bottom-viewport+24:opening-48;
 return Math.max(0,Math.min(maximum,target));
}

export function magneticPanel(panels,y,delta,viewport,captured=new Set()){
 if(delta<=0)return null;
 return panels.filter(panel=>!captured.has(panel.id)&&panel.top>y+3&&panel.target>y+3&&y+delta>=panel.top-viewport*2/3)
  .sort((a,b)=>a.top-b.top)[0]||null;
}
