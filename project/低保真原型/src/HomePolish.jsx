import {useEffect} from 'react';
import './home-polish.css';
import HomeSceneDesign from './HomeSceneDesign';

/** A progressive motion layer. Existing page copy, artwork and state stay owned
 * by their original components; scrolling is always interruptible by input. */
export default function HomePolish(){
 useEffect(()=>{
  const root=document.querySelector('#main.publicmain');
  if(!root)return;
  const page=document.documentElement,preference=matchMedia('(prefers-reduced-motion: reduce)');
  const hero=root.querySelector('.hero-import'),photo=hero?.querySelector('.hero-import-photo img');
  const animations=new Set();let frame=0,heroVisible=false,anchorTimer=0,anchorActive=false;
  const cleanupAnimations=()=>{for(const animation of animations)animation.cancel();animations.clear();};
  const animateOpening=()=>{
   cleanupAnimations();
   if(!hero||preference.matches||hero.getBoundingClientRect().bottom<=0||scrollY>innerHeight*.7)return;
   const ease=getComputedStyle(root).getPropertyValue('--jimo-ease').trim()||'cubic-bezier(.23,1,.32,1)';
   const parts=[hero.querySelector('h1'),hero.querySelector('.hero-import-description'),hero.querySelector('.hero-import-actions'),hero.querySelector('.hero-import-footnote'),hero.querySelector('.hero-import-photo')].filter(Boolean);
   parts.forEach((node,index)=>{
    const animation=node.animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,delay:0,easing:'ease-out'});
    animations.add(animation);animation.onfinish=()=>animations.delete(animation);
   });
  };
  const navLinks=[...root.querySelectorAll('.public-links a[href^="#"],.public-mobile-menu a[href^="#"]')];
  const sections=[...new Set(navLinks.map(link=>root.querySelector(link.hash)).filter(Boolean))];
  const setActive=id=>navLinks.forEach(link=>{
   if(link.hash==='#'+id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
  });
  const render=()=>{
   frame=0;
   if(photo&&heroVisible&&!preference.matches&&!document.hidden){
    const bounds=hero.getBoundingClientRect(),progress=Math.max(0,Math.min(1,-bounds.top/(bounds.height+innerHeight*.4)));
    photo.style.transform=`scale(${1.035-progress*.035})`;
   }
   let current='';
   for(const section of sections)if(section.getBoundingClientRect().top<=innerHeight*.36)current=section.id;
   setActive(current);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
  const releaseAnchor=()=>{clearTimeout(anchorTimer);anchorActive=false;delete page.dataset.homeAnchorNavigation;};
  const interruptAnchor=()=>{
   if(!anchorActive)return;
   scrollTo({top:scrollY,left:scrollX,behavior:'instant'});releaseAnchor();
  };
  const scrollEnd=()=>{if(anchorActive)releaseAnchor();};
  const onScroll=()=>{
   schedule();
   if(anchorActive){clearTimeout(anchorTimer);anchorTimer=setTimeout(releaseAnchor,180);}
  };
  const onAnchor=event=>{
   const link=event.target.closest('a[href^="#"]');
   if(!link||!root.contains(link)||link.hash.length<2||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const target=document.getElementById(decodeURIComponent(link.hash.slice(1)));
   if(!target)return;
   event.preventDefault();interruptAnchor();
   // HomeScroll's optional section settle checks this flag. No wheel events or
   // touch gestures are consumed by this enhancement.
   anchorActive=true;page.dataset.homeAnchorNavigation='true';
   const margin=parseFloat(getComputedStyle(target).scrollMarginTop)||0;
   const top=Math.max(0,scrollY+target.getBoundingClientRect().top-margin);
   if(location.hash!==link.hash)history.pushState(history.state,'',link.hash);
   const keyboard=event.detail===0;
   scrollTo({top,behavior:preference.matches||keyboard?'instant':'smooth'});
   if(keyboard){
    const focusTarget=target.matches('main,[tabindex]')?target:target.querySelector('h1,h2,h3')||target;
    const original=focusTarget.getAttribute('tabindex');
    if(original===null){focusTarget.setAttribute('tabindex','-1');focusTarget.addEventListener('blur',()=>focusTarget.removeAttribute('tabindex'),{once:true});}
    focusTarget.focus({preventScroll:true});releaseAnchor();
   }else anchorTimer=setTimeout(releaseAnchor,1600);
   schedule();
  };
  const onPreference=()=>{cleanupAnimations();interruptAnchor();if(photo)photo.style.removeProperty('transform');schedule();};
  const onVisibility=()=>{if(document.hidden){cleanupAnimations();cancelAnimationFrame(frame);frame=0;}else schedule();};
  const observer=new IntersectionObserver(entries=>{heroVisible=entries.some(entry=>entry.isIntersecting);if(heroVisible)schedule();},{threshold:0});
  if(hero)observer.observe(hero);
  animateOpening();schedule();
  root.addEventListener('click',onAnchor);
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',schedule);
  for(const type of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(type,interruptAnchor,{passive:true});
  window.addEventListener('scrollend',scrollEnd);preference.addEventListener('change',onPreference);document.addEventListener('visibilitychange',onVisibility);
  return()=>{
   cleanupAnimations();releaseAnchor();cancelAnimationFrame(frame);observer.disconnect();
   root.removeEventListener('click',onAnchor);window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',schedule);
   for(const type of ['wheel','touchstart','pointerdown','keydown'])window.removeEventListener(type,interruptAnchor);
   window.removeEventListener('scrollend',scrollEnd);preference.removeEventListener('change',onPreference);document.removeEventListener('visibilitychange',onVisibility);
   if(photo)photo.style.removeProperty('transform');navLinks.forEach(link=>link.removeAttribute('aria-current'));
  };
 },[]);
 return <HomeSceneDesign/>;
}
