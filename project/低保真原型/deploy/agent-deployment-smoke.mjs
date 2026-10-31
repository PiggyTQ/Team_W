// Synthetic, self-cleaning account check. Never invokes a configured model.
import fs from 'node:fs';
import {randomUUID,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const phase=process.argv[2],origin='https://47.250.133.180',work=new URL('./',import.meta.url);
assert.ok(['stage','production'].includes(phase));
let server,account,csrf='',jar=new Map();const report={phase,syntheticDataOnly:true,realProviderCalls:0,aiEnabled:false,checks:[],passed:false};
const password=`Deployment-${randomBytes(18).toString('base64url')}!`,email=`agent-deploy-${randomUUID()}@example.invalid`;
const check=name=>report.checks.push(name);
async function request(path,data,method=data?'POST':'GET',headers={}){
 const response=await fetch(base+path,{method,headers:{Origin:origin,'X-Forwarded-Proto':'https',Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...(account?{'X-Account-Id':account.id}:{}),...(data?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});
 for(const cookie of response.headers.getSetCookie()){const [name,value]=cookie.split(';')[0].split('=');jar.set(name,value);}
 const body=await response.json();if(body.csrfToken)csrf=body.csrfToken;return {status:response.status,body};
}
let base;
try{
 if(phase==='stage'){
  process.env.AI_ENABLED='0';const {createAuthServer}=await import('./stage/server/auth-server.mjs');
  server=await createAuthServer({database:new URL('./smoke/auth.sqlite',work).pathname,knowledgeDatabase:'/srv/career-growth/source/server/data/knowledge.sqlite',origin,production:true,trustProxy:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
 }else base='http://127.0.0.1:3001';
 await request('/api/auth/session');let result=await request('/api/auth/register',{email,password,agree:true,termsVersion:'2026-10-27'});assert.equal(result.status,201);account=result.body.user;check('synthetic account registration with session and CSRF');
 await request('/api/auth/logout',{});account=null;result=await request('/api/auth/login',{email,password});assert.equal(result.status,200);account=result.body.user;check('password sign-in after logout');
 const caps=(await request('/api/system/capabilities')).body;assert.equal(caps.ai,false);assert.equal(caps.agent.enabled,false);if(phase==='production')assert.equal(caps.publishedCourses,4);check('AI disabled and existing catalog capabilities retained');
 const status=await request('/api/agent/knowledge-status');assert.equal(status.body.reviewedChunks,46);assert.match(status.body.knowledgeDigest,/^[a-f0-9]{64}$/);check('46 approved authored sources reachable without model');
 let saved=(await request('/api/workspace')).body;assert.equal(saved.state.tasks.length,0);
 result=await request('/api/agent/analyse',{career:'data',baseVersion:saved.revision,claimRefs:[]});assert.equal(result.status,200);assert.ok(result.body.rows.every(r=>r.status==='unknown'));assert.equal(result.body.budget.weekly,3);check('on-site analysis preserves unknown and uses stored budget');
 result=await request('/api/agent/propose',{career:'data',baseVersion:saved.revision,skillId:'SK_SQL',hours:4,dependsOn:[]});assert.equal(result.body.code,'BUDGET_EXCEEDED');
 result=await request('/api/agent/propose',{career:'data',baseVersion:saved.revision,skillId:'SK_SQL',hours:1,dependsOn:[]});
 assert.equal(result.status,200);const preview=result.body;assert.equal((await request('/api/workspace')).body.state.tasks.length,0);check('over-budget rejection and preview without workspace mutation');
 const apply={id:preview.id,baseVersion:saved.revision,confirmation:'APPLY_ACTION',mutationId:randomUUID()};
 result=await request('/api/agent/apply',apply,undefined,{'X-CSRF-Token':'bad'});assert.equal(result.status,403);
 result=await request('/api/agent/apply',apply);assert.equal(result.status,200);assert.equal((await request('/api/agent/apply',apply)).body.duplicate,true);saved=(await request('/api/workspace')).body;assert.equal(saved.state.tasks.length,1);assert.equal(saved.state.tasks[0].completed,false);check('CSRF, explicit confirmation, single task, version and duplicate receipt');
 result=await request('/api/agent/memory',{baseRevision:0,preferences:{learningPreference:'Synthetic offline-first preference'},confirmation:'SAVE_PREFERENCES'});assert.equal(result.status,200);assert.equal(result.body.externalUse,false);result=await request('/api/agent/memory',{baseRevision:1,preferences:null,confirmation:'SAVE_PREFERENCES'});assert.equal(result.body.preferences,null);check('explicit preference save and withdrawal');
 result=await request('/api/agent/feedback',{proposalId:preview.id,category:'useful'});assert.equal(result.status,200);assert.equal(result.body.automaticTraining,false);check('feedback recorded without automatic training');
 result=await request('/api/agent/respond',{mode:'career_consultation',message:'Synthetic deployment check: do not call a model.',baseVersion:saved.revision,scope:{confirmedClaims:false,currentPlan:false},context:{workspace:'U11',career:'data'}});assert.equal(result.status,503);assert.equal(result.body.code,'AI_NOT_CONFIGURED');check('model request rejected while AI is off');
 const exported=(await request('/api/workspace/export')).body;assert.equal(exported.agentWorkflow.items.length,1);assert.equal(exported.agentMemory.preferences,null);check('account export includes action receipt and preference status');
 result=await request('/api/auth/clear-workspace',{currentPassword:password,baseVersion:saved.revision,confirmation:'CLEAR_WORKSPACE'});assert.equal(result.status,200);assert.equal((await request('/api/agent/workflow')).body.items.length,0);assert.equal((await request('/api/agent/memory')).body.revision,0);check('workspace clear purges new account-owned agent records');
 report.passed=true;
}catch(error){report.failure={name:error?.name,code:error?.code||null,message:String(error?.message||'Verification failed').slice(0,500)};process.exitCode=1;}
finally{
 if(account)try{const deleted=await request('/api/auth/delete-account',{currentPassword:password,email,confirmation:'DELETE_ACCOUNT'});report.syntheticAccountDeleted=deleted.status===200&&deleted.body.deleted===true;if(!report.syntheticAccountDeleted){report.passed=false;process.exitCode=1;}}catch{report.syntheticAccountDeleted=false;report.passed=false;process.exitCode=1;}
 if(server)await new Promise(resolve=>server.close(resolve));
 fs.writeFileSync(new URL(phase==='stage'?'./smoke/stage-smoke-result.json':'./production-smoke-result.json',work),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));
}
