import {useLayoutEffect,useRef} from 'react';
import {useLanguage} from './i18n/render';

// Keep a non-interactive visual snapshot for the departing state. React continues
// to own the live content, focus and business state; snapshots never receive input.
export function useContentTransition(ref,value,index=typeof value==='number'?value:null){
 const previous=useRef(null),interrupted=useRef(null),language=useLanguage();
 useLayoutEffect(()=>{
  const node=ref.current,last=previous.current;
  if(!node||value===false){previous.current=null;return;}
  const snapshot=node.cloneNode(true);
  snapshot.removeAttribute('id');snapshot.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  previous.current={snapshot,index,value,language};
  if(last?.value===value&&last.language===language)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(reduced.matches){interrupted.current=null;node.dataset.contentReveal='shown';return;}
  const direction=last&&index!==null&&last.index!==null?(index>=last.index?1:-1):Number(document.documentElement.dataset.homeScrollDirection||1);
  const distance=16*direction,parent=node.parentElement;
  const originalPosition=parent.style.position;
  if(getComputedStyle(parent).position==='static')parent.style.position='relative';
  let outgoing=null,exit=null;
  const style=getComputedStyle(document.documentElement);
  const duration=parseFloat(style.getPropertyValue('--jimo-switch'))||280;
  const timing={duration,easing:style.getPropertyValue('--jimo-ease').trim()||'cubic-bezier(.22,1,.36,1)'};
  if(last){
   outgoing=last.snapshot;
   outgoing.inert=true;outgoing.setAttribute('aria-hidden','true');outgoing.dataset.motionSnapshot='true';
   Object.assign(outgoing.style,{position:'absolute',left:node.offsetLeft+'px',top:node.offsetTop+'px',width:node.offsetWidth+'px',maxWidth:`calc(100% - ${node.offsetLeft}px)`,boxSizing:'border-box',height:node.offsetHeight+'px',margin:'0',pointerEvents:'none',overflow:'hidden',zIndex:'1'});
   parent.append(outgoing);
   exit=outgoing.animate([{opacity:interrupted.current?.opacity??1,transform:interrupted.current?.transform||'translateY(0)'},{opacity:0,transform:`translateY(${-distance}px)`}],{...timing,duration:220});
   exit.onfinish=()=>outgoing.remove();
  }
  node.dataset.contentDirection=direction>0?'up':'down';
  const arrival=node.animate([{opacity:interrupted.current?.opacity??0,transform:interrupted.current?.transform||`translateY(${distance}px)`},{opacity:1,transform:'translateY(0)'}],{...timing,delay:last?40:0,fill:'backwards'});
  arrival.pause();exit?.pause();node.dataset.contentReveal='pending';
  const observer=new IntersectionObserver(entries=>{
   if(!entries.some(entry=>entry.isIntersecting)||node.closest('[hidden],[inert]'))return;
   node.dataset.contentReveal='revealing';arrival.play();exit?.play();observer.disconnect();
  },{rootMargin:'0px 0px -5% 0px'});
  observer.observe(node);
  arrival.onfinish=()=>{node.dataset.contentReveal='shown';};
  interrupted.current=null;
  const stop=()=>{if(reduced.matches){observer.disconnect();arrival.cancel();exit?.cancel();outgoing?.remove();interrupted.current=null;node.dataset.contentReveal='shown';}};
  reduced.addEventListener('change',stop);
  return()=>{
   if(arrival.playState==='running'){const style=getComputedStyle(node);interrupted.current={opacity:style.opacity,transform:style.transform};}
   observer.disconnect();reduced.removeEventListener('change',stop);arrival.cancel();exit?.cancel();outgoing?.remove();parent.style.position=originalPosition;
  };
 },[ref,value,index,language]);
}
