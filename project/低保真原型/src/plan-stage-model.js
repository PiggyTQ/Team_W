import {uid} from './model.js';
import {dependencyBlock} from './completion-model.js';
import {stoppedTask,applyTaskEdit} from './task-edit-model.js';
import {submitTaskAttempt} from './task-attempt-model.js';

export const PLAN_STAGE_KEY='career-plan-stage-v1';
export const goalPeriods=[
 {id:'week',label:'周目标',action:'查看周目标',title:'我的周目标'},
 {id:'month',label:'月目标',action:'查看月目标',title:'我的月目标'},
 {id:'year',label:'年目标',action:'查看年目标',title:'我的年度目标'},
];
export const stageViewIds=['week','month','year','undated','actions','review'];
export const emptyStageRecords=()=>({version:1,goals:[],taskMeta:{},drafts:{}});
export const stageStorageKey=scope=>`${PLAN_STAGE_KEY}:${encodeURIComponent(scope||'local')}`;
const isoDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00'))&&new Date(value+'T12:00:00').toISOString().slice(0,10)===value;
const shift=(value,days)=>{const d=new Date(value+'T12:00:00');d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function periodRange(period,today){
 if(!isoDate(today)||!goalPeriods.some(x=>x.id===period))throw Error('目标周期无效。');
 if(period==='week'){const start=shift(today,-((new Date(today+'T12:00:00').getDay()+6)%7));return{start,end:shift(start,6)};}
 const start=period==='month'?today.slice(0,7)+'-01':today.slice(0,4)+'-01-01';
 const next=new Date(start+'T12:00:00');if(period==='month')next.setMonth(next.getMonth()+1);else next.setFullYear(next.getFullYear()+1);
 return{start,end:shift(`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-01`,-1)};
}
export function readStageRecords(raw){
 if(raw===null)return emptyStageRecords();
 const value=JSON.parse(raw);
 if(value?.version!==1||!Array.isArray(value.goals)||value.goals.length>1000||!value.taskMeta||typeof value.taskMeta!=='object'||Array.isArray(value.taskMeta)||!value.drafts||typeof value.drafts!=='object'||Array.isArray(value.drafts))throw Error('本机目标记录无法读取，原记录未覆盖。');
 const ids=new Set();
 for(const g of value.goals){
  if(!g||typeof g.id!=='string'||ids.has(g.id)||!goalPeriods.some(p=>p.id===g.period)||!isoDate(g.periodStart)||typeof g.title!=='string'||!g.title.trim()||!Number.isFinite(g.progress)||g.progress<0||g.progress>100||!['高','中','低'].includes(g.priority)||!isoDate(g.due)||!Array.isArray(g.milestones)||g.milestones.some(m=>!m||typeof m.id!=='string'||typeof m.title!=='string'||typeof m.done!=='boolean'))throw Error('本机目标记录无法读取，原记录未覆盖。');
  ids.add(g.id);
 }
 return value;
}
export const periodGoals=(records,period,today)=>records.goals.filter(g=>g.period===period&&g.periodStart===periodRange(period,today).start);
export function goalStats(goals){
 const done=goals.filter(g=>g.progress===100).length,going=goals.filter(g=>g.progress>0&&g.progress<100).length;
 return{total:goals.length,done,going,pending:goals.length-done-going,progress:goals.length?Math.round(goals.reduce((sum,g)=>sum+g.progress,0)/goals.length):0};
}
export const blankGoal=(period,today)=>({id:'',version:0,title:'',priority:'中',due:periodRange(period,today).end,progress:0,notes:'',milestoneText:''});
export const editableGoal=goal=>({...goal,milestoneText:goal.milestones.map(m=>m.title).join('\n')});
export function savePeriodGoal(records,period,today,draft){
 const range=periodRange(period,today),prior=records.goals.find(g=>g.id===draft.id),progress=Number(draft.progress);
 if(draft.id&&!prior||prior&&prior.version!==draft.version)throw Error('目标已变化，请重新打开后编辑。');
 if(!draft.title?.trim())throw Error('请填写目标名称。');
 if(!['高','中','低'].includes(draft.priority)||!Number.isFinite(progress)||progress<0||progress>100)throw Error('请填写有效的优先级和 0–100 的进度。');
 if(!isoDate(draft.due)||draft.due<range.start||draft.due>range.end)throw Error('截止日期须在当前目标周期内。');
 const milestones=[...new Set((draft.milestoneText||'').split('\n').map(x=>x.trim()).filter(Boolean))].map(title=>prior?.milestones.find(m=>m.title===title)||{id:uid('milestone'),title,done:false});
 const goal={id:prior?.id||uid('period-goal'),version:(prior?.version||0)+1,period,periodStart:range.start,title:draft.title.trim(),priority:draft.priority,due:draft.due,progress,notes:(draft.notes||'').trim(),milestones,updatedAt:new Date().toISOString()};
 return{...records,goals:prior?records.goals.map(g=>g.id===prior.id?goal:g):[...records.goals,goal]};
}
export function updateGoalProgress(records,id,progress){
 if(!Number.isFinite(progress)||progress<0||progress>100)throw Error('请填写有效的优先级和 0–100 的进度。');
 return{...records,goals:records.goals.map(g=>g.id===id?{...g,progress,version:g.version+1,updatedAt:new Date().toISOString()}:g)};
}
export const activePlanTask=t=>!['完成','延期','取消','跳过'].includes(t.status)&&!t.completed;
export const reviewSignature=t=>JSON.stringify([t.version||1,t.status,t.due||'',t.attempts?.at(-1)?.id||'',!!t.completed]);
export function stageTaskGroups(s,records,today){
 const actions=s.tasks.filter(activePlanTask),undated=actions.filter(t=>!t.due);
 const review=s.tasks.filter(t=>{
  if(stoppedTask(t)||records.taskMeta[t.id]?.review?.signature===reviewSignature(t))return false;
  const finished=t.completed||t.status==='完成';
  return finished?!s.reviews.some(r=>r.taskId===t.id&&(!t.attempts?.at(-1)?.date||r.date>=t.attempts.at(-1).date.slice(0,10))):t.status==='受阻'||!!(t.due&&t.due<today);
 });
 return{actions,undated,review};
}
export const taskEditDraft=t=>({title:t.title,purpose:t.purpose,hours:t.hours,due:t.due||'',deliveryNote:t.deliveryNote||'',status:t.status});
export function operateStageTask(s,id,type,{base,draft}={}){
 const task=s.tasks.find(t=>t.id===id);if(!task)throw Error('任务已不存在，请返回计划。');
 if(base&&(task.version||1)!==base.taskVersion)throw Error('任务或计划版本已变化，未覆盖原记录；请按当前基线重新预览。');
 const replace=next=>({...s,tasks:s.tasks.map(t=>t.id===id?next:t)});
 if(type==='schedule'){
  if(!isoDate(draft.due))throw Error('请选择有效的计划日期。');
  return applyTaskEdit(s,id,draft,base);
 }
 if(type==='record'){
  if(task.completed)throw Error('已完成的成果记录保持，调整安排请使用重新调整。');
  return replace({...task,...(task.mode==='S2'?{draft:draft.text}:{note:draft.text}),contribution:draft.contribution,selfcheck:!!draft.selfcheck});
 }
 if(stoppedTask(task))throw Error('这项任务已暂停，请先回计划核对预算并明确恢复。');
 if(dependencyBlock(s,task)&&!task.completed)throw Error('交付依赖尚未完成，请先在分阶段计划查看依赖任务。');
 if(type==='start')return replace({...task,status:'进行中',version:(task.version||1)+1});
 if(type==='submit')return submitTaskAttempt(s,id);
 if(type==='selfcheck'){
  const last=task.attempts?.at(-1);if(!last||task.completed)throw Error('请先提交当前产物版本，再记录本人自检。');
  return replace({...task,check:'自检记录',version:task.version+1,attempts:task.attempts.map(a=>a.id===last.id?{...a,result:'自检记录',feedback:'本人复查记录，不构成独立核验。'}:a)});
 }
 if(type==='complete'){
  if(task.completed)return s;
  if(task.mode!=='S2')return applyTaskEdit(s,id,{...taskEditDraft(task),status:'完成'},base||{taskVersion:task.version,planVersion:s.planVersion});
  if(!task.attempts?.length||!task.selfcheck||!task.contribution?.trim()||task.attempts.at(-1).result!=='自检记录')throw Error('完成条件未满足：需最新提交版本、贡献说明、对应自检记录及逐项标准确认。');
  return replace({...task,status:'完成',completed:true,version:task.version+1});
 }
 throw Error('当前操作不可用，请重新选择。');
}
