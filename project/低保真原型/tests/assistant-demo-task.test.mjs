import test from 'node:test';
import assert from 'node:assert/strict';
import {demoTaskSources,patchDemoTaskDiscussion,demoTaskReady} from '../src/assistant-demo-task-model.js';
import {newTaskConversation,chooseComparison,chooseTaskObject} from '../src/assistant-task-model.js';

const fixture=()=>({goal:'data',budget:4,planVersion:3,conversationId:'',conversations:[],
 tasks:[{id:'task-one',title:'My original task',template:'quality',hours:2,status:'进行中',draft:'PRIVATE ARTIFACT',contribution:'PRIVATE CONTRIBUTION',attempts:[]}],
 claims:[{id:'confirmed',title:'Confirmed claim',status:'已确认',text:'CONFIRMED TEXT'},{id:'pending',title:'Pending claim',status:'待确认',text:'PENDING TEXT'}],reports:[],resumes:[],reviews:[]});

test('local task sources reveal only selected private parts and retain actual original links',()=>{
 const s=fixture(),c=newTaskConversation(s,'expression');c.discussion.refs=[{kind:'task',id:'task-one',part:'output'}];
 const before=structuredClone(s),rows=demoTaskSources(s,c.discussion);
 const output=rows.find(r=>r.ref.kind==='task'&&r.ref.part==='output'),contribution=rows.find(r=>r.ref.kind==='task'&&r.ref.part==='contribution');
 assert.equal(output.selectedContent.artifact,'PRIVATE ARTIFACT');assert.ok(output.to.includes('task-one'));
 assert.equal(contribution.selectedContent,undefined);assert.equal(contribution.content,undefined);
 assert.ok(rows.some(r=>r.ref.id==='confirmed'));assert.ok(!rows.some(r=>r.ref.id==='pending'));
 assert.deepEqual(s,before);
});

test('comparison and object identity reuse the existing route model without changing the saved target',()=>{
 let s=fixture();const c=newTaskConversation(s,'compare');s={...s,conversations:[c],conversationId:c.id};
 s=chooseComparison(s,c.id,'data','frontend');const selected=s.conversations.find(v=>v.id===s.conversationId);
 const rows=demoTaskSources(s,selected.discussion);assert.equal(rows.find(r=>r.ref.id==='frontend').publicContent.id,'frontend');
 assert.ok(rows.find(r=>r.ref.id==='data').publicContent.provenance.version);assert.equal(s.goal,'data');
 const id=s.conversationId;s=chooseComparison(s,id,'frontend','data');s=chooseComparison(s,s.conversationId,'data','frontend');assert.equal(s.conversationId,id);
 const expression=newTaskConversation(s,'expression');s={...s,conversations:[...s.conversations,expression],conversationId:expression.id};
 s=chooseTaskObject(s,expression.id,{kind:'task',id:'task-one'});const objectId=s.conversationId;
 s=chooseTaskObject(s,expression.id,{kind:'task',id:'task-one'});assert.equal(s.conversationId,objectId);
});

test('local question patches retain other discussions and enforce the original source and question limits',()=>{
 let s=fixture();const a=newTaskConversation(s,'next-step'),b=newTaskConversation(s,'expression');
 s={...s,conversations:[a,b],conversationId:a.id};const before=structuredClone(s);
 const next=patchDemoTaskDiscussion(s,a.id,{question:'Saved local question'});
 assert.equal(next.conversations[0].discussion.question,'Saved local question');assert.deepEqual(next.conversations[1],b);
 assert.deepEqual(next.tasks,s.tasks);assert.equal(next.budget,4);assert.equal(next.goal,'data');assert.deepEqual(s,before);
 assert.throws(()=>patchDemoTaskDiscussion(s,a.id,{question:'x'.repeat(4001)}));
 assert.throws(()=>patchDemoTaskDiscussion(s,a.id,{refs:Array.from({length:13},(_,i)=>({kind:'task',id:'task-'+i,part:'plan'}))}));
});

test('local task readiness respects missing objects and a deliberately selected career pair',()=>{
 assert.equal(demoTaskReady({task:{page:'next-step'}}),true);
 assert.equal(demoTaskReady({task:{page:'compare',left:'data'}}),false);
 assert.equal(demoTaskReady({task:{page:'compare',left:'data',right:'data'}}),false);
 assert.equal(demoTaskReady({task:{page:'compare',left:'data',right:'testing'}}),true);
 assert.equal(demoTaskReady({task:{page:'expression'}}),false);
 assert.equal(demoTaskReady({task:{page:'expression',object:{kind:'task',id:'task-one'}}}),true);
});

test('temporary local assumptions remain selected as unverified context without changing the real budget',()=>{
 const s=fixture(),c=newTaskConversation(s,'next-step');
 c.discussion.task.time='Only 3 hours this week';c.discussion.refs=[{kind:'statement',id:'task-input'}];
 const row=demoTaskSources(s,c.discussion).find(row=>row.ref.kind==='statement');
 assert.equal(row.selectedContent.time,'Only 3 hours this week');assert.equal(row.labelEn,'Discussion input (unverified)');
 assert.equal(s.budget,4);assert.equal(s.goal,'data');
});
