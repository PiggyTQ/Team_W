import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createAuthServer} from '../server/auth-server.mjs';
import {AUTH_POLICY} from '../src/auth-contract.js';

test('private project API enforces session, CSRF and owner isolation, downloads exact bytes and clears attachments',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'career-resource-api-')),origin='http://career.test',server=await createAuthServer({database:join(dir,'auth.sqlite'),origin});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(done=>server.close(done));assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));await rm(dir,{recursive:true,force:true});});
 function actor(){const jar=new Map();let csrf='',id='';return {get id(){return id;},async request(path,{method='GET',data,headers={},binary=false}={}){
  const response=await fetch(base+path,{method,headers:{Origin:origin,Cookie:[...jar].map(([key,value])=>key+'='+value).join('; '),...(id?{'X-Account-Id':id}:{}),...(data?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});
  for(const line of response.headers.getSetCookie()){const [key,value]=line.split(';')[0].split('=');jar.set(key,value);}
  const body=binary&&response.ok?Buffer.from(await response.arrayBuffer()):await response.json();if(body.csrfToken)csrf=body.csrfToken;if(body.user)id=body.user.id;return {response,body};
 }};}
 const guest=actor();assert.equal((await guest.request('/api/resource-projects')).response.status,401);
 const alice=actor(),bob=actor(),password='Resource sample password 2026!';
 for(const [person,email] of [[alice,'alice-resource@example.com'],[bob,'bob-resource@example.com']]){await person.request('/api/auth/session');assert.equal((await person.request('/api/auth/register',{method:'POST',data:{email,password,agree:true,termsVersion:AUTH_POLICY.termsVersion}})).response.status,201);}
 const bytes=Buffer.from('本人完成的项目文件\n'),upload={title:'独立完成的项目',description:'记录本人实际完成的结果',contribution:'本人实现',completed:true,file:{name:'项目成果.txt',size:bytes.length,base64:bytes.toString('base64')}};
 assert.equal((await alice.request('/api/resource-projects',{method:'POST',data:upload,headers:{'X-CSRF-Token':'wrong'}})).response.status,403);
 assert.equal((await alice.request('/api/resource-projects',{method:'POST',data:{...upload,actorId:bob.id}})).body.code,'ACCOUNT_CHANGED');
 const saved=await alice.request('/api/resource-projects',{method:'POST',data:{...upload,actorId:alice.id}});assert.equal(saved.response.status,201);const project=saved.body.project;
 assert.equal((await alice.request('/api/resource-projects')).body.items[0].id,project.id);assert.deepEqual((await bob.request('/api/resource-projects')).body.items,[]);
 assert.equal((await alice.request('/api/resource-projects')).body.ownerId,alice.id);
 assert.equal((await bob.request('/api/resource-projects?ownerId='+alice.id)).body.code,'ACCOUNT_CHANGED');
 assert.equal((await bob.request('/api/resource-projects?ownerId='+alice.id,{method:'POST',data:upload})).body.code,'ACCOUNT_CHANGED');
 const path='/api/resource-projects/'+project.id;
 assert.equal((await bob.request(path+'/file')).response.status,404);assert.equal((await bob.request(path,{method:'DELETE',data:{}})).response.status,404);
 assert.equal((await bob.request(path+'/file?ownerId='+alice.id)).body.code,'ACCOUNT_CHANGED');
 assert.equal((await bob.request(path+'?ownerId='+alice.id,{method:'DELETE',data:{}})).body.code,'ACCOUNT_CHANGED');
 const downloaded=await alice.request(path+'/file',{binary:true});assert.deepEqual(downloaded.body,bytes);assert.equal(downloaded.response.headers.get('content-type'),'application/octet-stream');assert.match(downloaded.response.headers.get('content-disposition'),/^attachment;/);assert.equal(downloaded.response.headers.get('x-content-type-options'),'nosniff');
 const disguised=await alice.request('/api/resource-projects',{method:'POST',data:{...upload,file:{...upload.file,name:'image.png'}}});
 const imageDownload=await alice.request('/api/resource-projects/'+disguised.body.project.id+'/file',{binary:true});assert.equal(imageDownload.response.headers.get('content-type'),'application/octet-stream');assert.match(imageDownload.response.headers.get('content-disposition'),/^attachment;/);assert.deepEqual(imageDownload.body,bytes);
 await alice.request('/api/resource-projects/'+disguised.body.project.id,{method:'DELETE',data:{}});
 const exported=await alice.request('/api/workspace/export');assert.equal(exported.body.state.tasks.length,0);assert.equal(exported.body.resourceProjects[0].base64,upload.file.base64);
 assert.equal((await alice.request(path,{method:'DELETE',data:{}})).response.status,200);assert.deepEqual((await alice.request('/api/resource-projects')).body.items,[]);
 await alice.request('/api/resource-projects',{method:'POST',data:upload});await bob.request('/api/resource-projects',{method:'POST',data:upload});
 const cleared=await alice.request('/api/auth/clear-workspace',{method:'POST',data:{currentPassword:password,confirmation:'CLEAR_WORKSPACE',baseVersion:0}});assert.equal(cleared.response.status,200);assert.deepEqual((await alice.request('/api/resource-projects')).body.items,[]);assert.equal((await bob.request('/api/resource-projects')).body.items.length,1);
});
