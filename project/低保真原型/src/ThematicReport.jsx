import React from 'react';
import {reportRows} from './alignment-model';
import {groupReportRows,reportPanelSlot} from './report-theme-model';

export default function ThematicReport({body,activeId,all=false,idPrefix='report-section-'}){
 const rows=reportRows(body),groups=groupReportRows(rows),shown=all?groups:groups.filter(g=>g.id===(activeId||groups[0]?.id));
 return <div className="thematic-report" aria-label="报告主题排版">{shown.map(g=><section className="report-topic-spread" data-theme={g.id} key={g.id} aria-label={g.title}><header className="report-topic-intro"><span aria-hidden="true">{String(groups.findIndex(x=>x.id===g.id)+1).padStart(2,'0')}</span><div><h4>{g.title}</h4><p>{g.description}</p></div></header><div className="report-topic-panels">{g.rows.map(row=><section id={idPrefix+rows.findIndex(r=>r.id===row.id)} data-chapter={row.id} className="report-topic-panel" data-density={row.text.length>260?"long":"short"} data-slot={g.rows.find(r=>r.title===row.title)?.id===row.id?reportPanelSlot(row.title):"extra"} key={row.id}><h5>{row.title}</h5><p>{row.text.includes('：')?row.text.slice(row.text.indexOf('：')+1):row.text}</p></section>)}</div><details className="report-topic-original"><summary>查看本板块章节原文 · {g.rows.length} 项</summary>{g.rows.map(row=><p key={row.id}>{row.text}</p>)}</details></section>)}</div>;
}
