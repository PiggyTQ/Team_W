import React,{useLayoutEffect,useRef} from 'react';

// Keep route links as links and state buttons as buttons; the plate is decorative.
export default function SegmentedControl({as:Tag='nav',children,className='',...props}){
 const ref=useRef(null);
 useLayoutEffect(()=>{
  const el=ref.current;let frame,readyFrame;
  const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const active=el.querySelector(':scope>a[aria-current=page],:scope>button[aria-pressed=true],:scope>.selected');
   if(!active){el.dataset.selected='false';return;}
   const box=el.getBoundingClientRect(),item=active.getBoundingClientRect();
   el.style.setProperty('--selection-x',`${item.left-box.left+el.scrollLeft-el.clientLeft}px`);
   el.style.setProperty('--selection-y',`${item.top-box.top+el.scrollTop-el.clientTop}px`);
   el.style.setProperty('--selection-w',`${item.width}px`);el.style.setProperty('--selection-h',`${item.height}px`);el.dataset.selected='true';
   if(!el.dataset.animated)readyFrame=requestAnimationFrame(()=>{el.dataset.animated='true';});
   if(el.scrollWidth>el.clientWidth){if(active.offsetLeft<el.scrollLeft)el.scrollLeft=active.offsetLeft-5;else if(active.offsetLeft+active.offsetWidth>el.scrollLeft+el.clientWidth)el.scrollLeft=active.offsetLeft+active.offsetWidth-el.clientWidth+5;}
  });};
  const observer=new ResizeObserver(measure);observer.observe(el);Array.from(el.children).forEach(child=>observer.observe(child));
  // Translation may replace text without a React commit.
  const textObserver=new MutationObserver(measure);textObserver.observe(el,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-current','aria-pressed','class']});measure();
  return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(readyFrame);observer.disconnect();textObserver.disconnect();};
 },[children]);
 const keys=e=>{
  props.onKeyDown?.(e);if(e.defaultPrevented||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  const items=Array.from(ref.current.querySelectorAll(':scope>a,:scope>button:not(:disabled)'));const at=items.indexOf(document.activeElement);if(at<0)return;
  e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?items.length-1:(at+(e.key==='ArrowRight'?1:-1)+items.length)%items.length;items[next].focus();items[next].click();
 };
 return <Tag {...props} ref={ref} className={`segmented-control ${className}`} onKeyDown={keys}>{children}<span className="selection-plate" aria-hidden="true"/></Tag>;
}
