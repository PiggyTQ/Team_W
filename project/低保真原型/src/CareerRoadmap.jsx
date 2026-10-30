import React from 'react';
import {roadmapPhases} from './career-roadmaps';
import './career-roadmaps.css';

export default function CareerRoadmap({roadmap,node,visible,onSelect}){
 const ids=new Set(visible.map(n=>n.id)),byId=new Map(roadmap.nodes.map(n=>[n.id,n]));
 return <div className="career-roadmap">
  <header><h2>{roadmap.title}</h2><p>{roadmap.description}</p></header>
  <div className="roadmap-stage-labels" aria-hidden="true">{roadmapPhases.map(p=><span key={p.id}>{p.stage}<small>{p.title}</small></span>)}</div>
  <div className="roadmap-network" role="group" aria-label={roadmap.title+'，按节点查看内容'}>
   <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{roadmap.edges.filter(([from,to])=>ids.has(from)&&ids.has(to)).map(([from,to])=>{
    const a=byId.get(from),b=byId.get(to),active=node?.id===from||node?.id===to;
    const d=a.x===b.x?`M${a.x} ${a.y} C${a.x-4} ${a.y} ${b.x-4} ${b.y} ${b.x} ${b.y}`:`M${a.x} ${a.y} C${a.x+15} ${a.y} ${b.x-14} ${b.y} ${b.x} ${b.y}`;
    return <path key={from+to} className={active?'is-active':''} d={d}/>;
   })}</svg>
   {visible.map(n=><button key={n.id} type="button" className={'roadmap-node '+(node?.id===n.id?'is-selected':'')} data-roadmap-node={n.id} data-roadmap-stage={n.stage} style={{'--node-x':n.x+'%','--node-y':n.y+'%'}} aria-label={`${n.stage}：${n.title}，${n.topics.join('、')}`} aria-pressed={node?.id===n.id} onClick={()=>onSelect(n.id)}><span className="roadmap-node-dot" aria-hidden="true"/><span className="roadmap-node-label">{n.title}<small>{n.topics.slice(0,2).join(' · ')}</small></span></button>)}
  </div>
  <p className="roadmap-reading-note">连线表示建议学习顺序；点选主题可查看内容和小实践，不表示个人进度。</p>
 </div>;
}

export function RoadmapSources({roadmap}){
 return <details className="roadmap-sources"><summary>来源与编排说明 <span>{roadmap.sources.length} 项公开资料</span></summary><p>主题参考下列公开资料，由本产品整理为学习路径；连线和小实践为原创编排，不是认证条件或唯一职业标准。工具按场景选用，个人差距仍需具体材料。</p><ul>{roadmap.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M6 3H3v10h10v-3M8 3h5v5M7 9l6-6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></a><span>{source.scope}</span></li>)}</ul><small>资料核对：{roadmap.reviewed}。打开外部资料不会标记学习完成或自动生成本人能力结论。</small></details>;
}
