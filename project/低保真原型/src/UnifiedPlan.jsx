import React from 'react';
import PlanSchedule from './PlanSchedule';
import {localToday} from './TaskSchedule';
import PlanStructureDisclosure from './PlanStructureDisclosure';
import ControlIcon from './ControlIcon';
import ProductIcon from './ProductIcon';
import {PlanCardPattern,PlanContextDecoration} from './PlanDecoration';
import PlanStage from './PlanStage';
import PlanGoalDetail from './PlanGoalDetail';
import PlanGoalEditorPage from './PlanGoalEditorPage';
import PlanSchedulerPage from './PlanSchedulerPage';
import PlanTaskDetail from './PlanTaskDetail';
import usePlanStageRecords from './usePlanStageRecords';
import {goalEditorUrl,goalPeriods,periodGoals,stageTaskGroups,stageViewIds} from './plan-stage-model';
import {displayPublicText} from './i18n/render';
import './unified-plan.css';
import './schedule-day.css';

function PlanWaveCard({id,label,action,count,unit,onActivate}){
 const content=<>
  <span className="plan-wave-base" aria-hidden="true"><PlanCardPattern tone="blue"/><span className="plan-wave-label">{label}</span><span className="plan-summary-count"><strong>{count}</strong><span>{unit}</span></span></span>
  <span className="plan-wave-cover" aria-hidden="true"><span className="plan-wave-content"><PlanCardPattern tone="yellow"/><span className="plan-wave-action">{action}</span><ControlIcon name="arrow" size={16}/></span></span>
 </>;
 return <li className="plan-summary-row" data-plan-card={id}><button type="button" className="plan-wave-card" onClick={event=>onActivate(id,event)} aria-label={`${displayPublicText(label)} ${count} ${displayPublicText(unit)}, ${displayPublicText(action)}`}>{content}</button></li>;
}

export default function UnifiedPlan({s,open,link,go,goalEditing=false,goalEditPeriod,goalView,scheduling=false,scheduleGoalId,scheduleTaskId,calendarDate,precheck,startTask,update,adjustment,command,storageScope='local'}){
 const today=localToday(),{records,store,storageStatus}=usePlanStageRecords(storageScope),groups=stageTaskGroups(s,records,today);
 const initialView=stageViewIds.includes(goalView)?goalView:'overview';
 const views=[...goalPeriods.map(period=>({id:period.id,title:period.title,render:onBack=><PlanGoalDetail {...{today,records,storageStatus,link}} onBack={goalView?()=>go('/plan'):onBack} period={period.id}/>})),...['actions','review'].map(id=>({id,title:{actions:'待行动',review:'待复查'}[id],render:onBack=><PlanTaskDetail {...{s,today,records,store,storageStatus,update,command,link}} onBack={goalView?()=>go('/plan'):onBack} view={id} tasks={groups[id]} goals={id==='actions'?groups.actionGoals:[]}/>}))];
 if(goalEditing)return <PlanGoalEditorPage {...{s,open,link,today,records,store,storageStatus}} period={goalEditPeriod}/>;
 if(scheduling)return <PlanSchedulerPage {...{s,records,store,storageStatus,update,command,link}} goalId={scheduleGoalId} taskId={scheduleTaskId}/>;
 return <div className="unified-plan">
  <PlanStage key={initialView} views={views} initialView={initialView}>{show=>
  <section className="plan-context" aria-label="当前目标与行动摘要">
   <PlanContextDecoration/>
   <div className="plan-context-main">
    <div className="plan-context-copy">
    <div className="plan-context-heading"><h2>我的目标</h2></div>
    <ul className="plan-goal-periods">{goalPeriods.map(period=><PlanWaveCard key={period.id} {...period} count={periodGoals(records,period.id,today).length} unit="个" onActivate={show}/>)}</ul>
    <div className="plan-context-actions">{link(goalEditorUrl(),'编辑目标并预览','plan-context-button')}</div>
    </div>
    {React.cloneElement(link(goalEditorUrl(),<ProductIcon name="target" size={128}/>,'plan-context-illustration plan-context-illustration-goal'),{'aria-label':displayPublicText('进入目标编辑'),title:displayPublicText('目标编辑')})}
   </div>
   <div className="plan-context-plans">
    <div className="plan-context-copy">
    <div className="plan-context-heading"><h2>我的计划</h2></div>
    <ul className="plan-context-records">
     <PlanWaveCard id="undated" label="待排期" action="去排期" count={groups.undated.length+groups.undatedGoals.length} unit="项" onActivate={()=>go('/plan/schedule')}/>
     <PlanWaveCard id="actions" label="待行动" action="去行动" count={groups.actions.length+groups.actionGoals.length} unit="项" onActivate={show}/>
     <PlanWaveCard id="review" label="待复查" action="去审查" count={groups.review.length} unit="项" onActivate={show}/>
    </ul>
    <nav className="plan-context-next">{link('/learning','预览学习实践','button plan-context-button')}</nav>
    </div>
    <span className="plan-context-illustration plan-context-illustration-calendar" aria-hidden="true"><ProductIcon name="calendar" size={128}/></span>
   </div>
  </section>
  }</PlanStage>
  <div className="plan-context-adjustment">{adjustment}</div>
  {s.taskDraft&&<div className="plan-draft-strip"><ControlIcon name="file"/><div><strong>有一份未开始的行动草稿</strong><span translate="no">{s.taskDraft.title}</span></div><button onClick={()=>open('precheck',s.taskDraft)}>恢复预检草稿</button></div>}
  <PlanSchedule key={calendarDate||'calendar'} s={s} update={update} link={link} open={open} precheck={precheck} records={records} store={store} calendarDate={calendarDate}/>
  <PlanStructureDisclosure s={s} update={update} precheck={precheck} startTask={startTask} link={link}/>
 </div>;
}
