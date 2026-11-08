import {learning} from './model.js';
import {taskRoute} from './flow-navigation.js';

// Reading material and saving a draft never create a completed resource.
export function completedPracticeResources(s){
 return s.tasks.filter(task=>task.completed===true&&task.status==='完成'&&learning.some(unit=>unit.id===task.template)).map(task=>({
  id:task.id,title:task.title,career:task.career||learning.find(unit=>unit.id===task.template).career,
  description:task.attempts?.at(-1)?.text||task.note||'',
  contribution:task.contribution,source:'practice',task,
  to:taskRoute(s,task)+(s.stage==='S1'||task.mode==='S1'?'&step=record':'?tab=完成回执')
 }));
}

export function personalResources(s,uploads,{source='all',career='all'}={}){
 return [...completedPracticeResources(s),...uploads.filter(item=>item.completed===true).map(item=>({...item,source:'upload'}))]
  .filter(item=>(source==='all'||item.source===source)&&(career==='all'||item.career===career));
}
