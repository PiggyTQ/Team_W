// Shared browser/server privacy contract. No credential or model configuration.
export const AI_CONSENT_VERSION='deepseek-external-v1';
const SCOPES=new Set(['职业原创知识','当前目标与计划','本人确认片段']);
const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const validRef=ref=>record(ref)&&typeof ref.id==='string'&&ref.id.length>0&&ref.id.length<=120
  &&Number.isInteger(ref.version)&&ref.version>0;
const refsOf=state=>state.aiClaimRefs===undefined?[]:state.aiClaimRefs;

export function scopeKey(state) {
  if(!record(state)||!Array.isArray(state.aiScope)||state.aiScope.length>SCOPES.size
    ||state.aiScope.some(scope=>!SCOPES.has(scope))||new Set(state.aiScope).size!==state.aiScope.length)return null;
  const refs=refsOf(state);
  if(!Array.isArray(refs)||refs.length>12||refs.some(ref=>!validRef(ref))||new Set(refs.map(ref=>ref.id)).size!==refs.length)return null;
  return JSON.stringify({scope:[...state.aiScope].sort(),claimRefs:refs.map(({id,version})=>({id,version})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:a.version-b.version)});
}

export function hasExternalConsent(state) {
  const key=scopeKey(state),consent=state?.aiExternalConsent;
  if(key===null||!record(consent)||consent.version!==AI_CONSENT_VERSION||consent.provider!=='DeepSeek'
    ||consent.accepted!==true||consent.scopeKey!==key||typeof consent.grantId!=='string'||!/^[-a-zA-Z0-9]{12,120}$/.test(consent.grantId))return false;
  const refs=refsOf(state),usesClaims=state.aiScope.includes('本人确认片段');
  if(!usesClaims)return refs.length===0;
  if(state.authorized!==true||!refs.length||!Array.isArray(state.claims))return false;
  return refs.every(ref=>state.claims.some(claim=>claim.id===ref.id&&claim.version===ref.version&&claim.status==='已确认'));
}

export function agentMessageAvailable(state,message) {
  if(!record(state)||!record(message))return false;
  const refs=message.claimRefs===undefined?[]:message.claimRefs;
  if(!Array.isArray(refs)||refs.some(ref=>!validRef(ref)))return false;
  const real=message.provider==='deepseek'||message.service==='deepseek'||record(message.agentResponse);
  const personal=Array.isArray(message.scope)?message.scope.includes('本人确认片段'):message.scope?.confirmedClaims===true;
  if(personal&&!refs.length)return false;
  if(real&&(!hasExternalConsent(state)||message.sourceScopeKey!==scopeKey(state)||message.sourceConsentId!==state.aiExternalConsent.grantId))return false;
  if(refs.length){
    if(state.authorized!==true||!state.aiScope?.includes('本人确认片段')||!Array.isArray(state.claims))return false;
    const selected=refsOf(state);
    if(!Array.isArray(selected))return false;
    if(!refs.every(ref=>state.claims.some(claim=>claim.id===ref.id&&claim.version===ref.version&&claim.status==='已确认')
      &&selected.some(row=>row.id===ref.id&&row.version===ref.version)))return false;
  }
  const plan=Array.isArray(message.scope)?message.scope.includes('当前目标与计划'):message.scope?.currentPlan===true;
  if(real&&plan&&(message.sourcePlanVersion!==state.planVersion||!state.aiScope?.includes('当前目标与计划')))return false;
  return true;
}

export function agentKnowledgeAvailable(message,currentDigest){
  if(!record(message))return false;
  const response=message.agentResponse,real=message.provider==='deepseek'||record(response);
  if(!real||message.role==='user')return true;
  const explicit=Object.hasOwn(message,'sourceKnowledgeDigest');
  const scopeUsesKnowledge=Array.isArray(message.scope)&&message.scope.includes('职业原创知识');
  const cited=Array.isArray(response?.citations)&&response.citations.some(c=>c.sourceType==='approved_knowledge');
  const used=explicit?message.sourceKnowledgeDigest!==null:cited||response?.meta?.knowledgeUsed===true
    ||response?.meta?.knowledgeUsed===undefined&&scopeUsesKnowledge&&response?.meta?.providerCalled!==false;
  if(!used)return true;
  const sourceDigest=explicit?message.sourceKnowledgeDigest:response?.knowledgeDigest;
  return typeof currentDigest==='string'&&/^[a-f0-9]{64}$/.test(currentDigest)&&sourceDigest===currentDigest;
}
