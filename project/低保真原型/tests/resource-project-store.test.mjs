import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {createBusinessStore} from '../server/business-store.mjs';
import {createResourceProjectStore} from '../server/resource-project-store.mjs';
import {normalizeResourceProject,RESOURCE_PROJECT_MAX_BYTES} from '../src/resource-project-model.js';
import {fresh} from '../src/model.js';

const input=(text='已完成的项目成果')=>({title:'本人已完成项目',description:'记录实现过程与结果',career:'data',contribution:'本人整理数据与说明',completed:true,file:{name:'成果.md',size:Buffer.byteLength(text),base64:Buffer.from(text).toString('base64')}});
function fixture(t){const db=new DatabaseSync(':memory:');db.exec("PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('alice'),('bob');");const business=createBusinessStore(db);t.after(()=>db.close());return {db,business,store:business.resourceProjects};}

test('completed project attachments persist independently from task and workspace state',t=>{
 const {db,business,store}=fixture(t),before=business.read('alice');
 const project=store.upload('alice',input());assert.equal(project.completed,true);assert.equal(project.file.type,'text/markdown');assert.equal(project.file.name,'成果.md');assert.equal(Object.hasOwn(project,'body'),false);
 assert.deepEqual(business.read('alice'),before);assert.equal(business.read('alice').state.tasks.length,0);assert.equal(business.read('alice').state.claims.length,0);
 assert.deepEqual(createResourceProjectStore(db).list('alice'),[project]);assert.equal(store.get('alice',project.id).body.toString(),'已完成的项目成果');
 assert.deepEqual(store.list('bob'),[]);assert.throws(()=>store.get('bob',project.id),{code:'RESOURCE_PROJECT_NOT_FOUND'});assert.throws(()=>store.remove('bob',project.id),{code:'RESOURCE_PROJECT_NOT_FOUND'});
 const exported=store.exportData('alice');assert.equal(Buffer.from(exported[0].base64,'base64').toString(),'已完成的项目成果');
 store.remove('alice',project.id);assert.deepEqual(store.list('alice'),[]);
});

test('uploads require completed projects, supported bounded files and exact file bytes',t=>{
 const {store}=fixture(t);
 assert.throws(()=>store.upload('alice',{...input(),completed:false}),{code:'RESOURCE_PROJECT_COMPLETION_REQUIRED'});
 assert.throws(()=>store.upload('alice',{...input(),title:'  '}),{code:'RESOURCE_PROJECT_INVALID'});
 assert.throws(()=>store.upload('alice',{...input(),description:''}),{code:'RESOURCE_PROJECT_INVALID'});
 assert.throws(()=>store.upload('alice',{...input(),file:{...input().file,name:'../成果.md'}}),{code:'RESOURCE_PROJECT_FILE_REQUIRED'});
 assert.throws(()=>store.upload('alice',{...input(),file:{...input().file,name:'payload.exe'}}),{code:'RESOURCE_PROJECT_FILE_TYPE'});
 for(const extension of ['constructor','__proto__'])assert.throws(()=>store.upload('alice',{...input(),file:{...input().file,name:'payload.'+extension}}),{code:'RESOURCE_PROJECT_FILE_TYPE'});
 assert.throws(()=>normalizeResourceProject(input(),{name:'big.zip',size:RESOURCE_PROJECT_MAX_BYTES+1}),{code:'RESOURCE_PROJECT_TOO_LARGE'});
 assert.throws(()=>store.upload('alice',{...input(),file:{...input().file,size:1}}),{code:'RESOURCE_PROJECT_INVALID'});
 assert.throws(()=>store.upload('alice',{...input(),file:{...input().file,base64:'%'.repeat(input().file.base64.length)}}),{code:'RESOURCE_PROJECT_INVALID'});
 assert.deepEqual(store.list('alice'),[]);
});

test('large attachments avoid workspace payload size and owner quotas remain isolated',t=>{
 const {store}=fixture(t),body=Buffer.alloc(RESOURCE_PROJECT_MAX_BYTES,37),large={...input(),file:{name:'project.zip',size:body.length,base64:body.toString('base64')}};
 for(let i=0;i<10;i++)store.upload('alice',large);
 assert.equal(store.get('alice',store.list('alice')[0].id).body.byteLength,RESOURCE_PROJECT_MAX_BYTES);
 assert.throws(()=>store.upload('alice',input()),{code:'RESOURCE_PROJECT_QUOTA'});
 assert.equal(store.upload('bob',input()).title,input().title);
});

test('workspace clear and account deletion remove attachments only for that owner',t=>{
 const {db,business,store}=fixture(t);store.upload('alice',input());store.upload('bob',input());
 business.save('alice',{state:fresh(),baseVersion:0,mutationId:randomUUID()});
 assert.throws(()=>business.clear('alice',0),{code:'VERSION_CONFLICT'});assert.equal(store.list('alice').length,1);
 business.clear('alice',1);assert.deepEqual(store.list('alice'),[]);assert.equal(store.list('bob').length,1);
 store.upload('alice',input());db.prepare('DELETE FROM users WHERE id=?').run('alice');assert.deepEqual(store.list('alice'),[]);assert.equal(store.list('bob').length,1);
});
