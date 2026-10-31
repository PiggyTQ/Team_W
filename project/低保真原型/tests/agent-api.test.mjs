import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAuthServer} from '../server/auth-server.mjs';
import {createAgentService} from '../server/agent/service.mjs';
import {AUTH_POLICY} from '../src/auth-contract.js';
import {AI_CONSENT_VERSION,scopeKey} from '../src/agent-contract.js';

test('AI route uses real session/CSRF/account binding; scoped request is read-only',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'career-agent-api-'));
  let calls=0;
  const provider={configuredModel:'test-fixture',respond:async()=>{calls++;return {output:{statements:[{kind:'question',text:'想先了解哪个任务？',evidenceIds:[]}],limitations:[]}};}};
  const server=await createAuthServer({database:join(dir,'auth.sqlite'),knowledgeDatabase:join(dir,'missing.sqlite'),origin:'https://career.test',production:true,trustProxy:true,agentFactory:business=>createAgentService({business,provider,enabled:true})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});});
  const url=`http://127.0.0.1:${server.address().port}`,jar=new Map();let csrf='';
  async function req(path,{body,headers={},method=body?'POST':'GET'}={}){
    const r=await fetch(url+path,{method,headers:{Origin:'https://career.test','X-Forwarded-Proto':'https',Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...(body?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
    for(const line of r.headers.getSetCookie()){const [k,v]=line.split(';')[0].split('=');jar.set(k,v);}
    const data=await r.json();if(data.csrfToken)csrf=data.csrfToken;return {status:r.status,data};
  }
  const body={mode:'plan_simulation',message:'每周三小时如何安排？',baseVersion:0,scope:{confirmedClaims:false,currentPlan:true},context:{workspace:'U07',career:'data'}};
  assert.equal((await req('/api/agent/respond',{body})).status,401);
  await req('/api/auth/session');
  const account=await req('/api/auth/register',{body:{email:'agent-fixture@example.com',password:'Test fixture 2026!',agree:true,termsVersion:AUTH_POLICY.termsVersion}});
  assert.equal(account.status,201);
  assert.equal((await req('/api/agent/respond',{body,headers:{'X-CSRF-Token':'bad'}})).status,403);
  assert.equal((await req('/api/agent/respond',{body,headers:{'X-Account-Id':'other-owner'}})).status,409);
  assert.equal((await req('/api/agent/respond',{body:{...body,owner:'victim'}})).status,400);
  assert.equal((await req('/api/agent/respond',{body})).data.code,'AI_CONSENT_REQUIRED');assert.equal(calls,0);
  const unconsented=(await req('/api/workspace')).data,state=unconsented.state;
  state.aiScope=['职业原创知识','当前目标与计划'];
  state.aiExternalConsent={version:AI_CONSENT_VERSION,provider:'DeepSeek',accepted:true,scopeKey:scopeKey(state),grantId:'fixture-consent-0001'};
  assert.equal((await req('/api/workspace',{method:'PUT',body:{state,actorId:account.data.user.id,baseVersion:0,mutationId:'agent-consent-fixture-0001'}})).status,200);
  body.baseVersion=1;
  const before=(await req('/api/workspace')).data;
  const result=await req('/api/agent/respond',{body});assert.equal(result.status,200);assert.equal(result.data.readOnly,true);assert.equal(calls,1);
  assert.deepEqual((await req('/api/workspace')).data,before);
  const cap=(await req('/api/system/capabilities')).data;
  assert.equal(cap.ai,true);assert.equal(cap.agent.enabled,true);assert.equal(cap.agent.proposals,false);
  assert.equal((await req('/api/agent/respond',{body:{...body,baseVersion:9}})).status,409);
  assert.equal((await req('/api/agent/respond',{body:{...body,conversationId:'foreign-id'}})).status,404);
  assert.equal((await req('/api/agent/analyse',{body:{career:'data',baseVersion:1},headers:{'X-CSRF-Token':'bad'}})).status,403);
  const analysis=await req('/api/agent/analyse',{body:{career:'data',baseVersion:1}});assert.equal(analysis.status,200);assert.ok(analysis.data.rows.every(r=>r.status==='unknown'));
  const preview=await req('/api/agent/propose',{body:{career:'data',baseVersion:1,skillId:'SK_SQL',hours:1,dependsOn:[]}});assert.equal(preview.status,200);
  assert.equal((await req('/api/workspace')).data.state.tasks.length,0);
  assert.equal((await req('/api/agent/apply',{body:{id:preview.data.id,baseVersion:1,mutationId:'fixture-apply-action-0001'}})).status,400);
  const apply={id:preview.data.id,baseVersion:1,mutationId:'fixture-apply-action-0001',confirmation:'APPLY_ACTION'};
  const receipt=await req('/api/agent/apply',{body:apply});assert.equal(receipt.status,200);assert.equal((await req('/api/agent/apply',{body:apply})).data.duplicate,true);
  assert.equal((await req('/api/workspace')).data.state.tasks.length,1);
  const exported=(await req('/api/workspace/export')).data;assert.equal(exported.agentWorkflow.items.length,1);assert.equal(exported.agentMemory.preferences,null);
  const ops=(await req('/api/agent/operations')).data;assert.ok(ops.rows.some(r=>r.operation==='apply'&&r.status===200));assert.equal(JSON.stringify(ops).includes(body.message),false);
});
