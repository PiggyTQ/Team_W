import React,{useEffect,useRef,useState} from 'react';
import ProductIcon from './ProductIcon';
import ControlIcon from './ControlIcon';
import SegmentedControl from './SegmentedControl';
import PlanGoalEditor from './PlanGoalEditor';
import {StageStorageNote} from './PlanDetailShared';
import {blankGoal,deletePeriodGoal,editableGoal,goalEditorUrl,goalPeriods,periodGoals,periodRange,savePeriodGoal} from './plan-stage-model';
import {goalRecommendations} from './goal-recommendations';
import {displayPublicText,getFormattingLocale} from './i18n/render';
import './plan-goal-editor.css';

export default function PlanGoalEditorPage({s,open,link,today,period:requestedPeriod,records,store,storageStatus}){
 const period=goalPeriods.some(p=>p.id===requestedPeriod)?requestedPeriod:'week',config=goalPeriods.find(p=>p.id===period),goals=periodGoals(records,period,today),range=periodRange(period,today),draftKey=period+'-goal';
 const [pendingDelete,setPendingDelete]=useState(null),[message,setMessage]=useState(''),[error,setError]=useState(''),[editorPeriod,setEditorPeriod]=useState(null),[showPendingLink,setShowPendingLink]=useState(false),deleteOrigin=useRef(null),addButton=useRef(null);
 useEffect(()=>{const heading=document.querySelector('.screen-heading h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}},[]);
 useEffect(()=>{setPendingDelete(null);setMessage('');setError('');setEditorPeriod(null);setShowPendingLink(false);},[period]);
 const caption=period==='week'?`${range.start} — ${range.end}`:new Intl.DateTimeFormat(getFormattingLocale(),period==='month'?{year:'numeric',month:'long'}:{year:'numeric'}).format(new Date(today+'T12:00:00'));
 const edit=draft=>{setPendingDelete(null);setMessage('');setError('');setShowPendingLink(false);store(prev=>({...prev,drafts:{...prev.drafts,[draftKey]:draft}}));setEditorPeriod(period);};
 const saved=(persisted,isNew=true)=>{setMessage(isNew?(persisted?'目标已保存，并加入待排期。':'目标已加入待排期，本次改动暂未写入本机。'):(persisted?'目标已保存在本机。':'目标已更新，本次改动暂未写入本机。'));setShowPendingLink(isNew);setPendingDelete(null);setError('');setEditorPeriod(null);};
 const join=recommendation=>{try{const persisted=store(prev=>{
  if(periodGoals(prev,period,today).some(goal=>goal.recommendationId===recommendation.id))return prev;
  return savePeriodGoal(prev,period,today,{...blankGoal(period,today),title:displayPublicText(recommendation.title),notes:displayPublicText(recommendation.notes),milestoneText:displayPublicText(recommendation.milestoneText||''),recommendationId:recommendation.id});
 });saved(persisted);}catch(e){setError(e.message);}};
 const remove=()=>{try{const persisted=store(prev=>deletePeriodGoal(prev,period,today,pendingDelete));setPendingDelete(null);setError('');setMessage(persisted?'目标已删除。':'目标已删除，本次改动暂未写入本机。');addButton.current?.focus({preventScroll:true});}catch(e){setError(e.message);}};
 return <section className="goal-manager" aria-label="目标编辑">
  <div className="goal-manager-navigation">{link('/plan',<><ControlIcon name="arrow" size={16}/>返回目标与行动计划</>,'goal-manager-back')}</div>
  <div className="goal-manager-periods"><SegmentedControl aria-label="目标周期">{goalPeriods.map(item=>React.cloneElement(link(goalEditorUrl(item.id),<>{item.label}<span className="goal-manager-count">{periodGoals(records,item.id,today).length}</span></>),{key:item.id,'aria-current':item.id===period?'page':undefined}))}</SegmentedControl><span className="goal-manager-local">本机目标</span></div>
  <StageStorageNote status={storageStatus}/>
  <div className="goal-manager-period-heading"><div><h2>{config.title}</h2><p>{caption}</p></div>{link(`/plan?goalView=${period}`,'查看目标 →','goal-manager-preview')}</div>
  {message&&<p className="goal-manager-message" role="status">{message}{showPendingLink&&link('/plan/schedule','查看待排期 →','goal-manager-pending-link')}</p>}
  {error&&<p className="goal-manager-error" role="alert">{error}</p>}
  <div className="goal-manager-layout">
   <section className="goal-manager-list-panel" aria-label="目标清单"><div className="goal-manager-panel-heading"><h2>目标清单</h2><button ref={addButton} type="button" className="goal-manager-button" onClick={()=>edit(!records.drafts[draftKey]?.id&&records.drafts[draftKey]||blankGoal(period,today))}><ControlIcon name="plus" size={16}/>新增目标</button></div>
    {!goals.length?<div className="goal-manager-empty"><ProductIcon name="target" size={38}/><h3>您当前没有指定目标</h3><p>点击“新增目标”制定目标，也可一键加入右侧推荐。</p></div>:<ul className="goal-manager-list">{goals.map(goal=><li key={goal.id} data-managed-goal={goal.id} data-editing={editorPeriod===period&&records.drafts[draftKey]?.id===goal.id?'true':undefined}>
     <div className="goal-manager-goal-heading"><h3 translate="no">{goal.title}</h3><span className="goal-manager-state" data-done={goal.progress===100}>{goal.progress===100?'已完成':goal.progress>0?'进行中':'未开始'}</span></div>
     <div className="goal-manager-meta"><span>优先级：{goal.priority}</span><span>截止日期：<time>{goal.due}</time></span></div>
     <div className="goal-manager-progress"><progress aria-label={`${displayPublicText('目标完成进度')} ${goal.progress}%`} max="100" value={goal.progress}/><span>{goal.progress}%</span></div>
     {goal.notes&&<p className="goal-manager-goal-notes" translate="no">{goal.notes}</p>}
     {goal.milestones.length>0&&<p className="goal-manager-meta">关键里程碑：{goal.milestones.filter(m=>m.done).length} / {goal.milestones.length}</p>}
     <div className="goal-manager-goal-actions">{link('/plan/schedule?goal='+encodeURIComponent(goal.id),'去排期','goal-manager-button')}<button type="button" className="goal-manager-button" onClick={()=>edit(editableGoal(goal))}>编辑</button><button type="button" className="goal-manager-button is-delete" onClick={e=>{deleteOrigin.current=e.currentTarget;setError('');setPendingDelete({id:goal.id,version:goal.version});}}>删除</button></div>
     {pendingDelete?.id===goal.id&&<div className="goal-manager-delete-confirm" role="group" aria-label="删除目标确认"><p>确认删除这个目标？关联计划会保留，并解除与该目标的关联。</p><div className="goal-manager-goal-actions"><button type="button" autoFocus className="goal-manager-button is-delete" onClick={remove}>确认删除</button><button type="button" className="goal-manager-button" onClick={()=>{setPendingDelete(null);setError('');deleteOrigin.current?.focus({preventScroll:true});}}>取消删除</button></div></div>}
    </li>)}</ul>}
   </section>
   <section className="goal-manager-recommendations" aria-label="推荐加入的目标">
    <div className="goal-manager-panel-heading"><h2>推荐加入的目标</h2></div><p className="goal-manager-recommendation-hint">通用目标建议，加入后可按需编辑。</p>
    <ul className="goal-manager-recommendation-list">{goalRecommendations[period].map(item=>{const joined=goals.some(goal=>goal.recommendationId===item.id);return <li key={item.id} data-recommended-goal={item.id}><div><h3>{item.title}</h3><p>{item.notes}</p><span className="goal-manager-meta">截止日期：<time>{range.end}</time></span></div><button type="button" className="goal-manager-button" disabled={joined} onClick={()=>join(item)}><ControlIcon name={joined?'check':'plus'} size={15}/>{joined?'已加入':'一键加入'}</button></li>;})}</ul>
   </section>
  </div>
  {editorPeriod===period&&<PlanGoalEditor key={period} {...{period,today,records,store}} onSaved={saved} onClose={()=>setEditorPeriod(null)}/>}
  <details className="goal-manager-career"><summary>职业方向与预览</summary><p>职业方向调整沿用原有预览与确认流程。</p><button type="button" className="goal-manager-button" onClick={()=>open('goal',{goal:s.goal||'data',backup:s.backup||'',reason:s.decision.reason})}>预览职业目标调整</button></details>
 </section>;
}
