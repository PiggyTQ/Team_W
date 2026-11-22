import React,{createContext,useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import DiscussionWorkbench from './DiscussionWorkbench';
import {startDiscussion} from './discussion-contract';
import {useLanguage} from './i18n/render';
import AssistantSymbol from './AssistantSymbols';
import {authMessage} from './auth-contract';

export const DiscussionEnvironment=createContext(null);

/** A header launcher owns no lesson space. Only an open tutor creates a dock. */
export default function LearningDiscussion({context,disabled=false,children}){
 const env=useContext(DiscussionEnvironment),language=useLanguage(),en=language==='en';
 const [visible,setVisible]=useState(false),[topic,setTopic]=useState(null),[opening,setOpening]=useState(false),[error,setError]=useState(''),[slots,setSlots]=useState({trigger:null,dock:null});
 const trigger=useRef(null),origin=useRef(''),latest=useRef('');
 const returnKey='avemly-discussion-return:'+env?.user?.id;
 const objectKey=context.refs.map(r=>r.kind+':'+r.id+':'+r.part).join('|')+':'+(context.returnStep||'')+':'+(context.practiceMode||'');
 latest.current=(env?.user?.id||'')+':'+objectKey;
 useLayoutEffect(()=>{setSlots({trigger:document.getElementById('learning-tutor-slot'),dock:document.getElementById('learning-discussion-dock')});},[objectKey,env?.user?.id]);
 useEffect(()=>{try{const memory=JSON.parse(sessionStorage.getItem(returnKey));if(memory?.objectKey===objectKey){requestAnimationFrame(()=>requestAnimationFrame(()=>{const main=document.getElementById('main');if(main)main.scrollTop=memory.main;window.scrollTo(0,memory.window);sessionStorage.removeItem(returnKey);}));}}catch{}},[objectKey,env?.user?.id]);
 useEffect(()=>{if(disabled)setVisible(false);},[disabled]);
 useEffect(()=>{setVisible(false);setTopic(null);setError('');setOpening(false);},[objectKey,env?.user?.id]);
 useEffect(()=>{const c=env?.state.conversations.find(c=>c.id===env.state.conversationId);if(visible&&c?.discussion?.intent==='learning'&&context.refs.every(r=>c.discussion.refs.some(v=>v.kind===r.kind&&v.id===r.id&&v.part===r.part)))setTopic(c.id);},[visible,env?.state.conversationId,objectKey]);
 useLayoutEffect(()=>{
  if(!visible||!topic||!slots.dock)return;
  const main=document.getElementById('main'),dock=slots.dock;let frame;
  const fit=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const top=Math.max(88,dock.getBoundingClientRect().top);dock.style.setProperty('--tutor-height',Math.max(380,window.innerHeight-top-18)+'px');});};
  fit();window.addEventListener('resize',fit);main?.addEventListener('scroll',fit,{passive:true});
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',fit);main?.removeEventListener('scroll',fit);dock.style.removeProperty('--tutor-height');};
 },[visible,topic,slots.dock]);
 useEffect(()=>{
  if(!visible||!topic)return;
  const escape=e=>{if(e.key!=='Escape'||e.defaultPrevented||document.querySelector('dialog[open],[popover]:popover-open'))return;e.preventDefault();env?.liveAgent.cancel();setVisible(false);requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}));};
  document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);
 },[visible,topic]);
 if(!env?.user)return children;
 const conv=env.state.conversations.find(c=>c.id===topic),expanded=visible&&!!conv&&!disabled;
 const begin=async()=>{
  if(opening)return;const snapshot=latest.current;setError('');setOpening(true);env.liveAgent.cancel();
  try{await env.workspace.flush();if(snapshot!==latest.current)return;origin.current=location.pathname+location.search;setTopic(null);env.update(prev=>startDiscussion(prev,context));setVisible(true);}catch(e){if(snapshot===latest.current)setError(authMessage(e.code,language));}finally{if(snapshot===latest.current)setOpening(false);}
 };
 const close=()=>{env.liveAgent.cancel();setVisible(false);requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}));};
 const expand=async()=>{try{await env.workspace.flush();sessionStorage.setItem(returnKey,JSON.stringify({objectKey,main:document.getElementById('main')?.scrollTop||0,window:window.scrollY}));env.update({aiReturn:origin.current});window.history.pushState({},'','/assistant');window.dispatchEvent(new PopStateEvent('popstate'));}catch(e){setError(authMessage(e.code,language));}};
 const launcher=<span className="learning-tutor-launcher"><button data-learning-discussion-trigger ref={trigger} type="button" disabled={opening} aria-label={en?'Ask Cheese Scholar':'向芝识分子问询'} aria-expanded={expanded} aria-controls="learning-tutor-panel" onClick={()=>expanded?close():begin()}><AssistantSymbol name="brain" size={20}/><span>{en?'Cheese Scholar Tutor':'芝识分子 Tutor'}</span><AssistantSymbol name={expanded?'chevronDown':'chevron'} size={15}/></button>{error&&<span className="learning-tutor-error" role="alert">{error}</span>}</span>;
 const panel=expanded&&<aside id="learning-tutor-panel" className="learning-discussion-sidebar" aria-label={en?'Learning discussion':'学习讨论'} onKeyDown={e=>{if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();close();}}}><DiscussionWorkbench {...env} conv={conv} compact onClose={close} onExpand={expand}/></aside>;
 return <>
  {!disabled&&slots.trigger&&createPortal(launcher,slots.trigger)}
  <div className={'learning-discussion-layout'+(expanded?' has-learning-discussion':'')}><div className="learning-discussion-main">{children}</div></div>
  {panel&&slots.dock&&createPortal(panel,slots.dock)}
 </>;
}
