import React from 'react';
import {taskCopy} from './native-task-copy.js';
import {useLanguage} from './i18n/render';
import {atlasReturn} from './atlas-history';
import './atlas-history.css';

export default function AtlasPracticeContext({task,link}){
 const language=useLanguage();
 const to=atlasReturn(task);if(!to)return null;
 const modern=new URL(to,'http://local').searchParams.has('skill');
 if(modern)return <aside className="atlas-task-context" aria-label={language==='en'?'Skill practice source':'技能练习来源'}>
   <div><span>{taskCopy(task,'title')}</span><small>{language==='en'?'Practice from the career skill tree':'职业技能树节点练习'}</small></div>
   {link(to,language==='en'?'Return to the skill →':'返回技能节点 →')}
 </aside>;
 if(!task.atlas)return <aside className="atlas-task-context" aria-label="地图实践来源"><div><span>{taskCopy(task,'title')}</span><small>历史地图任务 · 保留原有交付标准与成果；来源版本未登记。</small></div>{link(to,'返回这条地图路线 →')}</aside>;
 return <aside className="atlas-task-context" aria-label="地图实践来源"><div><span>{task.atlas.title}</span><small>地图来源 v{task.atlas.version} · {task.atlas.tool==='sheet'?'表格工具':task.atlas.tool==='sql'?'SQL':'原创合成实践'} · 原始路线与交付范围已保留</small></div>{link(to,'返回这条地图路线 →')}{task.atlas.steps?.length>0&&<details><summary>查看这次实践的步骤</summary><ol>{task.atlas.steps.map(step=><li key={step}>{step}</li>)}</ol></details>}</aside>;
}
