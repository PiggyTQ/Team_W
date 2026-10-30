import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {fresh,makeTask} from '../src/model.js';
import {createBusinessStore} from '../server/business-store.mjs';
import {createBusinessCommands} from '../server/business-commands.mjs';
import {createAgentWorkflow} from '../server/agent/workflow.mjs';
import {scopedContextSignals} from '../server/agent/service.mjs';
function setup(t){const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('a'),('b')");const business=createBusinessStore(db);t.after(()=>db.close());
const save=(state,user='a',mutationId=randomUUID())=>business.save(user,{state,baseVersion:business.read(user).revision,mutationId});
const read=(user='a',digest='knowledge-v1')=>{const s=business.read(user);return business.personalContext.read(user,s.state,s.revision,digest);};return {db,business,save,read};}
test('confirmed materials, goal and completion refresh context; drafts, conversations and reading positions do not',t=>{
 const f=setup(t);let s=fresh();f.save(s);const first=f.read();assert.ok(first.suggestions.some(s=>s.id==='explore-goal'));
 s={...s,aiDraft:'PRIVATE_CHAT',claimDraft:{...s.claimDraft,text:'PRIVATE_DRAFT'},conversations:[{id:'conv-1',messages:[{role:'user',text:'PRIVATE_HISTORY'}]}],reading:{external:{chapter:0}}};f.save(s);assert.equal(f.read().contextRevision,first.contextRevision);
 s={...s,goal:'data',claims:[{id:'c',status:'已确认',version:1,skill:'SQL',text:'PRIVATE_ORIGINAL',contribution:'PRIVATE_CONTRIBUTION'}]};f.save(s);const next=f.read();assert.equal(next.contextRevision,first.contextRevision+1);assert.ok(next.suggestions.some(s=>s.id==='plan-small-step'));assert.doesNotMatch(JSON.stringify(next),/PRIVATE_/);
 const task={...makeTask(s,{title:'测试任务',hours:1,purpose:'核对'}),id:'t',status:'完成',completed:true,attempts:[{id:'attempt',version:1,text:'PRIVATE_ARTIFACT',result:'自检记录'}]};f.save({...s,tasks:[task]});assert.ok(f.read().suggestions.some(s=>s.id==='reflect-t'));assert.equal(f.read().providerCalled,false);
});
test('feedback is basis-bound and new evidence/knowledge invalidates it; snapshots never retain withdrawn text',t=>{
 const f=setup(t);f.save({...fresh(),claims:[{id:'c',status:'待确认',version:1,text:'PRIVATE_PENDING'}]});const first=f.read();
 let s=f.business.read('a');f.business.personalContext.feedback('a',s.state,s.revision,'knowledge-v1',{adviceKey:first.adviceKey,suggestionId:'confirm-materials',status:'dismissed'});assert.equal(f.read().suggestions.find(s=>s.id==='confirm-materials').status,'dismissed');
 assert.notEqual(f.read('a','knowledge-v2').adviceKey,first.adviceKey);assert.equal(f.read('a','knowledge-v2').suggestions[0].status,'new');
 const commands=createBusinessCommands({db:f.db,business:f.business});commands.execute('a',{type:'claim.confirm',baseVersion:s.revision,mutationId:randomUUID(),payload:{claimId:'c',claimVersion:1,text:'PRIVATE_CONFIRMED',contribution:'本人',resolution:'confirm',confirmation:'CONFIRM_SELF_REPORT'}});
 assert.notEqual(f.read().adviceKey,first.adviceKey);s=f.business.read('a');assert.throws(()=>f.business.personalContext.feedback('a',s.state,s.revision,'knowledge-v1',{adviceKey:first.adviceKey,suggestionId:'confirm-materials',status:'read'}),{code:'AI_CONTEXT_CHANGED'});
 assert.throws(()=>{const other=f.business.read('b');f.business.personalContext.feedback('b',other.state,other.revision,'knowledge-v1',{adviceKey:first.adviceKey,suggestionId:'confirm-materials',status:'read'});},{code:'AI_CONTEXT_CHANGED'});
 assert.doesNotMatch(JSON.stringify(f.db.prepare('SELECT snapshot_json FROM personal_context_heads').all()),/PRIVATE_/);
});
test('events are atomic, idempotent, survive reconstruction and are purged with the account workspace',t=>{
 const f=setup(t),state={...fresh(),goal:'data'},id=randomUUID();f.save(state,'a',id);const count=f.business.personalContext.events('a').items.length;
 f.business.save('a',{state,baseVersion:0,mutationId:id});assert.equal(f.business.personalContext.events('a').items.length,count);
 f.db.exec("CREATE TRIGGER context_fault BEFORE INSERT ON personal_context_events BEGIN SELECT RAISE(ABORT,'injected failure'); END");assert.throws(()=>f.save({...state,goal:'backend'}),/injected failure/);assert.equal(f.business.read('a').state.goal,'data');assert.equal(f.read().contextRevision,1);f.db.exec('DROP TRIGGER context_fault');
 const restored=createBusinessStore(f.db);assert.equal(restored.personalContext.events('a').items.length,count);
 f.save({...fresh(),goal:'ai'},'b');f.business.clear('a',1);assert.equal(f.business.personalContext.events('a').items.length,0);assert.equal(f.db.prepare('SELECT count(*) n FROM personal_context_heads WHERE user_id=?').get('a').n,0);assert.ok(f.business.personalContext.events('b').items.length);
 f.db.prepare('DELETE FROM users WHERE id=?').run('b');assert.equal(f.business.personalContext.events('b').items.length,0);
});
test('explicit preference changes refresh local context without adding preference text to model scope',t=>{
 const f=setup(t);f.save(fresh());const workflow=createAgentWorkflow({db:f.db,business:f.business}),before=f.read();workflow.memory('a',{baseRevision:0,preferences:{learningPreference:'PRIVATE_PREF'},confirmation:'SAVE_PREFERENCES'});assert.equal(f.read().contextRevision,before.contextRevision+1);assert.equal(f.read().snapshot.memoryRevision,1);assert.doesNotMatch(JSON.stringify(f.read()),/PRIVATE_PREF/);
 const signals=scopedContextSignals([{sourceType:'user_confirmed_unverified',text:JSON.stringify({id:'selected',skill:'SQL'})}]);assert.deepEqual(signals.selectedSkills,['SQL']);assert.equal(signals.fullProfileRead,false);assert.equal(signals.historyRead,false);assert.doesNotMatch(JSON.stringify(signals),/PRIVATE_PREF/);
});
test('returning to an old goal or clearing and rebuilding cannot revive an old advice token',t=>{
 const f=setup(t);f.save(fresh());const old=f.read();f.save({...fresh(),goal:'data'});f.save(fresh());assert.notEqual(f.read().adviceKey,old.adviceKey);
 f.business.clear('a',3);const rebuilt=f.read();assert.notEqual(rebuilt.adviceKey,old.adviceKey);const s=f.business.read('a');
 assert.throws(()=>f.business.personalContext.feedback('a',s.state,s.revision,'knowledge-v1',{adviceKey:old.adviceKey,suggestionId:'explore-goal',status:'dismissed'}),{code:'AI_CONTEXT_CHANGED'});
});
