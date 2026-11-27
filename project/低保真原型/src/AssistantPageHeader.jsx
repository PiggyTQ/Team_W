import React from 'react';
import {PageIntroduction} from './PageGuidance';
import { flowNavigation } from './flow-navigation';

export default function AssistantPageHeader({ s, tab = '', link, compact=false }) {
  const flow = flowNavigation(s, '/assistant', tab);
  const actions=tab&&flow&&!s.conversations?.find(c=>c.id===s.conversationId)?.discussion&&<nav aria-label="AI 工作台页面操作">{link(flow.back.to, '返回原工作页', 'button')}{tab === '自然语言检索' && link('/careers', '查看职业目录', 'button')}</nav>;
  return <header className="assistant-page-header"><div><h1>AI 工作台</h1></div>{actions&&(compact?<details className="assistant-route-menu"><summary>页面操作</summary>{actions}</details>:actions)}</header>;
}
