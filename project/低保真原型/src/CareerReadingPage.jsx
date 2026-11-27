import React,{useLayoutEffect,useRef} from 'react';
import {careerContent,careerRelatedEvidence} from './career-exploration-model';
import {useLanguage} from './i18n/render';
import ProductIcon from './ProductIcon';
import CareerCompareBasket from './CareerCompareBasket';
import './career-exploration-reading.css';
import {getCareerReadingGuide} from './career-reading-guide';
import './career-reading-experience.css';
import ReportRunwayNavigation from './ReportRunwayNavigation';
import {careerReadingSections as sectionNames,careerReadingPosition,careerReadingSectionUrl} from './career-reading-navigation';
import './career-reading-tabs.css';
import {CareerOverviewSection,CareerCaseSection,CareerPreparationSection,CareerGrowthSection,CareerPracticeSection,CareerSourcesSection} from './CareerReadingSections';
import './career-reading-hierarchy.css';
export default function CareerReadingPage({current,s,url,move,returnTo,link,open,toggleCompare,update,sync,ownerKey}){
 const language=useLanguage(),en=language==='en',tx=(z,e)=>en?e:z,role=careerContent(current.id,language);
 const position=careerReadingPosition(url),active=position.active,heading=useRef(),tabRefs=useRef({}),panels=useRef(),pending=useRef(null),lastActive=useRef(active),animation=useRef(null);
 const guide=getCareerReadingGuide(current.id,language);
 const saved=s.favorites.includes(current.id),compared=s.compare.includes(current.id),evidence=careerRelatedEvidence(s,current.id);
 const route=(id,hash='')=>careerReadingSectionUrl(url,id,hash);
 const choose=(id,motion=false,hash='',fromTab=false)=>{
  pending.current={motion,fromTab};
  const to=route(id,hash);
  if(to!==url)move(to,false,{preserveScroll:true});
  else if(hash){const target=document.getElementById(hash);if(target){if(target.tagName==='DETAILS')target.open=true;target.scrollIntoView({block:'start'});target.querySelector('summary')?.focus({preventScroll:true});}}
 };
 const activate=(event,id,hash='')=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();choose(id,event.detail>0,hash);};
 const readingLink=(id,label)=><a href={route(id)} onClick={event=>activate(event,id)}>{label}</a>;
 const sourceUrl=id=>route('sources','career-source-'+id);
 const onSource=(event,id)=>activate(event,'sources','career-source-'+id);
 const keys=(event,index)=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?sectionNames.length-1:(index+(event.key==='ArrowRight'?1:-1)+sectionNames.length)%sectionNames.length;const id=sectionNames[next][0];tabRefs.current[id]?.focus({preventScroll:true});choose(id,false,'',true);};
 const panel=id=>({id:'career-panel-'+id,role:'tabpanel','aria-labelledby':'career-reading-tab-'+id,tabIndex:0,hidden:active!==id,className:'career-reading-panel'});
 useLayoutEffect(()=>{
  animation.current?.cancel();animation.current=null;
  const request=pending.current,previous=lastActive.current;lastActive.current=active;
  const target=document.getElementById('career-panel-'+active);
  if(request?.motion&&previous!==active&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const direction=sectionNames.findIndex(([id])=>id===active)>sectionNames.findIndex(([id])=>id===previous)?1:-1;
   animation.current=target?.animate([{transform:`translate3d(${direction*16}px,0,0)`,opacity:.4},{transform:'translate3d(0,0,0)',opacity:1}],{duration:180,easing:'cubic-bezier(.22,1,.36,1)'});
   if(animation.current)animation.current.id='career-reading-panel-enter';
  }
  const frame=requestAnimationFrame(()=>{
   const hash=position.hash.slice(1),anchor=hash?document.getElementById(hash):null;
   if(anchor&&!anchor.closest('[hidden]')){if(anchor.tagName==='DETAILS')anchor.open=true;anchor.scrollIntoView({block:'start'});(anchor.querySelector('summary')||anchor).focus({preventScroll:true});}
   else if(new URL(url,location.origin).searchParams.has('section')||request){
    const nav=tabRefs.current[active]?.closest('nav'),root=document.getElementById('main'),bounds=nav?.getBoundingClientRect(),top=root?.getBoundingClientRect().top||0;
    if(!request?.fromTab||bounds?.top<top||bounds?.bottom>innerHeight)nav?.scrollIntoView({block:'start'});
    if(!request?.fromTab)target?.focus({preventScroll:true});
   }else heading.current?.focus({preventScroll:true});
   pending.current=null;
  });
  return()=>{cancelAnimationFrame(frame);animation.current?.cancel();};
 },[active,url]);
 return <article className="career-reading" data-i18n="off">
 <nav className="career-reading-back">{link(returnTo,tx('← 返回职业列表','← Back to career list'))}<CareerCompareBasket s={s} link={link} toggleCompare={toggleCompare}/></nav>
 <header className="career-reading-hero">
  <div className="career-hero-title"><img src="/illustrations/cheese-scenes/explore.png" alt=""/><div><h1 ref={heading} tabIndex={-1}>{role.name}</h1>{!en&&<p className="career-english-name" lang="en">{role.englishName}</p>}<p className="career-reading-question">{guide.question}</p><p className="career-occupation-intro">{guide.answer}</p></div></div>
  <div className="career-hero-actions"><button type="button" aria-pressed={saved} onClick={()=>update({favorites:saved?s.favorites.filter(id=>id!==current.id):[...s.favorites,current.id]})}><ProductIcon name="bookmark" size={18}/>{saved?tx('已收藏','Saved'):tx('收藏方向','Save career')}</button><button type="button" className={compared?'':'primary'} aria-pressed={compared} onClick={()=>toggleCompare(current.id)}><ProductIcon name={compared?'check':'plus'} size={18}/>{compared?tx('已加入比较','Added to comparison'):tx('加入比较','Add to comparison')}</button></div>
 <dl className="career-first-look"><div><dt><ProductIcon name="file" size={19}/>{tx('交付什么','What you deliver')}</dt><dd>{role.deliverables.map(d=>d.title).join(' / ')}</dd></div><div><dt><ProductIcon name="people" size={19}/>{tx('和谁协作','Who you work with')}</dt><dd>{role.collaboration.map(r=>r.role).join(' / ')}</dd></div><div><dt><ProductIcon name="compass" size={19}/>{tx('先试一件事','Try one thing')}</dt><dd>{readingLink('practice',guide.firstMove)}</dd></div></dl>
 </header>
 <ReportRunwayNavigation className="career-section-nav" chapters={sectionNames.map(([id])=>id)} labels={sectionNames.map(([,z,e])=>en?e:z)} active={active} animate={Boolean(pending.current?.motion)} tabRefs={tabRefs} onChoose={(id,motion)=>choose(id,motion,'',true)} onKeyDown={keys} ariaLabel={tx('职业阅读导航','Career reading sections')} tabPrefix="career-reading-tab-" panelPrefix="career-panel-" duration={250}/>
 {position.invalidSection&&<p role="status">{tx('阅读位置不可用，已从职业全貌开始。','This reading position is unavailable. Start with the career overview.')}</p>}
 <div ref={panels} className="career-reading-panels">
  <div {...panel('overview')}><CareerOverviewSection role={role} guide={guide} tx={tx} readingLink={readingLink} sourceUrl={sourceUrl} onSource={onSource}/></div>
  <div {...panel('work')}><CareerCaseSection role={role} tx={tx} readingLink={readingLink} sourceUrl={sourceUrl} onSource={onSource}/></div>
  <div {...panel('preparation')}><CareerPreparationSection role={role} tx={tx} evidence={evidence} link={link}/></div>
  <div {...panel('growth')}><CareerGrowthSection role={role} tx={tx}/></div>
  <div {...panel('practice')}><CareerPracticeSection role={role} tx={tx} s={s} update={update} sync={sync} ownerKey={ownerKey} link={link} open={open}/></div>
  <div {...panel('sources')}><CareerSourcesSection role={role} tx={tx}/></div>
 </div>
 <CareerCompareBasket s={s} link={link} toggleCompare={toggleCompare} returnTo={returnTo}/></article>;
}
