import {useLayoutEffect} from 'react';

// Static reading groups only. Dynamic panels belong to useContentTransition;
// major headings belong to MotionText, so animations never compete on a node.
export const homeRevealSelector=[
 '.intro-audience,.landing-intro>p,.intro-actions,.intro-footnote,.home-scroll-hint',
 '.outcomes-heading .caption,.outcomes-heading p,.outcomes-heading>.status-chip,.outcome-controls,.outcome-stage-nav,.outcome-more,.outcome-linear-scene',
 '#starting-points .section-heading>p',
 '#how .section-heading p,#how .section-heading>a,.sj-shortcuts,.sj-item h3,.sj-output,.sj-artifact,.sj-bottom',
 '#directions .section-heading p,.gallery-skip,.direction-playback,.direction-gallery-toolbar>label,.direction-card-content,.direction-gallery-footer,.direction-gallery-note',
 '.story-bridge>p,.story-bridge>span,.story-rail>h3,.story-rail>nav,.story-rail>p,.story-scene-intro,.tail-route-map,.tail-chat>header,.tail-chat-ready,.tail-chat-scope,.tail-report-tabs,.tail-report-controls,.story-scene-exit,.story-own-link',
 '.before-start>header>p,.start-list-toolbar,.start-answer-group>h3,.start-answer summary,.before-start>footer',
 '.tail-closing-frame>p,.tail-closing-frame>button,.tail-closing-frame>a,.tail-closing-frame>small,.tail-footer-nav,.publicmain>footer'
].join(',');

export function useHomeTextReveal(){
 useLayoutEffect(()=>{
  const root=document.querySelector('.publicmain');if(!root)return;
  const intro=root.querySelector('.landing-intro'),nav=root.querySelector('.publicnav');
  const sizeOpening=()=>{if(!intro)return;const top=Math.max(0,intro.getBoundingClientRect().top+scrollY);root.style.setProperty('--home-intro-offset',`${top}px`);};
  sizeOpening();window.addEventListener('resize',sizeOpening);
  const openingResize=new ResizeObserver(sizeOpening);if(nav)openingResize.observe(nav);
  const preference=matchMedia('(prefers-reduced-motion: reduce)'),records=new Map();let frame=0;
  const gated=node=>{
   const item=node.closest('.sj-item');
   return item?.closest('[data-journey-mode="scroll"]')&&item.dataset.active!=='true';
  };
  const finish=(node,record)=>{record.animation?.cancel();record.animation=null;node.dataset.revealState='shown';};
  const arm=(node,record)=>{
   record.animation?.cancel();
   if(preference.matches){finish(node,record);return;}
   const direction=1;
   const delay=node.matches('.sj-output')?70:node.matches('.sj-artifact')?140:0;
   const animation=node.animate([{opacity:0,transform:`translateY(${direction*24}px)`},{opacity:1,transform:'translateY(0)'}],{duration:600,delay:0,easing:'ease-out',fill:'both'});
   animation.pause();animation.currentTime=0;record.animation=animation;node.dataset.revealState='pending';
  };
  const reveal=(node,record)=>{
   if(preference.matches){finish(node,record);return;}
   if(!record.visible||gated(node)||node.dataset.revealState!=='pending')return;
   const animation=record.animation;node.dataset.revealState='revealing';animation.play();
   animation.onfinish=()=>{if(node.isConnected&&record.animation===animation)finish(node,record);};
  };
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries)for(const [node,record] of records){if(record.observed!==entry.target)continue;
    record.visible=entry.isIntersecting;
    if(record.visible)reveal(node,record);
    // A completed entrance stays completed. Observing the translated node near
    // the viewport edge must not cancel/restart its own animation indefinitely.
   }
  },{rootMargin:'0px 0px -12% 0px',threshold:0});
  const scan=()=>{
   frame=0;
   for(const [node,record] of records)if(!node.isConnected){record.animation?.cancel();records.delete(node);if(![...records.values()].some(other=>other.observed===record.observed))observer.unobserve(record.observed);}
   root.querySelectorAll(homeRevealSelector).forEach(node=>{
    if(records.has(node)||node.closest('[data-motion-snapshot]'))return;
    // Clipped reading groups need a stable observation box. The animated last
    // line can initially sit fully outside the clip and never intersect itself.
    const observed=node.closest('.outcomes-heading,.section-heading,.story-bridge,.before-start>header,.tail-closing-frame')||node;
    const record={visible:false,animation:null,observed};records.set(node,record);arm(node,record);observer.observe(observed);
   });
  };
  const mutations=new MutationObserver(entries=>{
   for(const entry of entries)if(entry.type==='attributes'&&(entry.attributeName!=='data-active'||entry.target.matches('.sj-item'))){
    for(const [node,record] of records)if(entry.target.contains(node)){
     // Existing pending entrances resume when their panel becomes active;
     // a started or completed entrance must never be rearmed by navigation.
     reveal(node,record);
    }
   }
   if(!frame)frame=requestAnimationFrame(scan);
  });
  const mediaChange=()=>{for(const [node,record] of records){if(node.dataset.revealState==='shown'||preference.matches)finish(node,record);else{arm(node,record);reveal(node,record);}}};
  const focus=event=>{for(const [node,record] of records)if(node.contains(event.target))finish(node,record);};
  scan();mutations.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['data-active','data-journey-mode']});
  preference.addEventListener('change',mediaChange);root.addEventListener('focusin',focus);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();mutations.disconnect();openingResize.disconnect();window.removeEventListener('resize',sizeOpening);root.style.removeProperty('--home-intro-offset');preference.removeEventListener('change',mediaChange);root.removeEventListener('focusin',focus);for(const [node,record] of records){record.animation?.cancel();delete node.dataset.revealState;}};
 },[]);
}
