import React,{useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {displayPublicText} from './i18n/render';
import curtainTexture from './assets/avemly-blue-champagne-curtain.png';
import './plan-stage.css';
import './plan-detail-compact.css';

const pause=(ms,signal)=>new Promise((resolve,reject)=>{
 const aborted=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};
 const timer=setTimeout(()=>{signal.removeEventListener('abort',aborted);resolve();},ms);
 signal.addEventListener('abort',aborted,{once:true});if(signal.aborted)aborted();
});
const loadCurtain=()=>{
 const image=new Image();image.src=curtainTexture;
 return image.decode().then(()=>true,()=>false);
};

function StageCurtains(){
 return <div className="plan-stage-curtains" aria-hidden="true">
  <div className="plan-stage-veil"/>
  <div className="plan-curtain-panel plan-curtain-left" data-curtain="left"><div className="plan-curtain-fabric"/></div>
  <div className="plan-curtain-panel plan-curtain-right" data-curtain="right"><div className="plan-curtain-fabric"/></div>
  <div className="plan-stage-spotlight"/>
 </div>;
}

export default function PlanStage({children,views,initialView='overview'}){
 const root=useRef(null),origin=useRef(null),locked=useRef(false),alive=useRef(true),controller=useRef(null),animations=useRef(new Set()),target=useRef('overview'),textureReady=useRef(null);
 const [view,setView]=useState(initialView),[phase,setPhase]=useState('idle'),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{if(initialView!=='overview')root.current.querySelector(`[data-stage-detail="${initialView}"] [data-stage-heading]`)?.focus({preventScroll:true});},[initialView]);
 useEffect(()=>{
  textureReady.current??=loadCurtain();
  alive.current=true;const media=matchMedia('(prefers-reduced-motion: reduce)');
  const changed=()=>{setReduced(media.matches);if(media.matches)controller.current?.abort();};media.addEventListener('change',changed);
  return()=>{alive.current=false;media.removeEventListener('change',changed);controller.current?.abort();for(const a of animations.current)a.cancel();};
 },[]);
 const transition=async(next,button)=>{
  if(locked.current||next===view)return;
  locked.current=true;target.current=next;if(next!=='overview')origin.current=button;
  const abort=new AbortController();controller.current=abort;
  const animate=(element,keyframes,duration,easing='cubic-bezier(.36,0,.24,1)')=>{
   const animation=element.animate(keyframes,{duration,easing,fill:'forwards'});animations.current.add(animation);
   const cancel=()=>animation.cancel();abort.signal.addEventListener('abort',cancel,{once:true});
   return animation.finished.finally(()=>abort.signal.removeEventListener('abort',cancel));
  };
  try{
   if(root.current.contains(document.activeElement))document.activeElement.blur();
   if(!reduced){
    flushSync(()=>setPhase('loading'));
    const ready=await(textureReady.current??=loadCurtain());
    if(!ready||!alive.current||abort.signal.aborted)return;
   }
   flushSync(()=>setPhase('closing'));
   const nodes=selector=>root.current.querySelector(selector),left=nodes('.plan-curtain-left'),right=nodes('.plan-curtain-right'),light=nodes('.plan-stage-spotlight');
   if(reduced){
    const veil=nodes('.plan-stage-veil');await animate(veil,[{opacity:0},{opacity:1}],80,'ease');
    if(!alive.current)return;flushSync(()=>{setView(next);setPhase('opening');});await animate(veil,[{opacity:1},{opacity:0}],80,'ease');
   }else{
    await Promise.all([
     animate(left,[{transform:'translateX(-103%) translateY(0)'},{transform:'translateX(0) translateY(0)'}],400),
     animate(right,[{transform:'translateX(103%) translateY(0)'},{transform:'translateX(0) translateY(0)'}],400),
    ]);
    if(!alive.current)return;flushSync(()=>setPhase('hold'));await pause(150,abort.signal);
    if(!alive.current)return;flushSync(()=>{setView(next);setPhase('opening');});
    const opening=side=>[{transform:'translateX(0) translateY(0) scaleX(1)',offset:0},{transform:'translateX(0) translateY(-8%) scaleX(1)',offset:.2},{transform:`translateX(${side*30}%) translateY(-12%) scaleX(.95)`,offset:.48},{transform:`translateX(${side*106}%) translateY(-17%) scaleX(.88)`,offset:1}];
    await Promise.all([
     animate(left,opening(-1),700),animate(right,opening(1),700),
     animate(light,[{opacity:0,offset:0},{opacity:.65,offset:.5},{opacity:0,offset:1}],700),
    ]);
   }
  }catch(error){if(error.name!=='AbortError')throw error;}
  finally{
   if(alive.current){
    flushSync(()=>{setView(target.current);setPhase('idle');});
    for(const a of animations.current)a.cancel();animations.current.clear();locked.current=false;
    const focus=target.current==='overview'?origin.current:root.current.querySelector(`[data-stage-detail="${target.current}"] [data-stage-heading]`);
    if(focus?.isConnected)focus.focus({preventScroll:true});
   }
  }
 };
 const busy=phase!=='idle';
 return <div ref={root} className={`plan-stage${reduced?' is-reduced':''}`} data-stage-view={view} data-stage-phase={phase} role="region" aria-label="目标与计划工作台" aria-busy={busy}>
  <div className="plan-stage-overview" style={{visibility:view==='overview'?'visible':'hidden'}} inert={busy||view!=='overview'} aria-hidden={busy||view!=='overview'}>{children((id,event)=>transition(id,event.currentTarget))}</div>
  {views.map(item=><section key={item.id} className="plan-stage-view" data-stage-detail={item.id} hidden={view!==item.id} inert={busy||view!==item.id} aria-hidden={busy||view!==item.id} aria-label={displayPublicText(item.title)}>{item.render(()=>transition('overview'))}</section>)}
  <StageCurtains/>
  <span className="plan-stage-announcement" role="status" aria-live="polite">{!busy&&view!=='overview'?displayPublicText(views.find(x=>x.id===view)?.title):''}</span>
 </div>;
}
