import React,{useEffect,useRef,useState} from 'react';
import {MotionText} from './HomeMotion';
import {SceneDecor,CheeseMascot} from './HomeSceneDesign';
import ExplorationDrawing from './ExplorationDrawing';
import DetailedJourneyArt from './DetailedJourneyArt';

const steps=[
  {title:'了解职业方向',out:'职业比较 + 探索问题',detail:'了解职业的日常工作、协作方式和常见成果，比较你愿意尝试的方向。',example:0,icon:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M16 8l-3 5-5 3 3-5Z'},
  {title:'分析准备差距',out:'已有经历 + 待补内容',detail:'用课程、项目和实习经历对照职业要求，分清已具备相关材料、需要补充和暂时无法判断的部分。',example:2,icon:'M6 3h9l4 4v14H5V3 M14 3v5h5 M8 12l2 2 4-4 M8 18h7'},
  {title:'安排学习实践',out:'每周任务 + 项目成果',detail:'按每周可投入时间安排学习和项目，记录完成的作品、收到的反馈和遇到的困难。',example:3,icon:'M5 5h14v16H5Z M8 2v6 M16 2v6 M5 10h14 M8 14h3 M8 17h7'},
  {title:'整理成果报告',out:'选择理由 + 职业报告',detail:'把职业选择、实践成果和复盘整理成报告，为下一阶段准备提供参考。',example:4,icon:'M5 3h10l4 4v14H5Z M14 3v5h5 M8 12h8 M8 16h8 M8 19h5'},
];

function StageArtifact({index}){
  return <div className={'sj-artifact sj-artifact-'+index}>
    <span className="sj-artifact-label">会留下什么</span>
    {index===0?<><div className="sj-choices"><span>方向 A</span><span>方向 B</span></div><p>日常任务 · 典型产物</p><div className="sj-artifact-bottom">留下一个想验证的问题</div></>:
    index===1?<><div className="sj-evidence-row"><span>本人贡献</span><span>材料出处</span></div><div className="sj-evidence-row"><span>已有支持</span><span>仍然未知</span></div><div className="sj-artifact-bottom">把依据与未知分别记录</div></>:
    index===2?<><div className="sj-action-row"><span aria-hidden="true">□</span><span>安排可承受的投入</span></div><div className="sj-action-row"><span aria-hidden="true">□</span><span>形成产物，记录限制</span></div><div className="sj-artifact-bottom">先做一次小范围尝试</div></>:
    <><div className="sj-report-lines"><span>选择理由</span><span>行动与成果</span><span>下一步</span></div><div className="sj-artifact-bottom">保留版本，继续调整</div></>}
  </div>;
}

export default function ScrollJourney({open}){
 const host=useRef(null),stage=useRef(null),geometry=useRef({pinned:false,range:0,top:0});
 const [active,setActive]=useState(0),[pinned,setPinned]=useState(false);
 useEffect(()=>{
  const section=host.current,panel=stage.current;
  const media=matchMedia('(min-width: 900px) and (min-height: 600px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  let frame=0;
  const render=()=>{frame=0;const g=geometry.current;if(!g.pinned)return;const position=Math.max(0,Math.min(3,(g.top-section.getBoundingClientRect().top)/g.range*3));setActive(previous=>Math.round(position)===previous?previous:Math.round(position));};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
  const measure=()=>{const enabled=media.matches,range=Math.round(innerHeight*1.65);section.dataset.journeyMode=enabled?'scroll':'list';section.dataset.snapRange=enabled?String(range):'';section.dataset.snapTop='0';section.dataset.snapCount='4';section.style.height=enabled?`${innerHeight+range}px`:'';panel.style.top='0px';geometry.current={pinned:enabled,range,top:0};setPinned(enabled);schedule();};
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',measure);media.addEventListener('change',measure);measure();
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',measure);media.removeEventListener('change',measure);};
 },[]);
 const select=index=>{const next=Math.max(0,Math.min(3,index)),g=geometry.current;setActive(next);if(g.pinned){scrollTo({top:scrollY+host.current.getBoundingClientRect().top+g.range*next/3,behavior:'instant'});}else{host.current.querySelector(`[data-spread-step="${next}"]`)?.scrollIntoView({block:'center',behavior:'instant'});}};
 return <section id="how" className="landing-section scroll-journey journey-spread" ref={host} data-journey-mode="list" data-active-step={active} aria-labelledby="journey-title" onKeyDownCapture={event=>{event.currentTarget.dataset.sceneInput='keyboard';}} onPointerDownCapture={event=>{event.currentTarget.dataset.sceneInput='pointer';}}>
  <div className="sj-stage" ref={stage}>
   <SceneDecor scene="journey" pose={active}/>
   <header className="section-heading"><div><h2 id="journey-title"><MotionText lines={['从“了解一份工作”到“做出自己的成果”']}/></h2><p>每一步，都为下一步留下依据。也可以直接选择阶段。</p></div><CheeseMascot pose={active} className="journey-header-mascot"/><a href="#directions">继续看工作方向 ↓</a></header>
   <div className="journey-spread-layout">
    <nav className="spread-index" aria-label="直接选择流程阶段">{steps.map((item,i)=><button key={item.title} aria-label={'跳到'+item.title} aria-pressed={active===i} onClick={()=>select(i)}><span className="spread-step-number">0{i+1}</span><span><span className="spread-step-title">{item.title}</span><small>{item.out}</small></span><span aria-hidden="true">↗</span></button>)}</nav>
    <div className="spread-plates" tabIndex={0} role="region" aria-label="滚动流程路径，左右方向键切换节点" onKeyDown={event=>{if(event.target!==event.currentTarget)return;const next={ArrowLeft:active-1,ArrowRight:active+1,Home:0,End:3}[event.key];if(next!==undefined){event.preventDefault();select(next);}}}>
     {steps.map((item,i)=><article key={item.title} className="spread-plate" data-spread-step={i} data-active={active===i} hidden={pinned&&active!==i}>
      <header><h3>{item.out}</h3><span>0{i+1} / 04</span></header>
      <div className="cheese-drawing-wrap"><ExplorationDrawing stage={i}/><CheeseMascot pose={i} className="journey-paper-mascot"/><DetailedJourneyArt stage={i}/></div>
      <div className="spread-caption"><StageArtifact index={i}/><div className="spread-description"><p>{item.detail}</p><button onClick={()=>open('example',{step:item.example})}>查看这一段合成示例 <span aria-hidden="true">↗</span></button></div></div>
     </article>)}
    </div>
   </div>
   <div className="sj-bottom"><small>流程与产物示意，不是你的完成进度；可以返回补充。</small><div><button aria-label="上一个流程节点" disabled={active===0} onClick={()=>select(active-1)}>←</button><button aria-label="下一个流程节点" disabled={active===3} onClick={()=>select(active+1)}>→</button></div></div>
  </div>
 </section>;
}
