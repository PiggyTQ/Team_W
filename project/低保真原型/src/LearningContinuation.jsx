import React from 'react';
import {learningContinuation} from './site-quality-model';
export default function LearningContinuation({s,open,startTask}){
 const rows=learningContinuation(s);if(!rows.length)return null;
 return <section className="quality-surface learning-continuation" aria-label="继续已有学习"><header><h3>接着已有记录继续</h3><p>恢复上次打开的章节，或继续同一实践任务。阅读位置不代表已经学会。</p></header><div>{rows.map(({unit,chapter,task})=><article key={unit.id}><div><h4>{unit.title}</h4><p>{chapter===null?'已有相关实践任务':'上次打开第 '+(chapter+1)+' / '+unit.chapters.length+' 章：'+unit.chapters[chapter]}</p>{task&&<small>{task.title} · {task.status}</small>}</div><div className="quality-actions">{chapter!==null&&<button onClick={()=>open('reading',{template:unit.id,chapter})}>恢复这个阅读位置</button>}{task&&<button onClick={()=>startTask(task)}>{task.completed?'查看这次任务成果':['取消','延期','跳过'].includes(task.status)?'核对并恢复这项任务':'继续同一任务'}</button>}</div></article>)}</div></section>;
}
