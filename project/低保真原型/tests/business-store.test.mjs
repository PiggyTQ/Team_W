import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {createBusinessStore,COLLECTIONS} from '../server/business-store.mjs';
import {fresh,makeTask} from '../src/model.js';

function fixture(t){const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('alice'),('bob');");const store=createBusinessStore(db);t.after(()=>db.close());return {db,store};}
const commit=(store,user,state,version=0,mutationId=randomUUID())=>store.save(user,{state,baseVersion:version,mutationId});
test('migration is repeatable and exactly 4/16/4 course resources remain unpublished',t=>{
  const {db,store}=fixture(t);createBusinessStore(db);
  const catalog=store.catalog();assert.equal(catalog.courses.length,4);assert.equal(catalog.courses.flatMap(c=>c.chapters).length,16);assert.equal(catalog.courses.flatMap(c=>c.videos).length,4);
  for(const course of catalog.courses){assert.equal(course.status,'placeholder');assert.equal(course.estimated_minutes,null);for(const chapter of course.chapters)assert.equal(chapter.body,null);for(const video of course.videos){assert.equal(video.url,null);assert.equal(video.duration_seconds,null);}}
  assert.equal(db.prepare('SELECT count(*) n FROM schema_migrations').get().n,2);
});
test('domain records survive reconstruction, are owner-isolated, and cannot forge authority',t=>{
  const {db,store}=fixture(t);const state=fresh();state.preferences.interest='本人保存的探索方向';state.claims=[{id:'claim-1',title:'本人经历',text:'原文',contribution:'本人整理',status:'待确认',skill:'SQL',version:1}];state.tasks=[{...makeTask(state,{title:'联系访谈',hours:1,purpose:'了解日常工作',template:'external'}),id:'task-1'}];state.role='admin';state.logged=true;
  assert.equal(commit(store,'alice',state).revision,1);
  const restored=createBusinessStore(db).read('alice');assert.equal(restored.state.preferences.interest,state.preferences.interest);assert.equal(restored.state.claims[0].owner,'alice');assert.equal(restored.state.role,'student');assert.equal(restored.state.logged,false);assert.equal(restored.state.tasks[0].id,'task-1');
  assert.equal(store.read('bob').state.claims.length,0);assert.throws(()=>store.records('bob','claims','claim-1'),{code:'NOT_FOUND'});assert.throws(()=>store.records('alice','constructor','claim-1'),{code:'NOT_FOUND'});
  assert.throws(()=>commit(store,'bob',{...state,claims:[{...state.claims[0],owner:'alice'}]}),{code:'OWNER_MISMATCH'});
  const before=store.records('alice','claims','claim-1').revision;
  commit(store,'alice',{...state,claims:[{...state.claims[0],text:'修订原文'}]},1);
  assert.equal(store.records('alice','claims','claim-1').revision,before+1);
});
test('optimistic versions, idempotency and server business rules fail without partial writes',t=>{
  const {store}=fixture(t);const state=fresh(),id=randomUUID();commit(store,'alice',state,0,id);
  assert.equal(commit(store,'alice',state,0,id).duplicate,true);
  assert.throws(()=>commit(store,'alice',{...state,budget:5},0,id),{code:'IDEMPOTENCY_MISMATCH'});
  assert.throws(()=>commit(store,'alice',{...state,budget:5},0),{code:'VERSION_CONFLICT'});
  const task={...makeTask(state,{title:'外部任务',hours:4,purpose:'验证',template:'external'}),id:'task-a'};
  assert.throws(()=>commit(store,'alice',{...state,tasks:[task]},1),{code:'BUDGET_EXCEEDED'});
  assert.throws(()=>commit(store,'alice',{...state,tasks:[{...task,hours:1,dependsOn:['missing']}]},1),{code:'INVALID_DEPENDENCY'});
  assert.throws(()=>commit(store,'alice',{...state,tasks:[{...task,hours:1,dependsOn:['task-a']}]},1),{code:'DEPENDENCY_CYCLE'});
  assert.throws(()=>commit(store,'alice',{...state,tasks:[{...task,hours:1,template:'quality'}]},1),{code:'COURSE_NOT_READY'});
  assert.throws(()=>commit(store,'alice',{...state,reading:{quality:{chapter:0,version:1}}},1),{code:'COURSE_NOT_READY'});
  assert.throws(()=>commit(store,'alice',JSON.parse('{"schema":1,"__proto__":{"role":"admin"}}'),1),{code:'INVALID_WORKSPACE'});
  assert.equal(store.read('alice').revision,1);assert.equal(store.read('alice').state.tasks.length,0);
});
test('clearing a workspace preserves account; deleting account cascades all its rows only',t=>{
  const {db,store}=fixture(t);const state=fresh();state.claims=[{id:'same-id',text:'私有记录'}];commit(store,'alice',state);commit(store,'bob',state);
  const cleared=store.clear('alice',1);assert.equal(cleared.revision,2);assert.equal(store.read('alice').state.claims.length,0);assert.ok(db.prepare('SELECT 1 FROM users WHERE id=?').get('alice'));
  db.prepare('DELETE FROM users WHERE id=?').run('alice');
  for(const table of ['account_workspaces','workspace_mutations','security_events',...Object.values(COLLECTIONS)])assert.equal(db.prepare(`SELECT count(*) n FROM ${table} WHERE user_id=?`).get('alice').n,0);
  assert.equal(store.read('bob').state.claims[0].text,'私有记录');
});
