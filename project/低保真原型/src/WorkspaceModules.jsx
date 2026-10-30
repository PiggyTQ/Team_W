import React from 'react';
import {careers,learning,cname,confirmed} from './model';
import {validCompareIds} from './site-quality-model';
import {pendingMaterials} from './workspace-guidance';
import {profileInsights} from './profile-insights-model';
import HomeCapabilityIcon from './HomeCapabilityIcon';

export function HomeEntryMetrics({link}){
 const entries=[
  {id:'explore',title:'可探索的职业',value:careers.length,unit:'个 IT 方向',to:'/careers'},
  {id:'learning',title:'可预览的实践',value:learning.length,unit:'个原创内容模板',to:'/learning'},
  {id:'reports',title:'可以整理的成果',value:'报告 / 简历',unit:'从本人确认材料开始',to:'/reports'}
 ];
 return <nav className="home-available-index" aria-label="可用内容与成果">{entries.map(entry=>React.cloneElement(link(entry.to,<>
  <HomeCapabilityIcon name={entry.id} size={30}/><span><span className="available-index-label">{entry.title}</span><span className="available-index-value"><strong>{entry.value}</strong><span>{entry.unit}</span></span></span><span className="available-index-arrow" aria-hidden="true">→</span>
 </>),{key:entry.id}))}</nav>;
}

export function HomeActionContext({s,task,fresh}){
 return <aside className="home-action-context" aria-label="当前行动准备"><HomeCapabilityIcon name={task?'plan':'preparation'} size={44}/>
  <h3>{task?'这项行动的记录':fresh?'经历可以这样整理':'确认后的材料可以复用'}</h3>
  {task?<dl><div><dt>预计投入</dt><dd>{task.hours} 小时</dd></div><div><dt>已有尝试</dt><dd>{task.attempts?.length||0} 个版本</dd></div><div><dt>关联材料</dt><dd>{s.claims.filter(c=>c.taskId===task.id).length} 项</dd></div></dl>:<ol>{(fresh?['背景与目标','本人行动与贡献','结果与产物']:['核对原文与本人贡献','对照职业任务与要求','整理报告与岗位表达']).map(text=><li key={text}>{text}</li>)}</ol>}
  <p>{task?'预计投入不代表实际耗时。':'保存为候选后，再逐项确认。'}</p>
 </aside>;
}

export function HomeWeekSummary({s,link}){
 const rank={'受阻':0,'进行中':1,'待开始':2},tasks=s.tasks.filter(t=>Object.hasOwn(rank,t.status)).sort((a,b)=>rank[a.status]-rank[b.status]).slice(0,2);
 const samples=[...learning.filter(item=>item.career===s.goal),...learning].filter((item,index,all)=>all.findIndex(other=>other.id===item.id)===index).slice(0,2);
 return <div className="home-week-summary"><h3>{tasks.length?'当前行动':'可先预览'}</h3><ul>{tasks.length?tasks.map(task=><li key={task.id}>{link('/plan?tab=执行&task='+encodeURIComponent(task.id),<><span className="week-entry-title" translate="no">{task.title}</span><small>{task.status} · {task.hours} 小时预计投入</small></>)}</li>):samples.map(item=><li key={item.id}>{link('/learning?tab=短体验&unit='+item.id,<><span className="week-entry-title">{item.title}</span><small>{item.hours} 小时预计投入 · 先预览</small></>)}</li>)}</ul></div>;
}

export default function WorkspaceModules({s,link,open,showDetail}){
 const facts=confirmed(s),pending=pendingMaterials(s),{recorded}=profileInsights(s),selected=validCompareIds(s.compare);
 const active=s.tasks.filter(task=>['待开始','进行中','受阻'].includes(task.status));
 const reading=Object.keys(s.reading||{}).find(id=>learning.some(item=>item.id===id)),readItem=learning.find(item=>item.id===reading);
 const latest=s.reports.at(-1),goal=careers.find(c=>c.id===s.goal);
 return <>
  <div className="home-capability-layout">
   <section className="home-complete-board home-growth-board" aria-labelledby="home-growth-heading">
    <header className="complete-board-heading"><div><h2 id="home-growth-heading">准备与行动</h2><p>{recorded} / 4 类信息有记录 · 非能力评分</p></div><button type="button" data-workspace-detail="preparation" aria-haspopup="dialog" onClick={()=>showDetail('preparation')}>准备概览 <span aria-hidden="true">→</span></button></header>
    <div className="home-capability-grid">
     <section className="home-capability" aria-labelledby="capability-preparation"><span className="capability-art tone-preparation"><HomeCapabilityIcon name="preparation" size={38}/></span><div><h3 id="capability-preparation">我的准备</h3><p>{pending.length?<>{pending.length} 项待核对 · {facts.length} 项本人确认</>:facts.length?<>{facts.length} 项本人确认材料，可继续核对准备缺口。</>:'把已有经历整理成材料，再查看依据与未知。'}</p><div className="capability-actions">{link(pending.length?'/assessment?tab=原文确认':'/assessment?tab=准备总览',pending.length?'核对已有材料 →':'查看准备总览 →')}{!facts.length&&link('/assessment?tab=资料经历','添加经历')}</div></div></section>
     <section className="home-capability" aria-labelledby="capability-learning"><span className="capability-art tone-learning"><HomeCapabilityIcon name="learning" size={38}/></span><div><h3 id="capability-learning">学习实践</h3><p>{readItem?<span>已保存阅读位置：<span translate="no">{readItem.title}</span></span>:'从短体验到综合项目，先看范围、基础与交付物。'}</p><div className="capability-actions">{readItem?<button type="button" onClick={()=>open('reading',{template:reading,chapter:s.reading[reading]?.chapter||0})}>继续已保存阅读 →</button>:link('/learning','预览学习内容 →')}{link('/learning?tab=综合项目','综合项目')}</div></div></section>
     <section className="home-capability" aria-labelledby="capability-plan"><span className="capability-art tone-plan"><HomeCapabilityIcon name="plan" size={38}/></span><div><h3 id="capability-plan">目标计划</h3><p>{active.length?<>{active.length} 项待进行动 · {s.goal?cname(s.goal):'可独立探索'}</>:'把待验证的问题，变成每周预算内的具体行动。'}</p><div className="capability-actions">{link('/plan','安排与推进 →')}<button type="button" data-workspace-detail="actions" aria-haspopup="dialog" onClick={()=>showDetail('actions')}>行动状态</button></div></div></section>
     <section className="home-capability" aria-labelledby="capability-assistant"><span className="capability-art tone-assistant"><HomeCapabilityIcon name="assistant" size={38}/></span><div><h3 id="capability-assistant">AI 工作台</h3><p>讨论方向、拆解准备问题；当前为模拟咨询，行动由你确认。</p><div className="capability-actions">{link('/assistant','开始讨论 →')}{link('/assistant?tab=自然语言检索','知识检索')}</div></div></section>
    </div>
    <div className="home-tools-lane"><HomeCapabilityIcon name="map" size={26}/><span>看清职业联系与技能先后</span>{link('/career-map','职业与技能地图 →')}</div>
   </section>
   <section className="home-complete-board home-career-board" aria-labelledby="home-career-heading">
    <header className="complete-board-heading"><div><h2 id="home-career-heading">探索职业方向</h2><p>{goal?<>当前目标：{goal.name}</>:'从日常工作、所需技能和典型产物开始。'}</p></div><span className="career-board-symbol"><HomeCapabilityIcon name="explore" size={48}/></span></header>
    <nav className="home-direction-grid" aria-label="十个职业方向">{careers.map(c=>React.cloneElement(link('/careers?career='+c.id,<><span>{c.name}</span><span aria-hidden="true">↗</span></>),{key:c.id,'aria-current':s.goal===c.id?'true':undefined}))}</nav>
    <footer className="home-career-footer"><p>{selected.length?<>{selected.length} 个方向在比较候选中</>:'了解和比较方向，不会自动更改主目标。'}</p><div>{link(selected.length>=2?'/careers?tab=比较':'/careers',selected.length>=2?'继续方向比较 →':'选择方向进行比较 →')}{link('/careers?tab=企业与岗位','企业与岗位')}</div></footer>
   </section>
  </div>
  <section className="home-complete-board home-output-board" aria-labelledby="home-output-heading">
   <header className="complete-board-heading"><div><h2 id="home-output-heading">成果与求职</h2><p>把准备与行动，整理成可以继续使用的材料。</p></div><button type="button" data-workspace-detail="records" aria-haspopup="dialog" onClick={()=>showDetail('records')}>材料与产出 <span aria-hidden="true">→</span></button></header>
   <div className="home-output-lanes">
    <section><span className="output-lane-art tone-reports"><HomeCapabilityIcon name="reports" size={42}/></span><div><h3>职业报告</h3><p>{latest?<><span>已保存 {s.reports.length} 个版本</span><span className="output-record-title" translate="no">{latest.title}</span></>:'记录方向选择、行动成果与实践复盘。'}</p>{link(latest?'/reports/'+encodeURIComponent(latest.id):'/reports',latest?'打开保存版本 →':'查看报告结构 →')}</div></section>
    <section><span className="output-lane-art tone-learning"><HomeCapabilityIcon name="preparation" size={42}/></span><div><h3>岗位简历</h3><p>{s.resumes.length?<>{s.resumes.length} 个已保存版本，按目标组织岗位表达。</>:'选择确认过的经历，制作通用或岗位简历。'}</p>{link('/reports?tab=岗位简历','进入简历工作台 →')}</div></section>
    <section><span className="output-lane-art tone-preparation"><HomeCapabilityIcon name="opportunities" size={42}/></span><div><h3>我的机会</h3><p>{s.jobs.length?<>{s.jobs.length} 份本人研究卡，准备与实际求职事件分别保留。</>:'研究岗位要求，跟进准备与本人求职进展。'}</p>{link('/careers?tab=我的机会','查看我的机会 →')}</div></section>
   </div>
  </section>
 </>;
}
