import React,{useCallback,useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal,flushSync} from 'react-dom';
import './cheese-page-transition.css';

const planPaths=new Set(['/plan','/plan/goals','/plan/schedule']);
const planMode=url=>url.searchParams.get('tab')==='复盘'?'review':url.searchParams.get('tab')==='执行'&&url.searchParams.get('view')!=='calendar'?'execution':'overview';
const isPageChange=(from,to)=>{
 const current=new URL(from,location.origin),next=new URL(to,location.origin);
 if(!planPaths.has(current.pathname)||!planPaths.has(next.pathname))return false;
 if(current.pathname!==next.pathname)return true;
 return current.pathname==='/plan'&&planMode(current)!==planMode(next);
};

// Tangent-continuous curves make the uneven molten lobes round at every join.
const moltenEdge=[[940,-100],[930,20],[970,115],[1003,168],[995,224],[949,266],[930,310],[949,355],[994,407],[1005,465],[980,512],[943,548],[927,595],[947,649],[991,704],[1004,761],[978,810],[941,849],[935,895],[969,942],[994,1000],[970,1100]];
function smoothEdge(points,move=true){
 let path=move?`M${points[0].join(' ')}`:'';
 for(let index=0;index<points.length-1;index++){
  const previous=points[Math.max(0,index-1)],start=points[index],end=points[index+1],next=points[Math.min(points.length-1,index+2)];
  path+=`C${start[0]+(end[0]-previous[0])/6} ${start[1]+(end[1]-previous[1])/6} ${end[0]-(next[0]-start[0])/6} ${end[1]-(next[1]-start[1])/6} ${end.join(' ')}`;
 }
 return path;
}
const holes=[[260,270,9,7],[640,220,13,9],[480,490,12,9],[770,620,8,11],[320,760,13,10],[650,840,6,5]];
const layers=['#dda43a','#f1bf53','#ffdb7c','#ffedb3'].map((tone,index)=>{
 const front=moltenEdge.map(([x,y])=>[950+(x-950)*(.8+index*.08),y+[0,24,-22,10][index]]),back=front.map(([x,y])=>[1000-x,y-35]).reverse();
 return{tone,path:smoothEdge(front)+`L${back[0].join(' ')}`+smoothEdge(back,false)+'Z',rim:smoothEdge(front.map(([x,y])=>[x-9,y])),backRim:smoothEdge(back.map(([x,y])=>[x+9,y]))};
});

function CheeseSheets({prefix}){
 return <div className="cheese-page-plane">{layers.map(({tone,path,rim,backRim},index)=><svg key={tone} className="cheese-page-sheet" viewBox="0 0 1000 1000" preserveAspectRatio="none" focusable="false" style={{'--cheese-sheet-color':tone}}>
  <defs><clipPath id={`${prefix}-${index}`}><path d={path}/></clipPath></defs>
  <g className="cheese-page-melt">
   <path d={path} fill="var(--cheese-sheet-color)"/>
   <g clipPath={`url(#${prefix}-${index})`}>
    <path d={rim+backRim} fill="none" stroke="#b67b24" strokeOpacity=".12" strokeWidth="8" strokeLinecap="round"/>
    <path d={rim+backRim} fill="none" stroke="#fff7d4" strokeOpacity=".58" strokeWidth="3" strokeLinecap="round"/>
    {index===3&&<g fill="#d5a03c" fillOpacity=".14">{holes.map(([cx,cy,rx,ry])=><ellipse key={cx} {...{cx,cy,rx,ry}}/>)}</g>}
   </g>
  </g>
 </svg>)}</div>;
}

function focusPage(){
 if(document.querySelector('dialog[open]'))return;
 const heading=document.querySelector('.plan-stage-view:not([hidden]) [data-stage-heading]')||document.querySelector('.screen-heading h1,#main h1')||document.getElementById('main');
 if(heading){if(!heading.hasAttribute('tabindex'))heading.tabIndex=-1;heading.focus({preventScroll:true});}
}

function contentBounds(){
 const main=document.getElementById('main')?.getBoundingClientRect();
 if(!main)return null;
 const sidebar=document.getElementById('workspace-sidebar')?.getBoundingClientRect(),header=document.querySelector('.app-header')?.getBoundingClientRect();
 const left=Math.max(0,main.left,sidebar?.right||0),top=Math.max(0,main.top,header?.bottom||0),right=Math.min(innerWidth,main.right),bottom=Math.min(innerHeight,main.bottom);
 return right>left&&bottom>top?{left,top,right,bottom}:null;
}

function positionOverlay(element,bounds){
 element.style.left=`${bounds.left}px`;element.style.top=`${bounds.top}px`;
 element.style.width=`${bounds.right-bounds.left}px`;element.style.height=`${bounds.bottom-bounds.top}px`;
}

export default function useCheesePageTransition(url){
 const prefix=useId().replaceAll(':',''),overlay=useRef(null),route=useRef(url),active=useRef(null),[phase,setPhase]=useState('idle');
 useLayoutEffect(()=>{route.current=url;},[url]);

 const release=useCallback((transaction,{render=true,focus=true}={})=>{
  if(active.current!==transaction)return;
  active.current=null;
  if(transaction.frame!==null)cancelAnimationFrame(transaction.frame);
  for(const animation of transaction.animations)animation.cancel();
  if(transaction.root){transaction.root.inert=transaction.wasInert;if(transaction.busy===null)transaction.root.removeAttribute('aria-busy');else transaction.root.setAttribute('aria-busy',transaction.busy);}
  if(render)flushSync(()=>setPhase('idle'));
  if(focus)focusPage();
 },[]);

 const finishTransition=useCallback(({focus=false}={})=>{
  const transaction=active.current;
  if(!transaction)return;
  if(!transaction.committed){transaction.committed=true;flushSync(transaction.commit);}
  release(transaction,{focus});
 },[release]);

 const transitionTo=useCallback((to,commit,{interrupt=false}={})=>{
  // Native history already moved. Never let an older delayed push overwrite it.
  if(active.current){
   if(!interrupt&&isPageChange(route.current,to))return;
   release(active.current,{focus:false});commit();focusPage();return;
  }
  if(!isPageChange(route.current,to)||matchMedia('(prefers-reduced-motion: reduce)').matches||document.querySelector('dialog[open]')||!overlay.current?.animate){commit();return;}
  const bounds=contentBounds();
  if(!bounds){commit();return;}
  positionOverlay(overlay.current,bounds);

  const root=document.getElementById('root'),transaction={commit,committed:false,animations:[],frame:null,root,wasInert:root?.inert,busy:root?.getAttribute('aria-busy')};
  active.current=transaction;
  if(root){root.inert=true;root.setAttribute('aria-busy','true');if(root.contains(document.activeElement))document.activeElement.blur();}
  const width=bounds.right-bounds.left,height=bounds.bottom-bounds.top,diagonal=Math.hypot(width,height),plane=overlay.current.querySelector('.cheese-page-plane');
  const duration=480,planeWidth=diagonal*1.55+180,rimGap=diagonal*.045,distance=(planeWidth+diagonal)/2+90;
  // Nested widths expose all four colors on both edges without changing their speed.
  plane.style.width=`${planeWidth}px`;
  plane.style.height=`${2*width*height/diagonal+240}px`;
  plane.style.left=`${width/2}px`;plane.style.top=`${height/2}px`;
  const base=`translate(-50%,-50%) rotate(${Math.atan2(height,width)}rad)`;
  const transform=offset=>`${base} translate3d(${offset}px,0,0)`;
  plane.style.transform=transform(-distance);
  const sheets=[...plane.querySelectorAll('.cheese-page-sheet')];
  sheets.forEach((sheet,index)=>{sheet.style.left=`${index*rimGap}px`;sheet.style.width=`${planeWidth-2*index*rimGap}px`;});
  flushSync(()=>setPhase('covering'));
  const animate=(element,keyframes,options)=>{
   const animation=element.animate(keyframes,{fill:'forwards',...options});
   transaction.animations.push(animation);return animation;
  };
  const motion=animate(plane,[{transform:transform(-distance)},{transform:transform(distance)}],{duration,easing:'linear'});
  const melting=sheets.map(sheet=>animate(sheet.querySelector('.cheese-page-melt'),[
   {transform:'translateY(-2px) scaleY(.99)'},
   {transform:'translateY(2px) scaleY(1.015)',offset:.5},
   {transform:'translateY(-2px) scaleY(.99)'}
  ],{duration,easing:'linear'}));
  const changePage=()=>{
   if(active.current!==transaction||transaction.committed)return;
    flushSync(()=>setPhase('covered'));
    transaction.committed=true;
    flushSync(commit);
    const destination=contentBounds();
    if(destination){
     // A destination may introduce a sidebar or a taller header. Never cover that shell.
     const clipped={left:Math.max(bounds.left,destination.left),top:Math.max(bounds.top,destination.top),right:Math.min(bounds.right,destination.right),bottom:Math.min(bounds.bottom,destination.bottom)};
     if(clipped.right<=clipped.left||clipped.bottom<=clipped.top){release(transaction);return;}
     positionOverlay(overlay.current,clipped);
    }
    // Routing happens under the moving sheets; the same linear animation continues.
    flushSync(()=>setPhase('revealing'));
  };
  const watchCoverage=()=>{
   if(active.current!==transaction)return;
   if(Number(motion.currentTime)>=duration/2)changePage();
   else transaction.frame=requestAnimationFrame(watchCoverage);
  };
  transaction.frame=requestAnimationFrame(watchCoverage);
  void (async()=>{
   try{
    await Promise.all([motion.finished,...melting.map(animation=>animation.finished)]);
    changePage();
   }catch{
    // Cancellation is expected for history interrupts, reduced motion, and unmount.
    if(active.current===transaction&&!transaction.committed){transaction.committed=true;flushSync(commit);}
   }finally{release(transaction);}
  })();
 },[release]);

 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>{if(media.matches)finishTransition({focus:true});},blockScroll=event=>{if(active.current)event.preventDefault();};
  const resized=()=>finishTransition({focus:true});
  const hidden=()=>{if(document.hidden)finishTransition();};
  media.addEventListener('change',changed);
  window.addEventListener('resize',resized);
  document.addEventListener('visibilitychange',hidden);
  const element=overlay.current;element?.addEventListener('wheel',blockScroll,{passive:false});
  return()=>{media.removeEventListener('change',changed);window.removeEventListener('resize',resized);document.removeEventListener('visibilitychange',hidden);element?.removeEventListener('wheel',blockScroll);if(active.current)release(active.current,{render:false,focus:false});};
 },[finishTransition,release]);

 const transitionOverlay=createPortal(<div ref={overlay} className="cheese-page-transition" data-transition-phase={phase} aria-hidden="true"><CheeseSheets prefix={prefix}/></div>,document.body);
 return {transitionTo,finishTransition,transitionOverlay,transitionBusy:phase!=='idle'};
}
