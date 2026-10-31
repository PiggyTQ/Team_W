import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAgentService,validateAgentOutput} from '../server/agent/service.mjs';
import {reviewedLibrary} from '../server/agent/library.mjs';
import {fresh} from '../src/model.js';
import {scopeKey} from '../src/agent-contract.js';
function fixture(output){const state=fresh();state.aiScope=['职业原创知识'];state.aiExternalConsent={version:'deepseek-external-v1',provider:'DeepSeek',accepted:true,scopeKey:scopeKey(state),grantId:'fallback-test-consent-20261028'};let calls=0;const knowledge=reviewedLibrary();return {state,knowledge,service:createAgentService({business:{read:()=>({state,revision:0})},knowledge,enabled:true,provider:{configuredModel:'fixture',respond:async()=>{calls++;return {output};}}}),get calls(){return calls;}};}
const input=career=>({mode:'career_consultation',message:'请解释职业任务和学习方向，保留限制。',context:{workspace:'U11',career},baseVersion:0,scope:{confirmedClaims:false,currentPlan:false}});
for(const file of ['live-evaluation.jsonl','live-evaluation-round2.jsonl']){
  const archive=new URL(`./fixtures/agent-evaluation-replay/${file}`,import.meta.url);
  const rejected=fs.readFileSync(archive,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l)).filter(r=>r.event==='case'&&!r.success&&r.syntheticOutputForReview);
  for(const row of rejected)test(`actual rejected response replay: ${file}/${row.id} uses public source floor once`,async()=>{
    const f=fixture(row.syntheticOutputForReview),before=JSON.stringify(f.state);const result=await f.service.respond('fixture-user',input(row.career));assert.equal(f.calls,1);assert.equal(result.meta.responseOrigin,'retrieval_fallback');assert.ok(['AI_INVALID_RESPONSE','AI_UNSUPPORTED_FACT'].includes(result.meta.validationRejected));assert.ok(result.statements.some(s=>s.kind==='fact'));assert.ok(result.citations.every(c=>c.sourceType==='approved_knowledge'));assert.equal(JSON.stringify(f.state),before);assert.ok(result.limitations.some(s=>s.includes('不是有效的模型分析')));
  });
}
test('unsupported personal or public upgrade cannot survive as model text in fallback',async()=>{
  const f=fixture({statements:[{kind:'fact',text:'UNSUPPORTED_UPGRADE',evidenceIds:['knowledge:foundation-SW_BE-tasks-whole']}],limitations:[]});const result=await f.service.respond('fixture-user',input('backend'));assert.equal(result.meta.responseOrigin,'retrieval_fallback');assert.equal(JSON.stringify(result).includes('UNSUPPORTED_UPGRADE'),false);assert.ok(result.statements.filter(s=>s.kind==='fact').every(s=>s.text.includes('适用范围')));
});
test('real semantic review regression: a test label cannot turn a user log into a synthetic log',()=>{
  const rows=fs.readFileSync(new URL('./fixtures/agent-evaluation-replay/live-evaluation-round2.jsonl',import.meta.url),'utf8').replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l));
  const actual=rows.find(r=>r.id==='injected-material-command');assert.equal(actual.success,true,'This was initially accepted structurally');
  assert.throws(()=>validateAgentOutput({statements:actual.result.statements,limitations:[]},actual.result.citations),{code:'AI_UNSUPPORTED_FACT'});
});
