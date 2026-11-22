import {useCallback,useLayoutEffect,useRef} from 'react';

// Descend through page/grid wrappers, then animate each independent module once.
// Keeping the modules in place preserves their layout, React state and controls.
const groups=[
 '.page-surface','.home-hub','.workbench-metrics','.home-available-index',
 '.workbench-grid','.home-capability-layout','.assessment-hub',
 '.unified-plan',
 '.library-layout','.library-results','.learning-grid',
 '.explore-layout','.explore-main','.occupation-grid',
 '.output-workspace','.career-report','.career-report-layout','.career-report-body',
 '.settings-focus-page','.account-shell-grid','.account-main-column','.account-side-column',
 '.assistant-page','.skill-map','[data-page-reveal-group]'
].join(',');
const excluded='dialog,[hidden],[inert],[aria-hidden="true"],[data-motion-snapshot],script,style,svg,[role="status"],[role="alert"]';

function visible(element){
 if(element.closest('dialog:not([open]),[hidden],[inert],[aria-hidden="true"]'))return false;
 const style=getComputedStyle(element),bounds=element.getBoundingClientRect();
 return style.display!=='none'&&style.visibility!=='hidden'&&bounds.width>2&&bounds.height>2;
}

function loading(surface){
 return [...surface.querySelectorAll('[data-page-reveal-pending]')].some(visible);
}

function pageModules(surface){
 const modules=[];
 const visit=element=>{
  if(element.matches(excluded))return;
  const style=getComputedStyle(element);
  if(style.display==='none'||style.visibility==='hidden')return;
  if(element.matches(groups)||style.display==='contents'){
   for(const child of element.children)visit(child);
  }else{
   const bounds=element.getBoundingClientRect();
   if(bounds.width>2&&bounds.height>2)modules.push({element,top:bounds.top,left:bounds.left});
  }
 };
 visit(surface);
 return modules.sort((a,b)=>a.top-b.top||a.left-b.left).map(module=>module.element);
}

export default function useWorkspacePageReveal(url,enabled){
 const mainRef=useRef(null),requested=useRef(null);
 const preparePageReveal=useCallback(to=>{requested.current=to;},[]);

 useLayoutEffect(()=>{
  if(requested.current!==url){requested.current=null;return;}
  if(!enabled)return;
  requested.current=null;
  const main=mainRef.current,surface=main?.querySelector('.page-surface');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(!surface||reduced.matches||!surface.animate)return;

  let active=true,starting=false,started=false,loadTimer;
  const animations=new Map();
  main.dataset.pageRevealState='waiting';

  const stop=()=>{
   if(!active)return;
   active=false;
   clearTimeout(loadTimer);observer.disconnect();
   for(const animation of animations.values()){animation.onfinish=null;animation.cancel();}
   animations.clear();
   main.dataset.pageRevealState='idle';
   main.removeEventListener('pointerdown',stop,true);
   main.removeEventListener('focusin',stop);
   main.removeEventListener('wheel',stop,true);
   main.removeEventListener('touchmove',stop,true);
   window.removeEventListener('resize',stop);
   window.removeEventListener('beforeprint',stop);
   document.removeEventListener('visibilitychange',hidden);
   reduced.removeEventListener('change',motionChanged);
  };
  const hidden=()=>{if(document.hidden)stop();};
  const motionChanged=()=>{if(reduced.matches)stop();};

  const prepare=()=>{
   for(const element of pageModules(surface)){
    if(animations.has(element))continue;
    const animation=element.animate([
     {opacity:0,translate:'0 28px'},
     {opacity:1,translate:'0 0'}
    ],{duration:520,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
    animation.id='workspace-page-reveal';
    // Hold ready modules before the first paint while Suspense/data/assets arrive.
    // All modules then share one timeline rather than replaying in separate batches.
    animation.pause();animation.currentTime=0;
    animations.set(element,animation);
    animation.onfinish=()=>{
     animations.delete(element);animation.cancel();
     if(started&&!animations.size)stop();
    };
   }
  };
  const start=()=>{
   if(!active)return;
   clearTimeout(loadTimer);
   prepare();
   const modules=pageModules(surface),current=new Set(modules);
   for(const [element,animation] of animations){
    if(!current.has(element)){animation.onfinish=null;animation.cancel();animations.delete(element);}
   }
   const step=Math.min(72,540/Math.max(1,modules.length-1));
   // Set one document-timeline origin, including modules mounted asynchronously.
   const origin=document.timeline.currentTime;
   started=true;main.dataset.pageRevealState='running';
   modules.forEach((element,index)=>{
    const animation=animations.get(element);
    animation.effect.updateTiming({delay:index*step});
    animation.play();animation.startTime=origin;
   });
   if(!animations.size)stop();
  };
  const ready=()=>{
   if(!active||starting)return;
   prepare();
   if(loading(surface))return;
   starting=true;observer.disconnect();
   const images=[...surface.querySelectorAll('img[data-page-reveal-image]')].filter(visible);
   if(images.length)Promise.all(images.map(image=>image.decode().catch(()=>{}))).then(start);
   else start();
  };
  const observer=new MutationObserver(ready);
  observer.observe(surface,{childList:true,subtree:true,attributes:true,attributeFilter:['data-page-reveal-pending','hidden']});
  // A slow/failed service must never leave the usable part of a page transparent.
  loadTimer=setTimeout(stop,4000);
  main.addEventListener('pointerdown',stop,true);
  main.addEventListener('focusin',stop);
  main.addEventListener('wheel',stop,{capture:true,passive:true});
  main.addEventListener('touchmove',stop,{capture:true,passive:true});
  window.addEventListener('resize',stop);
  window.addEventListener('beforeprint',stop);
  document.addEventListener('visibilitychange',hidden);
  reduced.addEventListener('change',motionChanged);
  ready();
  return stop;
 },[url,enabled]);

 return {mainRef,preparePageReveal};
}
