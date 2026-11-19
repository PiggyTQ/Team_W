import React,{useEffect,useRef} from 'react';
import {taskCopy} from './native-task-copy.js';
import {learning} from './model';
import {dependencyBlock} from './completion-model';
import {externalPracticeRoute,taskRoute} from './flow-navigation';
import {stoppedTask} from './task-edit-model';
import {expectedCapability} from './daily-execution-model';
import {guidedTask} from './practice-project-model';

export default function LearningTaskFocus({s,url,link,open,startTask}) {
 const requested=new URL(url,location.origin).searchParams.get('task'),ref=useRef(null);
 const task=s.tasks.find(item=>item.id===requested),unit=learning.find(item=>item.id===task?.template);
 useEffect(()=>{if(requested!==null){ref.current?.scrollIntoView({block:'start'});ref.current?.focus({preventScroll:true});}},[requested]);
 if(requested===null)return null;
 if(!task)return <section className="learning-task-focus" ref={ref} tabIndex={-1} role="status"><h2>这项任务已不可访问</h2><p>请返回行动推进台重新选择任务。</p>{link('/plan?tab=执行','返回行动推进台','button')}</section>;
 const done=task.completed||task.status==='完成'||task.recordedOnly||task.mode==='recorded',blocked=dependencyBlock(s,task)&&!done;
 const result=task.mode==='recorded'?externalPracticeRoute(task)+'&step=record':taskRoute(s,task)+(s.stage==='S1'||task.mode==='S1'?'&step=record':guidedTask(task)?'':'?tab=完成回执');
 return <section className="learning-task-focus" id={'learning-task-'+task.id} ref={ref} tabIndex={-1} aria-labelledby="learning-focus-title" data-learning-task={task.id}><div className="learning-focus-heading"><div><span>来自行动推进台</span><h2 id="learning-focus-title">{taskCopy(task,'title')}</h2></div><span className="status-chip">{task.status}</span></div><p>{taskCopy(task,'purpose')}</p><dl><div><dt>预期能力收获</dt><dd>{expectedCapability(task,taskCopy(task,'purpose'))}</dd></div><div><dt>本次交付</dt><dd>{taskCopy(task,'standard')||'待明确交付要求'}</dd></div>{unit&&<div><dt>对应学习内容</dt><dd>{unit.title}</dd></div>}</dl>{blocked&&<p className="notice">前置任务尚未完成，请先处理依赖。</p>}{task.status==='受阻'&&task.note&&<p className="notice">{task.note}</p>}<div className="actions">{done?link(result,'查看任务成果','button primary'):blocked?link('/plan?goalView=actions','查看前置任务','button primary'):<button className="primary" onClick={()=>startTask(task)}>{stoppedTask(task)?'核对并恢复这项任务':task.status==='待开始'?'开始实践':'继续实践'}</button>}{unit&&<button onClick={()=>open('reading',{template:unit.id,taskId:task.mode==='S2'?task.id:undefined})}>阅读任务资料</button>}{link('/plan?tab=执行','返回今日任务')}</div></section>;
}
