import React,{useLayoutEffect,useRef} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {displayText,useLanguage} from './i18n/render';
import './home-motion.css';

gsap.registerPlugin(ScrollTrigger);

// Split translated copy in React, never rewrite DOM managed by React or i18n.
// English stays in words so a line cannot break in the middle of one.
function units(text){
  return text.match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*|\s+|[^\s]/gu)||[];
}

export function MotionText({lines,entrance=false}){
  const ref=useRef(null),language=useLanguage();
  const translated=lines.map(displayText),signature=translated.join('\n');
  useLayoutEffect(()=>{
    const node=ref.current.closest('h2')||ref.current,preference=matchMedia('(prefers-reduced-motion: reduce)');let animation;
    const finish=()=>{animation?.cancel();node.dataset.homeFade='shown';node.dataset.motionShown='true';};
    const arm=()=>{
      if(node.dataset.motionShown||preference.matches)return;
      animation=node.animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,easing:'ease-out',fill:'both'});animation.pause();animation.currentTime=0;animation.onfinish=finish;node.dataset.homeFade='pending';
    };
    const show=()=>{if(node.dataset.motionShown||preference.matches||!animation)return;node.dataset.motionShown='true';node.dataset.homeFade='playing';animation.play();};
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){show();if(node.dataset.motionShown)observer.disconnect();}},{rootMargin:'0px 0px -12% 0px',threshold:0});
    arm();observer.observe(node);
    const reduce=()=>{if(preference.matches)finish();else{arm();observer.observe(node);}};preference.addEventListener('change',reduce);
    const focus=()=>finish();node.addEventListener('focusin',focus);
    return()=>{observer.disconnect();animation?.cancel();if(!node.dataset.motionShown)delete node.dataset.homeFade;node.removeEventListener('focusin',focus);preference.removeEventListener('change',reduce);};
  },[signature,language,entrance]);
  return <span className="motion-text" ref={ref} data-i18n="off">
    <span className="motion-sr-only">{translated.join(' ')}</span>
    <span aria-hidden="true">{translated.map((line,i)=><React.Fragment key={i}>{i>0&&<br/>}{units(line).map((unit,j)=>/\s/u.test(unit)?unit:<span className="motion-mask" key={j}><span className="motion-unit">{unit}</span></span>)}</React.Fragment>)}</span>
  </span>;
}

export function ScrollAperture({children}){
  const ref=useRef(null);
  useLayoutEffect(()=>{
    const media=gsap.matchMedia();
    media.add('(min-width: 1024px) and (min-height: 680px) and (prefers-reduced-motion: no-preference)',()=>{
      gsap.fromTo(ref.current,{clipPath:'inset(0% 12% 0% 12%)',scale:.96},{clipPath:'inset(0% 0% 0% 0%)',scale:1,ease:'none',scrollTrigger:{id:'home-aperture',trigger:ref.current.closest('#outcomes'),start:'clamp(top 96%)',end:'clamp(top 22%)',scrub:true,invalidateOnRefresh:true}});
      // Keyboard users always get the full interactive canvas immediately.
      const reveal=()=>gsap.getTweensOf(ref.current).forEach(tween=>tween.progress(1));
      const node=ref.current;
      node.addEventListener('focusin',reveal);
      return()=>node.removeEventListener('focusin',reveal);
    });
    return()=>media.revert();
  },[]);
  return <div className="outcome-aperture" ref={ref}>{children}</div>;
}
