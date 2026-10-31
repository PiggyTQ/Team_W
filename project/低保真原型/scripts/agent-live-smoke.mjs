// Remote-only, synthetic-data probe. Never copies or prints environment values.
// Place beside deepseek.mjs, budget.mjs and the bundled agent-service module.
import {createDeepSeekClient} from './deepseek.mjs';
import {createBudgetLedger,DEFAULT_BUDGET_ID} from './budget.mjs';

const ALLOWED_ERRORS=new Set(['AI_NOT_CONFIGURED','AI_CONFIG_INVALID','AI_TIMEOUT','AI_PROVIDER_UNAVAILABLE','AI_INVALID_RESPONSE','AI_UNSUPPORTED_FACT','AI_BUDGET_EXCEEDED','AI_BUDGET_CONFIG_INVALID','AI_BUDGET_UNAVAILABLE','AI_BUDGET_USAGE_CONFLICT','AI_BUDGET_PRICE_EXPIRED','AI_CONTEXT_CHANGED','AI_SCOPE_REJECTED']);
const phase=process.argv[2];
let ledger,client,before=null;
const started=Date.now();
try {
  if(!['connectivity','scoped'].includes(phase)||process.env.AI_ENABLED!=='0'
    ||process.env.DEEPSEEK_MODEL!=='deepseek-flash'||process.env.AI_BUDGET_CNY!=='8.00'
    ||process.env.AI_BUDGET_ID!==DEFAULT_BUDGET_ID
    ||process.env.AI_BUDGET_DATABASE!=='/var/lib/career-growth/ai-budget.sqlite')throw {code:'AI_CONFIG_INVALID'};
  // Modules and the root-only env file have been read before dropping privileges.
  // The ledger is created by the same unprivileged account as the website service.
  const serviceModule=phase==='scoped'?await import('./agent-service.bundle.mjs'):null;
  if(process.getuid()!==0)throw {code:'AI_CONFIG_INVALID'};
  process.chdir('/var/lib/career-growth');
  process.setgroups([]);
  process.setgid('career');process.setuid('career');
  ledger=createBudgetLedger({database:process.env.AI_BUDGET_DATABASE,limitCny:process.env.AI_BUDGET_CNY,budgetId:process.env.AI_BUDGET_ID});
  before=ledger.summary();
  client=createDeepSeekClient({apiKey:process.env.DEEPSEEK_API_KEY,model:process.env.DEEPSEEK_MODEL,budget:ledger,maxTokens:phase==='connectivity'?256:1200,timeoutMs:10000});
  let report;
  if(phase==='connectivity'){
    const result=await client.respond({messages:[
      {role:'system',content:'只输出简短json对象，精确格式为 {"status":"ok","message":"中文连通性说明"}。这是合成技术测试，不作任何职业或个人能力判断。'},
      {role:'user',content:'请确认你能返回这个JSON结构，用一句中文说明这是连通测试。'}
    ]});
    const output=result.output;
    if(output.status!=='ok'||typeof output.message!=='string'||output.message.length>300||Object.keys(output).sort().join(',')!=='message,status')throw {code:'AI_INVALID_RESPONSE'};
    report={output,configuredModel:result.configuredModel,providerActualModel:result.providerActualModel,usage:result.usage};
  } else {
    // All state below is invented for a labelled test, never read from an account.
    const state={authorized:true,aiScope:['本人确认片段'],aiClaimRefs:[{id:'fixture-claim',version:1}],
      claims:[{id:'fixture-claim',version:1,status:'已确认',title:'合成测试课程记录',text:'这是人工构造的合成测试材料：测试学生记录了一次SQL查询练习，未进行独立能力核验。',skill:'SQL',verified:true,privateNote:'UNSELECTED_SENTINEL_MUST_NOT_SEND'}],
      conversations:[{id:'fixture-conversation'}],tasks:[],goal:'data',budget:3,planVersion:1};
    state.aiExternalConsent={version:'deepseek-external-v1',provider:'DeepSeek',accepted:true,
      scopeKey:JSON.stringify({scope:['本人确认片段'],claimRefs:[{id:'fixture-claim',version:1}]}),grantId:'fixture-smoke-consent-20261028'};
    const baseline=JSON.stringify(state);
    let providerResult;
    const provider={configuredModel:client.configuredModel,respond:async request=>{
      if(JSON.stringify(request).includes('UNSELECTED_SENTINEL_MUST_NOT_SEND'))throw {code:'AI_SCOPE_REJECTED'};
      providerResult=await client.respond(request);return providerResult;
    }};
    const service=serviceModule.createAgentService({business:{read:()=>({state,revision:0})},provider,enabled:true});
    const result=await service.respond('fixture-owner',{
      mode:'assessment_explanation',message:'这是合成测试。请只说明这段材料支持了什么、还不能判断什么，引用本次证据。不要推测职业硬要求。',baseVersion:0,
      scope:{confirmedClaims:true,currentPlan:false,claimRefs:[{id:'fixture-claim',version:1}]},context:{workspace:'U04',career:'data'},conversationId:'fixture-conversation'
    },{stillAuthorized:()=>true});
    if(baseline!==JSON.stringify(state)||!result.readOnly||!result.meta.providerCalled)throw {code:'AI_INVALID_RESPONSE'};
    report={result,sourceStateUnchanged:true,syntheticDataOnly:true,configuredModel:client.configuredModel,providerActualModel:providerResult?.providerActualModel,usage:providerResult?.usage};
  }
  const after=ledger.summary();
  console.log(JSON.stringify({success:true,phase,syntheticDataOnly:true,productionServiceChanged:false,durationMs:Date.now()-started,budgetBefore:before,budgetAfter:after,...report}));
} catch(error) {
  let after=null;try{after=ledger?.summary()||null;}catch{}
  console.log(JSON.stringify({success:false,phase:['connectivity','scoped'].includes(phase)?phase:'invalid',syntheticDataOnly:true,productionServiceChanged:false,durationMs:Date.now()-started,
    code:ALLOWED_ERRORS.has(error?.code)?error.code:'SMOKE_FAILED',budgetBefore:before,budgetAfter:after}));
  process.exitCode=1;
} finally {
  try{client?.close();ledger?.close();}catch{}
}
