import {learning} from './model.js';

export function localDay(date=new Date()) {
 return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
const validDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const priorityRank={高:0,中:1,低:2};
export const taskPriority=task=>Object.hasOwn(priorityRank,task.priority)?task.priority:'未排序';
export const estimatedHours=task=>task.hours!==null&&task.hours!==undefined&&task.hours!==''&&Number.isFinite(Number(task.hours))&&Number(task.hours)>=0?Number(task.hours):null;
export function dailyExecution(s,today=localDay()) {
 const tasks=s.tasks.filter(task=>!task.completed&&['待开始','进行中','受阻'].includes(task.status)&&validDay(task.due)&&task.due<=today).slice().sort((a,b)=>(priorityRank[a.priority]??3)-(priorityRank[b.priority]??3)||a.due.localeCompare(b.due)||Number(b.status==='进行中')-Number(a.status==='进行中'));
 return {tasks,hours:tasks.reduce((sum,task)=>sum+(estimatedHours(task)??0),0),unknownHours:tasks.filter(task=>estimatedHours(task)===null).length,overdue:tasks.filter(task=>task.due<today).length};
}
const outcomes={
 quality:'SQL / 表格工具：识别数据质量问题，说明处理理由与分析局限。',
 'ai-eval':'Python / AI 评估：整理模型输入输出，制定评估规则并识别结果边界。',
 log:'日志分析：整理异常线索，比较替代解释并说明授权边界。',
 restore:'Linux / 运维：制定恢复步骤，判断回退条件并记录未验证项。'
};
export function expectedCapability(task) {
 return task.atlas?.skill?.trim()||task.skill?.trim()||outcomes[task.template]||task.purpose?.trim()||'待明确能力目标';
}
export function learningTaskRoute(task) {
 const params=new URLSearchParams({task:task.id});
 if(learning.some(unit=>unit.id===task.template))params.set('unit',task.template);
 return '/learning?'+params.toString()+'#learning-task-'+encodeURIComponent(task.id);
}
