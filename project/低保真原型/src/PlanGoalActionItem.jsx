import React,{useState} from 'react';
import ProductIcon from './ProductIcon';
import {displayPublicText} from './i18n/render';
import {goalPeriods,updateGoalProgress} from './plan-stage-model';
import {DetailEditor,DetailField,useInlineReveal} from './PlanDetailShared';

export default function PlanGoalActionItem({goal,records,store,link,expanded,hidden,onToggle,onNotice}){
 const key='action-goal:'+goal.id,draft=records.drafts[key],[error,setError]=useState(''),formRef=useInlineReveal(expanded&&!!draft);
 const setDraft=next=>{setError('');store(prev=>({...prev,drafts:{...prev.drafts,[key]:next}}));};
 const toggle=()=>{if(!expanded&&!draft)setDraft({version:goal.version,progress:goal.progress});onToggle();};
 const scheduleUrl='/plan/schedule?goal='+encodeURIComponent(goal.id);
 const scheduleLink=link?link(scheduleUrl,'调整排期','plan-detail-button'):<a href={scheduleUrl} className="plan-detail-button">调整排期</a>;
 const save=e=>{e.preventDefault();try{
  if(draft.progress==='')throw Error('请填写 0–100 的本人目标进度。');
  const persisted=store(prev=>{const next=updateGoalProgress(prev,goal.id,Number(draft.progress),draft.version);return{...next,drafts:{...next.drafts,[key]:null}};});
  onToggle();onNotice(persisted?'本人目标进度已保存。':'本人目标进度已更新，本次改动暂未写入本机。');
 }catch(e){setError(e.message);}};
 return <li className={`plan-detail-item${expanded?' is-editing':''}`} data-stage-goal={goal.id} data-action-goal={goal.id} hidden={hidden}>
  <div className="plan-detail-item-head"><button type="button" className="plan-detail-item-toggle" aria-expanded={expanded} onClick={toggle}><ProductIcon name="chevronDown" size={15}/><span translate="no">{goal.title}</span></button><span className="plan-detail-pill">{goal.progress>0?'进行中':'待开始'}</span></div>
  <div className="plan-detail-meta"><span>{goalPeriods.find(item=>item.id===goal.period)?.label}</span><span>计划日期：{goal.schedule.date}</span><span>{goal.schedule.time||displayPublicText('时间待定')}</span><span>截止日期：{goal.due}</span></div>
  {!expanded&&<div className="plan-goal-card-bottom"><div className="plan-goal-progress"><progress aria-label={`${displayPublicText('本人目标进度')} ${goal.progress}%`} max="100" value={goal.progress}/><span>{goal.progress}%</span></div><div className="plan-detail-actions"><button type="button" className="plan-detail-button" onClick={toggle}>记录目标进度</button>{scheduleLink}</div></div>}
  {expanded&&draft&&<div ref={formRef} className="plan-task-editor-host"><DetailEditor title="记录目标进度" subtitle={goal.title} label="目标进度记录" onSubmit={save} error={error&&<div className="plan-detail-error" role="alert">{error}{error.includes('已变化')&&<button type="button" className="plan-detail-button" onClick={()=>setDraft({...draft,version:goal.version})}>保留输入，采用当前版本</button>}</div>} actions={<><button type="submit" className="plan-detail-button is-primary">保存目标进度</button><button type="button" className="plan-detail-button" onClick={onToggle}>返回清单</button></>}>
   <div className="plan-editor-three-fields"><DetailField label="本人目标进度（%）"><input aria-label="本人目标进度" type="number" min="0" max="100" value={draft.progress} onChange={e=>setDraft({...draft,progress:e.target.value})} required/></DetailField></div>
   <p className="plan-detail-note">进度由本人记录，不会改变关联任务的完成状态或核验结果。</p>
   {goal.notes&&<p className="plan-detail-note" translate="no">{goal.notes}</p>}
   <div className="plan-detail-actions">{scheduleLink}</div>
  </DetailEditor></div>}
 </li>;
}
