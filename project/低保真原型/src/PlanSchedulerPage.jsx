import React,{useEffect,useState} from 'react';
import ControlIcon from './ControlIcon';
import ProductIcon from './ProductIcon';
import {StageStorageNote} from './PlanDetailShared';
import {activePlanTask,goalPeriods,operateStageTask,schedulePeriodGoal,taskEditDraft} from './plan-stage-model';
import {authMessage} from './auth-contract';
import {displayPublicText} from './i18n/render';
import './plan-scheduler.css';

export default function PlanSchedulerPage({s,records,store,storageStatus,update,command,link,goalId,taskId}){
 const items=[...records.goals.map(goal=>({id:goal.id,kind:'goal',record:goal,date:goal.schedule?.date||'',time:goal.schedule?.time||'',active:goal.progress<100})),...s.tasks.filter(activePlanTask).map(task=>({id:task.id,kind:'task',record:task,date:task.due||'',time:records.taskMeta[task.id]?.time||'',active:true}))];
 const requested=goalId?'goal:'+goalId:taskId?'task:'+taskId:'',find=key=>items.find(item=>item.kind+':'+item.id===key),initial=find(requested)||items.find(item=>item.active&&!item.date)||items.find(item=>item.active);
 const [selected,setSelected]=useState(initial?initial.kind+':'+initial.id:''),[filter,setFilter]=useState(initial?.date?'scheduled':'pending'),[query,setQuery]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[savedDate,setSavedDate]=useState('');
 useEffect(()=>{const heading=document.querySelector('.screen-heading h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}},[]);
 useEffect(()=>{const next=find(requested)||items.find(item=>item.active&&!item.date)||items.find(item=>item.active);setSelected(next?next.kind+':'+next.id:'');setFilter(next?.date?'scheduled':'pending');setQuery('');setMessage('');setError('');},[requested]);
 const item=find(selected),record=item?.record,draftKey=item?'schedule-'+item.kind+':'+item.id:'',base=item?.kind==='goal'?{version:record.version}:{base:{taskVersion:record?.version||1,planVersion:s.planVersion}},draft=item?(records.drafts[draftKey]||{...base,date:item.date,time:item.time}):null;
 const setDraft=patch=>{setError('');setMessage('');store(prev=>({...prev,drafts:{...prev.drafts,[draftKey]:{...draft,...patch}}}));};
 const pending=items.filter(item=>item.active&&!item.date),scheduled=items.filter(item=>item.date),visible=(filter==='pending'?pending:scheduled).filter(item=>item.record.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const changeFilter=next=>{setFilter(next);setQuery('');setMessage('');setError('');const first=(next==='pending'?pending:scheduled)[0];setSelected(first?first.kind+':'+first.id:'');};
 const save=async e=>{e.preventDefault();if(!item||busy)return;setBusy(true);setError('');setMessage('');try{
  if(!draft.date)throw Error('请选择执行日期。');
  if(draft.time&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.time))throw Error('请选择有效的执行时间。');
  let persisted;
  if(item.kind==='goal')persisted=store(prev=>schedulePeriodGoal(prev,{id:item.id,version:draft.version},draft));
  else{
   const edit={...taskEditDraft(record),due:draft.date},next=operateStageTask(s,item.id,'schedule',{base:draft.base,draft:edit});
   if(command)await command('task.edit',{taskId:item.id,...draft.base,draft:edit,confirmation:'EDIT_TASK'});else update(next);
   persisted=store(prev=>({...prev,taskMeta:{...prev.taskMeta,[item.id]:{...prev.taskMeta[item.id],time:draft.time}},drafts:{...prev.drafts,[draftKey]:null}}));
  }
  setFilter('scheduled');setQuery('');setSavedDate(draft.date);setMessage(persisted?'排期已保存，可在待行动和日历中查看。':'排期已更新，本次改动仅在当前页面保留。');
 }catch(e){setError(e.code?authMessage(e.code):e.message);}finally{setBusy(false);}};
 const href=entry=>'/plan/schedule?'+entry.kind+'='+encodeURIComponent(entry.id);
 return <section className="plan-scheduler" aria-label="计划排期">
  <nav className="scheduler-navigation">{link('/plan',<><ControlIcon name="arrow" size={16}/>返回目标与行动计划</>)}</nav>
  <div className="scheduler-intro"><p>为目标与行动安排执行日期，排期后即可开始推进。</p><span className="scheduler-local">目标安排保存在本机</span></div>
  <StageStorageNote status={storageStatus}/>
  {requested&&!find(requested)&&<p className="scheduler-warning" role="status">指定计划已不存在，请从清单中重新选择。</p>}
  <div className="scheduler-layout">
   <aside className="scheduler-list-panel" aria-label="计划清单"><div className="scheduler-panel-heading"><h2>计划清单</h2><span>{items.length} 项</span></div>
    <div className="scheduler-filters" role="group" aria-label="排期状态"><button type="button" aria-pressed={filter==='pending'} onClick={()=>changeFilter('pending')} disabled={busy}>待排期 <span>{pending.length}</span></button><button type="button" aria-pressed={filter==='scheduled'} onClick={()=>changeFilter('scheduled')} disabled={busy}>已排期 <span>{scheduled.length}</span></button></div>
    <label className="scheduler-search"><ControlIcon name="search" size={17}/><input aria-label="搜索计划" placeholder="搜索计划名称" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <ul className="scheduler-list">{visible.map(entry=><li key={entry.kind+entry.id} data-schedule-goal={entry.kind==='goal'?entry.id:undefined} data-schedule-task={entry.kind==='task'?entry.id:undefined}>{React.cloneElement(link(href(entry),<><span className="scheduler-row-meta"><span>{entry.kind==='goal'?goalPeriods.find(p=>p.id===entry.record.period)?.label:'行动任务'}</span><span>{entry.date||displayPublicText('待排期')}</span></span><strong translate="no">{entry.record.title}</strong><span className="scheduler-row-footer">优先级：{entry.record.priority||displayPublicText('未排序')}<ControlIcon name="arrow" size={16}/></span></>),{'aria-current':selected===entry.kind+':'+entry.id?'true':undefined,onClick:busy?e=>e.preventDefault():undefined,...(!busy?{onClick:e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){setSelected(entry.kind+':'+entry.id);setError('');setMessage('');}const handler=link(href(entry),'').props.onClick;handler?.(e);}}:{})})}</li>)}</ul>
    {!visible.length&&<div className="scheduler-empty-list"><ProductIcon name="calendar" size={28}/><p>{query?'没有匹配的计划。':filter==='pending'?'暂时没有待排期计划。':'暂时没有已排期计划。'}</p>{!query&&link('/plan/goals','去制定目标 →')}</div>}
   </aside>
   <section className="scheduler-detail" aria-label="排期详情">
    {!item?<div className="scheduler-empty"><ProductIcon name="calendar" size={44}/><h2>选择一项计划开始排期</h2><p>从左侧选择目标或行动，安排合适的执行日期。</p></div>:<>
     <div className="scheduler-detail-heading"><span className="scheduler-kind">{item.kind==='goal'?goalPeriods.find(p=>p.id===record.period)?.label:'行动任务'}</span><span className="scheduler-status">{item.date?'已排期':'待排期'}</span></div>
     <h2 className="scheduler-title" translate="no">{record.title}</h2>
     <div className="scheduler-facts"><span>优先级：{record.priority||displayPublicText('未排序')}</span>{item.kind==='goal'?<span>截止日期：<time>{record.due}</time></span>:<span>预计投入：{record.hours} 小时</span>}</div>
     {(record.notes||record.purpose)&&<p className="scheduler-description" translate="no">{record.notes||record.purpose}</p>}
     <form className="scheduler-form" aria-label="计划排期表单" onSubmit={save}>
      <h3>安排执行时间</h3><p className="scheduler-help">执行日期用于安排计划，具体时间可以稍后补充。</p>
      <div className="scheduler-fields"><label><span>执行日期</span><input aria-label="执行日期" type="date" value={draft.date} onChange={e=>setDraft({date:e.target.value})} required disabled={busy}/></label><label><span>执行时间（可选）</span><input aria-label="执行时间" type="time" value={draft.time} onChange={e=>setDraft({time:e.target.value})} disabled={busy}/></label></div>
      {item.kind==='goal'&&<p className="scheduler-help">排期不会更改目标的截止日期。</p>}
      {error&&<div className="scheduler-error" role="alert">{error}{/版本|已变化/.test(error)&&<button type="button" onClick={()=>setDraft(base)}>保留输入，采用当前版本</button>}</div>}
      <div className="scheduler-form-actions"><button type="submit" className="scheduler-primary" disabled={busy}>{busy?'正在保存…':'确认排期'}</button><button type="button" disabled={busy} onClick={()=>{store(prev=>({...prev,drafts:{...prev.drafts,[draftKey]:null}}));setError('');setMessage('');}}>重置输入</button></div>
     </form>
     {message&&<div className="scheduler-success" role="status"><p>{message}</p><nav>{link('/plan?goalView=actions','查看待行动 →')}{link('/plan?calendarDate='+encodeURIComponent(savedDate)+'#weekly-actions','查看日历 →')}</nav></div>}
    </>}
   </section>
  </div>
 </section>;
}
