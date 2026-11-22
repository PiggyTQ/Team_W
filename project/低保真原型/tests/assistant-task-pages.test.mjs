import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {fresh,makeTask,usedHours} from '../src/model.js';
import {createBusinessStore} from '../server/business-store.mjs';
import {createAgentWorkflow} from '../server/agent/workflow.mjs';
import {createDiscussionWorkflow} from '../server/agent/discussion-workflow.mjs';
import {discussionSources,resolveDiscussion} from '../server/agent/discussion-context.mjs';
import {normalizeDiscussion,discussionLocalKey,startDiscussion} from '../src/discussion-contract.js';
import {assistantTaskPage,ensureAssistantConversation,chooseComparison,chooseTaskObject,taskInputDiscussion,discussionRoute} from '../src/assistant-task-model.js';
import {careerComparison} from '../src/career-comparison.js';
import {normalizeWorkspaceRoute} from '../src/route-model.js';
function fixture(t,page='next-step'){
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('a'),('b')");
 const business=createBusinessStore(db);createAgentWorkflow({db,business});const workflow=createDiscussionWorkflow({db,business});t.after(()=>db.close());
 let state=fresh();state.budget=4;state.goal='data';state.tasks=[{...makeTask(state,{title:'A',purpose:'Check original grain',hours:2,template:'external'}),id:'a-task',owner:'a',note:'Observed three rows',contribution:'I checked grain.'},{...makeTask(state,{title:'B',purpose:'Review limits',hours:2,template:'external'}),id:'b-task',owner:'a',note:'NOT_SELECTED_PRIVATE'}];
 state=ensureAssistantConversation(state,page).state;
 const save=()=>business.save('a',{state,baseVersion:business.read('a').revision,mutationId:randomUUID()});
 const set=s=>{state=s;return state;};const conv=()=>state.conversations.find(c=>c.id===state.conversationId);
 return {db,business,workflow,get state(){return state;},set,save,conv};
}
test('three private task identities and legacy links preserve their own routes',()=>{
 for(const page of ['next-step','compare','expression'])assert.equal(assistantTaskPage('/assistant/'+page),page);
 assert.equal(assistantTaskPage('/assistant/unknown'),null);
 assert.equal(normalizeWorkspaceRoute('/assistant/compare?discussion=opaque&tab=bad').to,'/assistant/compare?discussion=opaque');
 assert.equal(normalizeWorkspaceRoute('/assistant?tab='+encodeURIComponent('自然语言检索')).to,'/assistant?tab='+encodeURIComponent('自然语言检索'));
 let s=fresh();for(const page of [null,'next-step','compare','expression']){const r=ensureAssistantConversation(s,page);s=r.state;r.conversation.discussion={...(r.conversation.discussion||{intent:'direction',career:'data',refs:[]}),question:'own-'+page};}
 assert.equal(s.conversations.filter(c=>c.discussion?.task).length,3);
 for(const page of ['next-step','compare','expression']){const r=ensureAssistantConversation(s,page);assert.equal(r.conversation.discussion.question,'own-'+page);assert.ok(discussionRoute(r.conversation).startsWith('/assistant/'+page+'?discussion='));}
 assert.equal(ensureAssistantConversation(s,'compare',s.conversationId).error,'NOT_FOUND');
});
test('career pairs and expression objects restore separate questions rather than borrowing old drafts',t=>{
 const f=fixture(t,'compare');f.set(chooseComparison(f.state,f.conv().id,'data','engineering'));const pair=f.conv().id;f.conv().discussion.question='A versus B';
 f.set(chooseComparison(f.state,pair,'engineering','data'));assert.notEqual(f.conv().id,pair);assert.equal(f.conv().discussion.question,'');
 f.set(chooseComparison(f.state,f.conv().id,'data','engineering'));assert.equal(f.conv().id,pair);assert.equal(f.conv().discussion.question,'A versus B');
 f.set(ensureAssistantConversation(f.state,'expression').state);f.set(chooseTaskObject(f.state,f.conv().id,{kind:'task',id:'a-task'}));const a=f.conv().id;f.conv().discussion.question='My contribution';f.conv().discussion=taskInputDiscussion(f.conv().discussion,{note:'UNVERIFIED_A'});
 f.set(chooseTaskObject(f.state,a,{kind:'task',id:'b-task'}));assert.equal(f.conv().discussion.question,'');assert.equal(f.conv().discussion.task.note,'');assert.deepEqual(f.conv().discussion.refs,[]);
 f.set(chooseTaskObject(f.state,f.conv().id,{kind:'task',id:'a-task'}));assert.equal(f.conv().id,a);assert.equal(f.conv().discussion.task.note,'UNVERIFIED_A');
});
test('new task metadata survives account persistence without changing goals, budgets or original records',t=>{
 const f=fixture(t);const before=structuredClone({goal:f.state.goal,budget:f.state.budget,tasks:f.state.tasks});
 f.conv().discussion=taskInputDiscussion(f.conv().discussion,{time:'3 hours/week',goal:'ai',note:'A temporary idea'});f.save();
 const saved=f.business.read('a').state;assert.deepEqual({goal:saved.goal,budget:saved.budget,tasks:saved.tasks},before);
 assert.equal(saved.conversations.find(c=>c.id===f.conv().id).discussion.task.time,'3 hours/week');assert.equal(f.business.read('b').state.conversations.some(c=>c.id===f.conv().id),false);
 assert.equal(usedHours(saved),4);saved.tasks[0].due='2027-01-01';assert.equal(usedHours(saved),4);saved.tasks[0].status='延期';assert.equal(usedHours(saved),2);
});
test('temporary input is selected as unverified source and invalidates authorization and bound drafts',t=>{
 const f=fixture(t);f.conv().discussion=taskInputDiscussion({...f.conv().discussion,refs:[{kind:'task',id:'a-task',part:'plan'}]},{time:'3 hours/week'});f.save();
 const d=f.conv().discussion,resolved=resolveDiscussion(f.state,d),key=discussionLocalKey(f.state,d);assert.equal(resolved.selected.find(s=>s.ref.kind==='statement').content.type,'unverified_discussion_input');
 const draft=f.workflow.draftCreate('a',{baseVersion:1,conversationId:f.conv().id,kind:'plan'});
 f.conv().discussion={...d,externalBasis:resolved.basis};f.conv().discussion=taskInputDiscussion(f.conv().discussion,{time:'2 hours/week'});assert.equal(f.conv().discussion.externalBasis,undefined);assert.notEqual(discussionLocalKey(f.state,f.conv().discussion),key);f.save();assert.equal(f.workflow.draftGet('a',{id:draft.id}).valid,false);
});
test('task metadata, object identities and 12-source boundaries are strict and cannot smuggle text in identity',()=>{
 const d={intent:'expression',career:'data',refs:[],task:{page:'expression',object:{kind:'task',id:'id'}}};
 assert.throws(()=>normalizeDiscussion({...d,task:{...d.task,arbitrary:'x'}}));assert.throws(()=>normalizeDiscussion({...d,task:{...d.task,note:'x'.repeat(2001)}}));assert.throws(()=>normalizeDiscussion({...d,task:{...d.task,object:{kind:'task',id:'private body with spaces'}}}));
 const full={...d,refs:Array.from({length:12},(_,i)=>({kind:'task',id:'t'+i}))};assert.throws(()=>taskInputDiscussion(full,{purpose:'resume'}));
 assert.throws(()=>normalizeDiscussion({...d,intent:'plan'}));
});
test('public comparison projection is server-resolved, versioned and identical to visible editorial content',t=>{
 const f=fixture(t,'compare');f.set(chooseComparison(f.state,f.conv().id,'data','engineering'));f.save();
 const r=f.workflow.sources('a',{discussion:f.conv().discussion}),profiles=r.items.filter(i=>i.ref.kind==='career'&&i.ref.part==='profile');assert.equal(profiles.length,2);
 for(const p of profiles){assert.deepEqual(p.publicContent,careerComparison(p.ref.id));assert.match(p.ref.stamp,/^[a-f0-9]{64}$/);assert.equal(p.publicContent.provenance.type,'project_original');assert.ok(p.publicContent.collaboration.length);}
 const resolved=resolveDiscussion(f.state,f.conv().discussion);assert.deepEqual(resolved.selected.filter(s=>s.ref.kind==='career').map(s=>s.content),profiles.map(p=>p.publicContent));
 assert.equal(r.items.find(i=>i.ref.id==='b-task'&&i.ref.part==='output').selectedContent,undefined);
});
test('one-sided, same-career and legacy-only compare sources cannot produce a complete comparison',t=>{
 const f=fixture(t,'compare');assert.throws(()=>resolveDiscussion(f.state,f.conv().discussion),{code:'AI_SCOPE_REJECTED'});
 f.set(chooseComparison(f.state,f.conv().id,'data','data'));assert.throws(()=>resolveDiscussion(f.state,f.conv().discussion),{code:'AI_SCOPE_REJECTED'});
 f.set(chooseComparison(f.state,f.conv().id,'data','ai'));const d=f.conv().discussion;assert.throws(()=>resolveDiscussion(f.state,{...d,refs:[{kind:'career',id:'data'},{kind:'career',id:'ai'}]}),{code:'AI_SCOPE_REJECTED'});
 const basis=resolveDiscussion(f.state,d).basis;assert.notEqual(resolveDiscussion(f.state,taskInputDiscussion(d,{focus:'outputs'})).basis,basis);
});
test('selecting expression object does not select any part; wrong-object or withdrawn sources fail closed',t=>{
 const f=fixture(t,'expression');f.set(chooseTaskObject(f.state,f.conv().id,{kind:'task',id:'a-task'}));assert.equal(f.conv().discussion.refs.length,0);
 f.conv().discussion.refs=[{kind:'task',id:'a-task',part:'output'}];const resolved=resolveDiscussion(f.state,f.conv().discussion);assert.equal(resolved.selected.length,1);assert.equal(resolved.selected[0].content.status,'待开始');assert.ok(!JSON.stringify(resolved).includes('NOT_SELECTED_PRIVATE'));assert.ok(!JSON.stringify(resolved).includes('I checked grain.'));
 assert.throws(()=>resolveDiscussion(f.state,{...f.conv().discussion,refs:[{kind:'task',id:'b-task',part:'output'}]}),{code:'AI_SCOPE_REJECTED'});
 f.state.tasks=f.state.tasks.filter(t=>t.id!=='a-task');assert.throws(()=>resolveDiscussion(f.state,f.conv().discussion),{code:'AI_CONTEXT_CHANGED'});
});
test('task plan and experience drafts retain original business workflow and task-specific return identity',t=>{
 const f=fixture(t);f.conv().discussion.refs=[{kind:'task',id:'a-task',part:'plan'}];f.save();const id=f.conv().id;
 const draft=f.workflow.draftCreate('a',{baseVersion:1,conversationId:id,kind:'plan'});const edited=f.workflow.draftSave('a',{id:draft.id,revision:draft.revision,payload:{...draft.payload,edits:[{...draft.payload.edits[0],hours:1,purpose:'Reduced to one table'}]}});const preview=f.workflow.preview('a',{baseVersion:1,conversationId:id,draftId:edited.id});const input={id:preview.id,baseVersion:1,mutationId:randomUUID(),confirmation:'APPLY_DISCUSSION'};f.workflow.apply('a',input);assert.equal(f.workflow.apply('a',input).duplicate,true);assert.equal(f.business.read('a').state.tasks.length,2);assert.equal(f.business.read('a').state.tasks[0].hours,1);assert.equal(discussionRoute({id,discussion:draft.context}),'/assistant/next-step?discussion='+id);
 f.set(f.business.read('a').state);f.set(ensureAssistantConversation(f.state,'expression').state);f.set(chooseTaskObject(f.state,f.conv().id,{kind:'task',id:'a-task'}));f.conv().discussion.refs=[{kind:'task',id:'a-task',part:'output'},{kind:'task',id:'a-task',part:'contribution'}];f.save();const rev=f.business.read('a').revision,candidate=f.workflow.draftCreate('a',{baseVersion:rev,conversationId:f.conv().id,kind:'candidate'});const p=f.workflow.preview('a',{baseVersion:rev,conversationId:f.conv().id,draftId:candidate.id});f.workflow.apply('a',{id:p.id,baseVersion:rev,mutationId:randomUUID(),confirmation:'APPLY_DISCUSSION'});assert.equal(f.business.read('a').state.claims.at(-1).status,'待确认');
});
test('legacy learning handoff reuses its free discussion without merging into task pages',t=>{
 const f=fixture(t,'next-step');f.conv().discussion.refs=[{kind:'task',id:'a-task',part:'plan'}];const taskId=f.conv().id;
 const handed=startDiscussion(f.state,{intent:'plan',career:'data',refs:[{kind:'task',id:'a-task',part:'plan'}]},'Legacy handoff');assert.notEqual(handed.conversationId,taskId);assert.equal(handed.conversations.find(c=>c.id===taskId).discussion.question,'');
});

test('expression purpose alone and public lessons cannot be converted into a personal experience',t=>{
 const f=fixture(t,'expression');f.set(chooseTaskObject(f.state,f.conv().id,{kind:'skill',id:'data:sql-joins'}));f.conv().discussion.refs=[{kind:'skill',id:'data:sql-joins',part:'context'}];f.save();
 assert.throws(()=>f.workflow.draftCreate('a',{baseVersion:1,conversationId:f.conv().id,kind:'candidate'}),{code:'AI_SCOPE_REJECTED'});
 const old=f.conv().id;f.conv().archived=true;const restored=ensureAssistantConversation(f.state,'expression');assert.notEqual(restored.conversation.id,old);assert.equal(ensureAssistantConversation(f.state,'expression',old).error,'NOT_FOUND');
});
