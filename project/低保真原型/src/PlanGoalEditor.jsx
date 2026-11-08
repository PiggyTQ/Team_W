import React,{useEffect,useRef,useState} from 'react';
import {blankGoal,periodRange,savePeriodGoal} from './plan-stage-model';
import {DetailField} from './PlanDetailShared';
import ControlIcon from './ControlIcon';

export default function PlanGoalEditor({period,today,records,store,onSaved,onClose}){
 const range=periodRange(period,today),draftKey=period+'-goal',draft=records.drafts[draftKey]||blankGoal(period,today);
 const [error,setError]=useState(''),dialogRef=useRef(null);
 useEffect(()=>{
  const origin=document.activeElement,dialog=dialogRef.current,overflow=document.documentElement.style.overflow;
  dialog.showModal();dialog.querySelector('input')?.focus({preventScroll:true});document.documentElement.style.overflow='hidden';
  return()=>{dialog.close();document.documentElement.style.overflow=overflow;if(origin?.isConnected)origin.focus({preventScroll:true});};
 },[]);
 const setDraft=next=>{setError('');store(prev=>({...prev,drafts:{...prev.drafts,[draftKey]:next}}));};
 const keepFocus=e=>{if(e.key!=='Tab')return;const controls=[...dialogRef.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[href]')].filter(el=>el.getClientRects().length),first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};
 const save=e=>{e.preventDefault();try{const persisted=store(prev=>{const next=savePeriodGoal(prev,period,today,{...draft,progress:draft.id?draft.progress:0});return{...next,drafts:{...next.drafts,[draftKey]:null}};});setError('');onSaved(persisted,!draft.id);}catch(e){setError(e.message);}};
 return <dialog ref={dialogRef} className="goal-manager-dialog" aria-labelledby="goal-manager-dialog-title" onKeyDown={keepFocus} onCancel={e=>{e.preventDefault();onClose();}}>
  <form className="goal-manager-form" aria-label="周期目标编辑" onSubmit={save}>
      <div className="goal-manager-panel-heading"><h2 id="goal-manager-dialog-title">{draft.id?'编辑目标':'新增目标'}</h2><button type="button" className="goal-manager-button goal-manager-close" aria-label="关闭目标窗口" onClick={onClose}><ControlIcon name="close" size={18}/></button></div>
      {!draft.id&&<p className="goal-manager-form-hint">制定后会显示在“待排期”，再安排具体执行时间。</p>}
      {error&&<p className="goal-manager-error" role="alert">{error}</p>}
      <div className={`goal-manager-fields${draft.id?' is-editing':''}`}>
       <DetailField label="目标名称"><input aria-label="目标名称" value={draft.title} maxLength={160} onChange={e=>setDraft({...draft,title:e.target.value})} required/></DetailField>
       <DetailField label="优先级"><select aria-label="目标优先级" value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}>{['高','中','低'].map(x=><option key={x}>{x}</option>)}</select></DetailField>
       <DetailField label="截止日期"><input aria-label="目标截止日期" type="date" min={range.start} max={range.end} value={draft.due} onChange={e=>setDraft({...draft,due:e.target.value})} required/></DetailField>
       {draft.id&&<DetailField label="完成进度（%）"><input aria-label="目标完成进度" type="number" min="0" max="100" value={draft.progress} onChange={e=>setDraft({...draft,progress:e.target.value})} required/></DetailField>}
      </div>
      <div className={`plan-goal-notes${period==='year'?' has-milestones':''}`}><DetailField label="目标说明"><textarea aria-label="目标说明" value={draft.notes} maxLength={4000} onChange={e=>setDraft({...draft,notes:e.target.value})}/></DetailField>
       {period==='year'&&<DetailField label="关键里程碑（每行一项）"><textarea aria-label="关键里程碑" value={draft.milestoneText} maxLength={4000} onChange={e=>setDraft({...draft,milestoneText:e.target.value})}/></DetailField>}
      </div>
      <div className="goal-manager-form-actions"><button type="submit" className="goal-manager-button is-primary">{draft.id?'保存目标到本机':'保存并加入待排期'}</button><button type="button" className="goal-manager-button" onClick={()=>{setDraft(null);onClose();}}>取消编辑</button></div>
 </form></dialog>;
}
