import {practiceKind} from '../../src/skill-practice-tasks.js';
import {createDiscussionDrafts} from './discussion-drafts.mjs';
import {randomUUID} from 'node:crypto';
import {businessError,canonicalWorkspace} from '../business-store.mjs';
import {usedHours} from '../../src/model.js';
import {validateTaskEdit} from '../../src/task-edit-model.js';
import {resolveDiscussion,discussionSources,discussionHash} from './discussion-context.mjs';
import {getSkillTree} from '../skill-trees/index.mjs';
const fail=(code='INVALID_REQUEST',status=400)=>{throw businessError(code,status);};
const keys=(v,list)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>list.includes(k));
export function createDiscussionWorkflow({db,business,now=Date.now}){
 const drafts=createDiscussionDrafts({db,business,now});
 const atomic=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
 const current=(user,input)=>{
  const saved=business.read(user);if(saved.revision!==input.baseVersion)fail('VERSION_CONFLICT',409);
  const conv=saved.state.conversations.find(c=>c.id===input.conversationId&&!c.archived);if(!conv?.discussion)fail('NOT_FOUND',404);
  return {...saved,conv,...resolveDiscussion(saved.state,conv.discussion,business.courseLibrary)};
 };
 function sources(user,input){
  if(!keys(input,['discussion']))fail();
  return {items:discussionSources(business.read(user).state,input.discussion,business.courseLibrary).map(({content,...row})=>({...row,...(row.ref.kind==='career'&&row.ref.part==='profile'?{publicContent:content}:{}),...(input.discussion?.task&&input.discussion.refs.some(ref=>ref.kind===row.ref.kind&&ref.id===row.ref.id&&ref.part===row.ref.part&&(!ref.stamp||ref.stamp===row.ref.stamp))?{selectedContent:content}:{})}))};
 }
 function review(user,input){
  if(!keys(input,['baseVersion','conversationId','hintLevel'])||input.hintLevel!==undefined&&![1,2,3].includes(input.hintLevel))fail();
  const c=current(user,input),en=c.conv.discussionLanguage==='en';
  const tips=c.discussion.intent==='learning'?
   [['先定位输入、粒度与实际输出的差异。','Locate the difference between inputs,grain and actual output.'],['逐个核对匹配次数、缺失值和排除条件，再修改最小范围。','Check match counts,missing values and exclusions before changing the smallest part.'],['修改后回原练习运行，对照输出并写下限制；最终检验仍在技能页提交。','Run the revision in the original exercise and record limits;submit the final check on its skill page.']]:c.discussion.intent==='plan'?
   [['先选择原任务和目标预算；没有选择的任务保持原样。','Select original tasks and the target budget;unselected tasks remain unchanged.'],['比较缩小投入和延后日期，再预览依赖、排期与总预算。','Compare reduced effort with later dates,then preview dependencies,scheduling and budget.']]:c.discussion.intent==='expression'?
   [['按做了什么、实际结果、本人贡献和未验证范围整理；保留原文。','Organize actions,observed results,personal contribution and unverified scope;retain original wording.'],['草稿只形成待确认材料，不会记为完成或能力证明。','A draft becomes a pending claim,never completion or proof of mastery.']]:
   [['先明确比较双方，并各自选择职业依据；缺少的一方保持未知。','Choose both careers and evidence for each;missing evidence remains unknown.']];
  const skillSource=c.selected.find(s=>s.ref.kind==='skill'),kind=skillSource?practiceKind(skillSource.ref.id):null;
  if(c.discussion.intent==='learning'&&['decision','handoff','alert'].includes(kind)){
   const specific={decision:[['先固定一个条件，逐项列出另一个条件的取值，不急着填最终动作。','Hold one condition fixed and enumerate the other before deciding the action.'],['分别核对规则是否覆盖每种组合，以及刚好达到阈值的情况。','Check coverage of each combination and the exact threshold separately.'],['回原练习检查组合动作；说明哪一条业务规则支持你的选择。','Check the actions in the original exercise and explain the supporting business rule.']],handoff:[['先区分能直接观察的事实、证据和仍未知的范围。','Separate observed facts, evidence and unknown scope first.'],['把每个判断连回日志编号；没有证据的根因保持未知。','Link each judgment to a log ID; keep unsupported root causes unknown.'],['回原练习检查结构与引用，开放判断仍由本人对照材料复核。','Check structure and references in the exercise; review open judgments against the materials yourself.']],alert:[['先从当前时间段的请求计数和错误计数开始，保留分母。','Start with request/error counts for the current interval and retain the denominator.'],['比较短峰、持续异常与低流量，再检查规则持续时间和请求下限。','Compare spikes, sustained errors and low traffic before checking duration and volume gates.'],['回原练习运行规则，对照触发时间，写下噪声与发现延迟的取舍。','Run the rule in the exercise, compare firing times and record the noise/detection-delay trade-off.']]};tips.splice(0,tips.length,...specific[kind]);
  }
  if(c.discussion.intent==='learning'&&c.selected.some(s=>s.ref.id==='data:sql-joins')){
   const output=c.selected.find(s=>s.ref.part?.endsWith('-output'));
   if(output)tips.unshift([`选中运行输出有 ${output.content.rows.length} 行。先按订单编号检查同一订单是否出现多次。`,`The selected output contains ${output.content.rows.length} rows. Check whether the same order appears more than once.`]);
  }
  const stepSource=c.selected.find(source=>source.content.publicHint);
  if(c.discussion.intent==='learning'&&stepSource)tips.unshift([stepSource.content.publicHint.zh,stepSource.content.publicHint.en]);
  const level=input.hintLevel||c.discussion.hintLevel||1;
  const associations=c.selected.filter(s=>s.ref.kind==='claim').map(source=>({sourceId:source.ref.id,
   sourceVersion:source.content.version,sourceStamp:source.ref.stamp,careerLinks:source.content.careerLinks,
   skillIds:source.content.careerLinks.filter(row=>row.career===c.discussion.career&&row.skill).map(row=>row.skill),
   status:'user_confirmed_unverified'}));
  return {basis:c.basis,returnTo:c.returnTo,sources:c.selected,associations,
   statements:tips.slice(0,c.discussion.intent==='learning'?level:tips.length).map(pair=>({kind:'suggestion',text:pair[en?1:0]})),
   clarification:!c.selected.length?(en?'Select sources for this discussion.':'请选择本次讨论的资料。'):null,source:'on_site_rules',hintLevel:level,readOnly:true};
 }
 function preview(user,input){
  if(!keys(input,['baseVersion','conversationId','draftId']))fail();
  return atomic(()=>{
   const bound=drafts.verified(user,input);input={...input,...bound.payload};
   const c=current(user,input);let next=c.state,changes=[],candidate=null;
   if(!c.selected.length)fail('AI_SCOPE_REJECTED',403);
   if(input.kind==='plan'){
    if(!Array.isArray(input.edits)||input.edits.length<1||input.edits.length>30||new Set(input.edits.map(e=>e.taskId)).size!==input.edits.length)fail();
    const selectedIds=new Set(c.selected.filter(s=>s.ref.kind==='task'&&s.ref.part==='plan').map(s=>s.ref.id));
    let tasks=[...c.state.tasks];
    for(const edit of input.edits){
     if(!keys(edit,['taskId','hours','due','status','purpose'])||!selectedIds.has(edit.taskId))fail('AI_SCOPE_REJECTED',403);
     const before=tasks.find(t=>t.id===edit.taskId);if(!before||before.completed)fail('INVALID_TASK_STATE',409);
     if(!Number.isFinite(edit.hours)||edit.hours<=0||edit.hours>168||!['待开始','进行中','受阻','延期'].includes(edit.status)||typeof edit.due!=='string'||edit.due&&!/^\d{4}-\d{2}-\d{2}$/.test(edit.due)||typeof edit.purpose!=='string'||!edit.purpose.trim()||edit.purpose.length>4000)fail();
     if(edit.due&&(!Number.isFinite(Date.parse(edit.due+'T00:00:00Z'))||new Date(edit.due+'T00:00:00Z').toISOString().slice(0,10)!==edit.due))fail();
     const after={...before,hours:edit.hours,due:edit.due,status:edit.status,purpose:edit.purpose,version:before.version+1};
     if(Number(before.hours)!==after.hours||before.due!==after.due||before.status!==after.status||before.purpose!==after.purpose){tasks=tasks.map(t=>t.id===before.id?after:t);changes.push({before,after,operation:edit.status==='延期'?'defer':'modify'});}
    }
    const budget=input.budget===undefined?Number(c.state.budget):input.budget;if(!Number.isFinite(budget)||budget<=0||budget>168)fail();
    next={...next,tasks,budget,planVersion:next.planVersion+1,proposal:null,analysisStale:!!next.analysis};
    for(const change of changes)if(validateTaskEdit(next,change.before,change.after))fail('INVALID_TASK_STATE',409);
   }else if(input.kind==='candidate'){
    const d=input.draft;
    if(!keys(d,['title','text','contribution'])||['title','text','contribution'].some(k=>typeof d[k]!=='string'||!d[k].trim()||d[k].length>(k==='title'?200:6000)))fail();
    if(!c.selected.some(s=>['task','claim','report','resume','skill','review'].includes(s.ref.kind)))fail('AI_SCOPE_REJECTED',403);
    candidate={id:randomUUID(),...d,skill:'未知',status:'待确认',version:1,origin:'讨论草稿待本人核对',owner:user,discussionId:c.conv.id};
    next={...next,claims:[...next.claims,candidate],profileVersion:next.profileVersion+1,analysisStale:!!next.analysis};
   }else fail();
   canonicalWorkspace(next,user,business.courseLibrary.map());
   const id=randomUUID(),p={schema:'discussion-action',id,draftId:bound.id,draftRevision:bound.revision,kind:input.kind,baseVersion:c.revision,conversationId:c.conv.id,basis:c.basis,context:c.discussion,
    expiresAt:now()+600000,changes:changes.map(({before,after,operation})=>({id:before.id,title:before.title,operation,before:{hours:before.hours,due:before.due,status:before.status,purpose:before.purpose},after:{hours:after.hours,due:after.due,status:after.status,purpose:after.purpose}})),
    retained:c.state.tasks.filter(t=>!changes.some(ch=>ch.before.id===t.id)).map(t=>({id:t.id,title:t.title})),
    dependencies:next.tasks.filter(t=>t.dependsOn?.some(id=>changes.some(ch=>ch.before.id===id))).map(t=>({id:t.id,title:t.title,dependsOn:t.dependsOn,due:t.due,status:t.status})),
    budget:{before:Number(c.state.budget),after:Number(next.budget),allocatedBefore:usedHours(c.state),allocatedAfter:usedHours(next),remaining:Number(next.budget)-usedHours(next)},candidate,
    nextTasks:input.kind==='plan'?next.tasks:null,returnTo:input.kind==='candidate'?'/assessment?tab=原文确认':'/plan?tab=执行&task='+encodeURIComponent(changes[0]?.before.id||'')};
   db.prepare('INSERT INTO agent_proposals VALUES(?,?,?,?,?,?,NULL,NULL)').run(id,user,c.revision,c.basis,JSON.stringify(p),p.expiresAt);
   return p;
  });
 }
 function apply(user,input){
  if(!keys(input,['id','baseVersion','mutationId','confirmation'])||input.confirmation!=='APPLY_DISCUSSION'||typeof input.mutationId!=='string'||!/^[-a-zA-Z0-9]{16,100}$/.test(input.mutationId))fail('CONFIRMATION_REQUIRED');
  return atomic(()=>{
   const row=db.prepare('SELECT * FROM agent_proposals WHERE id=? AND user_id=?').get(input.id,user);if(!row)fail('NOT_FOUND',404);
   if(row.receipt_json){if(row.mutation_id!==input.mutationId||row.base_version!==input.baseVersion)fail('IDEMPOTENCY_MISMATCH',409);return {...JSON.parse(row.receipt_json),duplicate:true};}
   const p=JSON.parse(row.payload_json);if(p.schema!=='discussion-action'||p.expiresAt<=now())fail('PROPOSAL_EXPIRED',409);
   if(db.prepare('SELECT 1 FROM agent_proposals WHERE mutation_id=? AND user_id=?').get(input.mutationId,user))fail('IDEMPOTENCY_MISMATCH',409);
   const c=current(user,{...input,conversationId:p.conversationId});if(c.basis!==p.basis||c.revision!==p.baseVersion)fail('AI_CONTEXT_CHANGED',409);
   const bound=drafts.verified(user,{draftId:p.draftId,conversationId:p.conversationId});if(bound.revision!==p.draftRevision)fail('VERSION_CONFLICT',409);
   const state=p.kind==='plan'?{...c.state,tasks:p.nextTasks,budget:p.budget.after,planVersion:c.state.planVersion+1,proposal:null,analysisStale:!!c.state.analysis}:
    {...c.state,claims:[...c.state.claims,p.candidate],profileVersion:c.state.profileVersion+1,analysisStale:!!c.state.analysis};
   const receipt={proposalId:p.id,draftId:p.draftId,revision:c.revision+1,kind:p.kind,objectIds:p.kind==='plan'?p.changes.map(c=>c.id):[p.candidate.id],returnTo:p.returnTo,appliedAt:now()};
   const catalog=discussionSources(state,p.context,business.courseLibrary);
   const nextContext={...p.context,externalBasis:undefined,refs:p.context.refs.map(ref=>catalog.find(row=>row.ref.kind===ref.kind&&row.ref.id===ref.id&&row.ref.part===ref.part)?.ref).filter(Boolean)};
   state.conversations=state.conversations.map(conv=>conv.id===p.conversationId?{...conv,discussion:nextContext,discussionReceipt:receipt}:conv);
   const saved=business.save(user,{state,baseVersion:c.revision,mutationId:input.mutationId},{trustedCommand:true,auditCode:'DISCUSSION_APPLIED'});
   db.prepare('UPDATE agent_proposals SET receipt_json=?,mutation_id=? WHERE id=?').run(JSON.stringify(receipt),input.mutationId,p.id);return receipt;
  });
 }
 function history(user,input){
  const c=current(user,input);
  return {basis:c.basis,returnTo:c.returnTo,items:db.prepare('SELECT payload_json,receipt_json FROM agent_proposals WHERE user_id=? ORDER BY rowid DESC LIMIT 60').all(user).flatMap(row=>{const p=JSON.parse(row.payload_json);return p.schema==='discussion-action'&&p.conversationId===c.conv.id?[{preview:p.basis===c.basis&&p.expiresAt>now()&&!row.receipt_json?p:null,receipt:row.receipt_json?JSON.parse(row.receipt_json):null}]:[];})};
 }
 return {sources,review,preview,apply,history,draftCreate:drafts.create,draftGet:drafts.get,draftSave:drafts.save,draftList:drafts.list};
}
