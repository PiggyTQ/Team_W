import {useEffect,useLayoutEffect,useRef} from 'react';

// A persistent date frame moves between the week column and the day rail.
// The layout commits once; only transform/opacity are interpolated afterwards.
export default function useWeekDayMotion({dayOnly,selectedDay,anchor}){
 const stage=useRef(null),scroller=useRef(null),frames=useRef(new Map()),pending=useRef(null),running=useRef(new Set()),weekScroll=useRef(0);
 const cancel=()=>{for(const animation of running.current)animation.cancel();running.current.clear();};
 const capture=(targetDate,event,{restoreFocus=false}={})=>{
  const source=frames.current.get(dayOnly?selectedDay:targetDate);
  const rect=source?.getBoundingClientRect();
  // Read the in-flight screen position before cancelling an interrupted move.
  cancel();
  if(!dayOnly)weekScroll.current=scroller.current?.scrollLeft||0;
  pending.current={date:targetDate,rect,keyboard:event?.detail===0,restoreFocus};
 };
 useLayoutEffect(()=>{
  const move=pending.current;if(!move)return;pending.current=null;
  const target=frames.current.get(move.date),scroll=scroller.current,root=stage.current;
  if(!target||!root)return;
  if(scroll)scroll.scrollLeft=dayOnly?0:weekScroll.current;
  if(!dayOnly&&scroll){const r=target.getBoundingClientRect(),box=scroll.getBoundingClientRect();if(r.left<box.left)scroll.scrollLeft-=box.left-r.left;else if(r.right>box.right)scroll.scrollLeft+=r.right-box.right;}
  if(move.restoreFocus)target.querySelector('button')?.focus({preventScroll:true});
  if(move.keyboard||!target.animate)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,style=getComputedStyle(root),raw=style.getPropertyValue('--jimo-switch').trim();
  const duration=raw.endsWith('ms')?parseFloat(raw):raw.endsWith('s')?parseFloat(raw)*1000:280;
  const easing=style.getPropertyValue('--jimo-ease').trim()||'cubic-bezier(.23,1,.32,1)';
  const play=(element,keyframes,options)=>{
   if(!element?.animate)return;
   const animation=element.animate(keyframes,options);running.current.add(animation);
   animation.finished.then(()=>{running.current.delete(animation);animation.cancel();},()=>running.current.delete(animation));
  };
  if(move.rect&&!reduced){const last=target.getBoundingClientRect(),dx=move.rect.left-last.left,dy=move.rect.top-last.top;
   if(Math.abs(dx)>.5||Math.abs(dy)>.5)play(target,[{transform:`translate(${dx}px, ${dy}px)`},{transform:'translate(0px, 0px)'}],{duration,easing,fill:'both'});
  }
  if(dayOnly)play(root.querySelector('.day-workbench'),reduced?[{opacity:.5},{opacity:1}]:[{opacity:0,transform:'translateX(12px)'},{opacity:1,transform:'translateX(0px)'}],{duration:reduced?120:200,delay:reduced?0:40,easing,fill:'both'});
 },[dayOnly,selectedDay,anchor]);
 useEffect(()=>{
  const query=matchMedia('(prefers-reduced-motion: reduce)'),onPreference=()=>{pending.current=null;cancel();};
  query.addEventListener('change',onPreference);
  // The stage intentionally changes from a 630px week canvas to a narrow day
  // canvas. Observe the stable viewport instead of treating that as a resize.
  const viewport=scroller.current;
  let width=viewport?.getBoundingClientRect().width;
  const observer=new ResizeObserver(entries=>{const next=entries[0].target.getBoundingClientRect().width;if(width!==undefined&&Math.abs(width-next)>.5){pending.current=null;cancel();}width=next;});
  if(viewport)observer.observe(viewport);
  return()=>{query.removeEventListener('change',onPreference);observer.disconnect();pending.current=null;cancel();};
 },[]);
 return {stage,scroller,frames,capture};
}
