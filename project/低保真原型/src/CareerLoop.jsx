import React,{useEffect,useRef,useState} from 'react';
import {SceneDecor} from './HomeSceneDesign';
import {MotionText} from './HomeMotion';
import {displayText,useLanguage} from './i18n/render';

const SPEED=88,ease='cubic-bezier(.23,1,.32,1)';
// Replace null with a public image path when each career portrait is supplied.
const PORTRAITS={data:null,ai:null,security:null,ops:null,frontend:null,backend:null,engineering:null,testing:null,software:null,delivery:null};

function CareerCard({career,index,total,copy,seek,preview,dragging,reduced,en}){
 const t=(zh,english)=>en?english:zh;
 const [hover,setHover]=useState(false),[pinned,setPinned]=useState(false),[imageFailed,setImageFailed]=useState(false);
 const front=useRef(null),back=useRef(null),pendingFocus=useRef(null);
 const revealed=!dragging&&(hover||pinned),portrait=PORTRAITS[career.id];
 const moveFocus=()=>{pendingFocus.current?.current?.focus({preventScroll:true});pendingFocus.current=null;};
 useEffect(()=>{if(reduced&&pendingFocus.current)moveFocus();},[revealed,reduced]);
 const reveal=()=>{pendingFocus.current=back;setPinned(true);};
 const restore=()=>{pendingFocus.current=front;setPinned(false);setHover(false);};
 const action=(className,label,handler,ref,arrow)=>copy===1?
  <button ref={ref} className={className} data-career-index={index} onFocus={()=>seek(index,{instant:true})} onClick={handler}>{label}<span aria-hidden="true">{arrow}</span></button>:
  <span className={className} onClick={handler}>{label}<span aria-hidden="true">{arrow}</span></span>;
 return <div className="career-tile" data-revealed={revealed}
  onPointerEnter={event=>{if(event.pointerType==='mouse'&&matchMedia('(hover:hover) and (pointer:fine)').matches)setHover(true);}}
  onPointerLeave={()=>setHover(false)}
  onBlurCapture={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget))setPinned(false);}}>
  <div className="career-tile-flip" onTransitionEnd={event=>{if(event.target===event.currentTarget&&event.propertyName==='transform')moveFocus();}}>
   <div className="career-tile-face career-tile-front">
    <header><span>{String(index+1).padStart(2,'0')} / {total}</span><span className="career-cover-skill">{displayText(career.skill)}</span></header>
    <div className="career-cover-identity">
     <div className="career-cover-portrait">{portrait&&!imageFailed?<img src={portrait} alt="" loading="lazy" draggable="false" onError={()=>setImageFailed(true)}/>:<><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="32" cy="23" r="10"/><path d="M13 53c0-10.5 8.5-18 19-18s19 7.5 19 18"/></svg><span>{t('头像待添加','Portrait pending')}</span></>}</div>
     <h3>{displayText(career.name)}</h3><p className="career-cover-branch">{displayText(career.branch)}</p>
    </div>
    {action('career-tile-open career-cover-reveal',t('查看工作详情','Explore the work'),reveal,front,'↻')}
   </div>
   <div className="career-tile-face career-tile-back">
    <h3>{displayText(career.name)}</h3>
    <dl className="career-work-details"><div><dt>{t('日常工作','Daily work')}</dt><dd>{displayText(career.task)}</dd></div><div><dt>{t('常见产物','Typical deliverables')}</dt><dd>{displayText(career.output)}</dd></div><div><dt>{t('协作与工作条件','Collaboration and conditions')}</dt><dd>{displayText(career.env)}</dd></div></dl>
    {action('career-tile-open',t('查看职业介绍','View career overview'),()=>preview(career.id),null,'↗')}
    {action('career-tile-return',t('返回职业封面','Back to career cover'),restore,back,'')}
   </div>
  </div>
 </div>;
}
export default function CareerLoop({careers,open}){
 const en=useLanguage()==='en',t=(zh,english)=>en?english:zh;
 const viewport=useRef(null),track=useRef(null),position=useRef(0),motion=useRef(null),frame=useRef(0),gesture=useRef(null),suppressClick=useRef(false),activeRef=useRef(0);
 const geometry=useRef({width:360,gap:32,step:392,cycle:0,view:0});
 const [layout,setLayout]=useState(null),[active,setActive]=useState(0),[visible,setVisible]=useState(false),[paused,setPaused]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[dragging,setDragging]=useState(false),[settling,setSettling]=useState(false),[hidden,setHidden]=useState(document.hidden),[dialog,setDialog]=useState(false),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const playing=Boolean(layout&&visible&&!paused&&!hovered&&!focused&&!dragging&&!settling&&!hidden&&!dialog&&!reduced);
 const mod=(value,total)=>((value%total)+total)%total;
 const transform=value=>`translate3d(${(geometry.current.view-geometry.current.width)/2-geometry.current.cycle-value}px,0,0)`;
 const paint=(raw,write=true)=>{
  const rail=track.current,g=geometry.current;if(!rail||!g.cycle)return;
  position.current=mod(raw,g.cycle);if(write)rail.style.transform=transform(raw);
  [...rail.children].forEach((slide,i)=>{
   const distance=Math.abs(i*g.step-g.cycle-raw),focus=Math.max(0,1-distance/g.step);
   slide.firstElementChild.style.transform=distance<g.view/2+g.width?`translateY(${-4*focus}px) scale(${1+.035*focus})`:'none';
  });
  const next=mod(Math.round(position.current/g.step),careers.length);
  if(next!==activeRef.current){activeRef.current=next;setActive(next);}
 };
 const readMotion=entry=>entry.type==='auto'?mod(Number(entry.animation.currentTime||0)/entry.duration*entry.cycle,entry.cycle):entry.from+entry.delta*(entry.animation.effect.getComputedTiming().progress||0);
 const stop=()=>{
  cancelAnimationFrame(frame.current);frame.current=0;const current=motion.current;if(!current)return;
  const value=readMotion(current);motion.current=null;paint(mod(value,geometry.current.cycle));current.animation.cancel();
 };
 const seek=(index,{instant=false,pause=true}={})=>{
  stop();if(pause)setPaused(true);const g=geometry.current;if(!g.cycle)return;
  const target=mod(index,careers.length)*g.step,from=position.current;
  let delta=target-from;if(delta>g.cycle/2)delta-=g.cycle;if(delta<-g.cycle/2)delta+=g.cycle;
  if(instant||reduced||Math.abs(delta)<.5){paint(target);setSettling(false);return;}
  setSettling(true);const animation=track.current.animate([{transform:transform(from)},{transform:transform(from+delta)}],{duration:280,easing:ease,fill:'forwards'});
  const entry={type:'seek',animation,from,delta};motion.current=entry;
  const tick=()=>{if(motion.current!==entry)return;paint(readMotion(entry),false);frame.current=requestAnimationFrame(tick);};frame.current=requestAnimationFrame(tick);
  animation.onfinish=()=>{if(motion.current!==entry)return;cancelAnimationFrame(frame.current);motion.current=null;paint(target);animation.cancel();setSettling(false);};
 };
 useEffect(()=>{
  const view=viewport.current,rail=track.current;
  const measure=()=>{
   stop();setSettling(false);const old=geometry.current,unit=old.step?position.current/old.step:0;
   const width=Math.min(376,Math.max(240,view.clientWidth<600?view.clientWidth-32:360)),gap=view.clientWidth<600?24:32;
   const next={width,gap,step:width+gap,cycle:(width+gap)*careers.length,view:view.clientWidth};geometry.current=next;
   rail.style.setProperty('--career-card-width',`${width}px`);rail.style.setProperty('--career-card-gap',`${gap}px`);paint(unit*next.step);setLayout(next);
  };
  const resize=new ResizeObserver(measure);resize.observe(view);measure();
  const observer=new IntersectionObserver(entries=>setVisible(entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.2)),{threshold:[0,.2]});observer.observe(view);
  const preference=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(preference.matches),visibility=()=>setHidden(document.hidden);
  preference.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);
  const modal=new MutationObserver(()=>setDialog(Boolean(document.querySelector('dialog[open],[role="dialog"]'))));modal.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  return()=>{stop();resize.disconnect();observer.disconnect();modal.disconnect();preference.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};
 },[careers.length]);
 useEffect(()=>{
  if(!playing)return;stop();const g=geometry.current,duration=g.cycle/SPEED*1000;
  const animation=track.current.animate([{transform:transform(0)},{transform:transform(g.cycle)}],{duration,easing:'linear',iterations:Infinity});animation.currentTime=position.current/SPEED*1000;
  const entry={type:'auto',animation,duration,cycle:g.cycle};motion.current=entry;
  const tick=()=>{if(motion.current!==entry)return;paint(readMotion(entry),false);frame.current=requestAnimationFrame(tick);};frame.current=requestAnimationFrame(tick);
  return()=>{if(motion.current===entry)stop();};
 },[playing,layout]);
 const begin=event=>{
  if(event.button!==0||event.target.closest('button'))return;if(event.pointerType==='mouse')event.preventDefault();stop();setSettling(false);setDragging(true);
  gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,start:position.current,moved:false};
 };
 const drag=event=>{
  const g=gesture.current;if(!g||g.id!==event.pointerId)return;const dx=event.clientX-g.x,dy=event.clientY-g.y;
  if(!g.moved){if(Math.abs(dx)<5||Math.abs(dy)>Math.abs(dx))return;g.moved=true;suppressClick.current=true;event.currentTarget.setPointerCapture(event.pointerId);}
  event.preventDefault();paint(mod(g.start-dx,geometry.current.cycle));
 };
 const release=event=>{
  const g=gesture.current;if(!g||g.id!==event.pointerId)return;gesture.current=null;
  if(g.moved)seek(Math.round(position.current/geometry.current.step),{pause:false});setDragging(false);
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
 };
 const preview=id=>{stop();setPaused(true);open('careerPreview',{career:id});};
 const keyboard=event=>{
  const next={ArrowLeft:activeRef.current-1,ArrowRight:activeRef.current+1,Home:0,End:careers.length-1}[event.key];if(next===undefined)return;
  event.preventDefault();seek(next,{instant:true});if(event.target.matches('button'))track.current.querySelector(`[data-loop-copy="1"] [data-career-index="${mod(next,careers.length)}"]`)?.focus();
 };
 return <section id="directions" className="landing-section direction-directory career-loop" data-natural-flow data-active-direction={active} data-playing={playing} aria-labelledby="directions-title">
  <SceneDecor scene="careers"/>
  <header className="section-heading"><div><h2 id="directions-title"><MotionText lines={['了解十个 IT 职业方向的实际工作']}/></h2><p>{t('从数据分析到软件开发，比较每天做什么、需要哪些基础、会交付什么成果。','From data analysis to software development, compare daily tasks, foundations and deliverables.')}</p></div><a className="gallery-skip" href="#case-study">{t('继续看项目示例','Continue to the project example')} <span aria-hidden="true">↓</span></a></header>
  <div className="career-loop-toolbar"><span>{reduced?t('手动浏览 · 可拖动卡片','Manual browsing · Drag the cards'):paused?t('已暂停，可拖动浏览','Paused · Drag to browse'):hovered||focused?t('阅读时暂停','Paused while reading'):t('自动慢速循环 · 可拖动浏览','Slow autoplay · Drag to browse')}</span><div>{!reduced&&<button className="career-loop-toggle" aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?t('继续播放','Play'):t('暂停播放','Pause')}</button>}<button aria-label={t('上一个工作方向','Previous work direction')} onClick={()=>seek(activeRef.current-1)}><span aria-hidden="true">←</span></button><button aria-label={t('下一个工作方向','Next work direction')} onClick={()=>seek(activeRef.current+1)}><span aria-hidden="true">→</span></button></div></div>
  <div ref={viewport} className="career-loop-viewport" role="region" aria-roledescription={t('轮播','carousel')} aria-label={t('十个工作方向，拖动或按左右方向键浏览','Ten work directions. Drag or use the left and right arrow keys.')} tabIndex={0} data-dragging={dragging} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}} onKeyDown={keyboard} onPointerDown={begin} onPointerMove={drag} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onDragStart={event=>event.preventDefault()} onClickCapture={event=>{if(suppressClick.current){event.preventDefault();event.stopPropagation();suppressClick.current=false;}}}>
   <div ref={track} className="career-loop-track">{[0,1,2].flatMap(copy=>careers.map((career,i)=><article className="career-slide" key={copy+'-'+career.id} data-loop-copy={copy} data-career-id={career.id} data-current={active===i} aria-hidden={copy!==1?true:undefined}>
    <CareerCard career={career} index={i} total={careers.length} copy={copy} seek={seek} preview={preview} dragging={dragging} reduced={reduced} en={en}/>
   </article>))}</div>
  </div>
 </section>;
}
