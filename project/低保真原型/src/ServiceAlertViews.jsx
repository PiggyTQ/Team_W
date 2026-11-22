import React from 'react';
import {FollowTable} from './SkillFollowLesson';
import {alertRows,defaultAlertRule,evaluateAlert,validAlertRule} from './service-alert-model';
export const alertRule=(fields={},mode='lesson')=>Object.fromEntries(Object.entries(mode==='debug'?{threshold:5,minRequests:1,forMinutes:0}:defaultAlertRule).map(([k,v])=>[k,fields[k]??String(v)]));
export function readAlertRun(text,mode='lesson'){
 try{const run=JSON.parse(text);return validAlertRule(run.rule)?{rule:run.rule,prediction:typeof run.prediction==='string'?run.prediction.slice(0,32):'—',rows:evaluateAlert(alertRows(mode),run.rule)}:null;}catch{return null;}
}
export function AlertData({mode='lesson',language,selected,onSelect,showRates=false}){
 const en=language==='en',tx=(z,e)=>en?e:z;
 return <div className="alert-data">{onSelect&&<label>{tx('观察第几分钟','Observe minute')}<select aria-label={tx('观察分钟','Observation minute')} value={selected} onChange={e=>onSelect(e.target.value)}>{alertRows(mode).map(r=><option key={r.minute}>{r.minute}</option>)}</select></label>}<FollowTable caption={tx('原始分钟计数 · 缺测记NULL','Raw interval counts · missing = NULL')} columns={['min',tx('请求','Requests'),'5xx','CPU%','p95 ms',...(showRates?[tx('错误率%','Error%')]:[])]} rows={alertRows(mode).map(r=>[r.minute,r.requests,r.errors,r.cpu,r.p95,...(showRates?[r.rate]:[])])} highlight={r=>String(r[0])===String(selected)}/></div>;
}
export function AlertRuleEditor({rule,onChange,language}){
 const tx=(z,e)=>language==='en'?e:z;
 return <div className="alert-rule-inputs">{[['threshold',tx('错误率大于(%)','Error percentage greater than(%)')],['minRequests',tx('每分钟最少请求数','Minimum requests/min')],['forMinutes',tx('持续时间for(分钟)','Duration for(minutes)')]].map(([k,l])=><label key={k}>{l}<input type="number" aria-label={l} min={k==='minRequests'?1:0} max={k==='forMinutes'?5:k==='threshold'?100:10000} value={rule[k]} onChange={e=>onChange(k,e.target.value)}/></label>)}</div>;
}
export function AlertTimeline({rows,language}){
 const tx=(z,e)=>language==='en'?e:z,labels={inactive:tx('不满足','Inactive'),pending:tx('等待','Pending'),firing:tx('触发','Firing'),'low-traffic':tx('低样本','Low traffic'),unknown:tx('缺数','Unknown')};
 return <div className="alert-states" aria-label={tx('最近运行时间线','Last run timeline')}>{rows.map(r=><span key={r.minute} data-alert-state={r.state}>{r.minute} · {labels[r.state]}</span>)}</div>;
}
export function AlertBehaviorReview({rows,language}){
 const tx=(z,e)=>language==='en'?e:z;
 const cases=[['正常','Normal','1,3,11,12','inactive',rows.filter(r=>[1,3,11,12].includes(r.minute)).every(r=>r.state==='inactive')],['短峰','Spike','2',tx('不能触发','No firing'),rows[1]?.state!=='firing'],['持续异常','Sustained','4–7',tx('至少一次触发','At least one firing'),rows.slice(3,7).some(r=>r.state==='firing')],['恢复','Recovery','8','inactive',rows[7]?.state==='inactive'],['低样本','Low sample','9',tx('不触发；另行观察','No firing;inspect separately'),rows[8]?.state!=='firing'],['缺数','Missing','10','unknown',rows[9]?.state==='unknown']];
 return <FollowTable caption={tx('预期与最近运行对照 · 本教学任务约束','Expected versus last run · teaching constraints')} columns={[tx('情形 / 分钟','Case / minute'),tx('预期','Expected'),tx('实际','Actual'),tx('差异','Difference')]} rows={cases.map(([z,e,mins,expected,ok])=>[tx(z,e)+' '+mins,expected,rows.filter(r=>mins==='4–7'?r.minute>=4&&r.minute<=7:mins.split(',').includes(String(r.minute))).map(r=>r.minute+':'+r.state).join(' · '),ok?'✓':tx('需回查规则','Revisit rule')])} highlight={(_,i)=>!cases[i][4]}/>;
}
export function AlertReference({language}){
 const tx=(z,e)=>language==='en'?e:z;
 return <details className="alert-reference"><summary>{tx('共同资料：情境、定义、来源与运行边界','Shared reference:scenario,definitions,sources and limits')}</summary><p>{tx('学生上传附件。每行是完整一分钟区间计数；有效请求=到达服务的请求，坏请求=其中5xx，不涵盖所有超时、重试去重或业务失败。CPU为利用率，p95为该分钟95%请求不慢于的延迟(ms)，不是平均值。','Students upload attachments.Each row is a complete one-minute interval;requests reach the service and bad requests are5xx.This excludes uncounted timeouts,retry deduplication and business failures.CPU is utilization;p95 is the latency(ms)at or below which95% of requests fall,not the mean.')}</p><p>{tx('每分钟末评估，阈值严格大于。for从条件首次满足起计算经过时间；中断/缺数重置本模型计时。恢复即取消，未设keep_firing_for。低流量不代表安全，缺数不代表恢复。','Evaluate at minute-end using strict greater-than.For measures elapsed time from first true;false/missing resets this model timer.Recovery clears without keep_firing_for.Low traffic is not safety;missing is not recovery.')}</p><p>{tx('本站只模拟预聚合分钟数据，不运行完整PromQL，也不修改真实服务。真实rate/increase、抓取缺样和staleness需在目标Prometheus验证。此前promtool3.5规则测试仅覆盖预聚合输入及显式stale，不证明生产告警可靠性。','This simulates preaggregated minute data,not full PromQL,and changes no real service.Validate rate/increase,scrape gaps and staleness in your target Prometheus.Prior promtool3.5 tests covered preaggregated inputs and explicit stale only,not production reliability.')}</p><ul>{[['Google SRE monitoring','https://sre.google/sre-book/monitoring-distributed-systems/'],['Prometheus alerting rules','https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/'],['Prometheus rule tests','https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/']].map(([t,u])=><li key={u}><a href={u} target="_blank" rel="noreferrer">{t} ↗</a></li>)}</ul></details>;
}
