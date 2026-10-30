import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh} from '../src/model.js';
import {AI_CONSENT_VERSION,scopeKey} from '../src/agent-contract.js';
import {createAgentSession,agentMode} from '../src/agent-session.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const context={workspace:'U11',career:'data'};
function consent(state,grantId='consent-fixture-0001'){
  state.aiExternalConsent={version:AI_CONSENT_VERSION,provider:'DeepSeek',scopeKey:scopeKey(state),accepted:true,grantId};
}
function response(payload,extra={}){
  return {schemaVersion:1,readOnly:true,mode:payload.mode,baseVersion:payload.baseVersion,scope:structuredClone(payload.scope),
    promptVersion:'fixture-prompt',knowledgeVersion:'empty-v1',statements:[{kind:'question',text:'你希望进一步核对什么？',evidenceIds:[]}],citations:[],
    limitations:['合成测试响应，未调用模型。'],tools:[],meta:{providerCalled:false,durationMs:1},...extra};
}
function setup(options={}){
  const state=fresh();state.aiDraft='本人尚未发送的问题';consent(state);
  const live={ownerId:'alice',state,workspaceRevision:4,context:{...context}},requests=[],statuses=[],results=[];let flushCalls=0;
  const session=createAgentSession({getCurrent:()=>live,flush:async()=>{flushCalls++;return options.flush?.(live);},
    request:async(payload,requestOptions)=>{requests.push({payload,options:requestOptions});return options.request?options.request(payload,requestOptions):response(payload);},
    onStatus:value=>statuses.push(value),onResult:result=>{results.push(result);return options.onResult?.(result);}});
  return {session,live,requests,statuses,results,get flushCalls(){return flushCalls;},send:extra=>session.send({message:state.aiDraft,mode:'职业咨询',context,...extra})};
}
function addClaims(f){
  f.live.state.aiScope=['职业原创知识','本人确认片段'];f.live.state.authorized=true;
  f.live.state.claims=[{id:'selected',version:1,status:'已确认',title:'选定经历',text:'本人记录过SQL练习',skill:'SQL',verified:true,secret:'DO_NOT_SEND'},
    {id:'unselected',version:1,status:'已确认',text:'UNSELECTED_PRIVATE_TEXT'}];
  f.live.state.aiClaimRefs=[{id:'selected',version:1}];consent(f.live.state);
}

test('flush finishes before a bounded payload uses the latest persisted revision; messages preserve legacy arrays',async()=>{
  const saving=deferred();const f=setup({flush:()=>saving.promise});addClaims(f);
  const before=JSON.stringify(f.live.state),sent=f.send();await tick();assert.equal(f.requests.length,0);assert.equal(f.flushCalls,1);
  f.live.workspaceRevision=9;saving.resolve();const result=await sent;
  assert.equal(result.baseVersion,9);assert.equal(f.requests.length,1);
  const payload=f.requests[0].payload;
  assert.deepEqual(Object.keys(payload).sort(),['baseVersion','context','conversationId','message','mode','scope']);
  assert.equal(payload.mode,'career_consultation');assert.equal(payload.conversationId,'conv-1');
  assert.deepEqual(payload.scope,{confirmedClaims:true,currentPlan:false,claimRefs:[{id:'selected',version:1}]});
  assert.equal(JSON.stringify(payload).includes('DO_NOT_SEND'),false);assert.equal(JSON.stringify(payload).includes('UNSELECTED_PRIVATE_TEXT'),false);
  assert.equal(JSON.stringify(f.live.state),before);assert.equal(f.results.length,1);
  const {userMessage,assistantMessage}=f.results[0];
  assert.equal(userMessage.provider,'deepseek');assert.equal(userMessage.text,'本人尚未发送的问题');assert.equal(assistantMessage.provider,'deepseek');
  assert.ok(Array.isArray(assistantMessage.scope));assert.deepEqual(assistantMessage.claimRefs,[{id:'selected',version:1}]);
  assert.equal(assistantMessage.sourceConsentId,'consent-fixture-0001');assert.equal(assistantMessage.sourceScopeKey,scopeKey(f.live.state));
  assert.equal(assistantMessage.agentResponse,result);assert.equal(Object.hasOwn(assistantMessage,'sourcePlanVersion'),false);
  assert.deepEqual(f.statuses.map(item=>item.status),['saving','requesting','success']);assert.equal(f.session.current().pending,false);
});

test('explicit mode mapping does not silently route unsupported modes or invalid context',async()=>{
  for(const [value,wanted] of [['职业咨询','career_consultation'],['评估解释','assessment_explanation'],['计划推演','plan_simulation'],['career_consultation','career_consultation']])assert.equal(agentMode(value),wanted);
  for(const mode of ['学习辅导','成果反馈','报告编辑','unknown']){
    const f=setup();f.live.state.conversations[0].mode=mode;await assert.rejects(f.send({mode}),{code:'AI_MODE_UNAVAILABLE'});assert.equal(f.requests.length,0);
  }
  const f=setup();await assert.rejects(f.send({context:{workspace:['U11'],career:'data'}}),{code:'AI_INVALID_REQUEST'});
  assert.equal(f.flushCalls,0);
});

test('old simulated or missing consent and a missing account cannot start a request',async()=>{
  const f=setup();delete f.live.state.aiExternalConsent;
  await assert.rejects(f.send(),{code:'AI_CONSENT_REQUIRED'});assert.equal(f.flushCalls,0);
  consent(f.live.state);f.live.ownerId=null;
  await assert.rejects(f.send(),{code:'SESSION_EXPIRED'});assert.equal(f.requests.length,0);
});

test('double send is rejected without replacing the first in-flight request',async()=>{
  const waiting=deferred(),f=setup({request:()=>waiting.promise});
  const first=f.send();await tick();assert.equal(f.session.current().pending,true);
  await assert.rejects(f.send(),{code:'AI_BUSY'});assert.equal(f.requests.length,1);assert.equal(f.session.current().pending,true);
  waiting.resolve(response(f.requests[0].payload));await first;assert.equal(f.results.length,1);
});

test('cancellation while saving prevents network even when flush ignores cancellation',async()=>{
  const saving=deferred(),f=setup({flush:()=>saving.promise});
  const sent=f.send();await tick();assert.equal(f.session.cancel(),true);await assert.rejects(sent,{code:'AI_CANCELLED'});
  saving.resolve();await tick();assert.equal(f.requests.length,0);assert.equal(f.results.length,0);
  assert.equal(f.live.state.aiDraft,'本人尚未发送的问题');assert.equal(f.session.current().status,'cancelled');
});

test('cancellation after request discards an uncancellable late reply and preserves input',async()=>{
  const waiting=deferred(),f=setup({request:()=>waiting.promise});const sent=f.send();await tick();
  f.session.cancel();await assert.rejects(sent,{code:'AI_CANCELLED'});assert.equal(f.requests[0].options.signal.aborted,true);
  waiting.resolve(response(f.requests[0].payload));await tick();assert.equal(f.results.length,0);assert.equal(f.live.state.aiDraft,'本人尚未发送的问题');
});

test('account, conversation, mode, page context and consent grant changes discard pending results',async()=>{
  const changes=[
    f=>{f.live.ownerId='bob';},
    f=>{f.live.state.conversations.push({id:'conv-2',mode:'职业咨询',messages:[]});f.live.state.conversationId='conv-2';},
    f=>{f.live.state.conversations[0].mode='计划推演';},
    f=>{f.live.context={workspace:'U04',career:'data'};},
    f=>{consent(f.live.state,'consent-fixture-0002');}
  ];
  for(const [index,change] of changes.entries()){
    const waiting=deferred(),f=setup({request:()=>waiting.promise}),sent=f.send();await tick();change(f);
    assert.equal(f.session.revalidate(),false);await assert.rejects(sent,{code:index===0?'ACCOUNT_CHANGED':'AI_CONTEXT_CHANGED'});
    waiting.resolve(response(f.requests[0].payload));await tick();assert.equal(f.results.length,0);
  }
});

test('selected material changes and revocation abort, while unselected content and drafts can change',async()=>{
  for(const mutation of [s=>{s.claims[0].text='changed without bumping version';},s=>{s.claims[0].version=2;},s=>{s.claims[0].status='已撤回';},s=>{s.aiScope=['职业原创知识'];s.aiClaimRefs=[];s.authorized=false;}]){
    const waiting=deferred(),f=setup({request:()=>waiting.promise});addClaims(f);const sent=f.send();await tick();mutation(f.live.state);
    assert.equal(f.session.revalidate(),false);await assert.rejects(sent,{code:'AI_CONTEXT_CHANGED'});
    waiting.resolve(response(f.requests[0].payload));await tick();assert.equal(f.results.length,0);
  }
  const waiting=deferred(),f=setup({request:()=>waiting.promise});addClaims(f);const sent=f.send();await tick();
  f.live.state.claims[1].text='unselected edit';f.live.state.aiDraft='下一条问题草稿';f.live.state.aiReturn='/careers';
  f.live.state.conversations[0].messages.push({id:'unrelated-note',role:'user',text:'无关消息'});f.live.workspaceRevision=99;
  assert.equal(f.session.revalidate(),true);waiting.resolve(response(f.requests[0].payload));await sent;
  assert.equal(f.results.length,1);assert.equal(f.live.state.aiDraft,'下一条问题草稿');assert.equal(f.results[0].assistantMessage.agentResponse.baseVersion,4);
});

test('selected plan state, estimates and versions are guarded; plan message binds source plan version',async()=>{
  for(const mutate of [s=>{s.budget=5;},s=>{s.planVersion++;},s=>{s.tasks[0].hours=2;}]){
    const waiting=deferred(),f=setup({request:()=>waiting.promise});
    f.live.state.aiScope=['当前目标与计划'];f.live.state.conversations[0].mode='计划推演';f.live.state.tasks=[{id:'t1',title:'练习',hours:1,status:'待开始',dependsOn:[]}];consent(f.live.state);
    const sent=f.send({mode:'计划推演'});await tick();mutate(f.live.state);
    assert.equal(f.session.revalidate(),false);await assert.rejects(sent,{code:'AI_CONTEXT_CHANGED'});waiting.resolve(response(f.requests[0].payload));
  }
  const f=setup();f.live.state.aiScope=['当前目标与计划'];f.live.state.conversations[0].mode='计划推演';consent(f.live.state);
  await f.send({mode:'计划推演'});assert.equal(f.results[0].assistantMessage.sourcePlanVersion,1);assert.equal(f.requests[0].payload.scope.currentPlan,true);
});

test('account change during flush blocks the request and errors never clear or retry a draft',async()=>{
  const saving=deferred(),f=setup({flush:()=>saving.promise}),sent=f.send();await tick();f.live.ownerId='bob';saving.resolve();
  await assert.rejects(sent,{code:'ACCOUNT_CHANGED'});assert.equal(f.requests.length,0);
  const failure=setup({request:async()=>{throw Object.assign(new Error('network details must not reach UI'),{code:'AI_TIMEOUT'});}});
  await assert.rejects(failure.send(),{code:'AI_TIMEOUT'});assert.equal(failure.requests.length,1);assert.equal(failure.live.state.aiDraft,'本人尚未发送的问题');assert.equal(failure.results.length,0);
  const conflict=setup({flush:async()=>{throw Object.assign(Error(),{code:'VERSION_CONFLICT'});}});
  await assert.rejects(conflict.send(),{code:'VERSION_CONFLICT'});assert.equal(conflict.requests.length,0);
});

test('response identity, citation shape and unknown values are validated before message storage',async()=>{
  const malformed=[
    payload=>response(payload,{readOnly:false}),payload=>response(payload,{mode:'plan_simulation'}),payload=>response(payload,{baseVersion:999}),
    payload=>response(payload,{scope:{confirmedClaims:true,currentPlan:false}}),
    payload=>response(payload,{statements:[{kind:'fact',text:'伪引用',evidenceIds:['invented']}]}),
    payload=>response(payload,{meta:{reasoning_content:'internal chain must not be saved'}}),
    payload=>response(payload,{statements:[{kind:'question',text:'字'.repeat(1801),evidenceIds:[]}]})
  ];
  for(const build of malformed){const f=setup({request:payload=>build(payload)});await assert.rejects(f.send(),{code:'AI_INVALID_RESPONSE'});assert.equal(f.results.length,0);}
  const f=setup({request:payload=>response(payload,{debugSecret:'must be dropped'})});await f.send();assert.equal(Object.hasOwn(f.results[0].response,'debugSecret'),false);
});

test('destroy aborts pending requests without delivering callbacks into an unmounted consumer',async()=>{
  const waiting=deferred(),f=setup({request:()=>waiting.promise}),sent=f.send();await tick();const before=f.statuses.length;
  f.session.destroy();await assert.rejects(sent,{code:'AI_CANCELLED'});waiting.resolve(response(f.requests[0].payload));await tick();
  assert.equal(f.statuses.length,before);assert.equal(f.results.length,0);await assert.rejects(f.send(),{code:'AI_CANCELLED'});
});
