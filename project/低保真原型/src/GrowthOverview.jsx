import React from 'react';
import BudgetCapacity from './BudgetCapacity';
import { confirmed } from './model';

export function BudgetVisual({ s }) {
  return <BudgetCapacity s={s}/>;
}

export default function GrowthOverview({ s, link }) {
  const pending=s.claims.filter(c=>['待确认','疑似重复','矛盾'].includes(c.status)).length;
  const attempts=s.tasks.reduce((n,t)=>n+t.attempts.length,0);
  return <section className="growth-overview" aria-label="当前成长记录概览"><div className="growth-records"><h2>我的材料、任务与复盘</h2><p>查看已确认的经历、进行中的任务和复盘记录，决定接下来要补充什么。</p><div>{link('/assessment?tab=原文确认',<><strong>{confirmed(s).length}</strong><span>本人确认材料</span><small>{pending} 项待处理</small></>)}{link('/plan?tab=执行',<><strong>{s.tasks.filter(t=>t.status==='进行中'&&!t.completed).length}</strong><span>进行中行动</span><small>{attempts} 份提交版本</small></>)}{link('/plan?tab=复盘',<><strong>{s.reviews.length}</strong><span>本人复盘记录</span><small>不是能力增长分数</small></>)}</div></div><div><BudgetVisual s={s}/>{link('/plan?tab=执行&view=calendar','查看周日程与未排期任务 →')}</div></section>;
}
