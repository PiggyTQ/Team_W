import React from 'react';
import {completionReadiness} from './site-quality-model';
export function TaskDeliveryGuide({task,link}){
 const latest=task.attempts?.at(-1);
 return <aside className="quality-surface task-delivery-guide" aria-label="交付标准与已有反馈"><h3>交付要求</h3><p translate="no">{task.standard}</p>{task.deliveryNote&&<p translate="no">{task.deliveryNote}</p>}<section><h4>最近提交</h4>{latest?<><p>最近提交 v{latest.version} · {latest.result}</p>{latest.feedback?<p translate="no">{latest.feedback}</p>:<p>该版本尚无反馈记录。</p>}<details><summary>查看该版本产物</summary><p translate="no">{latest.text}</p></details></>:<p>暂无提交版本。可先保存草稿，完成后再提交。</p>}</section><section><h4>说明自己的实际贡献</h4><p>把做法、本人负责的部分、参考与辅助来源、尚未验证的限制分开记录。</p></section>{link('/work/'+encodeURIComponent(task.id)+'?tab=完成回执','查看本次完成条件 →')}</aside>;
}
export function TaskReadiness({s,task,link}){
 const rows=completionReadiness(s,task),missing=rows.filter(r=>!r.done);
 return <section className="quality-surface task-readiness" aria-label="本次完成条件"><header><h3>{task.completed?'本次任务范围已记录完成':missing.length?'待完成条件':'所需记录已齐，可确认完成'}</h3><p>只核对本次任务记录。自检与完成都不代表独立能力认证。</p></header><ul>{rows.map(r=><li key={r.id}><div><h4>{r.title}</h4><p>{r.detail}</p></div><span className="status-chip">{r.done?'已有记录':'待处理'}</span>{!r.done&&(r.local?<button onClick={()=>{const el=document.getElementById('task-standard-confirmation');el?.scrollIntoView({block:'center'});el?.focus({preventScroll:true});}}>去核对标准</button>:link(r.to,'补充记录 →','button'))}</li>)}</ul></section>;
}
