import React,{useEffect,useRef} from 'react';
import {useLanguage} from './i18n/render';
import './home-scene-design.css';
import './home-responsive.css';

const poses=['explore','report','laptop','report'];
export function CheeseMascot({pose='explore',className=''}){
 return <img className={'cheese-scene-mascot '+className} src={'/illustrations/cheese-scenes/'+(typeof pose==='number'?poses[pose]:pose)+'.png'} alt="" aria-hidden="true" width="1536" height="1024" loading="lazy" decoding="async" draggable="false"/>;
}
export function SceneDecor({scene,pose=0}){
 return <div className={'cheese-scene-decor cheese-decor-'+scene} data-pose={pose} aria-hidden="true">
  {(scene==='entry'||scene==='careers')&&<img className="detailed-scene-backdrop" src={'/illustrations/cheese-detail/'+(scene==='entry'?'entry':'career')+'-backdrop.png'} alt="" loading="eager"/>}
  <svg className="scene-handmarks" viewBox="0 0 1600 900" preserveAspectRatio="none"><g fill="none" stroke="#ffbf20" strokeWidth="8" strokeLinecap="round"><path d="m18 280 20 20m10-54 10 29M1480 380l28-12m-15 46 25 2M530 74l21-24m-9 49 31-6"/></g><g fill="none" stroke="#08417e" strokeWidth="5" strokeLinecap="round"><path d="M280 735c90 16 110-67 69-59-54 12 7 86 86 62M1330 158c-47-25-13-83 5-49 17 31-32 74-58 45"/></g></svg>
  <svg className="cheese-landscape" viewBox="0 0 1600 300" preserveAspectRatio="none"><path fill="#fff3d6" d="M0 100C200-40 380 300 640 180S1000 100 1200 170 1500 120 1600 20V300H0Z"/><path fill="#ffce49" d="M0 180C300 30 380 160 640 270S1100 260 1300 170 1510 120 1600 170V300H0Z"/></svg>
  <span className="cheese-corner"/>
  <CheeseMascot pose={scene==='journey'?pose:scene==='closing'?'laptop':scene==='faq'?'report':'explore'} className="cheese-decor-first"/>
  {(scene==='entry'||scene==='faq')&&<CheeseMascot pose={scene==='entry'?'report':'explore'} className="cheese-decor-second"/>}
  {scene==='entry'&&<CheeseMascot pose="report" className="cheese-decor-entry-header"/>}
  {scene==='closing'&&<><svg className="closing-road" viewBox="0 0 650 300"><path d="M0 280C-10 130 620 275 300 160S220 90 440 50" fill="none" stroke="#ffe8a3" strokeWidth="110"/><path d="M0 280C-10 130 620 275 300 160S220 90 440 50" fill="none" stroke="#fffdf4" strokeWidth="40"/></svg><svg className="cheese-signpost" viewBox="0 0 240 290"><path d="M119 40v238" stroke="#013e75" strokeWidth="14"/><path d="M25 57 198 42l32 32-29 35L26 124Z" fill="#fffdf7" stroke="#013e75" strokeWidth="6" strokeLinejoin="round"/><path d="m41 154 159 12v57L41 213l-30-32Z" fill="#fffdf7" stroke="#013e75" strokeWidth="6" strokeLinejoin="round"/><text x="55" y="89" fill="#013e75" fontSize="25" fontWeight="750">IT</text><path d="m65 184 82 6" stroke="#ced8df" strokeWidth="8" strokeLinecap="round"/></svg></>}
 </div>;
}
export function SceneRail(){
 const en=useLanguage()==='en';
 return <nav className="cheese-scene-rail" aria-label={en?'Continue exploring the homepage':'继续浏览首页'} data-i18n="off">
  <a href="#outcomes"><small>01</small>{en?'Direction & evidence':'方向与依据'}</a>
  <a href="#how"><small>02</small>{en?'Learning & practice':'学习与实践'}</a>
  <a href="#starting-points" aria-current="location"><small>03</small>{en?'Choose a starting point':'选择一个起点'}</a>
  <a href="#directions"><small>04</small>{en?'Explore IT careers':'了解 IT 职业'}</a>
  <a href="#before-start">{en?'Next steps ↓':'继续向下探索 ↓'}</a>
 </nav>;
}

/** Decoration never captures input; existing scrolling and pinned stages own navigation. */
export default function HomeSceneDesign(){
 const corner=useRef(null);
 useEffect(()=>{
  const media=matchMedia('(min-width:1024px) and (prefers-reduced-motion:no-preference)');
  const root=document.querySelector('#main.publicmain');if(!root)return;
  const animations=new Set();let observer,lastInput='pointer';
  const keyboard=()=>{lastInput='keyboard';for(const a of animations)a.cancel();animations.clear();};
  const pointer=()=>{lastInput='pointer';};
  const clear=()=>{observer?.disconnect();for(const a of animations)a.cancel();animations.clear();};
  const animate=(node,frames,options)=>{const a=node.animate(frames,options);animations.add(a);a.onfinish=()=>animations.delete(a);return a;};
  const setup=()=>{
   clear();if(!media.matches)return;
   const ease=getComputedStyle(root).getPropertyValue('--jimo-ease').trim()||'cubic-bezier(.23,1,.32,1)';
   const last=new WeakMap();
   observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)return;if(last.get(entry.target))return;last.set(entry.target,true);
    // Don't replay on minor intersection jitter or move focused interactive content.
    if(lastInput==='keyboard'||entry.target.contains(document.activeElement))return;
    const nodes=[entry.target.querySelector('.cheese-scene-decor')].filter(Boolean);
    nodes.forEach((node,i)=>{node.getAnimations().forEach(a=>a.cancel());animate(node,[{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,easing:ease});});
    if(corner.current){corner.current.getAnimations().forEach(a=>a.cancel());animate(corner.current,[{opacity:0,transform:'translate(16%,25%) scale(.96)'},{opacity:.55,offset:.3,transform:'translate(0,0) scale(1.06)'},{opacity:0,transform:'translate(0,0) scale(1.18)'}],{duration:800,easing:ease});}
   }),{rootMargin:'0px 0px -25% 0px',threshold:.08});
   root.querySelectorAll('#outcomes,#starting-points,#how,#directions,#before-start,.tail-closing').forEach(node=>observer.observe(node));
  };
  setup();media.addEventListener('change',setup);window.addEventListener('keydown',keyboard);window.addEventListener('pointerdown',pointer,{passive:true});window.addEventListener('wheel',pointer,{passive:true});
  return()=>{clear();media.removeEventListener('change',setup);window.removeEventListener('keydown',keyboard);window.removeEventListener('pointerdown',pointer);window.removeEventListener('wheel',pointer);};
 },[]);
 return <div ref={corner} className="cheese-transition-corner" aria-hidden="true"/>;
}
