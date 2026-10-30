import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh} from '../src/model.js';
import {AI_CONSENT_VERSION,scopeKey,hasExternalConsent,agentMessageAvailable,agentKnowledgeAvailable} from '../src/agent-contract.js';

function fixture({personal=false,plan=false}={}){
  const state=fresh();state.aiScope=['职业原创知识',...(plan?['当前目标与计划']:[]),...(personal?['本人确认片段']:[])];
  state.claims=[{id:'selected',version:1,status:'已确认',text:'选定材料'},{id:'other',version:1,status:'已确认',text:'未选材料'}];
  state.aiClaimRefs=personal?[{id:'selected',version:1}]:[];state.authorized=personal;
  state.aiExternalConsent={version:AI_CONSENT_VERSION,provider:'DeepSeek',accepted:true,scopeKey:scopeKey(state),grantId:'fixture-consent-0001'};
  return state;
}
const message=state=>({provider:'deepseek',role:'assistant',text:'不应越权展示的正文',scope:[...state.aiScope],claimRefs:[...state.aiClaimRefs],
  sourceScopeKey:scopeKey(state),sourceConsentId:state.aiExternalConsent.grantId,...(state.aiScope.includes('当前目标与计划')?{sourcePlanVersion:state.planVersion}:{})});

test('cached knowledge answers require the currently checked digest, including refresh and withdrawal',()=>{
  const digest='a'.repeat(64),changed='b'.repeat(64),answer={provider:'deepseek',role:'assistant',scope:['职业原创知识'],agentResponse:{knowledgeDigest:digest,meta:{knowledgeUsed:true},citations:[{sourceType:'approved_knowledge'}]}};
  assert.equal(agentKnowledgeAvailable(answer,digest),true);assert.equal(agentKnowledgeAvailable(answer,null),false);assert.equal(agentKnowledgeAvailable(answer,changed),false);assert.equal(agentKnowledgeAvailable({...answer,agentResponse:{...answer.agentResponse,knowledgeDigest:undefined}},digest),false);
});
test('knowledge withdrawal also hides saved note bodies, edit paths and historical versions',()=>{
  const digest='a'.repeat(64),note={provider:'deepseek',scope:['职业原创知识'],sourceKnowledgeDigest:digest,text:'old source',history:[{text:'old source'}]};assert.equal(agentKnowledgeAvailable(note,digest),true);assert.equal(agentKnowledgeAvailable(note,'b'.repeat(64)),false);assert.equal(agentKnowledgeAvailable({provider:'deepseek',scope:['职业原创知识'],text:'legacy public note'},digest),false);
});
test('public approval status does not invalidate non-knowledge personal replies, empty-library system notes or user questions',()=>{
  for(const item of [{provider:'deepseek',role:'user',scope:['职业原创知识']},{provider:'deepseek',role:'assistant',scope:['职业原创知识'],agentResponse:{meta:{knowledgeUsed:false},citations:[]}},{provider:'deepseek',scope:['职业原创知识'],sourceKnowledgeDigest:null},{provider:'deepseek',role:'assistant',scope:['职业原创知识'],agentResponse:{meta:{providerCalled:false},citations:[]}},{role:'assistant',scope:['职业原创知识'],text:'demo'}])assert.equal(agentKnowledgeAvailable(item,null),true);
});

test('scope keys are order-stable and keep material versions significant',()=>{
  const a=fixture({personal:true,plan:true}),b=structuredClone(a);
  a.aiClaimRefs.push({id:'other',version:1});b.aiClaimRefs=[{id:'other',version:1},...b.aiClaimRefs];b.aiScope.reverse();
  assert.equal(scopeKey(a),scopeKey(b));b.aiClaimRefs[0].version=2;assert.notEqual(scopeKey(a),scopeKey(b));
});
test('malformed or ambiguous scope shapes cannot produce valid external consent',()=>{
  for(const patch of [{aiScope:['unknown']},{aiScope:['职业原创知识','职业原创知识']},{aiScope:'职业原创知识'},{aiClaimRefs:null},{aiClaimRefs:[{id:'a',version:'1'}]},{aiClaimRefs:[{id:'a',version:1},{id:'a',version:1}]}]){
    const state={...fixture(),...patch};assert.equal(scopeKey(state),null);assert.equal(hasExternalConsent(state),false);
  }
});
test('simulation consent does not authorize external model access',()=>{
  const state=fixture({personal:true});delete state.aiExternalConsent;
  assert.equal(hasExternalConsent(state),false);
  for(const consent of [{version:'simulation-v1',provider:'DeepSeek',accepted:true,scopeKey:scopeKey(state)},
    {version:AI_CONSENT_VERSION,provider:'other',accepted:true,scopeKey:scopeKey(state)},
    {version:AI_CONSENT_VERSION,provider:'DeepSeek',accepted:true,scopeKey:scopeKey(state)}]){
    state.aiExternalConsent=consent;assert.equal(hasExternalConsent(state),false);
  }
});
test('explicit public-only consent is valid without authorizing private materials',()=>{
  const state=fixture();assert.equal(state.authorized,false);assert.equal(hasExternalConsent(state),true);
  state.aiClaimRefs=[{id:'selected',version:1}];state.aiExternalConsent.scopeKey=scopeKey(state);
  assert.equal(hasExternalConsent(state),false);
});
test('selected material authorization expires on deselection, revision, withdrawal and rejection',()=>{
  for(const change of ['selection','version','withdraw','reject','authorization']){
    const state=fixture({personal:true});assert.equal(hasExternalConsent(state),true);
    if(change==='selection')state.aiScope=['职业原创知识'];
    if(change==='version')state.claims[0].version=2;
    if(change==='withdraw')state.claims[0].status='已撤回';
    if(change==='reject')state.claims[0].status='已拒绝';
    if(change==='authorization')state.authorized=false;
    assert.equal(hasExternalConsent(state),false,change);
  }
});
test('real user messages, answers and notes all hide after referenced material becomes unavailable',()=>{
  for(const role of ['user','assistant','note']){
    const state=fixture({personal:true}),saved={...message(state),role};
    assert.equal(agentMessageAvailable(state,saved),true);
    state.claims[0].status='已撤回';assert.equal(agentMessageAvailable(state,saved),false);
  }
});
test('real messages require the exact current external consent identity',()=>{
  const state=fixture({personal:true}),saved=message(state);
  state.aiExternalConsent.accepted=false;assert.equal(agentMessageAvailable(state,saved),false);
  state.aiExternalConsent.accepted=true;state.aiExternalConsent.grantId='fixture-consent-0002';
  assert.equal(hasExternalConsent(state),true);assert.equal(agentMessageAvailable(state,saved),false);
});
test('plan-derived messages expire after a changed plan version',()=>{
  const state=fixture({plan:true}),saved=message(state);assert.equal(agentMessageAvailable(state,saved),true);
  state.planVersion++;assert.equal(agentMessageAvailable(state,saved),false);
});
test('unselected and changed material references cannot be resurrected by a saved response',()=>{
  const state=fixture({personal:true}),saved=message(state);
  assert.equal(agentMessageAvailable(state,{...saved,claimRefs:[{id:'other',version:1}]}),false);
  assert.equal(agentMessageAvailable(state,{...saved,claimRefs:[{id:'selected',version:2}]}),false);
  assert.equal(agentMessageAvailable(state,{...saved,claimRefs:'bad'}),false);
  assert.equal(agentMessageAvailable(state,{...saved,sourceScopeKey:'previous-scope'}),false);
});
test('legacy simulation history stays labelled by callers and still hides revoked personal refs',()=>{
  const state=fixture({personal:true});delete state.aiExternalConsent;
  const old={role:'assistant',text:'预录模拟',scope:['本人确认片段'],claimRefs:[{id:'selected',version:1}]};
  assert.equal(agentMessageAvailable(state,{...old,claimRefs:[]}),false);
  assert.equal(agentMessageAvailable(state,old),true);state.claims[0].status='已撤回';assert.equal(agentMessageAvailable(state,old),false);
  assert.equal(agentMessageAvailable(state,{role:'assistant',text:'公开模拟',scope:['职业原创知识']}),true);
});
