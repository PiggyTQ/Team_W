import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {fresh,makeTask} from '../src/model.js';
import {createBusinessStore} from '../server/business-store.mjs';
import {createAgentWorkflow} from '../server/agent/workflow.mjs';
import {createDiscussionWorkflow} from '../server/agent/discussion-workflow.mjs';
import {resolveDiscussion,discussionSources,recentDiscussion} from '../server/agent/discussion-context.mjs';
import {createAgentService} from '../server/agent/service.mjs';
import {scopeKey,AI_CONSENT_VERSION,agentMessageAvailable} from '../src/agent-contract.js';
import {discussionLocalKey} from '../src/discussion-contract.js';
import {writeSkillWork} from '../src/skill-learning-model.js';
import {createAgentSession} from '../src/agent-session.js';
import {startDiscussion} from '../src/discussion-contract.js';
function fixture(t,intent='plan'){
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('alice'),('bob')");
 const business=createBusinessStore(db);createAgentWorkflow({db,business});const workflow=createDiscussionWorkflow({db,business});
 const rawPreview=workflow.preview;workflow.preview=(user,input)=>{const {baseVersion,conversationId,...payload}=input;const draft=workflow.draftCreate(user,{baseVersion,conversationId,kind:payload.kind});const saved=workflow.draftSave(user,{id:draft.id,revision:draft.revision,payload});return rawPreview(user,{baseVersion,conversationId,draftId:saved.id});};
 const state=fresh();state.budget=4;state.tasks=[{...makeTask(state,{title:'SQL scope',hours:2,purpose:'Compare counts',template:'external'}),id:'task-one'},{...makeTask(state,{title:'Review',hours:2,purpose:'Review results',template:'external'}),id:'task-two'}];
 state.conversations=[{id:'topic',title:'Weekly scope',mode:'职业咨询',messages:[],discussion:{intent,career:'data',refs:[{kind:'plan',id:'current'},{kind:'task',id:'task-one',part:'plan'},{kind:'task',id:'task-two',part:'plan'}]}}];state.conversationId='topic';
 const save=()=>business.save('alice',{state,baseVersion:business.read('alice').revision,mutationId:randomUUID()});save();
 t.after(()=>db.close());return {db,business,workflow,state,save,rawPreview};
}
test('three-hour preview updates original tasks atomically, keeps IDs and persists an idempotent receipt',t=>{
 const f=fixture(t),edits=f.state.tasks.map(t=>({taskId:t.id,hours:1.5,due:'2026-12-01',status:'待开始',purpose:t.purpose}));
 const p=f.workflow.preview('alice',{baseVersion:1,conversationId:'topic',kind:'plan',edits,budget:3});assert.equal(f.business.read('alice').state.budget,4);assert.equal(p.budget.remaining,0);
 const input={id:p.id,baseVersion:1,mutationId:randomUUID(),confirmation:'APPLY_DISCUSSION'};
 const r=f.workflow.apply('alice',input);assert.equal(f.workflow.apply('alice',input).duplicate,true);
 const next=f.business.read('alice').state;assert.deepEqual(next.tasks.map(t=>t.id),['task-one','task-two']);assert.deepEqual(next.tasks.map(t=>Number(t.hours)),[1.5,1.5]);assert.equal(next.budget,3);
 assert.equal(next.conversations[0].discussionReceipt.proposalId,p.id);assert.equal(f.workflow.history('alice',{baseVersion:r.revision,conversationId:'topic'}).items[0].receipt.proposalId,p.id);
 assert.throws(()=>f.workflow.apply('bob',input),{code:'NOT_FOUND'});
});
test('over-budget, invalid dependency and stale source previews do not change the plan',t=>{
 const f=fixture(t),edit={taskId:'task-one',hours:2,due:'',status:'待开始',purpose:'Keep scope'};
 assert.throws(()=>f.workflow.preview('alice',{baseVersion:1,conversationId:'topic',kind:'plan',edits:[edit],budget:1}));
 const p=f.workflow.preview('alice',{baseVersion:1,conversationId:'topic',kind:'plan',edits:[{...edit,hours:1}],budget:3});
 f.state.tasks[0].purpose='changed scope';f.save();assert.throws(()=>f.workflow.apply('alice',{id:p.id,baseVersion:1,mutationId:randomUUID(),confirmation:'APPLY_DISCUSSION'}),{code:'VERSION_CONFLICT'});
 assert.equal(f.business.read('alice').state.tasks.length,2);
});
test('expression creates pending evidence only, never a completed action or confirmed experience',t=>{
 const f=fixture(t,'expression');
 // Synthetic pre-existing completed project: explicitly self-recorded, not AI-certified.
 f.state.tasks[0]={...f.state.tasks[0],mode:'recorded',recordedOnly:true,status:'完成',completed:true,note:'Observed output recorded.',contribution:'Wrote the query.'};f.save();
 const p=f.workflow.preview('alice',{baseVersion:2,conversationId:'topic',kind:'candidate',draft:{title:'Query review',text:'Compared output;limits remain.',contribution:'Wrote the query.'}});
 f.workflow.apply('alice',{id:p.id,baseVersion:2,mutationId:randomUUID(),confirmation:'APPLY_DISCUSSION'});
 const state=f.business.read('alice').state;assert.equal(state.tasks.length,2);assert.equal(state.claims.at(-1).status,'待确认');assert.equal(state.tasks.filter(t=>t.completed).length,1);assert.equal(Object.keys(state.skillStudy||{}).length,0);
});
test('SQL sources disclose selected attempts/output only, never saved assessment answers or unselected reflections',t=>{
 const f=fixture(t,'learning');f.state.skillStudy={'data:sql-joins:v1':{draft:writeSkillWork({artifact:'',reflection:'',answers:{q1:'UNPUBLISHED_CHOICE'},tasks:{independent:{kind:'sql',artifact:'SELECT * FROM orders',fields:{},reflection:'PRIVATE_REVIEW',hints:[],reviewed:false,output:{columns:['id'],rows:[[1]],engine:'SQLite'}}}})}};
 const catalog=discussionSources(f.state,{intent:'learning',career:'data',refs:[]});const attempt=catalog.find(s=>s.ref.id==='data:sql-joins'&&s.ref.part==='independent-attempt');assert.ok(attempt);
 const d={intent:'learning',career:'data',refs:[attempt.ref]},result=resolveDiscussion(f.state,d);assert.match(JSON.stringify(result.selected),/SELECT/);assert.doesNotMatch(JSON.stringify(result.selected),/UNPUBLISHED_CHOICE|PRIVATE_REVIEW/);
 const key=discussionLocalKey(f.state,d);f.state.skillStudy['data:sql-joins:v1'].draft='changed';assert.throws(()=>resolveDiscussion(f.state,d),{code:'AI_CONTEXT_CHANGED'});assert.equal(agentMessageAvailable(f.state,{text:'old',sourceDiscussion:d,sourceDiscussionKey:key}),false);
});
test('comparison requires both chosen career sources; invalid context is rejected rather than inferred',t=>{
 const f=fixture(t,'direction');assert.throws(()=>resolveDiscussion(f.state,{intent:'direction',career:'data',compareCareer:'ai',refs:[{kind:'career',id:'data'}]}),{code:'AI_SCOPE_REJECTED'});
 assert.equal(resolveDiscussion(f.state,{intent:'direction',career:'data',compareCareer:'ai',refs:[{kind:'career',id:'data'},{kind:'career',id:'ai'}]}).selected.length,2);
});
test('controlled provider receives bounded unconfirmed recent turns and selected scope; legacy consent does not authorize new sources',async t=>{
 const f=fixture(t,'plan');f.state.aiScope=['职业原创知识'];f.state.aiExternalConsent={version:AI_CONSENT_VERSION,provider:'DeepSeek',accepted:true,scopeKey:scopeKey(f.state),grantId:'local-test-consent-0001'};
 const conv=f.state.conversations[0],resolved=resolveDiscussion(f.state,conv.discussion);conv.messages=Array.from({length:12},(_,i)=>({id:'m'+i,role:i%2?'assistant':'user',text:i===11?'Option two is smaller.':'old '+i,discussionBasis:resolved.basis}));
 let content,calls=0;const service=createAgentService({business:f.business,enabled:true,provider:{respond:async input=>{calls++;content=JSON.parse(input.messages[1].content);return {output:{statements:[{kind:'suggestion',text:'Review option two.',evidenceIds:[]}],limitations:[]}};}}});
 f.save();const request={baseVersion:2,conversationId:'topic',mode:'career_consultation',message:'Adjust the second option',scope:{confirmedClaims:false,currentPlan:false},context:{workspace:'U11',career:'data'}};
 await assert.rejects(service.respond('alice',request),{code:'AI_CONSENT_REQUIRED'});assert.equal(calls,0);
 conv.discussion.externalBasis=resolved.basis;f.save();await service.respond('alice',{...request,baseVersion:3});
 assert.equal(content.recentDiscussion.length,6);assert.equal(content.recentDiscussion.at(-1).kind,'unconfirmed_advice');assert.match(content.recentDiscussion.at(-1).text,/Option two/);assert.equal(content.evidence.length,3);assert.equal(calls,1);
 assert.equal(recentDiscussion(conv,'different-topic').length,0);
});
test('returning from the same skill keeps one conversation and discards old scope authorization',t=>{
 const f=fixture(t,'learning'),context={intent:'learning',career:'data',refs:[{kind:'skill',id:'data:sql-joins',part:'context'}]};
 let state=startDiscussion(f.state,context,'How do I check the grain?');
 state.conversations.find(c=>c.id===state.conversationId).discussion.refs.push({kind:'task',id:'task-one',part:'plan'});
 const guided=resolveDiscussion(state,{...context,returnStep:'practice',practiceMode:'guided'}).basis,independent=resolveDiscussion(state,{...context,returnStep:'practice',practiceMode:'independent'}).basis;assert.notEqual(guided,independent);
 const id=state.conversationId;state=startDiscussion(state,context);assert.equal(state.conversationId,id);assert.equal(state.conversations.filter(c=>c.discussion?.refs.some(r=>r.id==='data:sql-joins')).length,1);assert.equal(state.conversations.find(c=>c.id===id).discussion.externalBasis,undefined);
});
test('discussion model requests exclude legacy broad scopes and reject late results after a selected task changes',async t=>{
 const f=fixture(t);f.state.aiScope=['职业原创知识','当前目标与计划'];f.state.aiExternalConsent={version:AI_CONSENT_VERSION,provider:'DeepSeek',accepted:true,scopeKey:scopeKey(f.state),grantId:'local-session-consent-0001'};
 let resolve,payload;const current={ownerId:'alice',state:f.state,workspaceRevision:1,context:{workspace:'U11',career:'data'}};
 const session=createAgentSession({getCurrent:()=>current,flush:()=>{},request:p=>{payload=p;return new Promise(r=>resolve=r);}});
 const pending=session.send({message:'Explain the smaller option',mode:'职业咨询',context:current.context});await new Promise(r=>setTimeout(r,0));
 assert.deepEqual(payload.scope,{confirmedClaims:false,currentPlan:false});f.state.tasks[0].purpose='New scope';session.revalidate();await assert.rejects(pending,{code:'AI_CONTEXT_CHANGED'});resolve?.({});
});
test('confirmed coarse labels stay unmapped, exact selected skill identities link without claiming mastery',t=>{
 const f=fixture(t);f.state.claims=[{id:'evidence',title:'My attempt',text:'I tried it.',skill:'SQL',status:'已确认',version:1}];f.state.conversations[0].discussion={intent:'expression',career:'data',refs:[{kind:'claim',id:'evidence'}]};f.save();
 assert.deepEqual(f.workflow.review('alice',{baseVersion:2,conversationId:'topic'}).associations[0].skillIds,[]);
 f.state.claims[0].skill='data:sql-joins';f.save();const row=f.workflow.review('alice',{baseVersion:3,conversationId:'topic'}).associations[0];assert.deepEqual(row.skillIds,['sql-joins']);assert.equal(row.status,'user_confirmed_unverified');
 const d=f.state.conversations[0].discussion,key=discussionLocalKey(f.state,d);f.state.claims[0].status='已撤回';f.save();
 assert.throws(()=>f.workflow.review('alice',{baseVersion:4,conversationId:'topic'}),{code:'AI_CONTEXT_CHANGED'});assert.equal(agentMessageAvailable(f.state,{text:'old note',sourceDiscussion:d,sourceDiscussionKey:key}),false);
});


test('draft A retains its text across source B selection and refresh but cannot preview or apply there',t=>{
 const f=fixture(t),base={baseVersion:1,conversationId:'topic'};
 const a=f.workflow.draftCreate('alice',{...base,kind:'plan'});
 const payload={...a.payload,edits:[{...a.payload.edits[0],purpose:'A-only edited scope'}]};
 const saved=f.workflow.draftSave('alice',{id:a.id,revision:a.revision,payload});
 const p=f.rawPreview('alice',{...base,draftId:a.id});
 assert.equal(p.changes[0].before.purpose,'Compare counts');assert.equal(p.changes[0].after.purpose,'A-only edited scope');
 f.state.conversations[0].discussion.refs=[{kind:'task',id:'task-two',part:'plan'}];f.save();
 const invalid=f.workflow.draftGet('alice',{id:a.id});assert.equal(invalid.valid,false);assert.equal(invalid.payload.edits[0].purpose,'A-only edited scope');
 assert.throws(()=>f.rawPreview('alice',{baseVersion:2,conversationId:'topic',draftId:a.id}),{code:'AI_CONTEXT_CHANGED'});
 assert.throws(()=>f.workflow.draftSave('alice',{id:a.id,revision:saved.revision,payload}),{code:'AI_CONTEXT_CHANGED'});
 assert.throws(()=>f.workflow.apply('alice',{id:p.id,baseVersion:2,mutationId:randomUUID(),confirmation:'APPLY_DISCUSSION'}));
 f.state.conversations[0].discussion.refs=a.context.refs;f.save();assert.equal(f.workflow.draftGet('alice',{id:a.id}).valid,true);
 f.state.tasks[0].purpose='A changed';f.save();assert.equal(f.workflow.draftGet('alice',{id:a.id}).valid,false);
 assert.equal(f.workflow.draftGet('alice',{id:a.id}).payload.edits[0].purpose,'A-only edited scope');
 assert.throws(()=>f.workflow.draftGet('bob',{id:a.id}),{code:'NOT_FOUND'});
});

test('selected server-issued suggestion converts once with provenance, edited payload stays scoped and versions protect previews',t=>{
 const f=fixture(t),saved=f.business.read('alice'),conv=saved.state.conversations[0],c={...saved,conv,...resolveDiscussion(saved.state,conv.discussion)};
 const edits=f.state.tasks.map(task=>({taskId:task.id,hours:1.5,due:'2026-12-01',status:'待开始',purpose:'Reduced scope'}));
 const result={statements:[{kind:'suggestion',text:'Selected second option',draft:{kind:'plan',budget:3,edits}}]};
 const refs=f.business.issueDiscussionSuggestions('alice',conv.id,result);assert.equal(refs.length,1);
 const input={baseVersion:1,conversationId:conv.id,suggestionId:refs[0].id},a=f.workflow.draftCreate('alice',input);assert.equal(a.suggestion,'Selected second option');assert.equal(a.payload.budget,3);
 const edited=f.workflow.draftSave('alice',{id:a.id,revision:a.revision,payload:{...a.payload,edits:a.payload.edits.map(e=>({...e,purpose:'Personal revision'}))}});
 assert.equal(f.workflow.draftCreate('alice',input).id,a.id);assert.equal(f.workflow.draftCreate('alice',input).payload.edits[0].purpose,'Personal revision');
 assert.throws(()=>f.workflow.draftSave('alice',{id:a.id,revision:a.revision,payload:a.payload}),{code:'VERSION_CONFLICT'});
 assert.throws(()=>f.workflow.draftSave('alice',{id:a.id,revision:edited.revision,payload:{...edited.payload,edits:[{...edits[0],taskId:'foreign-task'}]}}),{code:'AI_SCOPE_REJECTED'});
 assert.throws(()=>f.rawPreview('alice',{baseVersion:1,conversationId:conv.id,kind:'plan',edits,budget:3}),{code:'INVALID_REQUEST'});
 const p=f.rawPreview('alice',{baseVersion:1,conversationId:conv.id,draftId:a.id});
 f.workflow.draftSave('alice',{id:a.id,revision:edited.revision,payload:a.payload});
 assert.throws(()=>f.workflow.apply('alice',{id:p.id,baseVersion:1,mutationId:randomUUID(),confirmation:'APPLY_DISCUSSION'}),{code:'VERSION_CONFLICT'});
});

test('withdrawn confirmed material invalidates retained expression draft and cannot be sent or confirmed',t=>{
 const f=fixture(t,'expression');f.state.claims=[{id:'confirmed',title:'Synthetic source',text:'Original statement',contribution:'My part',skill:'未知',status:'已确认',version:1}];
 f.state.conversations[0].discussion.refs=[{kind:'claim',id:'confirmed'}];f.save();
 const draft=f.workflow.draftCreate('alice',{baseVersion:2,conversationId:'topic',kind:'candidate'});assert.equal(draft.payload.draft.text,'Original statement');
 f.state.claims[0].status='已撤回';f.save();assert.equal(f.workflow.draftGet('alice',{id:draft.id}).valid,false);assert.equal(f.workflow.draftList('alice',{conversationId:'topic'}).items[0].payload.draft.text,'Original statement');
 assert.throws(()=>f.rawPreview('alice',{baseVersion:3,conversationId:'topic',draftId:draft.id}),{code:'AI_CONTEXT_CHANGED'});
});


test('free discussion without attachments calls only the controlled provider, carries no private records and still requires consent',async t=>{
 const f=fixture(t,'direction');f.state.conversations[0].discussion={intent:'direction',career:'data',refs:[]};
 f.state.aiScope=[];f.state.aiExternalConsent={version:AI_CONSENT_VERSION,provider:'DeepSeek',accepted:true,scopeKey:scopeKey(f.state),grantId:'local-free-chat-consent'};
 let content;const service=createAgentService({business:f.business,enabled:true,provider:{respond:async input=>{content=JSON.parse(input.messages[1].content);return {output:{statements:[{kind:'question',text:'Which part would you like to clarify first?',evidenceIds:[]}],limitations:[]}};}}});
 f.save();const input={baseVersion:2,conversationId:'topic',mode:'career_consultation',message:'I am unsure how to start.',scope:{confirmedClaims:false,currentPlan:false},context:{workspace:'U11',career:'data'}};
 await assert.rejects(service.respond('alice',input),{code:'AI_CONSENT_REQUIRED'});
 f.state.conversations[0].discussion.externalBasis=resolveDiscussion(f.state,f.state.conversations[0].discussion).basis;f.save();
 const r=await service.respond('alice',{...input,baseVersion:3});assert.deepEqual(content.evidence,[]);assert.equal(r.meta.providerCalled,true);assert.equal(r.statements[0].kind,'question');assert.equal(r.suggestionRefs,undefined);
});

test('non-SQL course guidance stays at clues and methods; assessment answers remain private',t=>{
 const f=fixture(t,'learning');f.state.conversations[0].discussion={intent:'learning',career:'testing',refs:[{kind:'skill',id:'testing:decision-tables',part:'context'}]};f.save();
 const r=f.workflow.review('alice',{baseVersion:2,conversationId:'topic',hintLevel:2});assert.equal(r.hintLevel,2);assert.match(r.statements[0].text,/条件/);assert.equal(r.statements.length,2);assert.doesNotMatch(r.statements.map(s=>s.text).join(' '),/0、0、0|基本运费/);
});
