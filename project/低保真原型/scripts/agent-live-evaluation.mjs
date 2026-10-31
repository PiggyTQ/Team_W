// Isolated server runner: synthetic data only, existing cumulative budget only.
import fs from 'node:fs';
import {createDeepSeekClient} from './deepseek.mjs';
import {createBudgetLedger,DEFAULT_BUDGET_ID} from './budget.mjs';
import {createAgentService,createReviewedKnowledge,fresh,scopeKey} from './agent-eval.bundle.mjs';
let ledger,client;
try{
  if(process.getuid()!==0||process.env.AI_ENABLED!=='0'||process.env.DEEPSEEK_MODEL!=='deepseek-flash'||process.env.AI_BUDGET_CNY!=='8.00'||process.env.AI_BUDGET_ID!==DEFAULT_BUDGET_ID||process.env.AI_BUDGET_DATABASE!=='/var/lib/career-growth/ai-budget.sqlite')throw {code:'EVAL_CONFIG_INVALID'};
  const pack=JSON.parse(fs.readFileSync(new URL('./authored-guidance-v1.json',import.meta.url))),cases=JSON.parse(fs.readFileSync(new URL('./evaluation-cases-v1.json',import.meta.url)));
  process.chdir('/var/lib/career-growth');process.setgroups([]);process.setgid('career');process.setuid('career');
  ledger=createBudgetLedger({database:process.env.AI_BUDGET_DATABASE,limitCny:process.env.AI_BUDGET_CNY,budgetId:process.env.AI_BUDGET_ID});
  const before=ledger.summary();
  // An extra experiment ceiling, in addition to the immutable 8 yuan ledger.
  if(before.reservedMicroCny>4000000)throw {code:'EVAL_REMAINING_BUDGET_TOO_LOW'};
  const experimentCeiling=110408+2000000; // Same cumulative experiment across both rounds, never reset.
  const experimentBudget={reserve:input=>{const s=ledger.summary(),cost=(input.requestBytes+s.inputTokenOverhead)*s.inputMicroCnyPerToken+input.maxTokens*s.outputMicroCnyPerToken;if(s.reservedMicroCny+cost>experimentCeiling)throw {code:'AI_BUDGET_EXCEEDED'};return ledger.reserve(input);},recordUsage:(...args)=>ledger.recordUsage(...args),summary:()=>ledger.summary()};
  const selectedCase=process.argv[2];
  client=createDeepSeekClient({apiKey:process.env.DEEPSEEK_API_KEY,model:process.env.DEEPSEEK_MODEL,budget:experimentBudget,maxTokens:selectedCase?800:1400,timeoutMs:20000});
  const knowledge=createReviewedKnowledge({loadPack:()=>pack});
  const available=[...cases.retrieval.filter(c=>c.id.endsWith('-task')),...cases.liveSafety];
  if(selectedCase&&!available.some(c=>c.id===selectedCase))throw {code:'EVAL_INVALID_CASE'};
  const tests=selectedCase?available.filter(c=>c.id===selectedCase):available;let success=0,failed=0;
  console.log(JSON.stringify({event:'begin',syntheticDataOnly:true,productionServiceChanged:false,caseCount:tests.length,budgetBefore:before}));
  for(const c of tests){
    if(ledger.summary().reservedMicroCny>=experimentCeiling){console.log(JSON.stringify({event:'stopped',reason:'experiment_2_yuan_reservation_ceiling'}));break;}
    const state=fresh();state.authorized=!!c.claim;state.aiScope=['职业原创知识',...(c.claim?['本人确认片段']:[])];state.aiClaimRefs=c.claim?[{id:'eval-claim',version:1}]:[];
    if(c.claim)state.claims=[{id:'eval-claim',version:1,status:'已确认',title:'明确标注的合成测试',text:c.claim,skill:c.skill,verified:true,privateNote:'DO_NOT_SEND_PRIVATE_EVAL_SENTINEL'}];
    state.aiExternalConsent={version:'deepseek-external-v1',provider:'DeepSeek',accepted:true,scopeKey:scopeKey(state),grantId:'synthetic-evaluation-consent-20261028'};
    const baseline=JSON.stringify(state);let raw=null;
    const provider={configuredModel:client.configuredModel,respond:async request=>{
      if(JSON.stringify(request).includes('DO_NOT_SEND_PRIVATE_EVAL_SENTINEL'))throw {code:'AI_SCOPE_REJECTED'};
      const result=await client.respond(request);raw=result.output;return result;
    }};
    const service=createAgentService({business:{read:()=>({state,revision:0})},knowledge,provider,enabled:true});
    const start=Date.now();
    try{
      const result=await service.respond('synthetic-eval-owner',{mode:c.claim?'assessment_explanation':'career_consultation',message:c.query,baseVersion:0,scope:{confirmedClaims:!!c.claim,currentPlan:false,...(c.claim?{claimRefs:state.aiClaimRefs}:{})},context:{workspace:'U11',career:c.career}});
      if(baseline!==JSON.stringify(state))throw {code:'EVAL_STATE_MUTATED'};
      // Narrow regression assertions, not a substitute for human semantic review.
      const asserted=result.statements.filter(s=>s.kind==='fact').map(s=>s.text.replace(/\s/g,'')).join('\n');
      if((c.mustNotAssert||[]).some(s=>asserted.includes(s)))throw {code:'EVAL_FORBIDDEN_ASSERTION'};
      success++;console.log(JSON.stringify({event:'case',id:c.id,career:c.career,success:true,durationMs:Date.now()-start,result,semanticReview:'pending independent review'}));
    }catch(e){failed++;console.log(JSON.stringify({event:'case',id:c.id,career:c.career,success:false,durationMs:Date.now()-start,code:/^(AI_|EVAL_)/.test(e?.code||'')?e.code:'EVAL_FAILED',syntheticOutputForReview:raw}));}
  }
  console.log(JSON.stringify({event:'complete',success,failed,budgetBefore:before,budgetAfter:ledger.summary(),syntheticDataOnly:true,productionServiceChanged:false,studentStudyCompleted:false}));
}catch(e){console.log(JSON.stringify({event:'fatal',code:/^(AI_|EVAL_)/.test(e?.code||'')?e.code:'EVAL_FAILED'}));process.exitCode=1;}
finally{try{ledger?.close();}catch{}}
