import React from 'react';
import {PageIntroduction} from './PageGuidance';
import { flowNavigation } from './flow-navigation';

export default function AssistantPageHeader({ s, tab = '', link, compact=false }) {
  const flow = flowNavigation(s, '/assistant', tab);
  const actions=flow&&<nav aria-label="AI 工作台页面操作">{link(flow.back.to, '返回原工作页', 'button')}{link(flow.next.to, tab === '自然语言检索' ? '查看职业目录' : '前往目标计划', 'button primary')}</nav>;
  return <header className="assistant-page-header"><div><h1>AI 工作台</h1><PageIntroduction title="AI 工作台" description="讨论职业方向、分析准备差距，或一起调整学习与项目计划。"/></div>{actions&&(compact?<details className="assistant-route-menu"><summary>页面操作</summary>{actions}</details>:actions)}</header>;
}
