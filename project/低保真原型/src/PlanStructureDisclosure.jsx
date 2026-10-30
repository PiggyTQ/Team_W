import React,{useEffect,useState} from 'react';
import DetailDrawer from './DetailDrawer';
import PhasedPlan from './PhasedPlan';
import './plan-structure-disclosure.css';

export default function PlanStructureDisclosure({s,update,precheck,startTask,link}){
 const [opened,setOpened]=useState(()=>location.hash==='#phase-actions');
 useEffect(()=>{
  const openLinkedSection=()=>{if(location.hash==='#phase-actions')setOpened(true);};
  window.addEventListener('hashchange',openLinkedSection);
  return()=>window.removeEventListener('hashchange',openLinkedSection);
 },[]);
 return <>
  <section className="plan-structure-disclosure" id={opened?'plan-structure-entry':'phase-actions'} aria-label="阶段计划摘要">
   <div><button type="button" aria-expanded={opened} aria-haspopup="dialog" onClick={()=>setOpened(true)}>阶段与优先级</button><p>{s.tasks.length?<><span>{s.tasks.length} 项任务</span><span>按需调整阶段顺序、优先级与依赖。</span></>:<>尚无任务，可先安排一次自主行动。</>}</p></div>
   {!s.tasks.length&&<button type="button" className="primary" onClick={()=>precheck()}>安排自主行动</button>}
  </section>
  {opened&&<DetailDrawer title="阶段与优先级" onClose={()=>setOpened(false)} className="plan-structure-drawer"><PhasedPlan s={s} update={update} precheck={precheck} startTask={startTask} link={link}/></DetailDrawer>}
 </>;
}
