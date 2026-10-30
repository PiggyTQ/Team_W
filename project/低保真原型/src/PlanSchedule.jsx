import {getLanguage} from './i18n/render';
import React,{useState,useRef,useEffect} from 'react';
import SegmentedControl from './SegmentedControl';
import BudgetCapacity from './BudgetCapacity';
import ControlIcon from './ControlIcon';
import {taskRoute} from './flow-navigation';
import {stoppedTask} from './task-edit-model';
import {localToday} from './TaskSchedule';
import useWeekDayMotion from './useWeekDayMotion';

const shift=(v,n)=>{const d=new Date(`${v}T12:00:00`);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const weekday=d=>(getLanguage()==='en'?['Sun','Mon','Tue','Wed','Thu','Fri','Sat']:['周日','周一','周二','周三','周四','周五','周六'])[new Date(`${d}T12:00:00`).getDay()];
const active=t=>!['取消','跳过','延期','完成'].includes(t.status)&&!t.completed;
const panelIds={day:'schedule-selected-day',undated:'schedule-undated',review:'schedule-overdue'};

export default function PlanSchedule({s,update,link,open,precheck}){
 const today=localToday(),editor=useRef(null),origin=useRef(null),calendar=useRef(null);
 const [anchor,setAnchor]=useState((s.scheduleView?.dayOnly&&s.scheduleView?.selectedDay)||s.scheduleView?.anchor||today),[selectedDay,setDay]=useState(s.scheduleView?.selectedDay||today),[dayOnly,setDayOnly]=useState(s.scheduleView?.dayOnly||false),[includeClosed,setClosed]=useState(false),[edit,setEdit]=useState(null),[dateDraft,setDateDraft]=useState(''),[error,setError]=useState(''),[tab,setTab]=useState('day');
 const motion=useWeekDayMotion({dayOnly,selectedDay,anchor});
 const currentDay=useRef(selectedDay);currentDay.current=selectedDay;
 const view=patch=>{if(patch.anchor)setAnchor(patch.anchor);if(patch.selectedDay)setDay(patch.selectedDay);if(patch.dayOnly!==undefined)setDayOnly(patch.dayOnly);update(prev=>({...prev,scheduleView:{...(prev.scheduleView||{}),...patch}}));};
 const start=shift(anchor,-((new Date(`${anchor}T12:00:00`).getDay()+6)%7)),days=Array.from({length:7},(_,i)=>shift(start,i));
 const tasks=s.tasks.filter(t=>includeClosed||active(t)),undated=tasks.filter(t=>!t.due),overdue=tasks.filter(t=>active(t)&&t.due&&t.due<today),blocked=tasks.filter(t=>active(t)&&t.status==='受阻'&&(!t.due||t.due>=today));
 const weekTasks=tasks.filter(t=>days.includes(t.due)),dayTasks=tasks.filter(t=>t.due===selectedDay),selected=edit?s.tasks.find(t=>t.id===edit.id):null;
 const showDay=(day,event,nextTab='day')=>{
  if(!dayOnly||day!==selectedDay)motion.capture(day,event,{restoreFocus:event?.currentTarget?.classList.contains('schedule-day-more')});
  view({dayOnly:true,selectedDay:day,anchor:day});setTab(nextTab);setEdit(null);setError('');
 };
 const showWeek=event=>{if(!dayOnly)return;motion.capture(selectedDay,event,{restoreFocus:event?.currentTarget?.classList.contains('day-return')});view({dayOnly:false});setEdit(null);setError('');};
 const navigate=(amount,event)=>{const next=shift(dayOnly?selectedDay:anchor,amount*(dayOnly?1:7));if(dayOnly)showDay(next,event);else{view({anchor:next,selectedDay:shift(selectedDay,amount*7)});setEdit(null);}};
 const selectTab=(key,focus=false)=>{setTab(key);setEdit(null);setError('');if(focus)requestAnimationFrame(()=>document.getElementById(`schedule-tab-${key}`)?.focus({preventScroll:true}));};
 const closeEditor=()=>{setEdit(null);setError('');requestAnimationFrame(()=>{const target=origin.current;const fallback=motion.frames.current.get(selectedDay)?.querySelector('button');(target?.isConnected&&target.getClientRects().length?target:fallback)?.focus({preventScroll:true});});};
 useEffect(()=>{
  let frame;
  const reveal=hash=>{const key=Object.keys(panelIds).find(key=>'#'+panelIds[key]===hash);if(key){view({dayOnly:true,anchor:currentDay.current});setTab(key);setEdit(null);frame=requestAnimationFrame(()=>{calendar.current?.scrollIntoView({block:'nearest'});document.getElementById(panelIds[key])?.focus({preventScroll:true});});}else if(hash==='#weekly-actions')calendar.current?.scrollIntoView({block:'start'});};
  const onHash=()=>reveal(location.hash),onAnchor=e=>{const href=e.target.closest?.('a[href]')?.getAttribute('href');if(Object.values(panelIds).some(id=>href==='#'+id))reveal(href);};
  onHash();window.addEventListener('hashchange',onHash);document.addEventListener('click',onAnchor);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('hashchange',onHash);document.removeEventListener('click',onAnchor);};
 },[]);
 useEffect(()=>{if(edit)editor.current?.scrollIntoView({block:'nearest'});},[edit]);
 const choose=(t,event)=>{origin.current=event?.currentTarget;if(!dayOnly){showDay(t.due||selectedDay,event);setTab('day');}setEdit({id:t.id,version:t.version||1,due:t.due||''});setDateDraft(t.due||selectedDay);setError('');};
 const save=e=>{e.preventDefault();if(!selected)return;if((selected.version||1)!==edit.version||(selected.due||'')!==edit.due){setError('任务版本或日期已变化，请取消后重新选择，未覆盖原记录。');return;}
  update(prev=>({...prev,tasks:prev.tasks.map(t=>t.id===selected.id?{...t,due:dateDraft,version:(t.version||1)+1}:t),planVersion:prev.planVersion+1,scenario:prev.scenario?{...prev.scenario,stale:true}:null}));closeEditor();};
 const card=t=><button key={t.id} data-task-id={t.id} type="button" className="schedule-task" data-status={t.status} aria-pressed={selected?.id===t.id} onClick={e=>choose(t,e)}><small className="schedule-task-state">{t.status}</small><span translate="no">{t.title}</span><small className="schedule-task-effort"><ControlIcon name="clock" size={13}/>预计 {t.hours} 小时</small></button>;
 const taskEditor=selected&&<section ref={editor} className="schedule-editor" aria-label="选中任务日期调整"><header><h3>调整任务日期</h3><button className="schedule-close" aria-label="关闭任务日期调整" onClick={closeEditor}><ControlIcon name="close" size={16}/></button></header><div className="schedule-editor-content"><div><h4 translate="no">{selected.title}</h4><p className="schedule-selected-meta">{selected.status} · {selected.association} · 预计 {selected.hours} 小时</p><div className="schedule-detail-links">{link(taskRoute(s,selected),stoppedTask(selected)?'查看暂停原因与恢复入口 →':selected.status==='完成'?'查看任务成果 →':'进入该任务实践 →')}<button onClick={()=>open('taskEdit',{taskId:selected.id})}>编辑完整安排</button><button onClick={()=>open('task',{taskId:selected.id})}>任务详情 / 状态</button></div></div><form onSubmit={save}><label className="field"><span>计划日期（可留空）</span><input aria-label="任务计划日期" type="date" value={dateDraft} onChange={e=>setDateDraft(e.target.value)}/></label>{error&&<p className="error" role="alert">{error}</p>}<div className="actions"><button type="submit" className="primary">保存日期变更</button><button type="button" onClick={closeEditor}>取消改期</button><button type="button" onClick={()=>setDateDraft('')}>移回未排期</button></div></form></div></section>;
 return <section id="weekly-actions" className="task-schedule schedule-workspace" aria-label="本周日程与任务安排">
  <div className="schedule-caption"><div><h2>本周日程</h2><p>点击日期展开当天安排，返回本周查看全局。</p></div><button className="primary" onClick={()=>precheck()}><ControlIcon name="file" size={16}/>安排行动</button></div>
  <div className="schedule-layout">
   <section className="schedule-budget" aria-label="本周时间预算"><header className="schedule-budget-heading"><h3>本周时间预算</h3><button onClick={()=>open('scenario',{budget:s.budget??0,goal:s.goal||'',base:s.planVersion,policy:'延后超额任务'})}>调整预算 / 临时推演</button></header><BudgetCapacity s={s} link={link}/></section>
   <section ref={calendar} className="calendar-area" aria-label="任务日期日历" onKeyDown={e=>{if(e.key==='Escape'&&dayOnly){e.preventDefault();if(edit)closeEditor();else{showWeek({detail:0});motion.frames.current.get(selectedDay)?.querySelector('button')?.focus({preventScroll:true});}}}}>
    <header className="calendar-toolbar"><div className="calendar-date-nav"><button aria-label={dayOnly?'上一天':'上一周'} onClick={e=>navigate(-1,e)}>←</button><span>{dayOnly?`${selectedDay.slice(0,4)}${getLanguage()==='en'?'':'年'} ${selectedDay.slice(5).replace('-','/')} ${weekday(selectedDay)}`:`${start.slice(0,4)}${getLanguage()==='en'?'':'年'} ${start.slice(5).replace('-','/')} — ${days[6].slice(5).replace('-','/')}`}</span><button aria-label={dayOnly?'下一天':'下一周'} onClick={e=>navigate(1,e)}>→</button><button onClick={e=>{if(dayOnly)showDay(today,e);else{view({anchor:today,selectedDay:today});setEdit(null);}}}>今天</button></div><SegmentedControl as="div" className="calendar-mode-switch" role="group" aria-label="日程显示范围"><button key="week" aria-pressed={!dayOnly} onClick={showWeek}>周</button><button key="day" aria-pressed={dayOnly} onClick={e=>showDay(days.includes(selectedDay)?selectedDay:anchor,e)}>日</button></SegmentedControl></header>
    <div className="calendar-range-summary"><span>{dayOnly?'当日':'本周'}已排期 {dayOnly?dayTasks.length:weekTasks.length} 项</span><span>按日期安排 · 预计投入另计</span></div>
    <div ref={motion.scroller} className="calendar-scroll" data-mode={dayOnly?'day':'week'} role="region" aria-label={dayOnly?'当日安排工作区':'可横向浏览的周日程'} tabIndex={dayOnly?-1:0}>
     <div ref={motion.stage} className={`week-grid calendar-stage ${dayOnly?'is-day':''}`} data-mode={dayOnly?'day':'week'}>
      {days.map(day=>{const dated=tasks.filter(t=>t.due===day);return <section key={day} data-date={day} hidden={dayOnly&&day!==selectedDay} className={`schedule-date-tile ${day===selectedDay?'selected-day':''} ${day===today?'today-column':''}`}>
       <div className="calendar-day-frame" data-motion-date={day} ref={node=>{if(node)motion.frames.current.set(day,node);else motion.frames.current.delete(day);}}><button className="calendar-day" aria-label={`${day} ${weekday(day)}，${dated.length} 项安排${dayOnly?'，返回周视图':''}`} aria-pressed={day===selectedDay} onClick={e=>dayOnly?showWeek(e):showDay(day,e)}><span className="calendar-day-month">{Number(day.slice(5,7))} 月</span><span>{weekday(day)}</span><strong>{day.slice(8)}</strong><small>{day===today?'今天':`${dated.length} 项`}</small></button></div>
       <div className="calendar-day-content">{dated.slice(0,2).map(card)}{!dated.length&&<p className="day-empty">暂未安排</p>}{dated.length>2&&<button className="schedule-day-more" onClick={e=>showDay(day,e)}>查看其余 {dated.length-2} 项 →</button>}</div>
       {dayOnly&&<div className="day-rail"><button className="day-return" onClick={showWeek}>← 返回本周</button></div>}
      </section>;})}
      <div className="day-workbench" hidden={!dayOnly} role="region" aria-labelledby="day-workbench-heading">
       <header className="day-workbench-heading"><h3 id="day-workbench-heading">{Number(selectedDay.slice(5,7))} 月 {Number(selectedDay.slice(8))} 日安排</h3><p>查看已有安排，或从待安排任务中选择。</p></header>
       <SegmentedControl as="div" role="tablist" className="day-task-tabs" aria-label="当日任务分类">{[['day','当日',dayTasks.length],['undated','待安排',undated.length],['review','复查',overdue.length+blocked.length]].map(([key,label,count])=><button key={key} role="tab" id={`schedule-tab-${key}`} className={tab===key?'selected':''} aria-selected={tab===key} aria-controls={panelIds[key]} tabIndex={tab===key?0:-1} onClick={()=>selectTab(key)}>{label}<span>{count}</span></button>)}</SegmentedControl>
       {taskEditor}
       <section id="schedule-selected-day" role="tabpanel" aria-labelledby="schedule-tab-day" tabIndex={0} hidden={tab!=='day'} className="day-task-panel"><div className="schedule-task-list">{dayTasks.length?dayTasks.map(card):<div className="day-panel-empty"><p>当天还没有安排。</p>{undated.length?<button onClick={()=>selectTab('undated',true)}>从 {undated.length} 项待安排任务中选择 →</button>:<button onClick={()=>precheck()}>安排一次行动 →</button>}</div>}</div></section>
       <section id="schedule-undated" role="tabpanel" aria-labelledby="schedule-tab-undated" tabIndex={0} hidden={tab!=='undated'} className="day-task-panel"><p className="day-panel-note">选择任务后可安排到 {Number(selectedDay.slice(5,7))} 月 {Number(selectedDay.slice(8))} 日，保存后生效。</p><div className="schedule-task-list">{undated.length?undated.map(card):<div className="day-panel-empty"><p>暂无未排期任务。</p><button onClick={()=>precheck()}>安排一次行动 →</button></div>}</div></section>
       <section id="schedule-overdue" role="tabpanel" aria-labelledby="schedule-tab-review" tabIndex={0} hidden={tab!=='review'} className="day-task-panel"><div className="schedule-task-list">{overdue.length>0&&<><p>计划日期已过</p>{overdue.map(card)}</>}{blocked.length>0&&<><p>行动受阻，查看任务说明</p>{blocked.map(card)}</>}{!overdue.length&&!blocked.length&&<div className="day-panel-empty"><p>暂无已过日期或受阻的活动任务。</p></div>}{overdue.length>0&&<small>日期已过只提示复查，不自动改变任务状态。</small>}</div></section>
      </div>
     </div>
    </div>
    {!dayOnly&&<div className="week-task-shortcuts"><span>{weekTasks.length?'选中一天，集中查看和安排任务。':'本周还没有排期，选中一天开始安排。'}</span><button onClick={e=>showDay(selectedDay,e,'undated')}>未排期 {undated.length} 项 →</button><button onClick={e=>showDay(selectedDay,e,'review')}>需复查 {overdue.length+blocked.length} 项 →</button></div>}
    <footer className="calendar-footnote"><label className="check"><input type="checkbox" checked={includeClosed} onChange={e=>setClosed(e.target.checked)}/>显示已完成与暂缓记录</label><small>预计投入不代表实际耗时，改期不改变预算占用。</small></footer>
   </section>
  </div>
 </section>;
}
