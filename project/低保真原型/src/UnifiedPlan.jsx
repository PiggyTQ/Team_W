import React from 'react';
import {cname} from './model';
import PlanSchedule from './PlanSchedule';
import {localToday} from './TaskSchedule';
import PlanStructureDisclosure from './PlanStructureDisclosure';
import ControlIcon from './ControlIcon';
import './unified-plan.css';
import './schedule-day.css';

export default function UnifiedPlan({s,open,link,precheck,startTask,update,adjustment}){
 const active=s.tasks.filter(t=>!['完成','延期','取消','跳过'].includes(t.status)&&!t.completed);
 const undated=active.filter(t=>!t.due),review=active.filter(t=>t.status==='受阻'||(t.due&&t.due<localToday()));
 return <div className="unified-plan">
  <section className="plan-context" aria-label="当前目标与行动摘要">
   <div className="plan-context-main"><div className="plan-direction-heading"><h2>{s.goal?cname(s.goal):'先从独立探索开始'}</h2><span>{s.goal?'当前主目标':'方向未定'}</span></div><p className="plan-choice-reason">{s.decision.reason||'先了解工作内容，再用一次小实践验证自己的选择。'}</p><p className="plan-context-meta">备用方向：{s.backup?cname(s.backup):'未选择'}<span>计划 v{s.planVersion}</span></p><div className="plan-context-actions"><button onClick={()=>open('goal',{goal:s.goal||'data',backup:s.backup||'',reason:s.decision.reason})}>编辑目标并预览</button></div></div>
   <div className="plan-context-question"><h3>待验证的问题</h3><p>{s.decision.question||'还没有记录问题。可以先比较方向，或从一次有限实践开始。'}</p><nav aria-label="目标探索入口">{link('/careers?tab=比较','比较方向 →')}{link('/learning','预览学习实践 →')}</nav></div>
   <dl className="plan-context-records"><div><dt>待进行动</dt><dd><strong>{active.length}</strong><span>项</span>{link('/plan?tab=执行','进入执行 →')}</dd></div><div><dt>未排期</dt><dd><strong>{undated.length}</strong><span>项</span><a href="#schedule-undated">安排日期 →</a></dd></div><div><dt>需复查</dt><dd><strong>{review.length}</strong><span>项</span><a href="#schedule-overdue">查看原因 →</a></dd></div></dl>
  </section>
  <div className="plan-context-adjustment">{adjustment}</div>
  {s.taskDraft&&<div className="plan-draft-strip"><ControlIcon name="file"/><div><strong>有一份未开始的行动草稿</strong><span translate="no">{s.taskDraft.title}</span></div><button onClick={()=>open('precheck',s.taskDraft)}>恢复预检草稿</button></div>}
  <PlanSchedule s={s} update={update} link={link} open={open} precheck={precheck}/>
  <PlanStructureDisclosure s={s} update={update} precheck={precheck} startTask={startTask} link={link}/>
 </div>;
}
