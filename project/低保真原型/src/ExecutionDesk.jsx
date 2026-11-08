import React,{useEffect,useState} from 'react';
import {getFormattingLocale} from './i18n/render';
import {dailyExecution,estimatedHours,expectedCapability,learningTaskRoute,localDay,taskPriority} from './daily-execution-model';
import './daily-execution.css';
const priorityLabels={高:'高优先级',中:'中优先级',低:'低优先级',未排序:'未排序'};

export default function ExecutionDesk({s,link}) {
 const [today,setToday]=useState(localDay);
 useEffect(()=>{
  const refresh=()=>setToday(localDay()),timer=setInterval(refresh,30000);
  window.addEventListener('focus',refresh);
  return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[]);
 const view=dailyExecution(s,today),date=new Date(today+'T12:00:00');
 return <section className="daily-execution" aria-labelledby="daily-execution-title">
  <header className="daily-heading"><div><span className="daily-date">{new Intl.DateTimeFormat(getFormattingLocale(),{month:'long',day:'numeric',weekday:'long'}).format(date)}</span><h2 id="daily-execution-title">今日任务</h2><p>按优先级逐项推进，把今天的投入变成具体能力。</p></div><div className="daily-summary"><span><strong>{view.tasks.length}</strong> 项待完成</span><span>预计共 <strong>{view.hours}</strong> 小时{view.unknownHours>0&&<small>部分任务用时待定</small>}</span></div></header>
  {view.tasks.length?<><div className="daily-list-caption"><span>优先级从高到低</span>{view.overdue>0&&<span>含逾期未完成任务</span>}</div><ol className="daily-task-list">{view.tasks.map((task,index)=>{
   const hours=estimatedHours(task),priority=taskPriority(task);
   return <li className="daily-task" key={task.id} data-daily-task={task.id}><span className="daily-task-order" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div className="daily-task-main"><div className="daily-task-badges"><span className="daily-priority" data-priority={priority}>{priorityLabels[priority]}</span>{task.due<today&&<span className="daily-overdue">逾期未完成 · {task.due}</span>}{task.status!=='待开始'&&<span className="daily-task-status">{task.status}</span>}</div><h3 title={task.title} id={'daily-task-title-'+task.id}>{task.title}</h3>{task.purpose&&<p title={task.purpose}>{task.purpose}</p>}</div><div className="daily-task-time"><span>预计用时</span><strong>{hours===null?'待确定':<>{hours}<small> 小时</small></>}</strong></div><div className="daily-task-gain"><span>预期能力收获</span><p>{expectedCapability(task)}</p></div>{React.cloneElement(link(learningTaskRoute(task),<>去完成 <span aria-hidden="true">→</span></>,'button primary daily-task-go'),{'aria-describedby':'daily-task-title-'+task.id})}</li>;
  })}</ol></>:<div className="daily-empty"><span className="daily-empty-mark" aria-hidden="true">✓</span><h3>今天没有待完成的任务</h3><p>安排到今天的任务会显示在这里，完成后会自动移出清单。</p>{link('/plan/schedule','安排今天的任务','button primary')}</div>}
  <footer className="daily-footer">{link('/plan?goalView=actions','调整任务安排 →')}</footer>
 </section>;
}
