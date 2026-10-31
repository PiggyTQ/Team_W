import React,{useEffect,useRef} from 'react';

export default function StatusToast({message,revision,onDismiss}){
 const timer=useRef(),remaining=useRef(0),started=useRef(0),paused=useRef(new Set()),dismiss=useRef(onDismiss);
 dismiss.current=onDismiss;
 const start=()=>{
  clearTimeout(timer.current);
  if(!message||paused.current.size)return;
  started.current=Date.now();
  timer.current=setTimeout(()=>dismiss.current(),remaining.current);
 };
 const pause=reason=>{
  if(!paused.current.size){clearTimeout(timer.current);remaining.current=Math.max(0,remaining.current-(Date.now()-started.current));}
  paused.current.add(reason);
 };
 const resume=reason=>{paused.current.delete(reason);if(!paused.current.size)start();};
 useEffect(()=>{
  if(!message){clearTimeout(timer.current);paused.current.clear();return;}
  remaining.current=Math.max(3500,Math.min(10000,String(message).length*85));start();
  return()=>clearTimeout(timer.current);
 },[message,revision]);
 return <div role="status" aria-live="polite" aria-atomic="true" className={'toast '+(message?'show':'')} onMouseEnter={()=>pause('pointer')} onMouseLeave={()=>resume('pointer')} onFocus={()=>pause('focus')} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))resume('focus');}}>
  {message&&<><span>{message}</span><button type="button" onClick={onDismiss} aria-label="关闭提示">关闭</button></>}
 </div>;
}
