import React,{useState} from 'react';
import AssistantSymbol from './AssistantSymbols';
import {agentMessageAvailable,agentKnowledgeAvailable} from './agent-contract.js';
import {useAgentKnowledgeDigest} from './agent-knowledge-view';

const labels={fact:'原文引文',suggestion:'建议',question:'待补问题'};
const strings=value=>Array.isArray(value)?value.filter(item=>typeof item==='string'):[];

function Citation({citation,index}){
  const type=citation.sourceType;
  let title=typeof citation.sourceTitle==='string'?citation.sourceTitle:typeof citation.sourceId==='string'?citation.sourceId:citation.id;
  let original=typeof citation.text==='string'?citation.text:'';
  if(type==='user_confirmed_unverified'){
    try{
      const claim=JSON.parse(original);
      if(typeof claim.title==='string')title=claim.title;
      if(typeof claim.text==='string')original=claim.text;
    }catch{/* Legacy or malformed text remains inert plain text. */}
  }
  const label=type==='user_confirmed_unverified'?'本人确认，未独立核验':type==='approved_knowledge'?'本次获准知识':type==='saved_plan_estimates'?'已保存的计划估计':'本次依据';
  return <section className="agent-citation">
    <h4><span>来源 {index+1}</span><span translate="no">{title}</span></h4>
    <p className="agent-citation-type">{label}</p>
    <p className="agent-citation-original" translate="no">{original}</p>
    <small translate="no">{citation.id}{typeof citation.sourceVersion==='string'?` · ${citation.sourceVersion}`:''}</small>
  </section>;
}

export default function AgentMessage({s,message,onSave,onReport,saved=false}){
  const [reportState,setReportState]=useState('');
  const m=message,assistant=m.role!=='user',real=m.provider==='deepseek',response=m.agentResponse;
  const digest=useAgentKnowledgeDigest(),privacyAvailable=agentMessageAvailable(s,m),available=privacyAvailable&&agentKnowledgeAvailable(m,digest);
  const structured=real&&assistant&&response&&Array.isArray(response.statements)&&Array.isArray(response.citations)&&Array.isArray(response.limitations);
  const statements=structured?response.statements.filter(row=>row&&Object.hasOwn(labels,row.kind)&&typeof row.text==='string').slice(0,10):[];
  const invalid=real&&assistant&&(!structured||!statements.length)||!structured&&typeof m.text!=='string';
  const author=!assistant?'你':real?(response?.meta?.responseOrigin==='retrieval_fallback'?'系统 · 检索原文回退':response?.meta?.providerCalled===false?'系统 · 资料缺口说明':'DeepSeek · 只读回答'):'AI · 预录模拟回答';
  return <article className={`chat-message ${assistant?'chat-message-assistant':'chat-message-user'}${!available||invalid?' agent-message-unavailable':''}`}>
    <span className="chat-message-author">{assistant&&<AssistantSymbol name="identity" size={17}/>} {author}</span>
    <div className="chat-message-body">
      {!available?<p className="agent-retracted">{privacyAvailable?'知识版本尚未核对或已变化，此回答与缓存引用暂不展示。请重新核对知识后生成。':'引用或授权已变化，原消息与缓存依据已隐藏。请重新选择资料后提问。'}</p>:invalid?<p className="agent-retracted">回答记录格式不可用，未显示正文。请重新提问。</p>:<>
        {structured?<div className="agent-statements">{statements.map((row,index)=><section key={index} className={`agent-statement agent-statement-${row.kind}`}>
          <h4>{labels[row.kind]}</h4><p translate="no">{row.text}</p>
        </section>)}</div>:<p translate={real?'no':undefined}>{m.text}</p>}
        {assistant&&<details className="agent-reference-details"><summary>引用与使用范围</summary>
          {structured?<>
            {response.citations.length?response.citations.filter(c=>c&&typeof c.id==='string').map((citation,index)=><Citation key={citation.id} citation={citation} index={index}/>):<p>本次没有可展示的引用，不能据此认定职业要求或个人能力。</p>}
            <h4>局限与待核对</h4><ul className="agent-limitations">{strings(response.limitations).map((item,index)=><li key={index} translate="no">{item}</li>)}</ul>
            <p>未生成可应用提议，业务操作仍需在原页面预览确认。</p>
          </>:<p>原创职业示例 v1；不生成个人能力结论。</p>}
          <p>本次范围：{strings(m.scope).join('、')}。私人反思默认排除。</p>
        </details>}
        {assistant&&onSave&&<button type="button" className="agent-save-note" disabled={saved} onClick={()=>onSave(m)}>{saved?'已保存为本人笔记':'保存回答为本人笔记'}</button>}
        {structured&&onReport&&<details className="agent-answer-feedback"><summary>反馈这条回答</summary><p>反馈用于人工复核，不会自动成为知识或训练资料。</p>{['unsupported','unclear','useful'].map(category=><button type="button" key={category} disabled={reportState==='saving'||reportState==='saved'} onClick={async()=>{setReportState('saving');try{await onReport(category);setReportState('saved');}catch{setReportState('error');}}}>{category==='unsupported'?'依据不足':category==='unclear'?'不清楚':'有帮助'}</button>)}{reportState==='saved'&&<p role="status">反馈已保存，等待复核。</p>}{reportState==='error'&&<p role="alert">反馈保存失败，请稍后重试。</p>}</details>}
      </>}
    </div>
  </article>;
}
