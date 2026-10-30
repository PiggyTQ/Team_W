import {careers,usedHours} from './model.js';
import {hasExternalConsent,scopeKey} from './agent-contract.js';

export const AGENT_MODE_MAP=Object.freeze({
  '职业咨询':'career_consultation','评估解释':'assessment_explanation','计划推演':'plan_simulation'
});
const MODE_VALUES=new Set(Object.values(AGENT_MODE_MAP));
const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const fail=code=>{throw Object.assign(new Error(code),{code});};
const trimmed=(value,max)=>typeof value==='string'?value.slice(0,max):'';
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
let sequence=0;
const identifier=prefix=>`${prefix}-${globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${++sequence}`}`;

export function agentMode(value){
  const mode=AGENT_MODE_MAP[value]||value;
  if(!MODE_VALUES.has(mode))fail('AI_MODE_UNAVAILABLE');
  return mode;
}

function contextValue(value){
  if(!record(value)||typeof value.workspace!=='string'||!/^U(0[3-9]|1[01])$/.test(value.workspace)
    ||!careers.some(c=>c.id===value.career))fail('AI_INVALID_REQUEST');
  return {workspace:value.workspace,career:value.career};
}

function capture(current,requestedMode,context){
  if(!current||typeof current.ownerId!=='string'||!current.ownerId)fail('SESSION_EXPIRED');
  const state=current.state;
  if(!record(state)||typeof state.conversationId!=='string'||!Array.isArray(state.conversations))fail('AI_CONTEXT_CHANGED');
  const conversation=state.conversations.find(c=>c.id===state.conversationId);
  if(!conversation||agentMode(conversation.mode||'职业咨询')!==requestedMode)fail('AI_CONTEXT_CHANGED');
  if(current.context&&!same(contextValue(current.context),context))fail('AI_CONTEXT_CHANGED');
  if(!hasExternalConsent(state))fail('AI_CONSENT_REQUIRED');
  const selectedScope=[...(state.aiScope||[])],confirmedClaims=selectedScope.includes('本人确认片段'),currentPlan=selectedScope.includes('当前目标与计划');
  const claimRefs=confirmedClaims?(state.aiClaimRefs||[]).map(ref=>({id:ref.id,version:ref.version})).sort((a,b)=>a.id.localeCompare(b.id)):[];
  if(confirmedClaims&&(!state.authorized||claimRefs.length<1||claimRefs.length>12||new Set(claimRefs.map(ref=>ref.id)).size!==claimRefs.length))fail('AI_SCOPE_REJECTED');
  const claims=claimRefs.map(ref=>{
    const claim=state.claims?.find(c=>c.id===ref.id&&c.version===ref.version&&c.status==='已确认');
    if(!claim)fail('AI_SCOPE_REJECTED');
    return {id:ref.id,version:ref.version,title:trimmed(claim.title,160),text:trimmed(claim.text,2000),skill:trimmed(claim.skill,160)};
  });
  if(requestedMode==='assessment_explanation'&&!confirmedClaims||requestedMode==='plan_simulation'&&!currentPlan)fail('AI_SCOPE_REJECTED');
  const plan=currentPlan?{
    goal:state.goal,planVersion:state.planVersion,budget:Number(state.budget),usedHours:usedHours(state),
    tasks:state.tasks.slice(0,30).map(t=>({id:trimmed(t.id,120),title:trimmed(t.title,160),hours:Number(t.hours),status:trimmed(t.status,40),dependsOn:(t.dependsOn||[]).slice(0,30).map(id=>trimmed(id,120))}))
  }:null;
  const sourceScopeKey=scopeKey(state);
  const sourceConsentId=state.aiExternalConsent.grantId;
  const basis=JSON.stringify({ownerId:current.ownerId,conversationId:conversation.id,mode:requestedMode,context,sourceScopeKey,sourceConsentId,claims,plan});
  return {ownerId:current.ownerId,conversationId:conversation.id,mode:requestedMode,context,sourceScopeKey,sourceConsentId,basis,
    scope:{confirmedClaims,currentPlan,...(confirmedClaims?{claimRefs}: {})},
    scopeLabels:selectedScope,claimRefs,sourcePlanVersion:currentPlan?state.planVersion:undefined};
}

function safeCopy(value,depth=0){
  if(depth>18)fail('AI_INVALID_RESPONSE');
  if(value===null||typeof value==='boolean')return value;
  if(typeof value==='number'){if(!Number.isFinite(value))fail('AI_INVALID_RESPONSE');return value;}
  if(typeof value==='string'){if(value.length>45000)fail('AI_INVALID_RESPONSE');return value;}
  if(Array.isArray(value)){if(value.length>50)fail('AI_INVALID_RESPONSE');return value.map(v=>safeCopy(v,depth+1));}
  if(!record(value))fail('AI_INVALID_RESPONSE');
  const entries=Object.entries(value);
  if(entries.length>40||entries.some(([key])=>['__proto__','prototype','constructor','password','password_hash','apiKey','DEEPSEEK_API_KEY','reasoning_content'].includes(key)))fail('AI_INVALID_RESPONSE');
  return Object.fromEntries(entries.map(([key,child])=>[key,safeCopy(child,depth+1)]));
}

function validResponse(input,payload){
  if(!record(input)||input.schemaVersion!==1||input.readOnly!==true||input.mode!==payload.mode||input.baseVersion!==payload.baseVersion
    ||!Array.isArray(input.statements)||!input.statements.length||input.statements.length>10
    ||!Array.isArray(input.citations)||input.citations.length>18||!Array.isArray(input.limitations)||input.limitations.length>20
    ||input.limitations.some(item=>typeof item!=='string'||item.length>1800)||!record(input.scope)
    ||input.scope.confirmedClaims!==payload.scope.confirmedClaims||input.scope.currentPlan!==payload.scope.currentPlan
    ||!same(input.scope.claimRefs||[],payload.scope.claimRefs||[]))fail('AI_INVALID_RESPONSE');
  const citations=new Set();
  for(const row of input.citations){
    if(!record(row)||typeof row.id!=='string'||!row.id||row.id.length>240||citations.has(row.id)
      ||typeof row.text!=='string'||row.text.length>45000||!['approved_knowledge','user_confirmed_unverified','saved_plan_estimates'].includes(row.sourceType))fail('AI_INVALID_RESPONSE');
    citations.add(row.id);
  }
  for(const row of input.statements){
    if(!record(row)||!['fact','suggestion','question'].includes(row.kind)||typeof row.text!=='string'||!row.text.trim()||row.text.length>1800
      ||!Array.isArray(row.evidenceIds)||row.evidenceIds.length>8||row.evidenceIds.some(id=>typeof id!=='string'||!citations.has(id))
      ||row.kind==='fact'&&!row.evidenceIds.length)fail('AI_INVALID_RESPONSE');
  }
  const picked=Object.fromEntries(['schemaVersion','readOnly','mode','baseVersion','knowledgeVersion','knowledgeDigest','promptVersion','statements','citations','limitations','scope','tools','meta']
    .filter(key=>Object.hasOwn(input,key)).map(key=>[key,input[key]]));
  const output=safeCopy(picked);
  if(JSON.stringify(output).length>262144)fail('AI_INVALID_RESPONSE');
  return output;
}

/** One shared request lifecycle for U11 and its sidebar; no business writes. */
export function createAgentSession({getCurrent,flush,request,onStatus=()=>{},onResult=()=>{}}={}){
  if([getCurrent,flush,request,onStatus,onResult].some(fn=>typeof fn!=='function'))throw new TypeError('Agent session callbacks must be functions');
  let active=null,destroyed=false,status={status:'idle',pending:false,error:null,requestId:null,conversationId:null};
  const notify=(next,token,error=null)=>{
    status={status:next,pending:['saving','requesting'].includes(next),error,requestId:token?.id||null,conversationId:token?.snapshot?.conversationId||null};
    if(!destroyed)onStatus({...status});
  };
  function stop(code='AI_CANCELLED'){
    if(!active||active.controller.signal.aborted)return false;
    active.abortCode=code;active.controller.abort();return true;
  }
  function check(token){
    if(destroyed||active!==token||token.controller.signal.aborted)fail(token.abortCode||'AI_CANCELLED');
    const current=getCurrent();
    if(current?.ownerId!==token.snapshot.ownerId)fail('ACCOUNT_CHANGED');
    let latest;try{latest=capture(current,token.snapshot.mode,token.snapshot.context);}catch{fail('AI_CONTEXT_CHANGED');}
    if(latest.basis!==token.snapshot.basis)fail('AI_CONTEXT_CHANGED');
    return {current,latest};
  }
  function revalidate(){
    if(!active||active.controller.signal.aborted)return !active;
    try{check(active);return true;}catch(error){stop(error.code||'AI_CONTEXT_CHANGED');return false;}
  }
  async function send({message,mode,context}={}){
    if(destroyed)fail('AI_CANCELLED');
    if(active)fail('AI_BUSY');
    let token,abortListener;
    try{
      if(typeof message!=='string'||!message.trim()||message.length>4000)fail('AI_INVALID_REQUEST');
      const normalized=agentMode(mode),sourceContext=contextValue(context),snapshot=capture(getCurrent(),normalized,sourceContext);
      token={id:identifier('agent-request'),snapshot,controller:new AbortController(),abortCode:null};active=token;
      const aborted=new Promise((_,reject)=>{abortListener=()=>reject(Object.assign(new Error(token.abortCode||'AI_CANCELLED'),{code:token.abortCode||'AI_CANCELLED'}));token.controller.signal.addEventListener('abort',abortListener,{once:true});});
      notify('saving',token);
      await Promise.race([Promise.resolve().then(()=>{check(token);return flush();}),aborted]);
      const {current,latest}=check(token);
      if(!Number.isInteger(current.workspaceRevision)||current.workspaceRevision<0)fail('AI_INVALID_REQUEST');
      const payload={mode:normalized,message,baseVersion:current.workspaceRevision,scope:latest.scope,context:sourceContext,conversationId:latest.conversationId};
      notify('requesting',token);
      const raw=await Promise.race([Promise.resolve().then(()=>{check(token);return request(payload,{signal:token.controller.signal});}),aborted]);
      check(token);
      const response=validResponse(raw,payload);
      const common={provider:'deepseek',scope:[...snapshot.scopeLabels],claimRefs:snapshot.claimRefs.map(ref=>({...ref})),sourceScopeKey:snapshot.sourceScopeKey,sourceConsentId:snapshot.sourceConsentId,
        ...(snapshot.sourcePlanVersion!==undefined?{sourcePlanVersion:snapshot.sourcePlanVersion}:{}),sourceContext:{...sourceContext}};
      const userMessage={id:identifier('msg'),role:'user',text:message,...common};
      const assistantMessage={id:identifier('msg'),role:'assistant',text:response.statements.map(row=>row.text).join('\n\n'),...common,agentResponse:response};
      await onResult({userMessage,assistantMessage,response,ownerId:snapshot.ownerId,conversationId:snapshot.conversationId,requestId:token.id});
      notify('success',token);return response;
    }catch(error){
      const code=token?.abortCode||(typeof error?.code==='string'&&/^[-A-Z_]{1,80}$/.test(error.code)?error.code:'NETWORK_ERROR');
      notify(code==='AI_CANCELLED'?'cancelled':'error',token,code);
      throw Object.assign(new Error(code),{code});
    }finally{
      if(token&&abortListener)token.controller.signal.removeEventListener('abort',abortListener);
      if(active===token)active=null;
    }
  }
  return {send,cancel:()=>stop(),revalidate,current:()=>({...status}),destroy:()=>{destroyed=true;stop();}};
}
