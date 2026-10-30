import React from 'react';
export default function PlanGoalContext({s,link}){
 return <div className="plan-goal-context"><h3>待验证的问题</h3><p>{s.decision.question||'还没有记录问题。可以先比较工作内容，或用一次小实践了解自己想继续探索什么。'}</p><nav aria-label="目标探索入口">{link('/careers?tab=比较','比较方向 →')}{link('/learning','选一次有限实践 →')}</nav></div>;
}
