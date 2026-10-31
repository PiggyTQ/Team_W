import {uid} from './model.js';
import {dependencyBlock} from './completion-model.js';
import {stoppedTask} from './task-edit-model.js';

export function submitTaskAttempt(s,id) {
  const task=s.tasks.find(t=>t.id===id);
  if(!task)throw Error('任务已不存在，请返回计划。');
  if(task.completed||task.status==='完成')throw Error('本任务已完成，成果版本已保留；下一轮行动请回计划，经预算预检另建任务。');
  if(stoppedTask(task))throw Error('这项任务已暂停，请先回计划核对预算并明确恢复。');
  if(dependencyBlock(s,task))throw Error('交付依赖尚未完成，请先在分阶段计划查看依赖任务。');
  if(!task.draft?.trim())throw Error('请先填写当前产物。');
  const attempt={id:uid('attempt'),version:task.attempts.length+1,text:task.draft,contribution:task.contribution,aid:task.aid,milestone:task.milestone,date:new Date().toISOString(),result:'未检查',feedback:'',...(task.courseVersion?{courseVersion:task.courseVersion}:{})};
  return {...s,tasks:s.tasks.map(t=>t.id===id?{...t,attempts:[...t.attempts,attempt],completed:false,check:'未检查',status:'进行中',selfcheck:false,version:t.version+1}:t)};
}
