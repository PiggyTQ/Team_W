import React,{useEffect,useRef,useState} from 'react';
import {apiRequest} from './auth-client';
import {authMessage} from './auth-contract';
import {careers} from './model';
import {useLanguage} from './i18n/render';
import './agent-workflow.css';
import {useAgentKnowledgeDigest} from './agent-knowledge-view';

export default function AgentWorkflow({user,state,workspace}){
  const knowledgeDigest=useAgentKnowledgeDigest();
  const language=useLanguage(),[analysis,setAnalysis]=useState(null),[preview,setPreview]=useState(null),[receipt,setReceipt]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[career,setCareer]=useState(state.goal||'data'),[skill,setSkill]=useState(''),[hours,setHours]=useState(''),[feedback,setFeedback]=useState(''),[memory,setMemory]=useState(null),[preference,setPreference]=useState('');
  const latest=useRef(null),key=useRef(null),sequence=useRef(0),analysisBasis=useRef(null);
  const [localRefs,setLocalRefs]=useState([]);
  latest.current={user,state,workspace};
  useEffect(()=>{sequence.current++;setAnalysis(null);setPreview(null);setReceipt(null);setMemory(null);setPreference('');setError('');setBusy(false);},[user?.id]);
  useEffect(()=>{setLocalRefs(previous=>{const next=previous.filter(r=>state.claims.some(c=>c.id===r.id&&c.version===r.version&&c.status==='已确认'));return next.length===previous.length?previous:next;});},[state.claims]);
  const sourceKey=JSON.stringify({career,claims:state.claims,localRefs,refs:state.aiClaimRefs,scope:state.aiScope,authorized:state.authorized,tasks:state.tasks,plan:state.planVersion,budget:state.budget,goal:state.goal});
  const visibleAnalysis=analysis&&analysisBasis.current===sourceKey&&analysis.knowledgeDigest===knowledgeDigest;
  useEffect(()=>{sequence.current++;setAnalysis(null);setPreview(null);setError('');},[sourceKey]);
  async function run(work){
    if(busy)return;const owner=user?.id,seq=sequence.current;setBusy(true);setError('');
    const valid=()=>latest.current.user?.id===owner&&sequence.current===seq;
    try{await work(valid);}catch(e){if(valid())setError(authMessage(e.code,language));}finally{if(latest.current.user?.id===owner)setBusy(false);}
  }
  const inspect=()=>run(async valid=>{await workspace.flush();const base=workspace.current();const result=await apiRequest('/api/agent/analyse',{data:{career,baseVersion:base.revision,claimRefs:localRefs}});if(valid()){analysisBasis.current=sourceKey;setAnalysis(result);setSkill(result.rows[0]?.skillId||'');setPreview(null);setReceipt(null);}});
  const propose=()=>run(async valid=>{await workspace.flush();const result=await apiRequest('/api/agent/propose',{data:{career,baseVersion:workspace.current().revision,skillId:skill,hours:Number(hours),dependsOn:[]}});if(valid()){key.current=crypto.randomUUID();setPreview(result);setReceipt(null);setFeedback('');}});
  const apply=()=>run(async valid=>{
    const result=await workspace.applyExternal(async base=>{if(base.revision!==preview.baseVersion)throw {code:'VERSION_CONFLICT'};return apiRequest('/api/agent/apply',{data:{id:preview.id,baseVersion:preview.baseVersion,confirmation:'APPLY_ACTION',mutationId:key.current}});});
    // The plan changing is expected here. Account binding still applies.
    if(latest.current.user?.id===user?.id){setReceipt(result);setPreview(null);}
  });
  const loadMemory=()=>run(async valid=>{const result=await apiRequest('/api/agent/memory');if(valid()){setMemory(result);setPreference(result.preferences?.learningPreference||'');}});
  const saveMemory=revoke=>run(async valid=>{const result=await apiRequest('/api/agent/memory',{data:{baseRevision:memory.revision,confirmation:'SAVE_PREFERENCES',preferences:revoke?null:{learningPreference:preference}}});if(valid()){setMemory(result);setPreference(result.preferences?.learningPreference||'');}});
  return <details className="agent-workflow"><summary>核对材料与安排下一步</summary><div className="agent-workflow-body">
    <p>以下核对在站内运行，不调用模型。只关联当前选中的本人确认片段；学习方向不是招聘门槛。</p>
    <details><summary>选择站内核对片段</summary><p>仅用于本次站内核对，不代表 DeepSeek 外发授权。最多选择十二项；不选时保留资料未知。</p><fieldset disabled={busy}>{state.claims.filter(c=>c.status==='已确认').map(c=>{const selected=localRefs.some(r=>r.id===c.id&&r.version===c.version);return <label className="agent-local-claim" key={c.id}><input type="checkbox" checked={selected} disabled={!selected&&localRefs.length>=12} aria-label={`站内核对片段：${c.title||c.id}`} onChange={e=>setLocalRefs(previous=>e.target.checked?[...previous.filter(r=>r.id!==c.id),{id:c.id,version:c.version}]:previous.filter(r=>r.id!==c.id))}/><span translate="no">{c.title||c.id}</span></label>;})}</fieldset>{!state.claims.some(c=>c.status==='已确认')&&<p>尚无确认片段，请先到个人评估核对材料。</p>}</details>
    <fieldset disabled={busy||!workspace.ready}><label>探索方向<select value={career} onChange={e=>setCareer(e.target.value)}>{careers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button type="button" onClick={inspect}>核对已选材料</button></fieldset>
    {visibleAnalysis&&<><ul>{analysis.rows.map(r=><li key={r.skillId}><strong>{r.name}</strong><span>{r.status==='related_self_report'?'有关联的本人自述 · 未独立核验':'资料未知 · 没有材料不等于不会'}</span>{r.evidence.length>0&&<details><summary>查看关联原文</summary>{r.evidence.map(e=><blockquote translate="no" key={e.id}>{e.text}</blockquote>)}</details>}</li>)}</ul><details><summary>核对依据与限制</summary><p translate="no">{analysis.source.id} · {analysis.source.version}</p><pre translate="no">{analysis.source.text}</pre>{analysis.limitations.map(t=><p key={t}>{t}</p>)}</details>
    <fieldset disabled={busy}><legend>预览一次小范围行动</legend><label>学习方向<select value={skill} onChange={e=>{setSkill(e.target.value);setPreview(null);}}>{analysis.rows.map(r=><option value={r.skillId} key={r.skillId}>{r.name}</option>)}</select></label><label>本人预计投入（小时）<input type="number" min="0.25" max="168" step="0.25" value={hours} onChange={e=>{setHours(e.target.value);setPreview(null);}}/></label><button type="button" onClick={propose} disabled={!hours||Number(hours)<=0}>检查预算并预览</button></fieldset></>}
    {analysis&&analysisBasis.current===sourceKey&&analysis.knowledgeDigest!==knowledgeDigest&&<p role="status">知识版本尚未核对或已变化，请重新核对后预览行动。</p>}
    {preview&&preview.knowledgeDigest===knowledgeDigest&&<section className="agent-action-preview" aria-label="行动预览"><h3 translate="no">{preview.task.title}</h3><p translate="no">{preview.task.purpose}</p><p translate="no">{preview.task.standard}</p>{preview.learningPreference&&<p translate="no">站内学习偏好（本人保存）：{preview.learningPreference}</p>}<p>每周预算 {preview.budget.weekly} 小时 · 保存后预计分配 {preview.budget.after} 小时 · 剩余 {preview.budget.remaining} 小时</p><p>计划 v{preview.planVersionBefore} → v{preview.planVersionAfter} · 预览有效期十分钟</p><p>{preview.impact}</p><button type="button" className="primary" disabled={busy} onClick={apply}>本人确认新增到计划</button><button type="button" disabled={busy} onClick={()=>setPreview(null)}>放弃预览</button></section>}
    {receipt&&<section role="status"><p>行动已保存。计划 v{receipt.planVersion}，工作区版本 {receipt.revision}。</p><small translate="no">{receipt.id}</small><label>这次行动建议是否有帮助？<select value={feedback} onChange={e=>setFeedback(e.target.value)}><option value="">请选择</option><option value="useful">有帮助</option><option value="irrelevant">不相关</option><option value="unclear">不清楚</option><option value="cannot_execute">无法执行</option><option value="unsupported">依据不足</option></select></label><button type="button" disabled={!feedback||busy} onClick={()=>run(async valid=>{await apiRequest('/api/agent/feedback',{data:{proposalId:receipt.proposalId,category:feedback}});if(valid())setFeedback('');})}>保存反馈</button></section>}
    <details><summary onClick={()=>{if(!memory&&!busy)loadMemory();}}>可撤销的站内学习偏好</summary><p>仅本人主动保存；不自动读取对话，不发送给外部模型。撤回后停止使用。</p>{memory&&<fieldset disabled={busy}><label>学习偏好<input maxLength={300} value={preference} onChange={e=>setPreference(e.target.value)}/></label><button type="button" disabled={!preference.trim()} onClick={()=>saveMemory(false)}>确认保存偏好</button><button type="button" onClick={()=>saveMemory(true)}>撤回偏好</button><p>{memory.preferences?'已保存站内偏好':'尚未保存偏好'}</p></fieldset>}</details>
    {busy&&<p role="status">正在核对，请稍候。</p>}{error&&<p role="alert">{error}</p>}
  </div></details>;
}
