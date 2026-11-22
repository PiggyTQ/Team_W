import {useCallback,useEffect,useRef,useState} from 'react';
import {skillProgress,skillStudyKey} from './skill-tree-model';
import {growthTiming} from './skill-growth-geometry';

// Queue only a confirmed first pass. Loading saved progress never schedules
// feedback. Wait until the tree is visible so a check below it cannot consume
// the animation offscreen, and consume each event before playing it.
export function useTreeGrowth({tree,study,viewRef}) {
  const [pending,setPending]=useState([]),[active,setActive]=useState(null);
  const played=useRef(new Set()),serial=useRef(0);
  const enqueue=useCallback(skill=>{
    const bough=tree.branches.findIndex(branch=>branch.leaves.some(leaf=>leaf.id===skill));
    if(bough<0)return;
    const branch=tree.branches[bough],index=branch.leaves.findIndex(leaf=>leaf.id===skill),key=skillStudyKey(tree.id,branch.leaves[index]);
    if(played.current.has(key))return;
    setPending(queue=>queue.some(item=>item.key===key)?queue:[...queue,{skill,key,bough,index,branch:branch.id}]);
  },[tree]);
  useEffect(()=>{
    if(active||!pending.length||!viewRef.current)return;
    // A confirmed command can resolve before the workspace render commits.
    // Keep the bud closed until that same record has actually arrived.
    if(!study?.[pending[0].key]?.assessment?.passedAt)return;
    const start=()=>{
      const item=pending[0];
      if(played.current.has(item.key)){setPending(queue=>queue.slice(1));return;}
      played.current.add(item.key);
      const branch=tree.branches[item.bough],stats=skillProgress(tree.id,branch.leaves,study);
      const full=stats.done===stats.total&&pending.filter(row=>row.branch===item.branch).length===1;
      setPending(queue=>queue.slice(1));
      if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)setActive({...item,full,phase:'water',serial:++serial.current});
    };
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.35)){observer.disconnect();start();}
    },{threshold:[.35]});
    observer.observe(viewRef.current);
    return()=>observer.disconnect();
  },[active,pending,tree,study,viewRef]);
  useEffect(()=>{
    if(!active)return;
    const serial=active.serial;
    const phase=(value)=>setActive(current=>current?.serial===serial?{...current,phase:value}:current);
    const leafTimer=setTimeout(()=>phase('leaf'),growthTiming.arrival);
    const branchTimer=active.full?setTimeout(()=>phase('branch'),growthTiming.branchStart):null;
    const timer=setTimeout(()=>setActive(null),active.full?growthTiming.branch:growthTiming.single);
    return()=>{clearTimeout(timer);clearTimeout(leafTimer);clearTimeout(branchTimer);};
  },[active?.serial]);
  return {pendingGrowth:pending,recentGrowth:active,enqueueGrowth:enqueue};
}
