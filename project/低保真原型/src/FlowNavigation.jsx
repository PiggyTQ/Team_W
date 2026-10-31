import React, { useLayoutEffect, useRef } from 'react';
import { flowNavigation } from './flow-navigation';

export default function FlowNavigation({ s, path, tab, search, link }) {
  const flow = ['/app', '/assistant', '/career-map'].includes(path) ? null : flowNavigation(s, path, tab, search);
  const ref = useRef(null);
  useLayoutEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const root = document.getElementById('root');
    const observer = new ResizeObserver(() => root.style.setProperty('--flow-nav-height', `${bar.offsetHeight}px`));
    observer.observe(bar);
    return () => { observer.disconnect(); root.style.removeProperty('--flow-nav-height'); };
  }, [Boolean(flow)]);
  if (!flow) return null;
  return <nav ref={ref} className="flow-progress" aria-label="流程前进与返回">
    {link(flow.back.to, <><span aria-hidden="true">←</span>{flow.back.label}</>, 'button flow-back')}
    <div className="flow-progress-context"><p>{flow.hint}</p>{flow.help && link(flow.help.to, flow.help.label, 'flow-help')}</div>
    {flow.next.action==='selected-action'?<button className="button primary flow-next" onClick={()=>{const target=document.getElementById('action-selected-detail');target?.scrollIntoView({block:'start'});target?.focus({preventScroll:true});}}>{flow.next.label}<span aria-hidden="true">→</span></button>:link(flow.next.to, <>{flow.next.label}<span aria-hidden="true">→</span></>, 'button primary flow-next')}
  </nav>;
}
