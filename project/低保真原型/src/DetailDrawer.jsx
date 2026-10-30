import React,{useEffect,useId,useRef} from 'react';
import {createPortal} from 'react-dom';
import './information-disclosure.css';

// Inspection keeps the underlying workspace available. Protected decisions
// continue to use the application's modal dialogs above this surface.
export default function DetailDrawer({title,children,onClose,className=''}){
 const dialog=useRef(null),heading=useRef(null),close=useRef(onClose),id=useId();
 close.current=onClose;
 useEffect(()=>{
  const el=dialog.current,previous=document.activeElement;
  document.dispatchEvent(new CustomEvent('workspace-detail-open',{detail:id}));
  el.show();heading.current?.focus({preventScroll:true});
  const escape=e=>{
   if(e.key!=='Escape'||document.querySelector('dialog:modal,[popover]:popover-open'))return;
   e.preventDefault();e.stopPropagation();close.current();
  };
  const another=e=>{if(e.detail!==id)close.current();};
  const cancel=e=>{e.preventDefault();close.current();};
  document.addEventListener('keydown',escape);
  document.addEventListener('workspace-detail-open',another);
  el.addEventListener('cancel',cancel);
  return()=>{
   const restore=el.contains(document.activeElement)||document.activeElement===document.body;
   document.removeEventListener('keydown',escape);
   document.removeEventListener('workspace-detail-open',another);
   el.removeEventListener('cancel',cancel);el.close();
   if(restore&&previous?.isConnected)previous.focus({preventScroll:true});
  };
 },[id]);
 return createPortal(<dialog ref={dialog} className={'information-drawer '+className} aria-modal="false" aria-labelledby={id}>
  <header className="information-drawer-heading"><h2 id={id} ref={heading} tabIndex={-1}>{title}</h2><button type="button" onClick={onClose} aria-label="关闭详情">关闭</button></header>
  <div className="information-drawer-content">{children}</div>
 </dialog>,document.body);
}
