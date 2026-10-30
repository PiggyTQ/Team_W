import React from 'react';
import {budgetVisual} from './visual-records-model';
import {taskRoute} from './flow-navigation';
import ControlIcon from './ControlIcon';
const amount=n=>Number(n.toFixed(2));
export default function BudgetCapacity({s,compact=false,link}){
 const {used,budget,known,over,tasks,scale,segments,budgetPosition}=budgetVisual(s);
 return <div className={`budget-capacity ${compact?'capacity-compact':''}`} data-state={!known?'unknown':over?'over':'available'}>
  <div className="capacity-header"><div><span>已安排</span><strong>{used}<small> 小时</small></strong></div><div><span>本周总预算</span><strong>{known?budget:'未定'}{known&&<small> 小时</small>}</strong></div></div>
  <div className="capacity-plot">
   {known?<><div className="capacity-scale" aria-hidden="true"><span>0h</span><span>{amount(scale)}h</span></div><div className="capacity-rail" role="meter" aria-label="本周预计投入与预算" aria-valuemin={0} aria-valuemax={budget} aria-valuenow={Math.min(used,budget)} aria-valuetext={`预计已安排${used}小时，总预算${budget}小时${over?'，已超预算':''}`}>{segments.map((part,i)=><span className="capacity-segment" key={part.id} aria-hidden="true" style={{width:part.share*100+'%','--segment-ink':['#323232','#747474','#a0a0a0'][i%3]}}/>)}{over&&<i className="capacity-budget-marker" aria-hidden="true" style={{left:budgetPosition*100+'%'}}/>}</div>{over&&<p className="capacity-over-label">预算位置：{budget} 小时</p>}</>:<div className="capacity-unknown">预算未定，暂不显示分配比例</div>}
  </div>
  <div className="capacity-legend"><span><i/>{known?'预计已安排':'预计投入'}</span><span>{!known?'预算未定':over?<>超出 <strong>{amount(used-budget)}</strong> 小时</>:<>可安排 <strong>{amount(budget-used)}</strong> 小时</>}</span></div>
  {!compact&&<><p className="capacity-note">预计投入，不代表实际学习时长。</p><details className="capacity-ledger"><summary><ControlIcon name="route" size={16}/><span>查看预计投入明细</span><span className="capacity-task-count">{tasks.length} 项任务</span><ControlIcon name="chevron" size={15}/></summary><div><p className="capacity-detail-note">{!known?'先设预算；未知不显示可行。':tasks.length?'每段对应一项活动任务，宽度按预计投入计算。':'当前没有计入预算的活动任务。'}</p>{tasks.map((t,i)=><div className="capacity-task" key={t.id}><i aria-hidden="true" style={{background:['#323232','#747474','#a0a0a0'][i%3]}}/>{link?link(taskRoute(s,t),t.title):<span>{t.title}</span>}<span>{t.hours}h</span></div>)}</div></details></>}
 </div>;
}
