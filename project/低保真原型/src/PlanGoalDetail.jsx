import React,{useState} from 'react';
import ProductIcon from './ProductIcon';
import {getLanguage,displayPublicText} from './i18n/render';
import {goalEditorUrl,goalPeriods,goalStats,periodGoals,periodRange} from './plan-stage-model';
import {DetailStats,PlanDetailHeader,StageStorageNote} from './PlanDetailShared';

export default function PlanGoalDetail({period,today,records,storageStatus,onBack,link}){
 const config=goalPeriods.find(p=>p.id===period),range=periodRange(period,today),goals=periodGoals(records,period,today),stats=goalStats(goals);
 const [expanded,setExpanded]=useState(null);
 const locale=getLanguage()==='en'?'en-US':'zh-CN';
 const caption=period==='week'?`${range.start} — ${range.end}`:new Intl.DateTimeFormat(locale,period==='month'?{year:'numeric',month:'long'}:{year:'numeric'}).format(new Date(today+'T12:00:00'));
 const listTitle={week:'本周目标清单',month:'本月目标清单',year:'年度目标清单'}[period],focus=goals.find(g=>g.priority==='高'&&g.progress<100),milestones=goals.flatMap(g=>g.milestones);
 return <>
  <PlanDetailHeader title={config.title} subtitle={caption} onBack={onBack} local/>
  <div className="plan-detail-scroll" data-detail-scroll={period}>
   <StageStorageNote status={storageStatus}/>
   <div className={`plan-detail-layout${goals.length?'':' is-goal-empty'}`}>
    {goals.length>0&&<aside className="plan-detail-summary">
     <div><p className="plan-detail-period">{period==='week'?'本周整体进度':period==='month'?'本月完成进度':'年度整体进度'}</p><div className="plan-detail-progress-number"><strong>{stats.progress}</strong><span>%</span></div><progress aria-label="整体目标完成进度" value={stats.progress} max="100"/></div>
     <DetailStats items={[["已完成",stats.done],["进行中",stats.going],["未开始",stats.pending]]}/>
     <p className="plan-detail-note">共 {stats.total} 个目标。周期目标保存在此浏览器，不会同步到服务器。</p>
     {period==='month'&&focus&&<div className="plan-detail-highlight"><strong>本月重点目标</strong><span translate="no">{focus.title}</span></div>}
     {period==='year'&&<div className="plan-detail-highlight"><strong>年度关键里程碑</strong><span>{milestones.filter(m=>m.done).length} / {milestones.length}</span><p className="plan-detail-note">里程碑由你逐项确认，目标进度单独记录。</p></div>}
    </aside>}
    <div className="plan-detail-main">
     {goals.length>0&&<div className="plan-detail-toolbar"><h3>{listTitle}</h3></div>}
     <div className="plan-detail-list-scroll" data-list-scroll={period}>
     {!goals.length?<div className="plan-detail-empty plan-goal-empty"><ProductIcon name="target" size={32}/><h3>您当前没有指定目标</h3>{link(goalEditorUrl(period),'去制定 →','plan-goal-formulate-link')}</div>:<ul className="plan-detail-list plan-goal-list">{goals.map(goal=><li key={goal.id} className="plan-detail-item" data-period-goal={goal.id}>
      <div className="plan-detail-item-head"><button type="button" className="plan-detail-item-toggle" aria-expanded={expanded===goal.id} onClick={()=>setExpanded(expanded===goal.id?null:goal.id)}><ProductIcon name="chevronDown" size={15}/><span translate="no">{goal.title}</span></button><span className="plan-detail-pill" data-state={goal.progress===100?'done':'active'}>{goal.progress===100?'已完成':goal.progress>0?'进行中':'未开始'}</span></div>
      <div className="plan-detail-meta"><span className="plan-detail-priority" data-priority={goal.priority}>优先级：{goal.priority}</span><span>截止日期：<time>{goal.due}</time></span></div>
      <div className="plan-goal-card-bottom"><div className="plan-goal-progress"><progress aria-label={`${displayPublicText('目标完成进度')} ${goal.progress}%`} max="100" value={goal.progress}/><span>{goal.progress}%</span></div>{link('/plan/schedule?goal='+encodeURIComponent(goal.id),'去排期','plan-detail-button')}</div>
      {expanded===goal.id&&<div className="plan-detail-expanded"><p translate="no">{goal.notes||displayPublicText('尚未填写目标说明。')}</p>{goal.milestones.length>0&&<><h4>关键里程碑</h4><ul className="plan-detail-milestones plan-goal-milestones-readonly">{goal.milestones.map(m=><li key={m.id}><span className="plan-detail-pill" data-state={m.done?'done':'active'}>{m.done?'已完成':'未完成'}</span><span translate="no">{m.title}</span></li>)}</ul></>}</div>}
     </li>)}</ul>}
     </div>
    </div>
   </div>
  </div>
 </>;
}
