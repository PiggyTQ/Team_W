import {careerComparison} from '../../src/career-comparison.js';
import {hasTaskInput} from '../../src/assistant-task-model.js';
import {createHash} from 'node:crypto';
import {normalizeDiscussion,refKey} from '../../src/discussion-contract.js';
import {getSkillTree} from '../skill-trees/index.mjs';
import {readSkillWork} from '../../src/skill-learning-model.js';
import {skillRecord} from '../../src/skill-tree-model.js';
import {careers} from '../../src/model.js';
import {taskRoute} from '../../src/flow-navigation.js';
import {PRACTICE_STEPS,guidedTask} from '../../src/practice-project-model.js';
import {businessError} from '../business-error.mjs';
import {materialCareerLinks} from '../../src/career-material-links.js';
export function discussionClaimLinks(claim,careerIds){
 return materialCareerLinks(claim).filter(row=>careerIds.includes(row.career)&&getSkillTree(row.career)?.branches.some(b=>!row.skill||b.leaves.some(l=>l.id===row.skill)));
}
export const discussionHash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=()=>{throw businessError('AI_CONTEXT_CHANGED',409);};
const cut=t=>typeof t==='string'?t.slice(0,6000):'';
export function discussionSources(state,context,courseLibrary=null){
 const d=normalizeDiscussion(context),rows=[];
 if(!careers.some(c=>c.id===d.career)||d.compareCareer&&!careers.some(c=>c.id===d.compareCareer))fail();
 const add=(kind,id,part,label,content,to,personal=true)=>rows.push({ref:{kind,id,...(part?{part}:{})},label,content,to,personal});
 for(const career of [d.career,...d.compareCareer?[d.compareCareer]:[]]){
  const tree=getSkillTree(career);if(!tree)continue;
  add('career',career,null,tree.title?.[0]||careers.find(c=>c.id===career)?.name,{branches:tree.branches.map(b=>({id:b.id,title:b.title,purpose:b.purpose,skills:b.leaves.map(l=>({id:l.id,title:l.title,lesson:l.lesson}))}))}, '/career-map?career='+career,false);
  add('career',career,'profile',careers.find(c=>c.id===career).name,careerComparison(career),'/careers?career='+career,false);
  for(const b of tree.branches)for(const leaf of b.leaves){
   const id=career+':'+leaf.id,record=skillRecord(state.skillStudy,career,leaf),work=readSkillWork(record?.draft||'');
   add('skill',id,'context',leaf.title[0],{career,branch:b.id,skill:leaf.id,title:leaf.title,lesson:leaf.lesson},'/career-map?career='+career+'&branch='+b.id+'&skill='+leaf.id+'&step=practice',false);
   for(const [mode,task]of Object.entries(work.tasks||{})){
    add('skill',id,mode+'-attempt',leaf.title[0]+' · '+mode,{artifact:cut(task.artifact),fields:task.fields},'/career-map?career='+career+'&skill='+leaf.id+'&step=practice');
    if(task.output)add('skill',id,mode+'-output',leaf.title[0]+' · output',task.output,'/career-map?career='+career+'&skill='+leaf.id+'&step=practice');
    if(task.reflection)add('skill',id,mode+'-review',leaf.title[0]+' · review',{reflection:task.reflection,selfReview:task.reviewed,ruleCheck:task.check},'/career-map?career='+career+'&skill='+leaf.id+'&step=practice');
   }
   if(!work.tasks&&work.artifact)add('skill',id,'legacy',leaf.title[0]+' · draft',{artifact:cut(work.artifact),reflection:work.reflection},'/career-map?career='+career+'&skill='+leaf.id+'&step=practice');
   if(record?.assessment)add('skill',id,'feedback',leaf.title[0]+' · feedback',{correct:record.assessment.correct,total:record.assessment.total,passedAt:record.assessment.passedAt||null},'/career-map?career='+career+'&skill='+leaf.id+'&step=check');
  }
 }
 add('plan','current',null,'当前目标与预算',{goal:state.goal,budget:state.budget,planVersion:state.planVersion},'/plan');
 for(const task of state.tasks){
  const route=taskRoute(state,task);
  add('task',task.id,'plan',task.title,{id:task.id,title:task.title,purpose:task.purpose,hours:task.hours,due:task.due,status:task.status,standard:task.standard,dependsOn:task.dependsOn,version:task.version},route);
  const responses=task.projectPractice?.responses||task.projectPractice?.steps||{};
  if(task.note||task.projectPractice)add('task',task.id,'output',task.title+' · output',{status:task.status,completed:!!task.completed,note:cut(task.note),steps:responses},route);
  if(task.contribution)add('task',task.id,'contribution',task.title+' · contribution',{contribution:task.contribution},route);
  let project=null;try{project=guidedTask(task)&&courseLibrary?courseLibrary.course(task.template,task.courseVersion).project:null;}catch{}
  for(const step of guidedTask(task)?(courseLibrary&&!project?[]:PRACTICE_STEPS):Object.keys(responses)){
   const row=responses[step]||{},published=project?.steps.find(item=>item.id===step);
   add('task',task.id,step,task.title+' · '+step,{template:task.template,courseVersion:task.courseVersion,step,...(published?{assignment:published.assignment,publicHint:published.hint,reviewGuide:published.check,sourceIds:published.sourceIds}:{}),note:cut(row.note),evidenceIds:row.evidence||row.evidenceIds,review:row.reviewed},route+'&step='+step);
  }
 }
 for(const claim of state.claims.filter(c=>c.status==='已确认'))add('claim',claim.id,null,claim.title,{title:claim.title,text:cut(claim.text),contribution:claim.contribution,skill:claim.skill,careerLinks:discussionClaimLinks(claim,[d.career,d.compareCareer].filter(Boolean)),associationType:'user_confirmed_task_self_report',version:claim.version,status:claim.status},'/assessment?tab=原文确认');
 for(const kind of ['report','resume','review'])for(const row of state[kind==='report'?'reports':kind==='resume'?'resumes':'reviews']||[])add(kind,row.id,null,row.title||row.id,{text:cut(row.body||row.text||row.result),contribution:row.contribution,version:row.version},kind==='review'?'/plan?tab=复盘':'/reports/'+encodeURIComponent(row.id));
 if(d.task&&hasTaskInput(d.task))add('statement','task-input',null,'本次讨论说明（未核对）',{type:'unverified_discussion_input',...Object.fromEntries(['goal','time','focus','purpose','note'].filter(k=>d.task[k]).map(k=>[k,d.task[k]])),...(d.task.object?{object:d.task.object}:{})},'/assistant/'+d.task.page);
 return rows.map(r=>{
  const leaf=r.ref.kind==='skill'?getSkillTree(r.ref.id.split(':')[0])?.branches.flatMap(b=>b.leaves).find(l=>l.id===r.ref.id.split(':')[1]):null;
  return {...r,...(leaf?{labelEn:leaf.title[1]}:r.ref.kind==='plan'?{labelEn:'Current goal and budget'}:r.ref.kind==='career'?{labelEn:careerComparison(r.ref.id)?.titleEn||r.ref.id}:r.ref.kind==='statement'?{labelEn:'Discussion input (unverified)'}:{}),ref:{...r.ref,stamp:discussionHash(r.content)}};
 });
}
export function resolveDiscussion(state,context,courseLibrary=null){
 const d=normalizeDiscussion(context),catalog=discussionSources(state,d,courseLibrary);
 const selected=d.refs.map(ref=>{
  const source=catalog.find(r=>refKey(r.ref)===refKey(ref));
  if(!source||ref.stamp&&source.ref.stamp!==ref.stamp)fail();
  return source;
 });
 if(d.task&&hasTaskInput(d.task)&&!selected.some(s=>s.ref.kind==='statement'&&s.ref.id==='task-input'))throw businessError('AI_SCOPE_REJECTED',403);
 if(d.task?.page==='next-step'&&selected.filter(s=>s.ref.kind==='task'&&s.ref.part==='plan').length>3)throw businessError('AI_SCOPE_REJECTED',403);
 if(d.task?.page==='expression'&&!d.task.object)throw businessError('AI_SCOPE_REJECTED',403);
 if(d.task?.goal&&!careers.some(c=>c.id===d.task.goal))fail();
 if(d.task?.object&&!catalog.some(s=>s.ref.kind===d.task.object.kind&&s.ref.id===d.task.object.id))fail();
 if(d.task?.page==='expression'&&selected.some(s=>s.ref.kind!=='statement'&&(s.ref.kind!==d.task.object?.kind||s.ref.id!==d.task.object?.id)))throw businessError('AI_SCOPE_REJECTED',403);
 if(d.task?.page==='compare'&&(!d.task.left||!d.task.right||d.task.left===d.task.right||d.career!==d.task.left||d.compareCareer!==d.task.right||![d.task.left,d.task.right].every(id=>selected.some(s=>s.ref.kind==='career'&&s.ref.id===id&&s.ref.part==='profile'))))throw businessError('AI_SCOPE_REJECTED',403);
 if(d.intent==='direction'&&d.compareCareer&&(!selected.some(r=>r.ref.kind==='career'&&r.ref.id===d.career)||!selected.some(r=>r.ref.kind==='career'&&r.ref.id===d.compareCareer)))throw businessError('AI_SCOPE_REJECTED',403);
 if(d.contextNote)selected.push({ref:{kind:'review',id:'coach-context',stamp:discussionHash(d.contextNote)},label:'本步先前问答（待核对）',labelEn:'Earlier step discussion (unconfirmed)',content:{unconfirmedContext:d.contextNote},personal:true,to:selected[0]?.to||'/learning'});
 const basis=discussionHash({intent:d.intent,career:d.career,compareCareer:d.compareCareer,returnStep:d.returnStep,practiceMode:d.practiceMode,task:d.task,refs:selected.map(s=>s.ref)});
 const primary=selected.find(s=>s.ref.kind==='skill');
 const returnRoute=primary&&d.returnStep?primary.to.replace(/step=\w+/,'step='+d.returnStep):null;
 return {discussion:d,selected,basis,returnTo:returnRoute||selected.find(s=>s.ref.kind==='skill'||s.ref.kind==='task'||s.ref.kind==='report'||s.ref.kind==='resume')?.to||'/careers'};
}
export function recentDiscussion(conversation,basis){
 // Saved roles are untrusted data, never provider system/assistant messages.
 return (conversation?.messages||[]).filter(m=>m.discussionBasis===basis&&['user','assistant'].includes(m.role)&&typeof m.text==='string').slice(-6).map(m=>({kind:m.role==='user'?'user_question':'unconfirmed_advice',text:m.text.slice(0,1800)}));
}
