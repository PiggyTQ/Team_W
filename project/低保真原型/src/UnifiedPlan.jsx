import React,{useState} from 'react';
import PlanSchedule from './PlanSchedule';
import {localToday} from './TaskSchedule';
import PlanStructureDisclosure from './PlanStructureDisclosure';
import ControlIcon from './ControlIcon';
import ProductIcon from './ProductIcon';
import {PlanCardPattern,PlanContextDecoration} from './PlanDecoration';
import DetailDrawer from './DetailDrawer';
import {displayPublicText} from './i18n/render';
import './unified-plan.css';
import './schedule-day.css';

const goalPeriods=[
 {id:'week',label:'周目标',action:'查看周目标',empty:'还没有周目标。'},
 {id:'month',label:'月目标',action:'查看月目标',empty:'还没有月目标。'},
 {id:'year',label:'年目标',action:'查看年目标',empty:'还没有年目标。'},
];

function PlanWaveCard({id,label,action,count,unit,href,link,onActivate,expanded}){
 const content=<>
  <span className="plan-wave-base" aria-hidden="true"><PlanCardPattern tone="blue"/><span className="plan-wave-label">{label}</span><span className="plan-summary-count"><strong>{count}</strong><span>{unit}</span></span></span>
  <span className="plan-wave-cover" aria-hidden="true"><span className="plan-wave-content"><PlanCardPattern tone="yellow"/><span className="plan-wave-action">{action}</span><ControlIcon name="arrow" size={16}/></span></span>
 </>;
 const control=href?(href.startsWith('#')?<a href={href}>{content}</a>:link(href,content)):<button type="button" onClick={onActivate}>{content}</button>;
 return <li className="plan-summary-row" data-plan-card={id}>{React.cloneElement(control,{
  className:'plan-wave-card',
  'aria-label':`${displayPublicText(label)} ${count} ${displayPublicText(unit)}, ${displayPublicText(action)}`,
  'aria-haspopup':onActivate?'dialog':undefined,
  'aria-expanded':onActivate?expanded:undefined,
 })}</li>;
}

export default function UnifiedPlan({s,open,link,precheck,startTask,update,adjustment}){
 const [goalPeriod,setGoalPeriod]=useState(null);
 const active=s.tasks.filter(t=>!['完成','延期','取消','跳过'].includes(t.status)&&!t.completed);
 const undated=active.filter(t=>!t.due),review=active.filter(t=>t.status==='受阻'||(t.due&&t.due<localToday()));
 return <div className="unified-plan">
  <section className="plan-context" aria-label="当前目标与行动摘要">
   <PlanContextDecoration/>
   <div className="plan-context-main">
    <div className="plan-context-copy">
    <div className="plan-context-heading"><h2>我的目标</h2></div>
    <ul className="plan-goal-periods">{goalPeriods.map(period=><PlanWaveCard key={period.id} {...period} count={0} unit="个" onActivate={()=>setGoalPeriod(period)} expanded={goalPeriod?.id===period.id}/>)}</ul>
    <div className="plan-context-actions"><button className="plan-context-button" onClick={()=>open('goal',{goal:s.goal||'data',backup:s.backup||'',reason:s.decision.reason})}>编辑目标并预览</button></div>
    </div>
    <span className="plan-context-illustration plan-context-illustration-goal" aria-hidden="true"><ProductIcon name="target" size={128}/></span>
   </div>
   <div className="plan-context-plans">
    <div className="plan-context-copy">
    <div className="plan-context-heading"><h2>我的计划</h2></div>
    <ul className="plan-context-records">
     <PlanWaveCard id="undated" label="待排期" action="去排期" count={undated.length} unit="项" href="#schedule-undated" link={link}/>
     <PlanWaveCard id="actions" label="待行动" action="去行动" count={active.length} unit="项" href="/plan?tab=执行" link={link}/>
     <PlanWaveCard id="review" label="待复查" action="去审查" count={review.length} unit="项" href="#schedule-overdue" link={link}/>
    </ul>
    <nav className="plan-context-next">{link('/learning','预览学习实践','button plan-context-button')}</nav>
    </div>
    <span className="plan-context-illustration plan-context-illustration-calendar" aria-hidden="true"><ProductIcon name="calendar" size={128}/></span>
   </div>
  </section>
  {goalPeriod&&<DetailDrawer key={goalPeriod.id} title={goalPeriod.label} onClose={()=>setGoalPeriod(null)} className="plan-goal-period-drawer"><div className="plan-period-empty"><ProductIcon name="target" size={40}/><div className="plan-period-total"><strong>0</strong><span>个</span></div><p>{goalPeriod.empty}</p></div></DetailDrawer>}
  <div className="plan-context-adjustment">{adjustment}</div>
  {s.taskDraft&&<div className="plan-draft-strip"><ControlIcon name="file"/><div><strong>有一份未开始的行动草稿</strong><span translate="no">{s.taskDraft.title}</span></div><button onClick={()=>open('precheck',s.taskDraft)}>恢复预检草稿</button></div>}
  <PlanSchedule s={s} update={update} link={link} open={open} precheck={precheck}/>
  <PlanStructureDisclosure s={s} update={update} precheck={precheck} startTask={startTask} link={link}/>
 </div>;
}
