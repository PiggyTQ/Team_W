import React,{useEffect} from 'react';
import HomeTransitions from './HomeTransitions';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {magneticPanel,panelSnapTarget,wheelPixels} from './scroll-boundary-model';
import {springStep} from './scroll-physics';
import {nearestStoryStop,storyStops} from './story-snap-model';
import {directionalRelease} from './scroll-release-intent';
import {useHomeTextReveal} from './home-text-reveal';
import './home-scroll.css';
import './home-boundaries.css';
import './home-stages.css';

export default function HomeScroll(){
 useHomeTextReveal();
 useEffect(()=>{
  const media=matchMedia('(min-width: 520px) and (min-height: 560px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const preference=matchMedia('(prefers-reduced-motion: reduce)'),root=document.documentElement;
  const captured=new Set();
  let flight=null,frame=0,idle=0,dragging=false,lastTime=0,lastWritten=scrollY,motion={position:scrollY,velocity:0},gesture=null;
  const maximum=()=>Math.max(0,document.documentElement.scrollHeight-innerHeight);
  const layoutTop=node=>{let y=0;for(let el=node;el;el=el.offsetParent)y+=el.offsetTop;return y;};
  const railTop=node=>Number(node.dataset.snapTop||42);
  const naturalReading=()=>{const start=document.querySelector('#directions[data-natural-flow]');return start&&scrollY+innerHeight/2>=layoutTop(start);};
  const storyScenes=()=>[...document.querySelectorAll('#case-study .story-scene')].map(node=>({id:node.id,top:layoutTop(node),bottom:layoutTop(node)+node.offsetHeight,fullScreen:node.hasAttribute('data-story-fullscreen')}));
  const panels=()=>{
   const list=[];
   const add=(id,selector,openingSelector,stageSelector)=>{
    const node=document.querySelector(selector);if(!node)return;
    const stage=stageSelector&&node.querySelector(stageSelector);
    const box=stage||node,style=getComputedStyle(box);
    const top=layoutTop(box)+parseFloat(style.paddingTop||0),opening=layoutTop(node.querySelector(openingSelector)||node);
    const bottom=layoutTop(box)+box.offsetHeight-parseFloat(style.paddingBottom||0);
    let target=panelSnapTarget({top,bottom,opening},innerHeight,maximum());
    // Full-screen sections align their outer frame, not their inset heading.
    if(node.hasAttribute('data-single-case')||['directions','starting-points','before-start','closing'].includes(id))target=Math.max(0,Math.min(maximum(),layoutTop(box)));
    if(node.dataset.snapRange)target=Math.max(0,layoutTop(node)-railTop(node));
    // The pinned outcome timeline must start at phase zero after entry.
    if(id==='outcomes'){const trigger=ScrollTrigger.getById('home-outcomes');if(trigger)target=Math.min(target,trigger.start);}
    list.push({id,top,bottom,target});
   };
   add('outcomes','#outcomes','.showcase-heading','.showcase-frame');
   add('starting-points','#starting-points','.section-heading');
   add('how','#how','.section-heading','.sj-stage');
   // The directory and later sections form a continuous reading flow.
   return list;
  };
  const stop=()=>{cancelAnimationFrame(frame);frame=0;flight=null;lastTime=0;root.dataset.homeScrollPhase='free';};
  const tick=time=>{
   frame=0;
   if(!flight)return;
   if(flight.scene){
    const sceneStop=storyStops(storyScenes(),innerHeight).find(scene=>scene.id===flight.id);
    if(!sceneStop){stop();return;}
    flight.target=Math.max(0,Math.min(maximum(),sceneStop[flight.edge]));
   }
   if(flight.node){
    const range=Number(flight.node.dataset.snapRange),count=Number(flight.node.dataset.snapCount);
    if(!range){stop();return;}
    flight.target=layoutTop(flight.node)-railTop(flight.node)+range*flight.index/(count-1);
   }
   if(Math.abs(scrollY-lastWritten)>3){stop();scheduleSettle();return;}
   const elapsed=lastTime?(time-lastTime)/1000:1/60;lastTime=time;
   // Critical damping with a faster spring: a visible, light snap, no slow drag.
   motion=springStep(motion,flight.target,elapsed);
   const settled=Math.abs(motion.position-flight.target)<.5&&Math.abs(motion.velocity)<5;
   scrollTo({top:settled?flight.target:motion.position,behavior:'instant'});lastWritten=scrollY;
   if(settled){flight=null;lastTime=0;root.dataset.homeScrollPhase='free';return;}
   frame=requestAnimationFrame(tick);
  };
  const absorb=panel=>{
   stop();captured.add(panel.id);flight=panel;motion={position:scrollY,velocity:0};lastWritten=scrollY;
   root.dataset.homeSnapTarget=panel.id;root.dataset.homeScrollPhase='snapping';frame=requestAnimationFrame(tick);
  };
  // Snap the scroll coordinate, so the rail, counter and content share one position.
  // Pinned rails and vertical chapter gaps share the same release spring.
  const settleRail=()=>{
   idle=0;if(root.dataset.homeNativeSnap==='true'||root.dataset.homeAnchorNavigation==='true'||!media.matches||flight||dragging||naturalReading()||document.querySelector('[role="dialog"],dialog[open]'))return;
   const intent=gesture;gesture=null;
   for(const node of document.querySelectorAll('#how[data-snap-range]')){
    const range=Number(node.dataset.snapRange),count=Number(node.dataset.snapCount);
    if(!range||count<2)continue;
    const start=layoutTop(node)-railTop(node),position=scrollY-start;
    const entryReach=node.id==='how'?innerHeight/3:1;
    if(position < -entryReach||position>range+1)continue;
    const index=Math.max(0,Math.min(count-1,Math.round(position/range*(count-1))));
    const target=start+range*index/(count-1);
    const stops=Array.from({length:count},(_,i)=>({id:node.id,target:start+range*i/(count-1),rail:true,node,index:i}));
    const directed=intent&&directionalRelease(stops,intent.origin,scrollY,intent.direction);
    if(directed){absorb(directed);return;}
    if(Math.abs(scrollY-target)>1)absorb({id:node.id,target,rail:true,node,index});
    return;
   }
   const stops=storyStops(storyScenes(),innerHeight).flatMap(scene=>[
    {id:scene.id,target:scene.start,edge:'start',scene:true},
    ...(scene.end>scene.start+1?[{id:scene.id,target:scene.end,edge:'end',scene:true}]:[])
   ]);
   const boundaries=panels();
   const entrance=boundaries.find(panel=>panel.id==='case-study'),exit=boundaries.find(panel=>panel.id==='before-start');
   if(entrance&&stops[0]?.target>entrance.target)stops.unshift(entrance);
   if(exit&&stops.at(-1)?.target<exit.target)stops.push(exit);
   const directed=intent&&directionalRelease(stops,intent.origin,scrollY,intent.direction);
   if(directed){absorb(directed);return;}
   const scene=nearestStoryStop(storyScenes(),scrollY,innerHeight);
   if(scene&&Math.abs(scene.target-scrollY)>1)absorb({...scene,scene:true});
  };
  const scheduleSettle=()=>{clearTimeout(idle);if(root.dataset.homeNativeSnap==='true'){stop();gesture=null;return;}if(!flight)idle=setTimeout(settleRail,140);};
  const reset=()=>{clearTimeout(idle);stop();gesture=null;captured.clear();delete root.dataset.homeSnapTarget;};
  const pointerDown=()=>{dragging=true;reset();};
  const pointerUp=()=>{dragging=false;scheduleSettle();};
  const applyMedia=()=>{reset();root.dataset.homeScroll=media.matches?'section-snap':'native';};
  const wheel=event=>{
   if(root.dataset.homeNativeSnap==='true')return;
   if(root.dataset.homeAnchorNavigation==='true'){clearTimeout(idle);stop();gesture=null;return;}
   if(!media.matches||event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
   if(naturalReading()){clearTimeout(idle);stop();gesture=null;return;}
   const target=event.target;
   if(document.querySelector('[role="dialog"],dialog[open]')||target.closest('input,textarea,select,[contenteditable="true"],[data-native-scroll]'))return;
   let delta=wheelPixels(event.deltaY,event.deltaMode,innerHeight);if(!delta)return;
   root.dataset.homeScrollDirection=Math.sign(delta);
   clearTimeout(idle);
   const direction=Math.sign(delta);
   if(!gesture||gesture.direction!==direction)gesture={origin:scrollY,direction};
   if(flight)stop();
   if(delta<0){stop();for(const panel of panels())if(scrollY+delta<panel.top-innerHeight*2/3-40)captured.delete(panel.id);return;}
   let handed=false;
   for(let node=target;node&&node!==document.body;node=node.parentElement){
    const style=getComputedStyle(node);
    if(/auto|scroll/.test(style.overflowY)&&node.scrollHeight>node.clientHeight+2){
     const remaining=Math.max(0,node.scrollHeight-node.clientHeight-node.scrollTop);
     if(remaining>=delta){stop();return;}
     if(remaining>0){event.preventDefault();node.scrollBy({top:remaining,behavior:'instant'});delta-=remaining;handed=true;}
     break;
    }
   }
   if(flight){event.preventDefault();return;}
   const next=magneticPanel(panels(),scrollY,delta,innerHeight,captured);
   if(next){event.preventDefault();absorb(next);return;}
   // No spring, resistance, waiting period or gesture counting inside a panel.
   if(handed)scrollBy({top:delta,behavior:'instant'});
  };
  applyMedia();media.addEventListener('change',applyMedia);preference.addEventListener('change',applyMedia);window.addEventListener('wheel',wheel,{passive:false});
  window.addEventListener('scroll',scheduleSettle,{passive:true});
  window.addEventListener('pointerdown',pointerDown);window.addEventListener('pointerup',pointerUp);window.addEventListener('pointercancel',pointerUp);
  for(const event of ['keydown','resize','hashchange'])window.addEventListener(event,reset);
  return()=>{reset();media.removeEventListener('change',applyMedia);preference.removeEventListener('change',applyMedia);window.removeEventListener('wheel',wheel);window.removeEventListener('scroll',scheduleSettle);window.removeEventListener('pointerdown',pointerDown);window.removeEventListener('pointerup',pointerUp);window.removeEventListener('pointercancel',pointerUp);for(const event of ['keydown','resize','hashchange'])window.removeEventListener(event,reset);delete root.dataset.homeScroll;delete root.dataset.homeScrollPhase;delete root.dataset.homeScrollDirection;};
 },[]);
 return <HomeTransitions/>;
}
