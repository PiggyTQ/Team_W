import React from 'react';
import OutcomeShowcase from './OutcomeShowcase';
import {useLanguage} from './i18n/render';
import './hero-import.css';
import HomeCapabilityIcon from './HomeCapabilityIcon';
import './cheese-hero.css';

export default function LandingIntro({go,open}) {
 const en=useLanguage()==='en';
 const features=[
  ['explore','探索职业方向','Explore careers','了解真实工作，找到探索的起点。','Understand real work and find your starting point.','/careers'],
  ['preparation','把疑问变成计划','Turn questions into plans','整理已有经历，找出准备缺口。','Organize your experience and identify gaps.','/assessment'],
  ['learning','实践并积累技能','Practice and build skills','尝试小项目，留下过程与成果。','Try small projects and collect evidence.','/learning'],
  ['reports','整理清晰的成果','Get a clear outcome','把探索与实践整理成阶段报告。','Turn your exploration into an evidence-based report.','/reports']
 ];
 return <>
    <section className="landing-intro hero-import" aria-labelledby="intro-title" data-i18n="off"><div className="hero-import-copy">
      <p className="hero-import-eyebrow"><span aria-hidden="true"/>{en?'IT career planning and growth for students':'面向大学生的 IT 职业规划与成长工具'}</p>
      <h1 id="intro-title">{en?'Find a direction to explore,':'找到想探索的方向，'}<br/><span className="hero-cheese-emphasis">{en?'take an informed next step.':'走出有依据的下一步。'}</span></h1>
      <p className="hero-import-description">{en?'Start by exploring careers and organizing your experience.':'从了解职业、整理已有经历开始，'}<br/>{en?'Turn questions into an actionable plan.':'把疑问变成可执行的计划。'}</p>
      <div className="hero-import-actions"><button className="primary" onClick={()=>go('/careers')}>{en?'Start career planning':'开始职业规划'} <span aria-hidden="true">→</span></button><a href="#how">{en?'See how it works':'了解使用流程'}</a></div>
      <div className="hero-import-footnote">{en?'An undecided direction is fine · Start from scratch · Come back anytime':'方向可以未定 · 经历可以从零整理 · 随时回来继续'}</div></div>
      <div className="hero-import-photo"><img src="/illustrations/cheese-hero/exploration.png" alt="" width="1536" height="1024" fetchPriority="high"/></div>
    </section>
    <nav className="hero-feature-strip" aria-label={en?'Four starting points for career planning':'职业规划的四个起点'} data-i18n="off">{features.map(([icon,zh,title,description,english,to])=><a key={icon} href={to} onClick={event=>{if(event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();go(to);}}}><span className="hero-feature-icon" aria-hidden="true"><HomeCapabilityIcon name={icon} size={36}/></span><span><strong>{en?title:zh}</strong><span className="hero-feature-description">{en?english:description}</span></span></a>)}</nav>
    <OutcomeShowcase open={open}/>
  </>;
}
