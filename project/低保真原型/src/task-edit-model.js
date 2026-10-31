import {dependencyBlock} from './completion-model.js';
import {usedHours} from './model.js';
export const stoppedTask=t=>['延期','跳过','取消'].includes(t.status);
export const closedTask=t=>t.status==='完成'||stoppedTask(t);
export function validateTaskEdit(s,t,d) {
  if(!t.completed&&['进行中','完成'].includes(d.status)&&dependencyBlock(s,t))return '交付依赖尚未完成，请先在分阶段计划查看依赖任务。';
  if(!d.title?.trim()||!d.purpose?.trim())return '请填写行动标题与目的。';
  if(!Number.isFinite(Number(d.hours))||Number(d.hours)<0)return '预计投入须为非负数。';
  if(!['待开始','进行中','受阻','延期','跳过','取消','完成'].includes(d.status))return '请选择已有任务状态。';
  if(t.status==='完成'&&d.status!=='完成')return '已完成记录保留原完成状态；下一轮行动请另做预算预检。';
  if(d.status==='完成'&&!t.completed&&(t.mode==='S2'||!t.note?.trim()))return '先在实践页记录实际结果并检查完成条件，不能通过编辑安排跳过完成要求。';
  if(!closedTask(d)) {
    if(Number(d.hours)<=0)return '活动任务的预计投入须大于0小时。';
    if(!s.budget||Number(s.budget)<=0)return '总预算未定，请先设置预算；不会直接恢复任务。';
    const sum=usedHours({...s,tasks:s.tasks.filter(x=>x.id!==t.id)})+Number(d.hours);
    if(sum>Number(s.budget))return `调整后共 ${sum} 小时，超过本周期预算 ${s.budget} 小时；请缩小投入或先调整预算。`;
  }
  return '';
}
export function applyTaskEdit(s,id,d,base) {
  const task=s.tasks.find(x=>x.id===id);
  if(!task)throw new Error('任务已不存在，请返回计划。');
  if(task.version!==base.taskVersion||s.planVersion!==base.planVersion)throw new Error('任务或计划版本已变化，未覆盖原记录；请按当前基线重新预览。');
  const error=validateTaskEdit(s,task,d);if(error)throw new Error(error);
  const next={...task,title:d.title.trim(),purpose:d.purpose.trim(),hours:Number(d.hours),due:d.due||'',deliveryNote:d.deliveryNote||'',status:d.status,completed:d.status==='完成',version:(task.version||1)+1};
  return {...s,tasks:s.tasks.map(x=>x.id===id?next:x),planVersion:s.planVersion+1,scenario:s.scenario?{...s.scenario,stale:true}:null,proposal:null,analysisStale:!!s.analysis};
}
