import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';

export const SIDEBAR_KEY='career-prototype-sidebar-v1';
const readCollapsed=()=>{try{return localStorage.getItem(SIDEBAR_KEY)==='collapsed';}catch{return false;}};
const targets=()=>[document.getElementById('main'),document.querySelector('#root>.flow-progress'),document.querySelector('.app-header .workspace-search'),...document.querySelectorAll('#workspace-sidebar [data-nav-icon]')].filter(Boolean);

export function useSidebarLayout(path,blocked=false){
 const [collapsed,setCollapsed]=useState(readCollapsed),pending=useRef(null),running=useRef(new Map()),context=useRef({path,blocked});context.current={path,blocked};
 const cancel=useCallback(()=>{for(const [el,animation]of running.current){animation.cancel();el.style.removeProperty('will-change');}running.current.clear();},[]);
 const toggle=useCallback(event=>{
  const desktop=matchMedia('(min-width:721px)').matches,reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const keyboard=event?.type==='keydown'||event?.detail===0;
  const main=document.getElementById('main');
  pending.current=desktop&&!reduce&&!keyboard?{rects:new Map(targets().map(el=>[el,el.getBoundingClientRect()])),scroll:main?.scrollTop}:null;
  // Read the in-flight visual position before cancelling, so reversal stays continuous.
  cancel();setCollapsed(value=>!value);
 },[cancel]);
 useLayoutEffect(()=>{
  try{localStorage.setItem(SIDEBAR_KEY,collapsed?'collapsed':'expanded');}catch{}
  const snapshot=pending.current;pending.current=null;if(!snapshot)return;
  const main=document.getElementById('main');if(main&&Number.isFinite(snapshot.scroll))main.scrollTop=snapshot.scroll;
  for(const [el,before]of snapshot.rects){
   if(!el.isConnected)continue;const after=el.getBoundingClientRect(),x=before.left-after.left,y=before.top-after.top;
   if(Math.abs(x)+Math.abs(y)<.5)continue;
   el.style.willChange='transform';
   const animation=el.animate([{transform:`translate(${x}px,${y}px)`},{transform:'translate(0px,0px)'}],{duration:260,easing:'cubic-bezier(0.23,1,0.32,1)'});
   running.current.set(el,animation);
   const done=()=>{if(running.current.get(el)===animation){running.current.delete(el);el.style.removeProperty('will-change');}};
   animation.finished.then(done,done);
  }
 },[collapsed]);
 useLayoutEffect(()=>{pending.current=null;cancel();},[path,cancel]);
 useEffect(()=>{
  const keys=e=>{if(context.current.path!=='/'&&!context.current.blocked&&matchMedia('(min-width:721px)').matches&&(e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey&&e.code==='Backslash'){e.preventDefault();toggle(e);}};
  const storage=e=>{if(e.key===SIDEBAR_KEY){pending.current=null;cancel();setCollapsed(e.newValue==='collapsed');}};
  const resize=()=>{pending.current=null;cancel();};
  document.addEventListener('keydown',keys);window.addEventListener('storage',storage);window.addEventListener('resize',resize);
  return()=>{document.removeEventListener('keydown',keys);window.removeEventListener('storage',storage);window.removeEventListener('resize',resize);cancel();};
 },[toggle,cancel]);
 return {collapsed,toggle};
}
