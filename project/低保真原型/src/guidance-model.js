export const GUIDANCE_KEY='career-prototype-guidance-v1';
export function guidanceId(path,tab=''){
 if(path.startsWith('/reports'))return tab==='岗位简历'?'resume':'reports';
 if(path.startsWith('/work/'))return 'work';
 return ({'/app':'workspace','/careers':'careers','/assessment':'assessment','/plan':'plan','/learning':'learning','/assistant':'assistant','/settings':'settings','/career-map':'map'})[path]||null;
}
export function readGuidance(storage){try{const d=JSON.parse(storage?.getItem(GUIDANCE_KEY)||'{}');return {seen:Array.isArray(d.seen)?d.seen.filter(x=>typeof x==='string'):[],auto:d.auto!==false};}catch{return {seen:[],auto:true};}}
export function dismissGuidance(storage,id){const d=readGuidance(storage),next={...d,seen:[...new Set([...d.seen,id].filter(Boolean))]};try{storage?.setItem(GUIDANCE_KEY,JSON.stringify(next));}catch{}return next;}
export function setGuidanceAuto(storage,auto){const d={...readGuidance(storage),auto:!!auto};try{storage?.setItem(GUIDANCE_KEY,JSON.stringify(d));}catch{}return d;}
export const shouldShowGuidance=(state,id)=>!!id&&state.auto&&!state.seen.includes(id);
export function bubblePosition(anchor,size,viewport){
 const edge=16,leftEdge=(viewport.left||0)+edge,topEdge=(viewport.top||0)+edge,right=(viewport.left||0)+viewport.width-edge,bottom=(viewport.top||0)+viewport.height-edge;
 const width=Math.min(size.width,right-leftEdge),height=Math.min(size.height,bottom-topEdge),below=bottom-anchor.bottom-10,above=anchor.top-topEdge-10;
 const side=below>=height||below>=above?'bottom':'top';
 return {left:Math.max(leftEdge,Math.min(anchor.right-width,right-width)),top:Math.max(topEdge,Math.min(side==='bottom'?anchor.bottom+10:anchor.top-height-10,bottom-height)),width,maxHeight:bottom-topEdge,side};
}
