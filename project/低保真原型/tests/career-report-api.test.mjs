import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAuthServer} from '../server/auth-server.mjs';
import {AUTH_POLICY} from '../src/auth-contract.js';

test('career report HTTP preview and compose share account sources, bounded goals and an immutable digest without a knowledge database',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'career-composite-api-')),origin='http://composite.test';
 const server=await createAuthServer({database:join(dir,'auth.sqlite'),knowledgeDatabase:join(dir,'absent-knowledge.sqlite'),origin});await new Promise(done=>server.listen(0,'127.0.0.1',done));
 t.after(async()=>{await new Promise(done=>server.close(done));assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));await rm(dir,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+server.address().port;
 function client(){const jar=new Map();let csrf='',owner='';return {get owner(){return owner;},async request(path,{data,method=data?'POST':'GET'}={}){
  const response=await fetch(base+path,{method,headers:{Origin:origin,Cookie:[...jar].map(([key,value])=>key+'='+value).join('; '),...(owner?{'X-Account-Id':owner}:{}),...(data?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{} )},...(data?{body:JSON.stringify(data)}:{})});
  for(const cookie of response.headers.getSetCookie()){const [key,value]=cookie.split(';')[0].split('=');jar.set(key,value);}const body=await response.json();if(body.csrfToken)csrf=body.csrfToken;if(body.user)owner=body.user.id;return {status:response.status,body};
 }};}
 const alice=client(),bob=client();for(const [actor,email] of [[alice,'composite-alice@example.com'],[bob,'composite-bob@example.com']]){await actor.request('/api/auth/session');assert.equal((await actor.request('/api/auth/register',{data:{email,password:'Composite testing password 2026!',agree:true,termsVersion:AUTH_POLICY.termsVersion}})).status,201);}
 const saved=async()=>(await alice.request('/api/workspace')).body;
 async function put(patch){const current=await saved();const response=await alice.request('/api/workspace',{method:'PUT',data:{actorId:alice.owner,baseVersion:current.revision,mutationId:randomUUID(),state:{...current.state,...patch}}});assert.equal(response.status,200,JSON.stringify(response.body));return response.body;}
 await put({goal:'frontend',preferences:{...(await saved()).state.preferences,interestType:'INTJ',capabilityMastery:{HTML:true}},claims:[{id:'claim-html',version:1,title:'本人 HTML 项目',text:'实际页面与交互实现',contribution:'本人编写页面',skill:'HTML',status:'已确认'}],education:[{id:'edu',version:1,school:'已确认学校',status:'已确认'}]});
 const file=Buffer.from('已完成的项目文件'),upload=(title,career)=>({title,description:'实际成果\n不能拆出章节：项目说明',contribution:'本人实现',career,completed:true,file:{name:'project.txt',size:file.length,base64:file.toString('base64')}});
 const aliceUpload=await alice.request('/api/resource-projects',{data:upload('Alice 完成项目','frontend')});assert.equal(aliceUpload.status,201);await bob.request('/api/resource-projects',{data:upload('Bob 私有项目','data')});
 const planRecords={goals:[{id:'weekly',title:'本周完成作品集',period:'week',periodStart:'2026-11-02',due:'2026-11-08',progress:30,priority:'高',notes:'PRIVATE_GOAL_NOTE'}],drafts:{text:'PRIVATE_DRAFT'}};
 const preview=async(records=planRecords)=>{const current=await saved();const response=await alice.request('/api/services/report-preview',{data:{baseVersion:current.revision,format:'career-report-v1',planRecords:records}});assert.equal(response.status,200,JSON.stringify(response.body));return response.body;};
 const first=await preview();assert.equal(first.format,'career-report-v1');assert.equal(first.body.split('\n').length,5);assert.match(first.body,/Alice 完成项目/);assert.doesNotMatch(first.body,/Bob 私有项目|PRIVATE_GOAL_NOTE|PRIVATE_DRAFT/);assert.equal(first.compositeSources.uploadRefs.length,1);
 assert.equal((await alice.request('/api/services/report-preview',{data:{baseVersion:(await saved()).revision}})).status,503,'legacy preview keeps its original knowledge requirement');
 assert.equal((await alice.request('/api/services/report-preview',{data:{baseVersion:(await saved()).revision,format:'career-report-v1',uploads:[upload('伪造上传','ai')]}})).status,400,'caller cannot inject upload metadata');
 assert.equal((await alice.request('/api/services/report-preview',{data:{baseVersion:(await saved()).revision,format:'career-report-v1',planRecords:{goals:[{...planRecords.goals[0],progress:200}]}}})).status,400);
 async function compose(snapshot,records=planRecords){const current=await saved();return alice.request('/api/commands',{data:{type:'report.compose',baseVersion:current.revision,mutationId:randomUUID(),payload:{title:'综合职业报告',kind:'report',format:'career-report-v1',planRecords:records,sections:snapshot.body.split('\n').map(line=>line.split('：')[0]),previewVersion:current.revision,previewDigest:snapshot.digest,confirmation:'COMPOSE_REPORT'}}});}
 const extra=await alice.request('/api/resource-projects',{data:upload('额外上传项目','data')});assert.equal((await compose(first)).body.code,'VERSION_CONFLICT','upload additions invalidate digest even with unchanged workspace revision');
 const withExtra=await preview();await alice.request('/api/resource-projects/'+extra.body.project.id,{method:'DELETE',data:{}});assert.equal((await compose(withExtra)).body.code,'VERSION_CONFLICT','upload removals invalidate digest');
 const beforePersonality=await preview();await put({preferences:{...(await saved()).state.preferences,interestType:'ESFP'}});assert.equal((await compose(beforePersonality)).body.code,'VERSION_CONFLICT','a new baseVersion cannot make an old personality preview valid');
 const current=await preview();assert.equal((await compose(current,{goals:[{...planRecords.goals[0],progress:60}]})).body.code,'VERSION_CONFLICT','even non-body goal progress is captured in the preview digest');
 const composed=await compose(current);assert.equal(composed.status,200,JSON.stringify(composed.body));const state=(await saved()).state,report=state.reports.find(item=>item.id===composed.body.refs.reportId);assert.equal(report.body,current.body);assert.equal(report.format,'career-report-v1');assert.equal(report.authority.origin,'server-command-v1');assert.equal(report.compositeSources.preferences.interestType,'ESFP');assert.equal(report.compositeSources.educationRefs[0].id,'edu');assert.equal(report.compositeSources.uploadRefs[0].id,aliceUpload.body.project.id);assert.equal(Object.hasOwn(report.compositeSources.planRecords.goals[0],'notes'),false);
 const modified=await alice.request('/api/workspace',{method:'PUT',data:{actorId:alice.owner,baseVersion:(await saved()).revision,mutationId:randomUUID(),state:{...state,reports:[{...report,compositeSources:{...report.compositeSources,uploads:[]}}]}}});assert.equal(modified.body.code,'SERVER_RECORD_PROTECTED');
});
