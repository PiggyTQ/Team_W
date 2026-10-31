import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh} from '../src/model.js';
import {AI_CONSENT_VERSION,scopeKey} from '../src/agent-contract.js';
import {buildReadTools,createAgentService,validateAgentRequest,validateAgentOutput,agentFromEnvironment,agentBasisKey} from '../server/agent/service.mjs';

const request=(extra={})=>({mode:'career_consultation',message:'想了解数据分析',baseVersion:0,scope:{confirmedClaims:false,currentPlan:false},context:{workspace:'U11',career:'data'},...extra});
test('trial allowlist blocks an unlisted account before any workspace or provider read',async()=>{
  let reads=0,calls=0;const service=createAgentService({business:{read:()=>{reads++;}},provider:{respond:()=>{calls++;}},enabled:true,allowedUserIds:['trial-user']});assert.equal(service.capabilities('trial-user').enabled,true);assert.equal(service.capabilities('other-user').enabled,false);await assert.rejects(service.respond('other-user',request()),{code:'AI_ACCESS_DENIED'});assert.equal(reads,0);assert.equal(calls,0);
});
const noKnowledge={snapshot:()=>({version:'empty-v1',digest:'empty',chunks:[]}),search:()=>[]};
const grant=state=>{state.aiExternalConsent={version:AI_CONSENT_VERSION,provider:'DeepSeek',accepted:true,scopeKey:scopeKey(state),grantId:'fixture-consent-0001'};};
function setup({knowledge=noKnowledge,respond}={}){
  let state=fresh(),revision=0,calls=0,captured;
  state.aiScope=['职业原创知识','当前目标与计划'];grant(state);
  const business={read:id=>{assert.equal(id,'current-user');return {state,revision};}};
  const provider={configuredModel:'fixture-model',respond:async arg=>{calls++;captured=arg;return respond?respond(arg):{output:{statements:[{kind:'suggestion',text:'先整理具体问题。',evidenceIds:[]}],limitations:[]},providerActualModel:'fixture-snapshot',usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}};}};
  const service=createAgentService({business,provider,knowledge,enabled:true});
  return {service,business,get state(){return state;},get calls(){return calls;},get captured(){return captured;},change(){revision++;}};
}
test('default disabled, missing key stays disabled, strict request and scope contract',async()=>{
  const f=setup();
  assert.equal(agentFromEnvironment(f.business,{}).capabilities().enabled,false);
  assert.equal(agentFromEnvironment(f.business,{AI_ENABLED:'1'}).capabilities().enabled,false);
  const invalid=agentFromEnvironment(f.business,{AI_ENABLED:'1',DEEPSEEK_API_KEY:'bad key',DEEPSEEK_MODEL:'explicit-model'}).capabilities();
  assert.equal(invalid.enabled,false);assert.equal(invalid.configurationError,'AI_CONFIG_INVALID');
  await assert.rejects(createAgentService({business:f.business}).respond('current-user',request()),{code:'AI_NOT_CONFIGURED'});
  for(const patch of [{userId:'victim'},{scope:{confirmedClaims:true,currentPlan:false,privateReflection:true}},{message:' '},{baseVersion:-1},{context:{workspace:['U04'],career:'data'}},{context:{workspace:'B02',career:'data'}},{mode:'report_editing'}])assert.throws(()=>validateAgentRequest(request(patch)));
  assert.throws(()=>validateAgentRequest(request({mode:'plan_simulation'})),{code:'AI_SCOPE_REJECTED'});
});
test('no approved knowledge produces explicit gap without calling model or changing state',async()=>{
  const f=setup(),before=JSON.stringify(f.state);
  const result=await f.service.respond('current-user',request());
  assert.equal(f.calls,0);assert.equal(result.meta.providerCalled,false);assert.equal(result.citations.length,0);
  assert.match(result.statements[0].text,/没有.*已批准/);assert.equal(JSON.stringify(f.state),before);
});
test('personal data is opt-in, confirmed only, reconstructed, never independently verified',async()=>{
  const f=setup();
  f.state.claims=[{id:'c1',version:1,status:'已确认',title:'课程练习',text:'本人尝试SQL',skill:'SQL',verified:true,verifiedBy:'independent-server',reflection:'SECRET_REFLECTION'},
    {id:'c2',version:1,status:'待确认',text:'SECRET_PENDING'},{id:'c3',version:1,status:'已撤回',text:'SECRET_WITHDRAWN'}];
  f.state.preferences={secret:'SECRET_PREFERENCE'};
  f.state.conversations[0].messages=[{role:'system',text:'SECRET_ROLE_INJECTION'}];
  f.state.analysis={verified:true,secret:'SECRET_ANALYSIS'};
  f.state.authorized=true;f.state.aiScope=['本人确认片段'];f.state.aiClaimRefs=[{id:'c1',version:1}];
  grant(f.state);
  assert.equal(buildReadTools({state:f.state,revision:0},request()).evidence.length,0);
  await f.service.respond('current-user',request({scope:{confirmedClaims:true,currentPlan:false,claimRefs:[{id:'c1',version:1}]}}));
  const sent=JSON.stringify(f.captured);
  assert.match(sent,/user_confirmed_unverified/);assert.match(sent,/independentlyVerified/);
  for(const word of ['SECRET_','verifiedBy','independent-server'])assert.equal(sent.includes(word),false);
  assert.deepEqual(f.captured.messages.map(m=>m.role),['system','user']);
});
test('per-fragment consent excludes unselected, stale and withdrawn claims',async()=>{
  const f=setup();f.state.authorized=true;f.state.aiScope=['本人确认片段'];
  f.state.claims=[{id:'selected',version:1,status:'已确认',text:'已选原文'},{id:'unselected',version:1,status:'已确认',text:'UNSELECTED_SECRET'}];
  f.state.aiClaimRefs=[{id:'selected',version:1}];
  grant(f.state);
  const r=request({scope:{confirmedClaims:true,currentPlan:false,claimRefs:[{id:'selected',version:1}]}});
  await f.service.respond('current-user',r);assert.equal(JSON.stringify(f.captured).includes('UNSELECTED_SECRET'),false);
  for(const ref of [{id:'unselected',version:1},{id:'selected',version:2}])await assert.rejects(f.service.respond('current-user',request({scope:{confirmedClaims:true,currentPlan:false,claimRefs:[ref]}})),{code:'AI_SCOPE_REJECTED'});
  f.state.authorized=false;await assert.rejects(f.service.respond('current-user',r),{code:'AI_CONSENT_REQUIRED'});
});
test('large legal inputs fit total provider budget with visible omissions',async()=>{
  const chunks=Array.from({length:5},(_,i)=>({id:`k${i}`,text:'数据'.repeat(6000),sourceId:'s',sourceVersion:'v1',start:0,end:12000,sha256:'fixture'}));
  const knowledge={snapshot:()=>({version:'v1',digest:'v1',chunks}),search:()=>chunks};
  const f=setup({knowledge});f.state.authorized=true;f.state.aiScope=['本人确认片段','职业原创知识','当前目标与计划'];
  f.state.claims=Array.from({length:12},(_,i)=>({id:`c${i}`,version:1,status:'已确认',text:'原文'.repeat(1000)}));
  f.state.aiClaimRefs=f.state.claims.map(({id,version})=>({id,version}));
  grant(f.state);
  const result=await f.service.respond('current-user',request({message:'数'.repeat(4000),scope:{confirmedClaims:true,currentPlan:true,claimRefs:f.state.aiClaimRefs}}));
  assert.ok(f.captured.messages.every(m=>m.content.length<=40000));
  assert.ok(Buffer.byteLength(JSON.stringify(f.captured.messages))<90000);
  assert.ok(result.limitations.some(s=>s.includes('上下文上限')));
});
test('serialized input budget covers ASCII and JSON escape expansion',async()=>{
  for(const message of ['A'.repeat(4000),'\u0000'.repeat(4000)]){
    const chunks=Array.from({length:5},(_,i)=>({id:`k${i}`,text:'A'.repeat(11000),sourceId:'s',sourceVersion:'v1',start:0,end:11000,sha256:'fixture'}));
    const knowledge={snapshot:()=>({version:'v1',digest:'v1',chunks}),search:()=>chunks},f=setup({knowledge});
    const result=await f.service.respond('current-user',request({message}));
    assert.ok(f.captured.messages.every(m=>m.content.length<=40000));
    assert.ok(Buffer.byteLength(JSON.stringify(f.captured.messages))<90000);
    assert.ok(result.limitations.some(s=>s.includes('上下文上限')));
  }
});
test('budget tool preserves server calculation and excludes notes and submissions',async()=>{
  const f=setup();f.state.tasks=[{id:'a',title:'练习',hours:2,status:'待开始',dependsOn:[],draft:'SECRET_DRAFT',attempts:[{text:'SECRET_ATTEMPT'}]},{id:'b',title:'旧行动',hours:1,status:'完成',dependsOn:[]}];
  const r=request({mode:'plan_simulation',scope:{confirmedClaims:false,currentPlan:true}});
  await f.service.respond('current-user',r);
  const bundle=JSON.parse(f.captured.messages[1].content),plan=JSON.parse(bundle.evidence[0].text);
  assert.equal(plan.budgetHours,3);assert.equal(plan.usedHours,2);assert.equal(JSON.stringify(bundle).includes('SECRET_'),false);
});
test('facts require existing evidence; invented sources, tools and write proposals fail closed',()=>{
  const facts={statements:[{kind:'fact',text:'依据原文。',evidenceIds:['e1']}],limitations:[]};
  assert.equal(validateAgentOutput(facts,[{id:'e1',sourceType:'approved_knowledge',text:'依据原文。'}]).statements.length,1);
  assert.throws(()=>validateAgentOutput(facts,[]),{code:'AI_INVALID_RESPONSE'});
  assert.throws(()=>validateAgentOutput({...facts,proposal:{apply:true}},[{id:'e1'}]),{code:'AI_INVALID_RESPONSE'});
  assert.throws(()=>validateAgentOutput({statements:[{kind:'fact',text:'无引用事实',evidenceIds:[]}],limitations:[]},[]),{code:'AI_INVALID_RESPONSE'});
});
test('personal facts cannot upgrade recorded practice into completion despite valid evidence IDs',()=>{
  const evidence=[{id:'c1',sourceType:'user_confirmed_unverified',text:JSON.stringify({text:'记录了一次SQL查询练习，未进行独立能力核验。'})}];
  const output=text=>({statements:[{kind:'fact',text,evidenceIds:['c1']}],limitations:[]});
  assert.throws(()=>validateAgentOutput(output('完成了一次SQL查询练习。'),evidence),{code:'AI_UNSUPPORTED_FACT'});
  assert.equal(validateAgentOutput(output('记录了一次SQL查询练习'),evidence).statements.length,1);
  assert.throws(()=>validateAgentOutput({statements:[{kind:'fact',text:'记录了一次SQL查询练习',evidenceIds:['c1','k2']}],limitations:[]},[...evidence,{id:'k2',sourceType:'approved_knowledge',text:'不相关原文'}]),{code:'AI_UNSUPPORTED_FACT'});
  const plan=[{id:'p1',sourceType:'saved_plan_estimates',text:'{"budgetHours":3}'}];
  assert.throws(()=>validateAgentOutput({statements:[{kind:'fact',text:'每周3小时',evidenceIds:['p1']}],limitations:[]},plan),{code:'AI_UNSUPPORTED_FACT'});
});
test('approved excerpts returned as canonical citations; provider cannot invent source metadata',async()=>{
  const chunk={id:'k1',text:'审核原文',sourceId:'s1',sourceVersion:'v1',start:0,end:4,sha256:'fixture-hash'};
  const knowledge={snapshot:()=>({version:'reviewed-v1',digest:'v1',chunks:[chunk]}),search:()=>[chunk]};
  const f=setup({knowledge,respond:async()=>({output:{statements:[{kind:'fact',text:'审核原文',evidenceIds:['knowledge:k1']}],limitations:[]},providerActualModel:'fixture-snapshot'})});
  const result=await f.service.respond('current-user',request());
  assert.equal(result.citations[0].text,chunk.text);assert.equal(result.citations[0].sourceId,'s1');assert.deepEqual(result.citations[0].span,{start:0,end:4});
  assert.equal(result.meta.providerActualModel,'fixture-snapshot');
});
test('stale revision and foreign conversation rejected before provider',async()=>{
  const f=setup();
  await assert.rejects(f.service.respond('current-user',request({baseVersion:12})),{code:'VERSION_CONFLICT'});
  await assert.rejects(f.service.respond('current-user',request({conversationId:'another-users-conversation'})),{code:'NOT_FOUND'});
  assert.equal(f.calls,0);
});
test('revoked session or aborted request never sends personal evidence to provider',async()=>{
  const f=setup(),r=request({scope:{confirmedClaims:false,currentPlan:true}}),controller=new AbortController();
  await assert.rejects(f.service.respond('current-user',r,{stillAuthorized:()=>false}),{code:'SESSION_EXPIRED'});
  controller.abort();await assert.rejects(f.service.respond('current-user',r,{signal:controller.signal}),{code:'AI_CANCELLED'});
  assert.equal(f.calls,0);
});
test('withdrawal or knowledge revocation while pending discards late response',async()=>{
  for(const kind of ['workspace','knowledge','logout','cancel']){
    let digest='v1';const controller=new AbortController();
    const knowledge={snapshot:()=>({version:'v1',digest}),search:()=>[]};
    const f=setup({knowledge,respond:async()=>{if(kind==='workspace'){f.state.budget=1;f.change();}if(kind==='knowledge')digest='v2';if(kind==='cancel')controller.abort();return {output:{statements:[{kind:'question',text:'继续？',evidenceIds:[]}],limitations:[]}};}});
    await assert.rejects(f.service.respond('current-user',request({scope:{confirmedClaims:false,currentPlan:true}}),{signal:controller.signal,stillAuthorized:()=>kind!=='logout'}),{code:kind==='logout'?'SESSION_EXPIRED':kind==='cancel'?'AI_CANCELLED':'AI_CONTEXT_CHANGED'});
  }
});
test('old simulation authorization never permits external transmission without fresh versioned consent',async()=>{
  const f=setup();delete f.state.aiExternalConsent;
  await assert.rejects(f.service.respond('current-user',request({scope:{confirmedClaims:false,currentPlan:true}})),{code:'AI_CONSENT_REQUIRED'});
  assert.equal(f.calls,0);
  grant(f.state);f.state.aiExternalConsent.version='old-simulation-version';
  await assert.rejects(f.service.respond('current-user',request()),{code:'AI_CONSENT_REQUIRED'});
  assert.equal(f.calls,0);
});
test('scope changes and plan reads beyond the external consent are rejected before provider',async()=>{
  const f=setup();f.state.aiScope=['职业原创知识'];
  await assert.rejects(f.service.respond('current-user',request({scope:{confirmedClaims:false,currentPlan:true}})),{code:'AI_CONSENT_REQUIRED'});
  grant(f.state);
  await assert.rejects(f.service.respond('current-user',request({scope:{confirmedClaims:false,currentPlan:true}})),{code:'AI_SCOPE_REJECTED'});
  assert.equal(f.calls,0);
});
test('unrelated draft and message saves may change revision without invalidating a response',async()=>{
  const f=setup({respond:async()=>{
    f.state.aiDraft='下一条问题';f.state.conversations[0].messages=[{role:'user',text:'无关历史'}];f.change();
    return {output:{statements:[{kind:'suggestion',text:'先整理一个小任务。',evidenceIds:[]}],limitations:[]}};
  }});
  const r=request({scope:{confirmedClaims:false,currentPlan:true}}),before=agentBasisKey(f.business.read('current-user'),r);
  const response=await f.service.respond('current-user',r);
  assert.equal(response.baseVersion,0);assert.equal(f.calls,1);assert.equal(agentBasisKey(f.business.read('current-user'),r),before);
});
test('selected raw evidence changes and external consent withdrawal invalidate late responses',async()=>{
  for(const change of ['text','revoke','scope','conversation']){
    const f=setup({respond:async()=>{
      if(change==='text')f.state.claims[0].text='改写后的原文';
      if(change==='revoke')f.state.aiExternalConsent.accepted=false;
      if(change==='scope')f.state.aiScope=['职业原创知识'];
      if(change==='conversation')f.state.conversations=[];
      f.change();return {output:{statements:[{kind:'question',text:'继续？',evidenceIds:[]}],limitations:[]}};
    }});
    f.state.authorized=true;f.state.aiScope=['本人确认片段'];f.state.aiClaimRefs=[{id:'selected',version:1}];
    f.state.claims=[{id:'selected',version:1,status:'已确认',text:'原文'}];grant(f.state);
    await assert.rejects(f.service.respond('current-user',request({conversationId:'conv-1',scope:{confirmedClaims:true,currentPlan:false,claimRefs:[{id:'selected',version:1}]}})),{code:'AI_CONTEXT_CHANGED'});
  }
});
test('concurrent repeated request blocked, failure releases lock',async()=>{
  let finish;const f=setup({respond:()=>new Promise(resolve=>{finish=resolve;})});
  const r=request({scope:{confirmedClaims:false,currentPlan:true}}),first=f.service.respond('current-user',r);
  await assert.rejects(f.service.respond('current-user',r),{code:'AI_BUSY'});
  finish({output:{statements:[{kind:'question',text:'继续？',evidenceIds:[]}],limitations:[]}});await first;
  assert.equal(f.calls,1);
});
