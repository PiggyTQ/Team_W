import React,{useEffect,useRef,useState} from 'react';
import {apiRequest,SERVER_AUTH} from './auth-client';
import {createSuggestionsController,personalSignalKey} from './personal-suggestions-controller';
import {useLanguage,displayPublicText} from './i18n/render';
import './personal-suggestions.css';

export default function PersonalSuggestions({owner,workspace,state,link}){
  useLanguage();
  const [view,setView]=useState({status:'idle',data:null}),controller=useRef(null);
  if(!controller.current)controller.current=createSuggestionsController({request:apiRequest,onChange:setView});
  const signalKey=personalSignalKey(state),ready=workspace.status==='saved';
  useEffect(()=>{if(SERVER_AUTH)controller.current.update(owner,signalKey,ready);},[owner,signalKey,ready]);
  useEffect(()=>()=>controller.current.destroy(),[]);
  if(!SERVER_AUTH||!owner)return null;
  if(view.owner!==owner)return <p role="status">正在读取建议…</p>;
  const rows=view.data?.suggestions.filter(row=>!['dismissed','not_relevant'].includes(row.status))||[];
  return <section className="personal-suggestions workbench-panel" aria-labelledby="personal-suggestions-title" data-status={view.status}>
    <header><h2 id="personal-suggestions-title">根据当前记录，接下来可以做什么</h2><span>站内规则建议</span><button type="button" disabled={!ready||view.status==='feedback'||view.status==='loading'} onClick={()=>controller.current.update(owner,signalKey,ready,{force:true})}>重新读取建议</button></header>
    <p className="muted">依据已保存的目标、材料和任务更新，不产生模型调用费用。</p>
    {['idle','loading'].includes(view.status)&&<p role="status">正在读取建议…</p>}
    {view.status==='waiting'&&<p role="status">记录保存后更新建议；请先处理未保存或冲突状态。</p>}
    {view.status==='error'&&<div role="alert"><p>建议暂时无法读取，已有记录保留。</p><button type="button" onClick={()=>controller.current.update(owner,signalKey,ready,{force:true})}>重新读取建议</button></div>}
    {view.data&&<><ul>{rows.slice(0,3).map(row=><li key={row.id}><div><p>{displayPublicText(row.reason)}</p>{/^\/(?:assessment|careers|plan|assistant)(?:[/?]|$)|^\/work\/[-a-zA-Z0-9]+(?:[/?]|$)/.test(row.action?.route)&&link(row.action.route,displayPublicText(row.action.label),'button')}<details><summary>查看建议依据</summary><p>来自当前账户的已保存状态，不代表独立能力核验。</p>{row.refs.map((ref,i)=><small key={i}>{ref.kind} · {ref.id} · v{ref.version} </small>)}</details></div><div className="personal-suggestion-feedback"><button type="button" disabled={view.status==='feedback'} onClick={()=>controller.current.feedback(row.id,'dismissed')}>忽略此建议</button><button type="button" disabled={view.status==='feedback'} onClick={()=>controller.current.feedback(row.id,'not_relevant')}>与我无关</button></div></li>)}</ul>{!rows.length&&<p>当前没有新的规则建议，可以继续探索或更新记录。</p>}{rows.length>3&&<details><summary>查看其余建议</summary><ul>{rows.slice(3).map(row=><li key={row.id}><p>{displayPublicText(row.reason)}</p>{/^\/(?:assessment|careers|plan|assistant)(?:[/?]|$)|^\/work\/[-a-zA-Z0-9]+(?:[/?]|$)/.test(row.action?.route)&&link(row.action.route,displayPublicText(row.action.label))}<button type="button" disabled={view.status==='feedback'} onClick={()=>controller.current.feedback(row.id,'dismissed')}>忽略此建议</button></li>)}</ul></details>}</>}
  </section>;
}
