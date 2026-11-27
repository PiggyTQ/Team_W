import {careerComparison} from './career-comparison.js';
import {normalizeDiscussion,refKey} from './discussion-contract.js';
import {taskRoute} from './flow-navigation.js';
import {hasTaskInput} from './assistant-task-model.js';

// Local metadata and explicitly selected local text only; no service or model calls.
export function demoTaskSources(state,discussion,language='zh') {
 const d=normalizeDiscussion(discussion),rows=[],en=language==='en';
 const add=(kind,id,part,label,content,to,personal=true,labelEn)=>rows.push({ref:{kind,id,...(part?{part}:{})},label,labelEn,content,to,personal});
 for(const id of new Set([d.career,d.compareCareer,d.task?.left,d.task?.right].filter(Boolean))){
  const profile=careerComparison(id);if(!profile)continue;
  add('career',id,'profile',profile.title,profile,'/careers?career='+id,false,profile.titleEn);
 }
 add('plan','current',null,'当前目标与预算',{goal:state.goal,budget:state.budget,planVersion:state.planVersion},'/plan',true,'Current target and budget');
 for(const task of state.tasks||[]){
  const to=taskRoute(state,task);
  add('task',task.id,'plan',task.title,{title:task.title,purpose:task.purpose,hours:task.hours,due:task.due,status:task.status,standard:task.standard,dependsOn:task.dependsOn},to);
  const attempt=task.attempts?.at(-1),text=task.draft||attempt?.text||task.note;
  const steps=task.projectPractice?.responses;
  if(text||steps&&Object.keys(steps).length)add('task',task.id,'output',task.title+' · '+(en?'Artifact':'产物'),{artifact:text||'',steps,status:task.status,completed:!!task.completed},to);
  if(task.contribution)add('task',task.id,'contribution',task.title+' · '+(en?'Contribution':'本人贡献'),{contribution:task.contribution},to);
 }
 for(const claim of (state.claims||[]).filter(row=>row.status==='已确认'))add('claim',claim.id,null,claim.title,{text:claim.text,contribution:claim.contribution,status:claim.status,version:claim.version},'/assessment?tab=原文确认');
 for(const [kind,key]of [['report','reports'],['resume','resumes'],['review','reviews']])for(const row of state[key]||[])add(kind,row.id,null,row.title||row.id,{text:row.body||row.text||row.result,contribution:row.contribution,version:row.version},kind==='review'?'/plan?tab=复盘':'/reports/'+encodeURIComponent(row.id));
 if(d.task&&hasTaskInput(d.task))add('statement','task-input',null,'本次讨论说明（未核对）',Object.fromEntries(['goal','time','focus','purpose','note'].filter(key=>d.task[key]).map(key=>[key,d.task[key]])),'/assistant/'+d.task.page,true,'Discussion input (unverified)');
 return rows.map(({content,...row})=>({...row,...(!row.personal?{publicContent:content}:{}),...(d.refs.some(ref=>refKey(ref)===refKey(row.ref))?{selectedContent:content}:{})}));
}

export function patchDemoTaskDiscussion(state,conversationId,patch) {
 return {...state,conversations:state.conversations.map(conv=>conv.id===conversationId?{...conv,discussion:normalizeDiscussion({...conv.discussion,...patch,externalBasis:undefined})}:conv)};
}

export function demoTaskReady(d) {
 return d.task?.page==='next-step'||d.task?.page==='compare'&&!!d.task.left&&!!d.task.right&&d.task.left!==d.task.right||d.task?.page==='expression'&&!!d.task.object;
}
