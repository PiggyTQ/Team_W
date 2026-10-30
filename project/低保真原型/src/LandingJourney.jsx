import React, {useEffect, useRef, useState} from 'react';
import {SceneDecor,SceneRail} from './HomeSceneDesign';
import {MotionText} from './HomeMotion';
import {useContentTransition} from './content-transition';
import {useLanguage} from './i18n/render';

const entries=[
  {label:'方向未定',title:'我还没想好方向',text:'看清职业做什么，比较两个方向，留下一个想验证的问题。',output:'职业方向比较与探索问题',to:'/careers',icon:'compass'},
  {label:'目标已定',title:'有目标，怎么准备？',text:'对照目标职业要求，查看已有经历能支持什么，再安排需要补的学习和项目。',output:'准备差距与学习任务',to:'/assessment?tab=四维与差距',icon:'plan'},
  {label:'已有作品',title:'把做过的项目讲清楚',text:'整理课程项目和个人作品，写清自己做了什么，为报告和简历准备材料。',output:'项目经历与个人贡献',to:'/assessment',icon:'file'},
];
const entryLines=[['我还没想好','方向'],['有目标，','怎么准备？'],['把做过的项目','讲清楚']];

// These states only describe public previews, never the visitor's career or progress.
function useEntrance(ref) {
  const [entered,setEntered]=useState(false);
  useEffect(()=>{
    const node=ref.current;
    if(!node)return;
    const observer=new IntersectionObserver(items=>{
      setEntered(items.some(item=>item.isIntersecting));
    },{rootMargin:'80px 0px',threshold:0});
    observer.observe(node);
    return()=>observer.disconnect();
  },[ref]);
  return [entered,setEntered];
}

export function EntryDeck({link,Icon}) {
  const en=useLanguage()==='en';
  const englishTitles=['I have not chosen a direction','I have a goal. How do I prepare?','Explain the projects I have done'];
  const ref=useRef(null),[entered,setEntered]=useEntrance(ref);
  const [selected,setSelected]=useState(null),[keyboard,setKeyboard]=useState(false),[selectionMotion,setSelectionMotion]=useState(false);
  const note=useRef(null);useContentTransition(note,selected,selected);
  useEffect(()=>setSelectionMotion(false),[entered]);
  return <section id="starting-points" className="entry-section entry-deck-section" aria-labelledby="entry-title">
    <SceneDecor scene="entry"/>
    <header className="section-heading"><h2 id="entry-title" data-i18n="off">{en?'Choose a career, identify gaps, or organize your projects?':<MotionText lines={['选方向、补差距，还是整理项目？']}/>}</h2><p>按你现在的准备情况开始，之后可以随时调整方向和计划。</p></header>
    <div ref={ref} className="entry-deck" data-expanded={entered} data-selection-motion={selectionMotion} data-keyboard={keyboard} data-selected={selected??'none'} onKeyDown={()=>{setKeyboard(true);setEntered(true);}} onPointerDown={()=>setKeyboard(false)} onFocusCapture={()=>setEntered(true)}>
      {entries.map((entry,i)=><article className="problem-card" key={entry.label} data-card={i} data-selected={selected===i}>
        <button className="problem-card-face" aria-label={'选择：'+entry.label} aria-pressed={selected===i} onClick={()=>{setSelectionMotion(true);setSelected(selected===i?null:i);}}>
          <span className="problem-card-top"><span>{entry.label}</span><Icon name={entry.icon} size={24}/></span>
          <span className="problem-card-title" data-i18n="off">{en?englishTitles[i]:entryLines[i].map((line,n)=><React.Fragment key={line}>{n>0&&<br/>}{line}</React.Fragment>)}</span><span className="problem-card-description">{entry.text}</span>
          <span className="problem-card-output"><small>你将整理出</small>{entry.output}</span>
          <span className="problem-pick">{selected===i?'已选取 · 可直接开始':'选择这个起点'}<span aria-hidden="true">↗</span></span>
        </button>
        <div className="problem-card-enter">{link(entry.to,`从${entry.label}开始 →`)}</div>
      </article>)}
    </div>
    <p className="entry-deck-note" ref={note} aria-live="polite">{selected===null?'先选择一种情况，再通过卡片底部入口开始。':`已选：${entries[selected].label}。点卡牌底部入口继续，也可以换一张。`}<span>选择入口不会替你确定职业目标。</span></p>
    <SceneRail/>
  </section>;
}

export {default as JourneyPath} from './ScrollJourney';

export {default as DirectionGallery} from './DirectionGallery';

