import React from 'react';
import {confirmed,learning} from './model';
import {activeWorkspaceTask,pendingMaterials} from './workspace-guidance';

// This is a record index, not an assessment of ability or a completion score.
export default function HomeWorkOverview({s,link,open,Icon}){
 const materials=confirmed(s),pending=pendingMaterials(s),active=activeWorkspaceTask(s);
 const ongoing=s.tasks.filter(t=>!t.completed&&['待开始','进行中','受阻'].includes(t.status));
 const completed=s.tasks.filter(t=>t.completed||t.status==='完成');
 const latest=s.reports.at(-1),reading=Object.keys(s.reading).find(id=>learning.some(item=>item.id===id));
 const rows=[
  {id:'materials',icon:'user',title:'材料与依据',status:pending.length?<>{pending.length} 项待核对</>:materials.length?<>{materials.length} 项本人确认材料</>:'尚未整理经历',
   detail:pending[0]?.title||materials.at(-1)?.title||'课程项目、实习与自主作品都可以记录。',
   to:pending.length?'/assessment?tab=原文确认':'/assessment',label:pending.length?'核对材料 →':s.claims.length?'查看材料 →':'添加经历 →'},
  {id:'actions',icon:'plan',title:'行动与实践',status:ongoing.length?<>{ongoing.length} 项待推进</>:completed.length?<>{completed.length} 项已记录完成</>:'尚未安排行动',
   detail:active?.title||completed.at(-1)?.title||(s.tasks.length?'可以回到计划查看暂停或取消的行动。':'先预览范围、预计投入和交付物，再决定是否开始。'),
   to:s.tasks.length?'/plan?tab=执行':'/learning',label:s.tasks.length?'查看行动 →':'预览实践 →'},
  {id:'reports',icon:'file',title:'报告与复盘',status:latest?<>已保存 {s.reports.length} 个报告版本</>:s.reviews.length?<>{s.reviews.length} 项本人复盘</>:'尚未保存报告',
   detail:latest?.title||(s.reviews.length?'回看已经记录的结果、反馈与调整。':'整理选择理由与行动记录，保留阶段版本。'),
   to:latest?'/reports/'+encodeURIComponent(latest.id):s.reviews.length?'/plan?tab=复盘':'/reports',label:latest?'打开保存版本 →':s.reviews.length?'查看复盘 →':'查看报告结构 →'}
 ];
 return <section className="home-work-overview" aria-labelledby="home-records-title">
  <h2 id="home-records-title">准备与记录</h2>
  <div className="home-record-index">{rows.map(row=><div className="home-record-line" key={row.id} data-record={row.id}>
   <Icon name={row.icon} size={22}/><div className="home-record-copy"><div className="home-record-label"><h3>{row.title}</h3><span className="home-record-state">{row.status}</span></div><p>{row.detail}</p></div>{link(row.to,<><span>{row.label.slice(0,-2)}</span><Icon name="arrow" size={18}/></>,'home-record-link')}
  </div>)}</div>
  {reading&&<div className="home-reading-resume"><Icon name="book" size={20}/><div><span>继续上次阅读</span><p>{learning.find(item=>item.id===reading)?.title}</p></div><button onClick={()=>open('reading',{template:reading,chapter:s.reading[reading]?.chapter||0})}>继续阅读</button></div>}
 </section>;
}
