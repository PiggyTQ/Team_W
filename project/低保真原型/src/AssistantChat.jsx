import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {validScopeRefs} from './alignment-model';
import {uid} from './model';
import AssistantSymbol from './AssistantSymbols';
import {CheesePose} from './CheeseAvatar';
import {displayText} from './i18n/render';
import {agentMessageAvailable,hasExternalConsent} from './agent-contract.js';
import AgentMessage from './AgentMessage';
import './agent-live.css';

const prompts = [
  ['比较职业方向', '我想比较数据分析和 AI 应用：每天做什么，需要哪些基础，我可以先尝试什么？', '从日常工作与基础要求开始', 'direction'],
  ['梳理项目经历', '我有一个课程项目，怎样写清个人贡献？还需要补充哪些作品或过程记录？', '讲清个人贡献，找到待补材料', 'project'],
  ['调整时间安排', '每周只有三小时，怎么缩小范围或延后任务？', '按可用时间，推敲任务取舍', 'time'],
  ['拆解学习任务', '这个项目需要先学什么？如果基础不足，可以从哪个小任务开始？', '把遇到的困难拆成具体步骤', 'learning'],
];

export default function AssistantChat({ s, conv, update, open, send, proposal, liveAgent=null }) {
  const [error, setError] = useState('');
  const [companionFocused, setCompanionFocused] = useState(false);
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
  const composer = (<form className="chat-composer" onSubmit={e => { e.preventDefault(); submit(); }}>
      {inlineError && <p className="chat-inline-error" role="alert">{inlineError}</p>}
      {live&&!liveAgent.enabled&&<p className="agent-inline-status">{liveAgent.loading?'正在检查 AI 服务状态。':'AI 服务尚未启用，问题可保留，手动业务功能仍可使用。'}</p>}
      {live&&!liveAgent.enabled&&!liveAgent.loading&&<button type="button" className="agent-status-action" onClick={()=>liveAgent.reload?.()}>重新检查 AI 服务</button>}
      {live&&!consent&&<><p className="agent-inline-status">发送前请先确认资料范围与 DeepSeek 外发授权。</p><button type="button" className="agent-status-action" onClick={chooseScope}>选择并确认资料范围</button></>}
      {live&&!supported&&<p className="agent-inline-status">此模式尚未开放真实 AI。请切换到职业咨询、评估解释或计划推演。</p>}
      {pending&&<p className="agent-inline-status" role="status">正在请求 DeepSeek，可以取消。取消后问题仍保留。</p>}
      <div className={`chat-composer-heading ${conv.messages.length ? 'sr-only' : ''}`}><label className="chat-input-label" htmlFor="assistant-question">你的问题</label><small>{live?'失败时保留输入':'本机自动保留'}</small></div>
      <textarea ref={input} id="assistant-question" aria-label={displayText(live?'当前问题':'当前问题（本机自动保留）')} value={draft} onFocus={()=>setCompanionFocused(true)} onBlur={()=>setCompanionFocused(false)} onChange={e => setDraft(e.target.value)} placeholder={displayText('描述你想解决的问题，例如：每周只有三小时，该先做什么？')} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} />
      <div className="composer-controls"><label><AssistantSymbol size={16}/><span className="sr-only">意图 / 六种咨询模式</span><select aria-label="意图 / 六种咨询模式" disabled={pending} value={conv.mode || '职业咨询'} onChange={e => update({ conversations: s.conversations.map(c => c.id === conv.id ? { ...c, mode: e.target.value } : c) })}>{['职业咨询', '评估解释', '计划推演', '学习辅导', '成果反馈', '报告编辑'].map(mode => <option key={mode} disabled={live&&!['职业咨询','评估解释','计划推演'].includes(mode)} value={mode}>{live&&mode==='学习辅导'?'学习辅导（尚未开放）':live&&mode==='成果反馈'?'成果反馈（尚未开放）':live&&mode==='报告编辑'?'报告编辑（尚未开放）':mode}</option>)}</select></label>{!live&&<details className="chat-demo-menu"><summary>演示选项</summary><button type="button" onClick={e => { e.currentTarget.closest('details').open = false; setError('模拟连接失败，问题已保留。请重新发送，或返回原页面手动继续准备。'); }}>模拟 AI 失败</button></details>}{pending&&<button className="agent-cancel" type="button" onClick={()=>liveAgent.cancel()}>取消请求</button>}<button className="primary chat-send" type="submit" disabled={!canSend} aria-describedby="assistant-input-requirement" aria-label={live?'发送至 DeepSeek':'发送并显示模拟结果'}>{pending?'请求中':'发送'} <AssistantSymbol name="up" size={18}/></button></div>
      <p id="assistant-input-requirement" className="composer-disclaimer">{live?'Enter 发送 · Shift + Enter 换行 · 仅发送已选范围 · 建议尚未应用':conv.messages.length ? <>{!draft.trim() && <span className="sr-only">先输入问题后再发送。 </span>}Enter 发送 · Shift + Enter 换行 · 业务变更需本人确认</> : <>{!draft.trim() && <>先输入问题后再发送。 </>}Enter 发送，Shift + Enter 换行 · 回答为模拟示例，业务变更需本人确认</>}</p>
    </form>);
  return <div ref={surface} className={`ai-chat-surface ${conv.messages.length ? "has-messages" : "is-empty"}${live?' is-live':''}`}>
    <header className="chat-toolbar"><div className="chat-session-title"><span className="chat-session-symbol"><AssistantSymbol name="identity" size={38}/></span><div><h2>{conv.title}</h2><span className={`chat-service-status${live&&!liveAgent.enabled?' is-disabled':''}`}><i aria-hidden="true"/>{live?(liveAgent.loading?'正在检查 AI 服务':liveAgent.enabled?'DeepSeek · 只读建议':'AI 服务尚未启用'):'模拟 AI · 未连接模型'}</span></div></div><button onClick={chooseScope} aria-label="选择本次可用资料" title="选择本次可用资料"><AssistantSymbol name="files" size={17}/><span className="chat-scope-button-label">选择本次可用资料</span></button></header>
    <div className="chat-scope-summary"><span>当前：{conv.mode || '职业咨询'}</span><span>计划 v{s.planVersion}</span><span className="chat-scope-detail"><AssistantSymbol name="shield" size={14}/>{validScopeRefs(s).length ? `已选 ${validScopeRefs(s).length} 项确认片段` : '尚无可用于本次讨论的个人资料'}</span></div>
    {conv.messages.length ? <div ref={stream} className="chat-stream" role="log" aria-label="当前讨论消息" aria-live="polite" tabIndex={0}><div className="chat-transcript">{conv.messages.map(m => <AgentMessage key={m.id} s={s} message={m} onSave={saveAnswer} onReport={live&&liveAgent.report?category=>liveAgent.report({answerRef:{conversationId:conv.id,messageId:m.id},category}):null} saved={(s.aiNotes||[]).some(n=>n.messageId===m.id)}/>)}{!live&&proposal}</div></div> : <section className="empty-chat-home" aria-label="开始新的讨论"><div className="empty-chat-intro"><span className="chat-welcome-symbol"><CheesePose pose={companionFocused?"note":"perch"}/></span><h3>从一个问题开始</h3><p>比较方向、理解差距，或一起调整计划。</p></div>{composer}<aside className="empty-prompt-rail" aria-label="咨询起点"><h3>试试这些问题</h3><div className="empty-prompt-starts" aria-label="问题起点">{prompts.map(([title, question, description, symbol]) => <button key={title} title={question} onClick={() => { setDraft(question); input.current?.focus(); }}><span className={`prompt-symbol prompt-symbol-${symbol}`}><AssistantSymbol name={symbol} size={22}/></span><span className="prompt-copy"><span>{title}</span><small>{description}</small></span><AssistantSymbol name="arrow" size={17} className="prompt-arrow"/></button>)}</div><p className="prompt-rail-note">选择起点会填入草稿，你可以修改后发送。</p></aside></section>}
    {conv.messages.length > 0 && composer}

  </div>;
}

