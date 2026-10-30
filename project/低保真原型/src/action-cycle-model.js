import {usedHours,uid} from './model.js';
import {dependencyBlock} from './completion-model.js';
import {stoppedTask} from './task-edit-model.js';

export const executionGroups=[{id:'all',title:'全部行动'},{id:'pending',title:'待开始',statuses:['待开始']},{id:'active',title:'进行与受阻',statuses:['进行中','受阻']},{id:'closed',title:'成果与暂停',statuses:['完成','延期','跳过','取消']}];
export function executionState(s,filter='all',focus=null){
 const group=executionGroups.find(g=>g.id===filter)||executionGroups[0];
 const rank=t=>t.status==='受阻'||(!t.completed&&!stoppedTask(t)&&dependencyBlock(s,t))?0:t.status==='进行中'?1:t.status==='待开始'?2:t.status==='完成'?3:4;
 const tasks=s.tasks.filter(t=>!group.statuses||group.statuses.includes(t.status)).slice().sort((a,b)=>rank(a)-rank(b));
 const selected=focus!==null?s.tasks.find(t=>t.id===focus&&tasks.some(x=>x.id===t.id)):tasks[0];
 const hours=usedHours(s),budget=Number(s.budget),known=s.budget!==null&&s.budget!==''&&Number.isFinite(budget)&&budget>0;
 return {group,tasks,selected,missingFocus:focus!==null&&!selected,hours,budget:known?budget:null,remaining:known?Math.max(0,budget-hours):null,over:known&&hours>budget};
}
export const reviewTypes=['本人记录的真实接触 / 调研','原创模拟实践','自主学习'];
export function reviewDraftFor(s,id){return {type:s.tasks.find(t=>t.id===id)?.mode==='S2'?'原创模拟实践':'本人记录的真实接触 / 调研',result:'',feedback:'',reason:'',next:'',...(s.reviewDrafts?.[id]||{})};}
export function reviewMissing(d){return ['result','reason','next'].filter(key=>!d[key]?.trim());}
export function savedActionText(t){return t?.attempts?.at(-1)?.text||t?.note?.trim()||'';}
export function reviewTaskId(s,requested=null){if(requested!==null)return s.tasks.some(t=>t.id===requested)?requested:'';return [...s.tasks].reverse().find(t=>savedActionText(t)||t.status==='完成')?.id||s.tasks[0]?.id||'';}
export function saveReviewRecord(s,id,draft){
 if(!s.tasks.some(t=>t.id===id))throw Error('关联行动已不可用，请重新选择。');
 if(reviewMissing(draft).length)throw Error('请填写实际结果、原因分析和改进措施后再保存。');
 if(!reviewTypes.includes(draft.type))throw Error('请选择已有的活动类型。');
 const record={id:uid('review'),version:1,history:[],taskId:id,type:draft.type,result:draft.result.trim(),feedback:(draft.feedback||'').trim(),reason:draft.reason.trim(),next:draft.next.trim(),date:new Date().toISOString().slice(0,10)};
 const reviewDrafts={...s.reviewDrafts};delete reviewDrafts[id];
 return {record,state:{...s,analysisStale:!!s.analysis,reviews:[...s.reviews,record],reviewDrafts}};
}
