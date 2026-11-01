import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import CheeseAvatar from './CheeseAvatar';
import AgentMessage from './AgentMessage';
import {hasExternalConsent} from './agent-contract';
import {useLanguage} from './i18n/render';
import './ai-companion.css';

const words = {
  zh: {name:'芝识分子', subtitle:'你的 AI 职业成长伙伴', close:'关闭对话', welcome:'嗨！我是芝识分子 👋', intro:'今天有什么想聊的？无论是职业探索、学习规划，还是整理经历，我都可以陪你一起想办法。', hint:'你可以直接提问，也可以从下面选择一个话题。', prompts:['✨ 帮我探索适合的职业方向','📅 帮我规划本周学习任务','📝 帮我整理项目和实习经历'], placeholder:'问问芝识分子...', send:'发送', pending:'正在思考…', demo:'模拟 AI · 未连接模型', live:'DeepSeek · 只读建议', unavailable:'AI 服务尚未启用，草稿会保留。', loading:'正在检查 AI 服务', consent:'发送前请在工作台确认资料范围与外发授权。', mode:'请在工作台切换到支持的咨询模式。', retry:'重新检查服务', workspace:'进入 AI 工作台 ↗', detail:'在工作台中继续深入探索。', keyboard:'Enter 发送 · Shift + Enter 换行', messages:'当前讨论消息'},
  en: {name:'Cheese Scholar', subtitle:'Your AI career companion', close:'Close conversation', welcome:'Hi! I’m Cheese Scholar 👋', intro:'What’s on your mind? Let’s explore careers, plan your learning, or organize your experience together.', hint:'Ask a question or choose a topic below.', prompts:['✨ Explore suitable career directions','📅 Plan my learning for this week','📝 Organize my projects and internships'], placeholder:'Ask Cheese Scholar...', send:'Send', pending:'Thinking…', demo:'Demo AI · No model connected', live:'DeepSeek · Read-only advice', unavailable:'AI service is unavailable. Your draft is kept.', loading:'Checking AI service', consent:'Confirm your data scope and external processing consent in the workspace before sending.', mode:'Choose a supported consultation mode in the workspace.', retry:'Check service again', workspace:'Enter AI workspace ↗', detail:'Continue exploring in your workspace.', keyboard:'Enter to send · Shift + Enter for a new line', messages:'Current conversation messages'},
};

export default function AiCompanionPopover({phase, onClose, onClosed, onWorkspace, trigger, s, conv, update, send, liveAgent}) {
  const language=useLanguage(), text=words[language]||words.zh;
  const panel=useRef(null), input=useRef(null), stream=useRef(null), submitLock=useRef(false), animationFrame=useRef(null);
  const callbacks=useRef({onClosed,onClose});callbacks.current={onClosed,onClose};
  const [position,setPosition]=useState({});
  const live=!!liveAgent, pending=live&&liveAgent.pending;
  const supported=['职业咨询','评估解释','计划推演'].includes(conv.mode||'职业咨询');
  const allowed=!live||(liveAgent.enabled&&hasExternalConsent(s)&&supported);
  const canSend=allowed&&!pending&&!!s.aiDraft.trim();
  useLayoutEffect(()=>{
    const fit=()=>{
      const viewport=window.visualViewport, width=viewport?.width||innerWidth, height=viewport?.height||innerHeight;
      const top=viewport?.offsetTop||0, left=viewport?.offsetLeft||0;
      const edge=trigger.current?.closest('aside')?.getBoundingClientRect().right||0;
      const narrow=width<=720;
      setPosition({left:left+(narrow?12:Math.max(12,Math.min(edge+20,width-402))),top:top+Math.max(12,height-Math.min(560,height-24)-16),width:narrow?width-24:390,height:Math.min(560,height-28)});
    };
    fit();window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);
    return()=>{window.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('scroll',fit);};
  },[trigger]);
  useLayoutEffect(()=>{
    const el=panel.current, closing=phase==='closing', reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const folded={opacity:0,transform:'translate(-8px, 12px) scale(.88)'}, expanded={opacity:1,transform:'translate(0, 0) scale(1)'};
    const animation=el.animate([animationFrame.current||(closing?expanded:folded),closing?folded:expanded],{duration:reduced?0:closing?260:340,easing:'cubic-bezier(0.22, 1, 0.36, 1)',fill:'both'});
    let active=true;
    animation.finished.then(()=>{if(active&&closing)callbacks.current.onClosed();}).catch(()=>{});
    return()=>{active=false;const style=getComputedStyle(el);animationFrame.current={opacity:style.opacity,transform:style.transform};animation.cancel();};
  },[phase]);
  useEffect(()=>{input.current?.focus({preventScroll:true});},[]);
  useEffect(()=>{submitLock.current=false;if(stream.current)stream.current.scrollTop=stream.current.scrollHeight;},[conv.id,conv.messages.length,pending]);
  useEffect(()=>{
    const key=e=>{if(e.key==='Escape'){e.preventDefault();callbacks.current.onClose(true);}};
    const outside=e=>{if(!panel.current?.contains(e.target)&&!trigger.current?.closest('.sidebar-companion')?.contains(e.target))callbacks.current.onClose(false);};
    document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);
    return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside);};
  },[trigger]);
  const submit=question=>{
    if(!allowed||pending||submitLock.current||!question.trim()||phase==='closing')return;
    submitLock.current=true;send(question);
    input.current?.focus({preventScroll:true});
  };
  return createPortal(<section ref={panel} id="ai-companion-popover" className="ai-companion-popover" data-phase={phase} style={position} role="dialog" inert={phase==='closing'} aria-modal="false" aria-labelledby="companion-title">
    <header className="companion-header"><CheeseAvatar size={48}/><div><h2 id="companion-title">{text.name}</h2><p>{text.subtitle}</p><small>{live?(liveAgent.loading?text.loading:liveAgent.enabled?text.live:text.unavailable):text.demo}</small></div><button type="button" className="companion-close" onClick={()=>onClose(true)} aria-label={text.close}>×</button></header>
    <div ref={stream} className="companion-stream" role="log" aria-label={text.messages} aria-live="polite" tabIndex={0}>
      {conv.messages.length?conv.messages.map(message=><AgentMessage key={message.id} s={s} message={message}/>):<div className="companion-welcome"><span className="companion-eyebrow">AVENLY COMPANION</span><h3>{text.welcome}</h3><p>{text.intro}</p><small>{text.hint}</small><div className="companion-prompts">{text.prompts.map((question,index)=><button key={question} type="button" style={{'--prompt-index':index}} disabled={pending||phase==='closing'} onClick={()=>{if(allowed)submit(question);else {update({aiDraft:question});input.current?.focus({preventScroll:true});}}}>{question}</button>)}</div></div>}
      {pending&&<p className="companion-pending" role="status">{text.pending}</p>}
    </div>
    <form className="companion-composer" onSubmit={e=>{e.preventDefault();submit(s.aiDraft);}}>
      {liveAgent?.error&&<p role="alert">{liveAgent.error}</p>}
      {live&&!allowed&&<p className="companion-service-note">{!liveAgent.enabled?text.unavailable:!hasExternalConsent(s)?text.consent:text.mode}</p>}
      {live&&!liveAgent.enabled&&<button type="button" onClick={()=>liveAgent.reload()}>{text.retry}</button>}
      <div className="companion-input-row"><textarea ref={input} rows={2} value={s.aiDraft} aria-label={text.placeholder} placeholder={text.placeholder} onChange={e=>update({aiDraft:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();submit(s.aiDraft);}}}/><button type="submit" disabled={!canSend||phase==='closing'} aria-label={text.send}>↑</button></div><small>{text.keyboard}</small>
    </form>
    <footer className="companion-footer"><button type="button" disabled={phase==='closing'} onClick={onWorkspace}>{text.workspace}</button><small>{text.detail}</small></footer>
  </section>,document.body);
}
