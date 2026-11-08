import React,{useState} from 'react';
import ProductIcon from './ProductIcon';
import PlanGoalScheduleItem from './PlanGoalScheduleItem';
import PlanGoalActionItem from './PlanGoalActionItem';
import {displayPublicText,getFormattingLocale} from './i18n/render';
import {authMessage} from './auth-contract';
import {reviewTypes,saveReviewRecord,savedActionText} from './action-cycle-model';
import {operateStageTask,reviewSignature,taskEditDraft} from './plan-stage-model';
import {DetailEditor,DetailField,DetailStats,PlanDetailHeader,StageStorageNote,useEditorListScroll,useInlineReveal} from './PlanDetailShared';

const configs={
 actions:{title:'待行动',subtitle:'把尚未完成的行动推进一步，包含进行中与受阻事项。',list:'行动清单',empty:'当前没有待行动事项。'},
 undated:{title:'待排期',subtitle:'为已制定的目标和未排期行动安排执行日期。',list:'等待安排的计划',empty:'当前没有待排期的目标或行动。'},
 review:{title:'待复查',subtitle:'复查完成记录、受阻事项与已过计划日期的行动。',list:'需要你再看一眼',empty:'当前没有待复查事项。'},
};
const recordDraft=(task,meta,s,view,today)=>({
 mode:view==='undated'?'schedule':view==='review'?'review':'record',base:{taskVersion:task.version||1,planVersion:s.planVersion},
 ...taskEditDraft(task),due:task.due||today,time:meta.time||'',goalId:meta.goalId||'',text:task.mode==='S2'?task.draft||'':task.note||'',contribution:task.contribution||'',selfcheck:!!task.selfcheck,
 result:savedActionText(task),reason:'',next:'',feedback:'',
});

export default function PlanTaskDetail({view,s,tasks,goals=[],today,records,store,storageStatus,update,command,onBack,link}){
 const config=configs[view],GoalItem=view==='actions'?PlanGoalActionItem:PlanGoalScheduleItem,[expanded,setExpanded]=useState(null),[message,setMessage]=useState('');
 const editing=tasks.some(t=>t.id===expanded)||goals.some(g=>g.id===expanded),total=tasks.length+goals.length;
 const listScroll=useEditorListScroll(editing,expanded?`[data-stage-task="${CSS.escape(expanded)}"] .plan-detail-item-toggle,[data-stage-goal="${CSS.escape(expanded)}"] .plan-detail-item-toggle`:undefined);
 const stats=view==='undated'?[["待排期目标",goals.length],["待排期行动",tasks.length]]:view==='review'?[["已完成",tasks.filter(t=>t.completed).length],["受阻",tasks.filter(t=>t.status==='受阻').length],["日期已过",tasks.filter(t=>!t.completed&&t.due&&t.due<today).length]]:[["待开始",tasks.filter(t=>t.status==='待开始').length+goals.filter(g=>g.progress===0).length],["进行中",tasks.filter(t=>t.status==='进行中').length+goals.filter(g=>g.progress>0).length],["受阻",tasks.filter(t=>t.status==='受阻').length]];
 const perform=async(task,type,{base={taskVersion:task.version||1,planVersion:s.planVersion},draft}={})=>{
  const next=operateStageTask(s,task.id,type,{base,draft});
  if(!command||type==='record')update(next);
  else if(type==='schedule'||type==='complete'&&task.mode!=='S2')await command('task.edit',{taskId:task.id,...base,draft:type==='schedule'?draft:{...taskEditDraft(task),status:'完成'},confirmation:'EDIT_TASK'});
  else await command('task.'+type,{taskId:task.id,taskVersion:task.version||1,...(type==='submit'?{confirmation:'SUBMIT_ATTEMPT'}:type==='selfcheck'?{attemptId:task.attempts.at(-1).id,confirmation:'SELF_CHECK_ONLY'}:type==='complete'?{confirmation:'COMPLETE_LIMITED_SCOPE'}:{})});
  return next.tasks.find(t=>t.id===task.id);
 };
 return <>
  <PlanDetailHeader title={config.title} subtitle={config.subtitle} onBack={onBack}/>
  <div className="plan-detail-scroll" data-detail-scroll={view}>
   <StageStorageNote status={storageStatus}/>
   <div className="plan-detail-layout">
    <aside className="plan-detail-summary"><div><p className="plan-detail-period">{config.title}事项</p><div className="plan-detail-progress-number"><strong>{total}</strong><span>项</span></div></div><DetailStats items={stats}/><p className="plan-detail-note">{view==='undated'?'目标截止日期与执行安排分别记录，目标排期保存在本机。':view==='actions'&&goals.length?'已排期目标可在这里记录本人进度，原有任务继续沿用各自的完成条件。':'日期、状态和行动记录沿用现有任务。具体时刻、目标关联与提醒确认保存在本机。'}</p>{view==='undated'&&<div className="plan-detail-highlight"><strong>为目标与行动留出时间</strong><span>确认排期后，可在下方日程查看目标或任务的安排。</span></div>}{view==='review'&&<div className="plan-detail-highlight"><strong>本人复查</strong><span>复查不替代原有提交、自检或成果确认。</span></div>}</aside>
    <div className="plan-detail-main">{!editing&&<div className="plan-detail-toolbar"><h3>{config.list}</h3><span className="plan-detail-pill">{total} 项</span></div>}{message&&!editing&&<p className="plan-detail-message" role="status">{message}</p>}
     <div {...listScroll} className={`plan-detail-list-scroll${editing?' is-editing':''}`} data-list-scroll={view}>
     {!total?<div className="plan-detail-empty"><ProductIcon name={view==='undated'?'calendar':view==='review'?'check':'target'} size={32}/><h3>{config.empty}</h3><p>{view==='undated'?'制定目标后会进入这里，也可从下方创建行动。':'这里会根据现有任务自动更新，已有记录继续保留。'}</p></div>:<ul className={`plan-detail-list plan-task-list${editing?' is-editing':''}`}>{goals.map(goal=><GoalItem key={goal.id} {...{goal,records,store,link}} expanded={expanded===goal.id} hidden={editing&&expanded!==goal.id} onToggle={()=>{setMessage('');setExpanded(expanded===goal.id?null:goal.id);}} onNotice={setMessage}/>)}{tasks.map(task=><TaskDetailItem key={task.id} {...{task,view,s,today,records,store,perform,update}} expanded={expanded===task.id} hidden={editing&&expanded!==task.id} statusMessage={message} onToggle={()=>{setMessage('');setExpanded(expanded===task.id?null:task.id);}} onNotice={setMessage}/>)}</ul>}
     </div>
    </div>
   </div>
  </div>
 </>;
}

function TaskDetailItem({task,view,s,today,records,store,perform,update,expanded,hidden,statusMessage,onToggle,onNotice}){
 const key=view+':'+task.id,meta=records.taskMeta[task.id]||{},draft=records.drafts[key]||null,[error,setError]=useState(''),[busy,setBusy]=useState(false),formRef=useInlineReveal(expanded&&draft?draft.mode:false);
 const setDraft=next=>{setError('');store(prev=>({...prev,drafts:{...prev.drafts,[key]:next}}));};
 const setMeta=patch=>store(prev=>({...prev,taskMeta:{...prev.taskMeta,[task.id]:{...prev.taskMeta[task.id],...patch}}}));
 const toggle=()=>{if(!expanded&&!draft)setDraft(recordDraft(task,meta,s,view,today));onToggle();};
 const baseNow={taskVersion:task.version||1,planVersion:s.planVersion};
 const act=async(type,payload)=>{
  if(busy)return;setBusy(true);setError('');onNotice('');
  try{
   const next=await perform(task,type,payload);
   if(type==='complete'){setMeta({completedAt:new Date().toISOString()});onNotice('已记录任务完成；原有成果与检查记录保留。');}
   else if(type==='schedule'){
    setMeta({time:draft.time,goalId:draft.goalId,...(view==='review'?{review:{signature:reviewSignature(next),decision:'调整',date:new Date().toISOString()}}:{})});
    store(prev=>({...prev,drafts:{...prev.drafts,[key]:null}}));onNotice('排期已更新，可在下方原日程查看。');
   }else{
    if(draft)setDraft({...draft,base:{...baseNow,taskVersion:next.version||1},...(type==='submit'?{selfcheck:false}:{})});
    if(type==='record')setMeta({goalId:draft.goalId});
    onNotice(type==='record'?'行动记录已更新。':type==='submit'?'当前产物已提交为新版本。':type==='selfcheck'?'已记录此版本的本人自检。':'行动已开始，可在此记录实际结果。');
   }
  }catch(e){setError(e.code?authMessage(e.code):e.message);}
  finally{setBusy(false);}
 };
 const approve=e=>{
  e.preventDefault();setError('');
  try{
   if(task.version!==draft.base.taskVersion)throw Error('任务或计划版本已变化，未覆盖原记录；请按当前基线重新预览。');
   const result=saveReviewRecord(s,task.id,{type:task.mode==='S2'?reviewTypes[1]:reviewTypes[0],result:draft.result,reason:draft.reason,next:draft.next,feedback:draft.feedback});
   update(result.state);setMeta({review:{signature:reviewSignature(task),decision:'通过',date:new Date().toISOString()}});store(prev=>({...prev,drafts:{...prev.drafts,[key]:null}}));onNotice('本人复查已记录，原任务完成状态保持。');
  }catch(e){setError(e.message);}
 };
 const goal=records.goals.find(g=>g.id===meta.goalId),completedAt=meta.completedAt||task.completedAt||task.completionReceipt?.createdAt;
 const completionTime=completedAt&&!Number.isNaN(Date.parse(completedAt))?new Intl.DateTimeFormat(getFormattingLocale(),{dateStyle:'short',timeStyle:'short'}).format(new Date(completedAt)):displayPublicText('未记录');
 const goalField=<DetailField label="关联周期目标（本机）"><select aria-label="关联周期目标" value={draft?.goalId||''} onChange={e=>setDraft({...draft,goalId:e.target.value})}><option value="">沿用原计划归属</option>{records.goals.map(g=><option key={g.id} value={g.id} translate="no">{g.title}</option>)}</select></DetailField>;
 const errorMessage=error&&<div className="plan-detail-error" role="alert">{error}{error.includes('版本')&&<button type="button" className="plan-detail-button" onClick={()=>setDraft({...draft,base:baseNow})}>保留输入，采用当前版本</button>}</div>;
 const context=<><h4 translate="no">{task.title}</h4><p translate="no">{task.purpose}</p><p><strong>原交付标准：</strong><span translate="no">{task.standard||displayPublicText('未记录')}</span></p><p>所属目标：<span translate="no">{goal?.title||displayPublicText(task.association||'独立探索')}</span></p>{view==='review'&&<p>完成时间：{completionTime}</p>}{task.completed&&<p>已完成记录保留，调整不会重新开启或覆盖成果。</p>}{task.mode==='S2'&&<p>先保存记录，再提交版本、记录自检并完成任务。</p>}</>;
 const backButton=<button type="button" className="plan-detail-button" onClick={onToggle}>返回清单</button>;
 return <li className={`plan-detail-item${expanded?' is-editing':''}`} data-stage-task={task.id} hidden={hidden}>
  <div className="plan-detail-item-head"><button type="button" className="plan-detail-item-toggle" aria-expanded={expanded} onClick={toggle}><ProductIcon name="chevronDown" size={15}/><span translate="no">{task.title}</span></button><span className="plan-detail-pill" data-state={task.completed?'done':task.status==='受阻'?'blocked':'active'}>{task.status}</span></div>
  <div className="plan-detail-meta"><span className="plan-detail-priority" data-priority={task.priority||'未排序'}>优先级：{task.priority||'未排序'}</span><span>截止日期：{task.due||displayPublicText('未排期')}</span><span>预计 {task.hours??displayPublicText('未记录')} 小时</span><span>所属目标：<span translate="no">{goal?.title||displayPublicText(task.association||'独立探索')}</span></span>{view==='review'&&<span>完成时间：{completionTime}</span>}</div>
  {view==='actions'&&!expanded&&<div className="plan-detail-actions">{task.status!=='进行中'&&<button type="button" className="plan-detail-button is-primary" disabled={busy} onClick={()=>act('start')}>开始执行</button>}<button type="button" className="plan-detail-button" onClick={toggle}>查看与记录</button></div>}
  {view!=='actions'&&!expanded&&<div className="plan-detail-actions"><button type="button" className="plan-detail-button" onClick={toggle}>{view==='undated'?'安排日期与时间':'查看复查内容'}</button></div>}
  {error&&!expanded&&errorMessage}
  {expanded&&draft&&<div ref={formRef} className="plan-task-editor-host">
   {draft.mode==='schedule'?<DetailEditor title={view==='review'?'重新调整':'安排日期与时间'} subtitle={task.title} status={statusMessage} label="模块内排期编辑" context={context} error={errorMessage} actions={<><button type="submit" className="plan-detail-button is-primary" disabled={busy}>确认排期</button>{backButton}</>} onSubmit={e=>{e.preventDefault();act('schedule',{base:draft.base,draft:{title:draft.title,purpose:draft.purpose,hours:Number(draft.hours),due:draft.due,deliveryNote:draft.deliveryNote,status:view==='review'&&!task.completed?'待开始':task.status}});}}>
    <div className="plan-schedule-basics"><DetailField label="行动标题"><input aria-label="排期行动标题" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} required/></DetailField><DetailField label="计划日期"><input aria-label="模块内计划日期" type="date" value={draft.due} onChange={e=>setDraft({...draft,due:e.target.value})} required/></DetailField><DetailField label="计划时间（本机）"><input aria-label="模块内计划时间" type="time" value={draft.time} onChange={e=>setDraft({...draft,time:e.target.value})}/></DetailField><DetailField label="预计耗时（小时）"><input aria-label="模块内预计耗时" type="number" min="0" step="0.5" value={draft.hours} onChange={e=>setDraft({...draft,hours:e.target.value})} required/></DetailField></div>
    <div className="plan-editor-three-fields"><DetailField label="行动目的"><textarea aria-label="排期行动目的" value={draft.purpose} onChange={e=>setDraft({...draft,purpose:e.target.value})} required/></DetailField><DetailField label="补充交付说明"><textarea aria-label="补充交付说明" value={draft.deliveryNote} onChange={e=>setDraft({...draft,deliveryNote:e.target.value})}/></DetailField>{goalField}</div>
   </DetailEditor>:draft.mode==='review'?<DetailEditor title="复查内容" subtitle={task.title} label="模块内复查记录" context={context} error={errorMessage} onSubmit={approve} actions={<><button type="submit" className="plan-detail-button is-gold">确认通过</button><button type="button" className="plan-detail-button" onClick={()=>setDraft({...draft,mode:'schedule'})}>重新调整</button>{backButton}</>}>
    <div className="plan-editor-three-fields plan-review-fields"><DetailField label="实际结果"><textarea aria-label="复查实际结果" value={draft.result} onChange={e=>setDraft({...draft,result:e.target.value})} required/></DetailField><DetailField label="原因分析"><textarea aria-label="复查原因分析" value={draft.reason} onChange={e=>setDraft({...draft,reason:e.target.value})} required/></DetailField><DetailField label="下一步安排"><textarea aria-label="复查下一步安排" value={draft.next} onChange={e=>setDraft({...draft,next:e.target.value})} required/></DetailField></div><p className="plan-detail-note">确认本次实际结果，保留原因和下一步安排。</p>
   </DetailEditor>:<DetailEditor title="本次行动记录" subtitle={task.title} status={statusMessage} label="模块内行动记录" context={context} error={errorMessage} actions={backButton} footerActions={<>{task.status!=='进行中'&&<button type="button" className="plan-detail-button is-primary" disabled={busy} onClick={()=>act('start')}>开始执行</button>}<button type="button" className="plan-detail-button" disabled={busy} onClick={()=>act('record',{base:draft.base,draft:{text:draft.text,contribution:draft.contribution,selfcheck:draft.selfcheck}})}>保存记录</button>{task.mode==='S2'&&<><button type="button" className="plan-detail-button" disabled={busy} onClick={()=>act('submit')}>提交版本</button><button type="button" className="plan-detail-button" disabled={busy} onClick={()=>act('selfcheck')}>记录自检</button></>}<button type="button" className="plan-detail-button is-gold" disabled={busy} onClick={()=>act('complete')}>完成任务</button><button type="button" className="plan-detail-button" onClick={()=>setDraft({...draft,mode:'schedule'})}>编辑安排</button></>}>
    <div className="plan-editor-three-fields"><DetailField label={task.mode==='S2'?'本次产物':'实际行动与结果'}><textarea aria-label="本次行动内容" value={draft.text} maxLength={20000} onChange={e=>setDraft({...draft,text:e.target.value})}/></DetailField><DetailField label="本人贡献"><textarea aria-label="本次本人贡献" value={draft.contribution} onChange={e=>setDraft({...draft,contribution:e.target.value})}/></DetailField>{goalField}</div>
    {task.mode==='S2'&&<div className="plan-record-options"><label className="plan-detail-check"><input type="checkbox" aria-label="我已逐项核对原交付标准，仅记录本人自检范围。" checked={draft.selfcheck} onChange={e=>{const checked=e.target.checked;setDraft({...draft,selfcheck:checked});update({...s,tasks:s.tasks.map(t=>t.id===task.id?{...t,selfcheck:checked}:t)});}}/>已核对原交付标准（本人自检）</label><p className="plan-detail-note">提交版本 {task.attempts?.length||0} · {task.check}</p></div>}
   </DetailEditor>}
  </div>}
 </li>;
}
