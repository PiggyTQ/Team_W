import React,{useLayoutEffect,useRef} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import './home-transitions.css';

gsap.registerPlugin(ScrollTrigger);

// Motion only: the existing sections, backgrounds and artwork own layout.
export default function HomeTransitions(){
 const bar=useRef(null);
 useLayoutEffect(()=>{
  const root=document.querySelector('#main.publicmain'),nav=root?.querySelector('.publicnav');if(!root||!nav)return;
  const html=document.documentElement,language=document.querySelector('.language-switch-floating');
  const preference=matchMedia('(prefers-reduced-motion: reduce)'),nativeTimeline=CSS.supports('animation-timeline: scroll(root block)');
  let lastY=scrollY,frame=0,scanFrame=0,layoutFrame=0,media,active=true,interacted=false,inputDirection=0,intentUntil=0,revision=0,lastHeight=0;
  let observers=[],animations=new Set(),seenTitles=new WeakSet();
  const completedMasks=new WeakSet();
  const navVisible=visible=>{
   nav.dataset.motionHidden=String(!visible);html.dataset.homeNavigationHidden=String(!visible);
   root.style.setProperty('--home-sticky-top',visible?nav.offsetHeight+'px':'0px');
  };
  const measure=()=>{root.style.setProperty('--home-nav-height',nav.offsetHeight+'px');};
  // Arm before intersection; decode artwork before playback, not afterwards.
  const visibleOnce=(node,run,ready=Promise.resolve())=>{
   let visible=false,decoded=false,finished=false;const version=revision;
   const tryRun=()=>{if(!active||version!==revision||!visible||!decoded||finished)return;finished=true;observer.disconnect();run();};
   const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);tryRun();},{rootMargin:'0px 0px -12% 0px',threshold:0});
   observer.observe(node);observers.push(observer);ready.catch(()=>{}).then(()=>{decoded=true;tryRun();});
  };
  const arm=(node,frames,duration,marker,ready)=>{
   const animation=node.animate(frames,{duration,easing:'ease-out',fill:'both'});animation.pause();animation.currentTime=0;animations.add(animation);node.dataset[marker]='pending';
   const finish=()=>{animation.cancel();animations.delete(animation);node.dataset[marker]='shown';if(marker==='homeFade')node.dataset.motionShown='true';else completedMasks.add(node);};
   animation.onfinish=finish;
   visibleOnce(node,()=>{node.dataset[marker]='playing';if(marker==='homeFade')node.dataset.motionShown='true';animation.play();},ready);
   const focus=()=>{if(node.dataset[marker]!=='shown')finish();};
   const owner=marker==='homeMask'?node.closest('section'):node;
   owner?.addEventListener('focusin',focus);observers.push({disconnect:()=>owner?.removeEventListener('focusin',focus)});
  };
  const scanTitles=()=>{
   scanFrame=0;if(preference.matches)return;
   root.querySelectorAll('h2:not(:has(.motion-text))').forEach(node=>{
    if(seenTitles.has(node)||node.dataset.motionShown||node.closest('.direction-card,.outcome-stage,.spread-plate,dialog,[role="dialog"]'))return;
    seenTitles.add(node);arm(node,[{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],600,'homeFade');
   });
  };
  const reset=()=>{
   revision++;media?.revert();observers.forEach(o=>o.disconnect());observers=[];
   animations.forEach(a=>{const node=a.effect?.target;if(node){if(node.dataset.homeFade==='playing')node.dataset.motionShown='true';if(node.dataset.homeMask==='playing')completedMasks.add(node);delete node.dataset.homeFade;delete node.dataset.homeMask;}a.cancel();});animations.clear();
   seenTitles=new WeakSet();delete root.querySelector('.tail-closing-frame')?.dataset.homeColorProgress;
  };
  const setup=()=>{
   reset();html.dataset.homeNativeSnap=String(!preference.matches&&CSS.supports('scroll-snap-type: y mandatory'));navVisible(true);if(preference.matches)return;
   scanTitles();media=gsap.matchMedia();
   media.add('(prefers-reduced-motion: no-preference)',()=>{
    root.querySelectorAll('.entry-deck,.hero-feature-strip').forEach(group=>{
     if(group.dataset.homeStaggerShown)return;
     const cards=group.matches('.entry-deck')?[...group.querySelectorAll('.problem-card-face')]:[...group.children];
     const tween=gsap.fromTo(cards,{opacity:0,y:24},{opacity:1,y:0,duration:.6,stagger:.08,ease:'power1.out',paused:true,clearProps:'opacity,transform'});
     const play=()=>{group.dataset.homeStaggerShown='true';tween.play();};visibleOnce(group,play);
     const focus=()=>{group.dataset.homeStaggerShown='true';tween.progress(1);};group.addEventListener('focusin',focus);observers.push({disconnect:()=>group.removeEventListener('focusin',focus)});
    });
    root.querySelectorAll('.hero-import-photo img,.detailed-journey-art,.archive-cheese-top').forEach(node=>{
     if(completedMasks.has(node))return;
     const ready=node instanceof HTMLImageElement?node.decode():Promise.all([...node.querySelectorAll('image')].map(svg=>{const img=new Image();img.src=svg.getAttribute('href');return img.decode();}));
     arm(node,[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)'}],900,'homeMask',ready);
    });
    root.querySelectorAll('.scene-handmarks path').forEach(path=>{
     const length=path.getTotalLength();gsap.fromTo(path,{strokeDasharray:length,strokeDashoffset:length},{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:path.closest('section'),start:'top 85%',end:'top 20%',scrub:true}});
    });
    // Reversible color passage. No radius, padding, size or image-color changes.
    const closing=root.querySelector('.tail-closing-frame');
    if(closing){
     const background=getComputedStyle(closing).backgroundColor;
     const text=[...closing.querySelectorAll('h2,h2 .motion-unit,:scope>p,:scope>a,:scope>small')],original=text.map(node=>getComputedStyle(node).color);
     const top=()=>scrollY+closing.getBoundingClientRect().top;
     const timeline=gsap.timeline({scrollTrigger:{id:'home-color-passage',trigger:closing,refreshPriority:-10,start:()=>Math.max(0,top()-innerHeight*.95),end:()=>Math.min(html.scrollHeight-innerHeight,top()-innerHeight*.1),scrub:true,invalidateOnRefresh:true,onRefresh:self=>{closing.dataset.homeColorRange=`${Math.round(self.start)},${Math.round(self.end)}`;},onUpdate:self=>{closing.dataset.homeColorProgress=self.progress.toFixed(3);}}});
     timeline.fromTo(closing,{backgroundColor:background},{backgroundColor:'#073d76',duration:1,ease:'none',immediateRender:false},0).to(closing,{backgroundColor:background,duration:1,ease:'none'},1);
     text.forEach((node,i)=>{timeline.fromTo(node,{color:original[i]},{color:'#fff8e9',duration:1,ease:'none',immediateRender:false},0).to(node,{color:original[i],duration:1,ease:'none'},1);});
    }
   });
  };
  const keepNavigation=()=>!interacted||scrollY<80||preference.matches||nav.querySelector(':focus-visible')||language?.querySelector(':focus-visible')||nav.querySelector('details[open]')||document.querySelector('dialog[open],[role="dialog"]')||html.dataset.homeAnchorNavigation==='true';
  const render=()=>{
   frame=0;const y=scrollY,delta=y-lastY,direction=performance.now()<intentUntil?inputDirection:Math.sign(delta);
   if(keepNavigation()||direction<0)navVisible(true);else if(direction>0&&Math.abs(delta)>.5)navVisible(false);
   if(!nativeTimeline&&bar.current)bar.current.style.width=`${Math.max(0,Math.min(1,y/Math.max(1,html.scrollHeight-innerHeight)))*100}%`;
   lastY=y;
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
  const wheel=event=>{if(event.ctrlKey||!event.deltaY||Math.abs(event.deltaY)<Math.abs(event.deltaX))return;interacted=true;inputDirection=Math.sign(event.deltaY);intentUntil=performance.now()+650;if(inputDirection<0||keepNavigation())navVisible(true);else if(inputDirection>0)navVisible(false);};
  const focus=event=>{if(nav.contains(event.target)||language?.contains(event.target))navVisible(true);};
  const pointer=()=>{interacted=true;};
  const keyboard=()=>{interacted=true;inputDirection=0;intentUntil=0;navVisible(true);};
  // Pinned story stages mount after this layout effect and extend the document.
  // Refresh against their final height rather than retaining pre-pin positions.
  const refresh=()=>{if(!layoutFrame)layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;if(active){ScrollTrigger.sort();ScrollTrigger.refresh();}});};
  const layout=new ResizeObserver(()=>{const height=root.offsetHeight;if(Math.abs(height-lastHeight)>1){lastHeight=height;refresh();}});layout.observe(root);
  document.fonts.ready.then(()=>{if(active)refresh();});
  const resize=new ResizeObserver(()=>{measure();if(nav.dataset.motionHidden!=='true')navVisible(true);});resize.observe(nav);
  const mutations=new MutationObserver(()=>{if(!scanFrame)scanFrame=requestAnimationFrame(scanTitles);});mutations.observe(root,{childList:true,subtree:true});
  measure();setup();render();preference.addEventListener('change',setup);window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('wheel',wheel,{passive:true});window.addEventListener('pointerdown',pointer,{passive:true});window.addEventListener('resize',measure);document.addEventListener('focusin',focus);window.addEventListener('keydown',keyboard);
  return()=>{active=false;reset();cancelAnimationFrame(frame);cancelAnimationFrame(scanFrame);cancelAnimationFrame(layoutFrame);layout.disconnect();resize.disconnect();mutations.disconnect();preference.removeEventListener('change',setup);window.removeEventListener('scroll',schedule);window.removeEventListener('wheel',wheel);window.removeEventListener('pointerdown',pointer);window.removeEventListener('resize',measure);document.removeEventListener('focusin',focus);window.removeEventListener('keydown',keyboard);delete nav.dataset.motionHidden;delete html.dataset.homeNavigationHidden;delete html.dataset.homeNativeSnap;root.style.removeProperty('--home-sticky-top');root.style.removeProperty('--home-nav-height');};
 },[]);
 return <div ref={bar} className="home-reading-progress" aria-hidden="true"/>;
}
