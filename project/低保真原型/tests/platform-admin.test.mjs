import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {createPlatformAdmin} from '../server/platform-admin.mjs';
import {loadGuidance} from '../server/agent/library.mjs';
test('role isolation, immutable draft-review-publish-withdraw, stale writes, idempotent receipts and course preservation',()=>{
 const db=new DatabaseSync(':memory:');db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('editor'),('reviewer'),('publisher'),('student');CREATE TABLE courses(id TEXT PRIMARY KEY,title TEXT,status TEXT,content_version INTEGER,position INTEGER);CREATE TABLE course_versions(course_id TEXT,version INTEGER);INSERT INTO courses VALUES('one','test','published',1,0);INSERT INTO course_versions VALUES('one',1);");const admin=createPlatformAdmin({db});
 try{
 for(const r of ['editor','reviewer','publisher'])db.prepare('INSERT INTO platform_roles VALUES(?,?)').run(r,r);
 const cmd=(uid,type,payload,id=randomUUID())=>admin.execute(uid,{type,payload,mutationId:id});
 assert.throws(()=>admin.list('student'),e=>e.status===403);assert.throws(()=>cmd('student','knowledge.draft',{pack:loadGuidance()}),e=>e.status===403);
 const draft=cmd('editor','knowledge.draft',{pack:loadGuidance()});assert.equal(admin.currentPack(()=>({version:'fallback'})).version,'fallback');
 assert.throws(()=>cmd('publisher','knowledge.publish',{id:draft.id,revision:1,confirmation:'PUBLISH_KNOWLEDGE'}),e=>e.code==='INVALID_CONTENT_STATE');
 const reviewed=cmd('reviewer','knowledge.review',{id:draft.id,revision:1,confirmation:'REVIEW_KNOWLEDGE'});const mutationId=randomUUID(),payload={id:draft.id,revision:reviewed.revision,confirmation:'PUBLISH_KNOWLEDGE'};
 const published=cmd('publisher','knowledge.publish',payload,mutationId);assert.equal(cmd('publisher','knowledge.publish',payload,mutationId).duplicate,true);assert.equal(admin.currentPack(()=>null).chunks.length,46);
 assert.throws(()=>cmd('publisher','knowledge.withdraw',{id:draft.id,revision:1,confirmation:'WITHDRAW_KNOWLEDGE'}),e=>e.code==='VERSION_CONFLICT');
 cmd('publisher','knowledge.withdraw',{id:draft.id,revision:published.revision,confirmation:'WITHDRAW_KNOWLEDGE'});assert.equal(admin.currentPack(()=>null).chunks.length,0);
 cmd('publisher','course.status',{id:'one',revision:0,contentVersion:1,status:'retired',confirmation:'CHANGE_COURSE_STATUS'});assert.equal(db.prepare('SELECT count(*) n FROM course_versions').get().n,1);
 assert.throws(()=>cmd('publisher','course.status',{id:'one',revision:0,contentVersion:1,status:'published',confirmation:'CHANGE_COURSE_STATUS'}),e=>e.code==='VERSION_CONFLICT');
 }finally{db.close();}
});
