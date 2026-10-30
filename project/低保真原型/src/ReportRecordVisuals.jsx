import React from 'react';
import {reportVisual} from './visual-records-model';
import ControlIcon from './ControlIcon';
import {cname} from './model';

export function ReportRecordFlow({s,link,choose,onLibrary}){
 const data=reportVisual(s);
 return <nav className="report-record-flow" aria-label="报告记录关系">
  {link('/careers?tab=比较',<><span>方向选择</span><strong>{s.goal?cname(s.goal):'尚未确定'}</strong><small>查看比较与选择理由</small><ControlIcon name="arrow" size={16}/></>,'report-record-node')}
  <button type="button" className="report-record-node" onClick={()=>choose('evidence')}><span>经历依据</span><strong>{data.materials[0].count}<small> 项本人确认</small></strong><small>查看材料与待核对项</small><ControlIcon name="arrow" size={16}/></button>
  <button type="button" className="report-record-node" onClick={()=>choose('action')}><span>行动记录</span><strong>{data.actionTotal}<small> 项任务</small></strong><small>查看实际提交与状态</small><ControlIcon name="arrow" size={16}/></button>
  <button type="button" className="report-record-node" onClick={onLibrary}><span>保存快照</span><strong>{data.saved}<small> 个版本</small></strong><small>查看已保存报告</small><ControlIcon name="arrow" size={16}/></button>
 </nav>;
}

export default function ReportRecordVisuals({s,only}){
 const data=reportVisual(s);
 return <div className={'report-record-charts'+(only?' is-single':'')}>
  {only!=='action'&&<figure className="report-material-chart"><header><h3>材料状态分布</h3><span>{data.materialTotal} 项记录</span></header>
   <div className="record-material-track" role="img" aria-label={data.materials.map(g=>g.label+' '+g.count+' 项').join('；')}>
    {data.materials.filter(g=>g.count>0).map(g=><span key={g.id} className={'record-material-segment '+g.id} style={{width:g.count/data.materialTotal*100+'%'}}/>)}
   </div>
   <dl className="record-material-legend">{data.materials.map(g=><div key={g.id}><dt><i className={g.id}/>{g.label}</dt><dd>{g.count}</dd></div>)}</dl>
   <figcaption>{data.materialTotal?'材料数量表示记录分布，不表示能力水平。':'暂无材料记录，可从已有经历开始整理。'}</figcaption>
  </figure>}
  {only!=='evidence'&&<figure className="report-action-chart"><header><h3>行动状态分布</h3><span>{data.actionTotal} 项任务</span></header>
   <div className="record-columns" role="img" aria-label={data.actions.map(g=>g.label+' '+g.count+' 项').join('；')}>
    {data.actions.map(g=><div className="record-column" key={g.id} style={{'--record-share':g.count/data.actionMax}}><div className="record-column-track"><i className={g.id}/><span>{g.count}</span></div><span>{g.label}</span></div>)}
   </div>
   <figcaption>{data.actionTotal?<>已提交 {data.submissions} 个版本；状态不代表能力核验。</>:'暂无任务记录，未生成未来成果或进度。'}</figcaption>
  </figure>}
 </div>;
}
