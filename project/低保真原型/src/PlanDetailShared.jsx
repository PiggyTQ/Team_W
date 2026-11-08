import React,{forwardRef,useEffect,useLayoutEffect,useRef} from 'react';
import ControlIcon from './ControlIcon';
import {displayPublicText} from './i18n/render';

export function PlanDetailHeader({title,subtitle,onBack,backLabel='返回总览',local=false}){
 return <header className="plan-detail-header"><button type="button" className="plan-detail-back" onClick={onBack}><ControlIcon name="arrow" size={16}/>{backLabel}</button><div><h2 tabIndex={-1} data-stage-heading>{title}</h2><p>{subtitle}</p></div>{local&&<span className="plan-detail-local">本机目标</span>}</header>;
}
export function StageStorageNote({status}){
 return status==='saved'?null:<p className="plan-detail-error" role="status">{status==='unreadable'?'本机目标记录无法读取，原记录未覆盖。本次改动仅在当前页面保留。':'本机存储不可用，本次改动仅在当前页面保留。'}</p>;
}
export function DetailField({label,children}){return <label className="plan-detail-field"><span title={displayPublicText(label)}>{label}</span>{children}</label>;}
export function DetailStats({items}){return <div className="plan-detail-stats">{items.map(([label,count])=><div key={label}><strong>{count}</strong><span>{label}</span></div>)}</div>;}
export const DetailEditor=forwardRef(function DetailEditor({title,subtitle,status,label,actions,footerActions,context,error,onSubmit,children,className=''},ref){
 const Tag=onSubmit?'form':'div';
 return <Tag ref={ref} className={`plan-detail-editor ${className}`} aria-label={label} onSubmit={onSubmit}>
  <div className="plan-editor-toolbar"><h3><span>{title}</span>{(subtitle||status)&&<small className={status?'is-feedback':undefined} role={status?'status':undefined} title={status?displayPublicText(status):subtitle} translate={status?undefined:'no'}>{status||subtitle}</small>}</h3>
   {context&&<details className="plan-editor-context" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))e.currentTarget.open=false;}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();e.currentTarget.open=false;e.currentTarget.querySelector('summary').focus({preventScroll:true});}}}><summary>任务说明</summary><div className="plan-editor-context-content">{context}</div></details>}
   {actions&&<div className="plan-editor-actions">{actions}</div>}
  </div>
  {error&&<div className="plan-editor-error">{error}</div>}
  <div className="plan-editor-fields">{children}</div>
  {footerActions&&<div className="plan-editor-footer"><div className="plan-editor-actions">{footerActions}</div></div>}
 </Tag>;
});
export function useInlineReveal(open){
 const ref=useRef(null);
 useEffect(()=>{if(!open||!ref.current)return;const node=ref.current;if(node.closest('[hidden]'))return;node.querySelector('input,textarea,select')?.focus({preventScroll:true});},[open]);
 return ref;
}
export function useEditorListScroll(editing,focusSelector){
 const ref=useRef(null),top=useRef(0),active=useRef(editing),previous=useRef(editing),target=useRef('');active.current=editing;
 if(editing)target.current=focusSelector||'.plan-detail-toolbar button';
 useLayoutEffect(()=>{if(!editing&&ref.current){ref.current.scrollTop=top.current;if(previous.current)ref.current.closest('.plan-detail-main')?.querySelector(target.current)?.focus({preventScroll:true});}previous.current=editing;},[editing]);
 return{ref,onScroll:e=>{if(!active.current)top.current=e.currentTarget.scrollTop;}};
}
