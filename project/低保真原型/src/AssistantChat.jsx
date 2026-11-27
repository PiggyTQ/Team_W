import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {validScopeRefs} from './alignment-model';
import {uid} from './model';
import AssistantSymbol from './AssistantSymbols';
import {displayText,useLanguage} from './i18n/render';
import {agentMessageAvailable,hasExternalConsent} from './agent-contract.js';
import AgentMessage from './AgentMessage';
import './agent-live.css';

const taskStarts = [
  ['/assistant/next-step','signpost','梳理我的下一步','Work out my next step','根据选中资料一起想','Think it through with selected sources'],
  ['/assistant/compare','balance','比较职业方向','Compare career directions','看清差异与取舍','Understand differences and trade-offs'],
  ['/assistant/expression','edit','整理成果表达','Explain my achievements','讲清做法和贡献','Describe actions and your contribution'],
];
const openTask = (event,to) => {
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();window.history.pushState({},'',to);window.dispatchEvent(new PopStateEvent('popstate'));
};

export default function AssistantChat({ s, conv, update, open, send, proposal, liveAgent=null }) {
  const [error, setError] = useState('');
  const en=useLanguage()==='en',tx=(zh,english)=>en?english:zh,empty=!conv.messages.length;
  const live=liveAgent!==null,pending=live&&!!liveAgent.pending;
  const draft=live?(liveAgent.draft||''):s.aiDraft;
  const setDraft=value=>live?liveAgent.setDraft(value):update({aiDraft:value});
  const supported=['职业咨询','评估解释','计划推演'].includes(conv.mode||'职业咨询');
  const consent=!live||hasExternalConsent(s);
  const canSend=!!draft.trim()&&(!live||!!liveAgent.enabled&&!pending&&supported&&consent);
  const inlineError=live?liveAgent.error:error;
  const chooseScope=()=>{if(pending)liveAgent.cancel();open('scope');};
  const surface = useRef(null), stream = useRef(null), input = useRef(null);
  useLayoutEffect(() => {
    const field = input.current;
    if (!field) return;
    field.style.height = 'auto';
    const limit = Number.parseFloat(getComputedStyle(field).maxHeight) || 200;
    field.style.height = `${Math.min(field.scrollHeight, limit)}px`;
  }, [draft, conv.id, conv.messages.length]);
  useLayoutEffect(() => {
    if (!conv.messages.length) return;
    const frame = surface.current, workspace = frame?.closest('main.workspace');
    if (!frame || !workspace) return;
    const chrome = [...frame.querySelectorAll(':scope > .chat-toolbar, :scope > .chat-scope-summary, :scope > .chat-composer')];
    const fit = () => {
      if (window.matchMedia('(max-width:720px)').matches) {
        frame.style.removeProperty('--assistant-available-height');
        frame.style.removeProperty('--assistant-stream-fit');
        return;
      }
      const top = frame.getBoundingClientRect().top - workspace.getBoundingClientRect().top + workspace.scrollTop;
      const bottom = Number.parseFloat(getComputedStyle(workspace).paddingBottom) || 0;
      const messageMinimum = Number.parseFloat(getComputedStyle(frame).getPropertyValue('--assistant-stream-min')) || 180;
      const chromeHeight = chrome.reduce((height, item) => {
        const style = getComputedStyle(item);
        return height + item.offsetHeight + (Number.parseFloat(style.marginTop) || 0) + (Number.parseFloat(style.marginBottom) || 0);
      }, 0);
      const available=workspace.clientHeight-top-bottom;
      const streamMinimum=Math.max(72,Math.min(messageMinimum,available-chromeHeight));
      frame.style.setProperty('--assistant-stream-fit',`${streamMinimum}px`);
      frame.style.setProperty('--assistant-available-height', `${Math.ceil(Math.max(chromeHeight+streamMinimum,available))}px`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    [workspace, ...chrome].forEach(item => observer.observe(item));
    window.addEventListener('resize', fit);
    return () => { observer.disconnect(); window.removeEventListener('resize', fit); };
  }, [conv.id, conv.messages.length,pending]);
  useEffect(() => {
    if (stream.current) stream.current.scrollTop = conv.messages.length ? stream.current.scrollHeight : 0;
  }, [conv.id, conv.messages.length]);
  useEffect(() => { setError(''); }, [conv.id]);
  const submit = () => {
    if (!canSend) return;
    setError('');
    if(live)liveAgent.send();else send();
    input.current?.focus();
  };
  const saveAnswer = m => update(prev => !agentMessageAvailable(prev,m)||(prev.aiNotes||[]).some(n=>n.messageId===m.id)?prev:{...prev,aiNotes:[...prev.aiNotes||[],{id:uid('ai-note'),messageId:m.id,conversationId:conv.id,text:m.text,scope:Array.isArray(m.scope)?[...m.scope]:[],claimRefs:m.claimRefs||[],provider:m.provider,systemGenerated:m.agentResponse?.meta?.providerCalled===false,retrievalFallback:m.agentResponse?.meta?.responseOrigin==='retrieval_fallback',sourceKnowledgeDigest:m.agentResponse?.meta?.knowledgeUsed||m.agentResponse?.citations?.some(c=>c.sourceType==='approved_knowledge')?m.agentResponse.knowledgeDigest:null,sourceScopeKey:m.sourceScopeKey,sourceConsentId:m.sourceConsentId,sourcePlanVersion:m.sourcePlanVersion,date:new Date().toISOString()}]});
  const modeControl=<label><AssistantSymbol size={16}/><span className={empty?'':'sr-only'}>意图 / 六种咨询模式</span><select aria-label="意图 / 六种咨询模式" disabled={pending} value={conv.mode || '职业咨询'} onChange={e => update({ conversations: s.conversations.map(c => c.id === conv.id ? { ...c, mode: e.target.value } : c) })}>{['职业咨询', '评估解释', '计划推演', '学习辅导', '成果反馈', '报告编辑'].map(mode => <option key={mode} disabled={live&&!['职业咨询','评估解释','计划推演'].includes(mode)} value={mode}>{live&&mode==='学习辅导'?'学习辅导（尚未开放）':live&&mode==='成果反馈'?'成果反馈（尚未开放）':live&&mode==='报告编辑'?'报告编辑（尚未开放）':mode}</option>)}</select></label>;
  const demoControl=!live&&<details className="chat-demo-menu"><summary>演示选项</summary><button type="button" onClick={e => { e.currentTarget.closest('details').open = false; setError('模拟连接失败，问题已保留。请重新发送，或返回原页面手动继续准备。'); }}>模拟 AI 失败</button></details>;
  const composer = (<form className="chat-composer" onSubmit={e => { e.preventDefault(); submit(); }}>
      {inlineError && <p className="chat-inline-error" role="alert">{inlineError}</p>}
      {live&&!liveAgent.enabled&&<p className="agent-inline-status">{liveAgent.loading?'正在检查 AI 服务状态。':'AI 服务尚未启用，问题可保留，手动业务功能仍可使用。'}</p>}
      {live&&!liveAgent.enabled&&!liveAgent.loading&&<button type="button" className="agent-status-action" onClick={()=>liveAgent.reload?.()}>重新检查 AI 服务</button>}
      {live&&!consent&&<><p className="agent-inline-status">发送前请先确认资料范围与 DeepSeek 外发授权。</p><button type="button" className="agent-status-action" onClick={chooseScope}>选择并确认资料范围</button></>}
      {live&&!supported&&<p className="agent-inline-status">此模式尚未开放真实 AI。请切换到职业咨询、评估解释或计划推演。</p>}
      {pending&&<p className="agent-inline-status" role="status">正在请求 DeepSeek，可以取消。取消后问题仍保留。</p>}
      <div className="chat-composer-heading sr-only"><label className="chat-input-label" htmlFor="assistant-question">你的问题</label><small>{live?'失败时保留输入':'本机自动保留'}</small></div>
      <textarea ref={input} id="assistant-question" aria-label={displayText(live?'当前问题':'当前问题（本机自动保留）')} value={draft} onChange={e => setDraft(e.target.value)} placeholder={tx('说说你现在想理清的事…','What would you like to work through?')} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing&&e.keyCode!==229) { e.preventDefault(); submit(); } }} />
      <div className="composer-controls">{empty?<><button className="chat-source-trigger" type="button" onClick={chooseScope}><AssistantSymbol name="attachment" size={22}/>{tx('本次资料','Sources')}</button><details className="chat-options"><summary>{tx('讨论选项','Discussion options')}</summary><div className="chat-options-panel">{modeControl}{demoControl}</div></details></>:<>{modeControl}{demoControl}</>}{pending&&<button className="agent-cancel" type="button" onClick={()=>liveAgent.cancel()}>取消请求</button>}<button className="primary chat-send" type="submit" disabled={!canSend} aria-describedby="assistant-input-requirement" aria-label={live?'发送至 DeepSeek':'发送并显示模拟结果'}>{!empty&&(pending?'请求中':'发送')}<AssistantSymbol name="up" size={empty?22:18}/></button></div>
      <p id="assistant-input-requirement" className={'composer-disclaimer'+(empty?' sr-only':'')}>{live?'Enter 发送 · Shift + Enter 换行 · 仅发送已选范围 · 建议尚未应用':conv.messages.length ? <>{!draft.trim() && <span className="sr-only">先输入问题后再发送。 </span>}Enter 发送 · Shift + Enter 换行 · 业务变更需本人确认</> : <>{!draft.trim() && <>先输入问题后再发送。 </>}Enter 发送，Shift + Enter 换行 · 回答为模拟示例，业务变更需本人确认</>}</p>
    </form>);
  return <div ref={surface} className={`ai-chat-surface ${conv.messages.length ? "has-messages" : "is-empty"}${live?' is-live':''}`}>
    {!empty&&<><header className="chat-toolbar"><div className="chat-session-title"><span className="chat-session-symbol"><AssistantSymbol name="identity" size={38}/></span><div><h2>{conv.title}</h2><span className={`chat-service-status${live&&!liveAgent.enabled?' is-disabled':''}`}><i aria-hidden="true"/>{live?(liveAgent.loading?'正在检查 AI 服务':liveAgent.enabled?'DeepSeek · 只读建议':'AI 服务尚未启用'):'模拟 AI · 未连接模型'}</span></div></div><button onClick={chooseScope} aria-label="选择本次可用资料" title="选择本次可用资料"><AssistantSymbol name="files" size={17}/><span className="chat-scope-button-label">选择本次可用资料</span></button></header>
    <div className="chat-scope-summary"><span>当前：{conv.mode || '职业咨询'}</span><span>计划 v{s.planVersion}</span><span className="chat-scope-detail"><AssistantSymbol name="shield" size={14}/>{validScopeRefs(s).length ? `已选 ${validScopeRefs(s).length} 项确认片段` : '尚无可用于本次讨论的个人资料'}</span></div></>}
    {conv.messages.length ? <div ref={stream} className="chat-stream" role="log" aria-label="当前讨论消息" aria-live="polite" tabIndex={0}><div className="chat-transcript">{conv.messages.map(m => <AgentMessage key={m.id} s={s} message={m} onSave={saveAnswer} onReport={live&&liveAgent.report?category=>liveAgent.report({answerRef:{conversationId:conv.id,messageId:m.id},category}):null} saved={(s.aiNotes||[]).some(n=>n.messageId===m.id)}/>)}{!live&&proposal}</div></div> : <section className="empty-chat-home" aria-label="开始新的讨论"><header className="empty-chat-intro"><img src="/illustrations/workbench/ai-laptop.png" alt=""/><h3>{tx('和芝识分子聊聊','Talk it through with Cheese Scholar')}<span className="discussion-welcome-rays" aria-hidden="true"/></h3><p>{tx('从一个问题开始，一起理清方向与下一步。','Start with a question. Find clarity and your next step together.')}</p></header>{composer}<nav className="demo-discussion-starters" aria-label={tx('问题起点','Discussion starting points')}>{taskStarts.map(([to,icon,zh,english,description,descriptionEn])=><a key={to} href={to} onClick={event=>openTask(event,to)}><AssistantSymbol name={icon} size={38}/><span><strong>{tx(zh,english)}</strong><small>{tx(description,descriptionEn)}</small></span></a>)}</nav><p className="discussion-agency">{tx('资料由你选择，建议由你决定是否采用。','You choose the sources and decide which suggestions to use.')}</p>{!live&&<p className="demo-workspace-note">{tx('本机演示 · 回答为模拟示例，未连接模型。','Local demo · Responses are simulated; no model is connected.')}</p>}</section>}
    {conv.messages.length > 0 && composer}

  </div>;
}

