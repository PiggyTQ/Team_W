import React from 'react';
import {useLanguage,displayPublicText} from './i18n/render';

/** Shared fields: regular task editor and discussion draft on the plan page. */
export default function TaskArrangementFields({draft,change,minHours=0.25,statuses=['待开始','进行中','受阻','延期']}){
 const en=useLanguage()==='en',tx=(z,e)=>en?e:z;
 return <div className="task-arrangement-fields" data-i18n="off"><label>{tx('本次范围','Scope')}<textarea aria-label={tx('本次范围','Scope')} value={draft.purpose||''} maxLength={4000} required onChange={e=>change('purpose',e.target.value)}/></label><div className="cols2"><label>{tx('预计投入（小时）','Estimated effort (hours)')}<input aria-label={tx('预计投入（小时）','Estimated effort (hours)')} type="number" min={minHours} max="168" step="0.25" value={draft.hours} onChange={e=>change('hours',e.target.value)}/></label><label>{tx('截止日期','Due date')}<input aria-label={tx('截止日期','Due date')} type="date" value={draft.due||''} onChange={e=>change('due',e.target.value)}/></label></div><label>{tx('安排后的状态','Status after adjustment')}<select aria-label={tx('安排后的状态','Status after adjustment')} value={draft.status} onChange={e=>change('status',e.target.value)}>{statuses.map(status=><option key={status} value={status}>{displayPublicText(status)}</option>)}</select></label></div>;
}
