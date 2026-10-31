import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {displayText} from './i18n/render';
import ControlIcon from './ControlIcon';
import {workspaceSearchResults} from './workspace-search-model';
import './workspace-search-reference.css';

export default function WorkspaceSearch({s,query,setQuery,scope,setScope,go,open,startTask}){
 const form=useRef(null),input=useRef(null),popup=useRef(null),[shown,setShown]=useState(false),[active,setActive]=useState(-1),[position,setPosition]=useState({});
 const results=workspaceSearchResults({query,scope,tasks:s.tasks,logged:s.logged},displayText);
 const close=()=>{setShown(false);setActive(-1);};
 const choose=item=>{close();if(item.kind==='task')startTask(item.task);else go(item.to);};
 const all=()=>{close();if(!query.trim())return;if(scope==='本人任务')open('taskSearch',{query});else go('/careers?q='+encodeURIComponent(query.trim()));};
 useLayoutEffect(()=>{
  if(!shown)return;const place=()=>{const r=form.current.getBoundingClientRect(),width=Math.min(Math.max(r.width,470),innerWidth-24);setPosition({left:Math.max(12,Math.min(r.left,innerWidth-width-12)),top:r.bottom+8,width,maxHeight:Math.max(160,innerHeight-r.bottom-24)});};
  place();const observer=new ResizeObserver(place);observer.observe(form.current);window.addEventListener('resize',place);document.addEventListener('scroll',place,true);
  return()=>{observer.disconnect();window.removeEventListener('resize',place);document.removeEventListener('scroll',place,true);};
 },[shown]);
 useEffect(()=>{
  const outside=e=>{if(!form.current?.contains(e.target)&&!popup.current?.contains(e.target))close();};
  const keys=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!document.querySelector('dialog[open]')){e.preventDefault();input.current?.focus();setShown(true);}if(e.key==='Escape'&&shown){e.preventDefault();input.current?.focus();close();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',keys);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',keys);};
 },[shown]);
 useEffect(()=>{close();},[location.pathname,location.search]);
 useEffect(()=>{if(shown&&active>=0)popup.current?.querySelector('#workspace-search-result-'+active)?.scrollIntoView({block:'nearest'});},[active,shown]);
 return <><form ref={form} className={`global-search workspace-search ${shown?'search-open':''}`} role="search" onSubmit={e=>{e.preventDefault();all();}} onBlur={e=>{if(e.relatedTarget&&!form.current.contains(e.relatedTarget)&&!popup.current?.contains(e.relatedTarget))close();}}>
  <ControlIcon legacy name="search" size={18}/><input ref={input} role="combobox" aria-label="工作区搜索" aria-autocomplete="list" aria-expanded={shown} aria-controls={shown?'workspace-search-list':undefined} aria-activedescendant={shown&&results[active]?'workspace-search-result-'+active:undefined} autoComplete="off" value={query} placeholder="搜索职业、工作任务…" onFocus={()=>setShown(true)} onChange={e=>{setQuery(e.target.value);setActive(-1);setShown(true);}} onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setShown(true);setActive(i=>!results.length?-1:e.key==='ArrowDown'?(i+1)%results.length:(i<=0?results.length-1:i-1));}else if(e.key==='Enter'&&shown&&active>=0&&results[active]){e.preventDefault();choose(results[active]);}}}/>
  {query&&<button type="button" className="search-clear" aria-label="清空工作区搜索" onClick={()=>{setQuery('');setActive(-1);input.current.focus();}}><ControlIcon legacy name="close" size={14}/></button>}
  <select aria-label="搜索范围" value={scope} onChange={e=>{setScope(e.target.value);setActive(-1);setShown(true);}}><option>职业知识</option><option>本人任务</option></select><kbd aria-hidden="true">Ctrl K</kbd><button type="submit" className="search-submit">搜索</button>
 </form>{shown&&createPortal(<div ref={popup} className="workspace-search-results" style={position} onKeyDown={e=>{if(e.key==='Escape'){input.current.focus();close();}}}>
  <div className="search-result-label">{scope==='本人任务'?'本人保存的任务':query.trim()?'职业方向 · 原创摘要':'快速前往'}<span>{results.length}</span></div>
  <ul id="workspace-search-list" role="listbox" aria-label="工作区搜索结果">{results.map((item,i)=><li role="option" id={'workspace-search-result-'+i} key={item.kind+item.id} aria-selected={active===i} onPointerMove={()=>setActive(i)} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(item)}><span className="search-result-icon"><ControlIcon legacy name={item.kind==='task'?'clock':item.kind==='page'?'route':'file'}/></span><div><span>{item.title}</span><small>{item.description}</small></div><ControlIcon legacy name={active===i?'enter':'arrow'} size={16}/></li>)}</ul>
  {!results.length&&<div className="search-no-results"><ControlIcon legacy name="search" size={25}/><p>没有找到匹配内容</p><small>换个关键词，或切换搜索范围。</small></div>}
  <div className="search-result-footer"><span>方向键选择 · Enter 打开 · Esc 收起</span>{query.trim()&&<button type="button" onClick={all}>查看全部结果<ControlIcon legacy name="arrow" size={14}/></button>}</div>
 </div>,document.body)}</>;
}
