import React,{useState,useEffect} from 'react';
import {SERVER_AUTH} from './auth-client';
import {careers} from './model';
import {assessmentHub,hubSections,hubSectionForTab,assessmentEntryLink} from './assessment-hub-model';
import {ProfileEvidenceArchive} from './ProfileInsights';
import InterestAssessment from './InterestAssessment';
import {getInterestGroup,getInterestType} from './interest-assessment-model';
import DetailDrawer from './DetailDrawer';
import './assessment-disclosure.css';
import HomeCapabilityIcon from './HomeCapabilityIcon';
import BackgroundFolders from './BackgroundFolders';
import AssessmentRecommendations from './AssessmentRecommendations';
import {assessmentRecommendations} from './assessment-recommendations.js';
import CapabilityPuzzle from './CapabilityPuzzle';
import {setCapabilityMastery} from './capability-puzzle-model';
export default function AssessmentHub({s,tab,hash,update,link,go,reviewReceipt,analysis,renderManual,renderImport,renderExperience}){
 const data=assessmentHub(s),p=data.profile,personality=getInterestType(s.preferences?.interestType),interest=personality?.group||getInterestGroup(s.preferences?.interestGroup),target=hubSectionForTab(tab);
 const recommendation=assessmentRecommendations(s,{snapshot:data.snapshot});
 const {ability}=recommendation;
 const snapshotStatus={
  current:s.analysis?.catalogVersion?'已有规则对照快照':'已有模拟快照',
  other:'快照属于另一个职业方向，请更新。',
  unavailable:'快照材料或来源已不可用。',
  stale:'依据已变更，请更新快照。',
 }[data.snapshot];
 const [expanded,setExpanded]=useState({profile:target==='profile'&&hash==='#profile-evidence',analysis:target==='analysis'});
 const targetExpanded=expanded[target];
 const [jumpRequest,setJumpRequest]=useState(0),[archiveRequested,setArchiveRequested]=useState(false),[careerOpen,setCareerOpen]=useState(false);
 useEffect(()=>{
  setCareerOpen(false);
  if(target==='profile'||target==='analysis'){
   setExpanded(value=>({...value,[target]:target==='analysis'||hash==='#profile-evidence'}));
  }
 },[target,hash]);
 useEffect(()=>{
  if(!target||(target==='analysis'&&!targetExpanded))return;
  let inner;
  const frame=requestAnimationFrame(()=>{
   inner=requestAnimationFrame(()=>{
    let anchor;
    try{anchor=decodeURIComponent((hash||'').slice(1));}catch{}
    const element=document.getElementById(anchor)||document.getElementById(hubSections[target].id);
    if(!element)return;
    if(!element.hasAttribute('tabindex'))element.tabIndex=-1;
    element.scrollIntoView({block:'start'});
    element.focus({preventScroll:true});
   });
  });
  return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(inner);};
 },[target,targetExpanded,hash,jumpRequest]);
 useEffect(()=>{if(!archiveRequested||!expanded.profile)return;let inner;const frame=requestAnimationFrame(()=>{inner=requestAnimationFrame(()=>{const el=document.getElementById('profile-evidence');if(el){el.tabIndex=-1;el.scrollIntoView({block:'start'});el.focus({preventScroll:true});}setArchiveRequested(false);});});return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(inner);};},[archiveRequested,expanded.profile]);
 const jump=(key,label,cls)=>{
  const section=hubSections[key],anchor=link('/assessment?tab='+section.tab+'#'+section.id,label,cls);
  return React.cloneElement(anchor,{onClick:event=>{
   if(!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&event.button===0){
    setJumpRequest(value=>value+1);
    if(key==='analysis')setExpanded(value=>({...value,analysis:true}));
   }
   anchor.props.onClick(event);
  }});
 };
 const jumpCard=(key,icon,title,detail)=>jump(key,<><span className="hub-jump-icon" aria-hidden="true"><HomeCapabilityIcon name={icon} size={28}/></span><span>{title}</span><small>{detail}</small></>);
 const localLink=(to,label,cls)=>link(assessmentEntryLink(to),label,cls);
 const toggle=(key)=>setExpanded(value=>({...value,[key]:!value[key]}));
 return <div className="assessment-hub"><section className="hub-next" aria-label="本次优先行动"><div><h2>{data.next.title}</h2></div><img className="hub-peeking-cheese" src="/illustrations/workbench/peeking-cheese.png" alt="" aria-hidden="true"/>{link(data.next.to,data.next.action,'button primary')}</section>
 <nav className="assessment-hub-jumps" aria-label="准备总览区块">
 {jumpCard('review','preparation','背景评估',<>{p.pending.length} 项待核对 · {p.facts.length} 项已确认</>)}
 {jumpCard('profile','reports','爱好评估',interest?<>已选偏好 · {personality?.id||interest.id}</>:'待选择偏好')}
 {jumpCard('analysis','plan','能力评估',ability.recordedCount?<>已自评技能 · {ability.recordedCount}</>:ability.ready?'已有可用的能力对照':'待记录技能自评')}
 {jumpCard('recommendation','opportunities','综合评估',recommendation.status==='ready'?'查看推荐职业':'查看评估进度')}
 </nav>
 <section className="hub-section hub-review background-assessment" id="assessment-review" tabIndex={-1} aria-labelledby="hub-review-title">
 <header><h2 id="hub-review-title">背景评估</h2></header>
 <BackgroundFolders claims={s.claims} renderExperience={renderExperience} renderManual={renderManual} renderImport={renderImport} go={go} link={link} routeKey={tab+(hash||'')} live={SERVER_AUTH}/>
 {reviewReceipt}
 </section>
 <section className="hub-section hub-profile" id="assessment-profile" tabIndex={-1} aria-label="爱好评估">
 <InterestAssessment preferences={s.preferences} onChange={preference=>update({preferences:{...s.preferences,...preference}})} link={link}/>
 <button className="hub-text-action" type="button" aria-expanded={expanded.profile} onClick={()=>{if(!expanded.profile)setArchiveRequested(true);toggle('profile');}}>{expanded.profile?'收起材料与成果档案':'查看材料与成果档案'}</button>
 {expanded.profile&&<div className="profile-insight"><ProfileEvidenceArchive s={s} link={localLink}/></div>}
 </section>
 <section className="hub-section hub-analysis" id="assessment-analysis" tabIndex={-1} aria-labelledby="hub-analysis-title"><header><h2 id="hub-analysis-title">能力评估</h2><button type="button" aria-expanded={expanded.analysis} onClick={()=>toggle('analysis')}>{expanded.analysis?'收起模拟评估':'展开模拟评估'}</button></header>
 <div className="hub-direction"><label className="field"><span>对照职业范围</span><select aria-label="对照职业范围" value={p.career.id} onChange={e=>update({assessmentCareer:e.target.value,analysisStale:!!s.analysis})}>{careers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
 <CapabilityPuzzle careerId={p.career.id} preferences={s.preferences} onChange={(skill,mastered)=>update(previous=>({...previous,preferences:setCapabilityMastery(previous.preferences,skill,mastered)}))}/>
 <div className="capability-support-row"><details className="hub-capability-gaps"><summary>查看材料缺口与下一步</summary><div className="hub-gap-layout hub-gap-focused"><div><ul className="hub-gap-list">{p.gaps.length?p.gaps.slice(0,3).map(g=><li key={g.id}><div><h4>{g.title}</h4><p>{g.detail}</p></div>{localLink(g.to,g.action+' →')}</li>):<li>{link('/plan','查看下一项行动 →')}</li>}</ul></div></div></details>
 <div className="hub-detail-actions"><button type="button" aria-haspopup="dialog" aria-expanded={careerOpen} onClick={()=>setCareerOpen(true)}>查看职业要求与产物</button></div></div>{snapshotStatus&&<p className="hub-snapshot-state" role="status">{snapshotStatus}</p>}{expanded.analysis&&<div className="hub-expanded">{analysis}</div>}
 </section>
 <AssessmentRecommendations result={recommendation} section={hubSections.recommendation} jump={jump} link={link}/>
 {careerOpen&&<DetailDrawer title="职业要求与产物" onClose={()=>setCareerOpen(false)}><div className="hub-career-brief"><h3>这个方向要做什么？</h3><p>{p.career.task}</p><h3>可以准备的产物</h3><p>{p.career.output||p.career.product||p.career.skill+'相关任务的过程与产物'}</p><p>关联技能：{p.career.skill} · {p.related.length?'已有确认材料':'尚无对应确认材料'}</p>{link('/learning?career='+p.career.id,'选择一次学习实践 →')}</div></DetailDrawer>}</div>;
}
