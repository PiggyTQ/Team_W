import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBudgetLedger} from '../server/agent/budget.mjs';
import {createDeepSeekClient} from '../server/agent/deepseek.mjs';
import {agentFromEnvironment} from '../server/agent/service.mjs';

const messages=[{role:'system',content:'Return json.'},{role:'user',content:'合成测试，不包含真实用户资料。'}];
async function ledgerFixture(t,limitCny='8.00'){
  const dir=await mkdtemp(join(tmpdir(),'career-budget-integration-')),database=join(dir,'budget.sqlite');
  const budget=createBudgetLedger({database,limitCny});
  t.after(async()=>{budget.close();await rm(dir,{recursive:true,force:true});});
  return {database,budget};
}
test('the exact serialized paid request is reserved before fetch and successful usage never refunds it',async t=>{
  const {budget}=await ledgerFixture(t);let calls=0;
  const api=createDeepSeekClient({apiKey:'fixture-not-a-real-key',model:'deepseek-flash',maxTokens:1600,budget,fetchImpl:async(url,options)=>{
    calls++;const summary=budget.summary();assert.equal(summary.reservations,1);
    const cost=(Buffer.byteLength(options.body,'utf8')+4096)*4+1600*16;
    assert.equal(summary.reservedMicroCny,cost);
    return Response.json({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:'{"answer":"fixture"}'}}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}});
  }});
  const result=await api.respond({messages});assert.equal(calls,1);
  assert.equal(result.budget.reservations,1);assert.equal(result.budget.unreportedReservations,0);
  assert.equal(result.budget.reservedMicroCny,budget.summary().reservedMicroCny);
});
test('exhausted budget blocks provider network and preserves budget error code',async t=>{
  const {budget}=await ledgerFixture(t,'0.00');let calls=0;
  const api=createDeepSeekClient({apiKey:'fixture-not-a-real-key',model:'deepseek-flash',budget,fetchImpl:async()=>{calls++;throw new Error('must not reach network');}});
  await assert.rejects(api.respond({messages}),{code:'AI_BUDGET_EXCEEDED',status:429});assert.equal(calls,0);assert.equal(budget.summary().reservations,0);
});
test('timeout and malformed provider response retain non-refundable reservations',async t=>{
  const {budget}=await ledgerFixture(t);
  const stalled=createDeepSeekClient({apiKey:'fixture-not-a-real-key',model:'deepseek-flash',budget,timeoutMs:15,fetchImpl:()=>new Promise(()=>{})});
  await assert.rejects(stalled.respond({messages}),{code:'AI_TIMEOUT'});
  const first=budget.summary();assert.equal(first.reservations,1);assert.equal(first.unreportedReservations,1);
  const malformed=createDeepSeekClient({apiKey:'fixture-not-a-real-key',model:'deepseek-flash',budget,fetchImpl:async()=>Response.json({wrong:'shape'})});
  await assert.rejects(malformed.respond({messages}),{code:'AI_INVALID_RESPONSE'});
  assert.equal(budget.summary().reservations,2);assert.ok(budget.summary().reservedMicroCny>first.reservedMicroCny);
});
test('environment enabling requires a durable budget and refuses a limit above user authorization',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'career-budget-env-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const base={AI_ENABLED:'1',DEEPSEEK_API_KEY:'fixture-not-a-real-key',DEEPSEEK_MODEL:'deepseek-flash'};
  assert.equal(agentFromEnvironment({},base).capabilities().enabled,false);
  const env={...base,AI_BUDGET_DATABASE:join(dir,'budget.sqlite'),AI_BUDGET_CNY:'8.00',AI_BUDGET_ID:'initial-ai-test-20261028'};
  const good=agentFromEnvironment({},{...env,AI_ALLOWED_USER_IDS:'trial-user'});assert.equal(good.capabilities().enabled,false);assert.equal(good.capabilities('trial-user').enabled,true);assert.equal(good.capabilities('other-user').enabled,false);good.close();
  for(const extra of [{AI_BUDGET_CNY:'8.01'},{AI_BUDGET_ID:'new-id'},{DEEPSEEK_MODEL:'deepseek-v4-pro'}])assert.equal(agentFromEnvironment({},{...env,...extra}).capabilities().enabled,false);
});
test('the native provider path cannot make an unbudgeted paid request',async()=>{
  const api=createDeepSeekClient({apiKey:'fixture-not-a-real-key',model:'deepseek-flash'});
  await assert.rejects(api.respond({messages}),{code:'AI_BUDGET_CONFIG_INVALID'});
});
test('a cancellation triggered during reservation prevents provider network without refund',async()=>{
  const controller=new AbortController();let reservations=0,calls=0;
  const budget={reserve:()=>{reservations++;controller.abort();return {reservationId:'fixture'};},recordUsage(){},summary(){return {};}};
  const api=createDeepSeekClient({apiKey:'fixture-not-a-real-key',model:'deepseek-flash',budget,fetchImpl:async()=>{calls++;throw Error('must not run');}});
  await assert.rejects(api.respond({messages,signal:controller.signal}),{code:'AI_PROVIDER_UNAVAILABLE'});
  assert.equal(reservations,1);assert.equal(calls,0);
});
