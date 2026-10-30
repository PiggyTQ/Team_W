import React from 'react';
import {atlasReturn} from './career-atlas-model';

export default function AtlasPracticeContext({task,link}){
 const to=atlasReturn(task);if(!to)return null;
 if(!task.atlas)return <aside className="atlas-task-context" aria-label="地图实践来源"><div><span>{task.title}</span><small>历史地图任务 · 保留原有交付标准与成果；来源版本未登记。</small></div>{link(to,'返回这条地图路线 →')}</aside>;
 const guide=new URL(to,'http://local');guide.searchParams.set('guide','tool');
 return <aside className="atlas-task-context" aria-label="地图实践来源"><div><span>{task.atlas.title}</span><small>地图来源 v{task.atlas.version} · {task.atlas.tool==='sheet'?'表格工具':task.atlas.tool==='sql'?'SQL':'原创合成实践'} · 原始路线与交付范围已保留</small></div>{link(to,'返回这条地图路线 →')}<details><summary>查看这次实践的步骤</summary><ol>{task.atlas.steps.map(step=><li key={step}>{step}</li>)}</ol>{task.atlas.caseId==='data-quality-v1'&&link(guide.pathname+guide.search,'查看本次工具样例 →')}</details></aside>;
}
