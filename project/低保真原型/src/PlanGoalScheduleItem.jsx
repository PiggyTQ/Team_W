import React,{useState} from 'react';
import ProductIcon from './ProductIcon';
import {displayPublicText} from './i18n/render';
import {goalPeriods,schedulePeriodGoal} from './plan-stage-model';
import {DetailEditor,DetailField,useInlineReveal} from './PlanDetailShared';

export default function PlanGoalScheduleItem({goal,records,store,expanded,hidden,onToggle,onNotice}){
 const key='schedule-goal:'+goal.id,draft=records.drafts[key], [error,setError]=useState(''),formRef=useInlineReveal(expanded&&!!draft);
 const setDraft=next=>{setError('');store(prev=>({...prev,drafts:{...prev.drafts,[key]:next}}));};
 const toggle=()=>{if(!expanded&&!draft)setDraft({version:goal.version,date:'',time:''});onToggle();};
 const save=e=>{e.preventDefault();try{
  if(!draft.date)throw Error('请选择目标计划日期。');
  const persisted=store(prev=>{const next=schedulePeriodGoal(prev,{id:goal.id,version:draft.version},draft);return{...next,drafts:{...next.drafts,[key]:null}};});
  onNotice(persisted?'目标排期已保存，可在下方日程查看。':'目标排期已更新，本次改动暂未写入本机。');
 }catch(e){setError(e.message);}};
 return <li className={`plan-detail-item${expanded?' is-editing':''}`} data-stage-goal={goal.id} hidden={hidden}>
  <div className="plan-detail-item-head"><button type="button" className="plan-detail-item-toggle" aria-expanded={expanded} onClick={toggle}><ProductIcon name="chevronDown" size={15}/><span translate="no">{goal.title}</span></button><span className="plan-detail-pill">{goalPeriods.find(item=>item.id===goal.period)?.label}</span></div>
  <div className="plan-detail-meta"><span>优先级：{goal.priority}</span><span>截止日期：{goal.due}</span><span>待排期</span></div>
  {!expanded&&<div className="plan-detail-actions"><button type="button" className="plan-detail-button" onClick={toggle}>安排目标日期与时间</button></div>}
  {expanded&&draft&&<div ref={formRef} className="plan-task-editor-host"><DetailEditor title="安排目标日期与时间" subtitle={goal.title} label="目标排期编辑" onSubmit={save} error={error&&<div className="plan-detail-error" role="alert">{error}{error.includes('已变化')&&<button type="button" className="plan-detail-button" onClick={()=>setDraft({...draft,version:goal.version})}>保留输入，采用当前版本</button>}</div>} actions={<><button type="submit" className="plan-detail-button is-primary">确认目标排期</button><button type="button" className="plan-detail-button" onClick={onToggle}>返回清单</button></>}>
   <p className="plan-detail-note">截止日期：{goal.due}。计划日期用于安排目标，截止日期保持不变。</p>
   <div className="plan-editor-three-fields"><DetailField label="目标计划日期"><input aria-label="目标计划日期" type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})} required/></DetailField><DetailField label="目标计划时间（可选）"><input aria-label="目标计划时间" type="time" value={draft.time} onChange={e=>setDraft({...draft,time:e.target.value})}/></DetailField></div>
   <p className="plan-detail-note" translate="no">{goal.notes||displayPublicText('可按目标选择合适的执行日期，时间可稍后补充。')}</p>
  </DetailEditor></div>}
 </li>;
}
