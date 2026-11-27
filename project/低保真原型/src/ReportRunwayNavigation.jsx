import React,{useCallback,useEffect,useLayoutEffect,useRef} from 'react';
import './report-runway.css';

function Aircraft(){
 return <svg className="report-runway-aircraft" viewBox="0 0 220 160" fill="currentColor" aria-hidden="true" focusable="false">
  <path d="M48 146 14 120 29 109 48 114 89 88 15 64 32 49 124 64 181 28Q194 22 201 32T199 51Z"/>
 </svg>;
}

export default function ReportRunwayNavigation({chapters,labels,active,animate,tabRefs,onChoose,onKeyDown,className='',ariaLabel='综合报告章节',tabPrefix='report-tab-',panelPrefix='career-report-',duration=480}){
 const root=useRef(null),plane=useRef(null),running=useRef(null),latest=useRef(active),placed=useRef(false);
 const cancel=useCallback(()=>{
  if(running.current){running.current.onfinish=null;running.current.cancel();running.current=null;}
  if(root.current)root.current.dataset.taxiing='false';
 },[]);
 const position=useCallback((motion=false)=>{
  const nav=root.current,aircraft=plane.current,tab=tabRefs.current[latest.current];
  if(!nav||!aircraft||!tab)return;
  const bounds=nav.getBoundingClientRect(),target=tab.getBoundingClientRect();
  const destination=target.left-bounds.left-nav.clientLeft+target.width/2-aircraft.offsetWidth/2;
  const transform=getComputedStyle(aircraft).transform;
  // Read the current visual position before cancelling a rapid reversal.
  const start=placed.current?new DOMMatrixReadOnly(transform==='none'?undefined:transform).m41:destination;
  cancel();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const moving=motion&&!reduced&&Math.abs(destination-start)>.5;
  placed.current=true;
  aircraft.style.transform=`translate3d(${destination}px,0,0)`;
  if(!moving||!aircraft.animate)return;
  nav.dataset.taxiing='true';
  const animation=aircraft.animate([
   {transform:`translate3d(${start}px,0,0)`},
   {transform:`translate3d(${destination}px,0,0)`}
  ],{duration,easing:'cubic-bezier(.22,1,.36,1)'});
  animation.id='report-runway-taxi';
  running.current=animation;
  animation.onfinish=()=>{if(running.current===animation)cancel();};
 },[cancel,tabRefs,duration]);

 useLayoutEffect(()=>{latest.current=active;position(animate);},[active,animate,position]);
 useEffect(()=>{
  const nav=root.current,preference=matchMedia('(prefers-reduced-motion: reduce)');
  let width=nav.getBoundingClientRect().width;
  const resized=new ResizeObserver(()=>{
   const next=nav.getBoundingClientRect().width;
   if(Math.abs(next-width)>.5){width=next;position();}
  });
  resized.observe(nav);
  const settle=()=>position();
  const hidden=()=>{if(document.hidden)settle();};
  preference.addEventListener('change',settle);
  window.addEventListener('beforeprint',settle);
  document.addEventListener('visibilitychange',hidden);
  return()=>{cancel();resized.disconnect();preference.removeEventListener('change',settle);window.removeEventListener('beforeprint',settle);document.removeEventListener('visibilitychange',hidden);};
 },[cancel,position]);

 return <nav ref={root} className={`career-report-nav report-runway-nav ${className}`} role="tablist" aria-label={ariaLabel} style={{'--runway-stops':chapters.length}}>
  {chapters.map((id,index)=><button key={id} ref={element=>{tabRefs.current[id]=element;}} type="button" role="tab"
   id={tabPrefix+id} aria-controls={panelPrefix+id} aria-selected={active===id} tabIndex={active===id?0:-1}
   onKeyDown={event=>onKeyDown(event,index)} onClick={event=>onChoose(id,event.detail>0)}>
    <span className="report-runway-label">{labels[index]}</span>
  </button>)}
  <span className="report-runway-track" aria-hidden="true"/>
  <span ref={plane} className="report-runway-plane" aria-hidden="true"><Aircraft/></span>
 </nav>;
}
