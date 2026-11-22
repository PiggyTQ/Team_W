// Original synthetic interval counts. One evaluation at each minute-end.
export const alertCases={lesson:{name:['上传服务 · 看清短峰与持续异常','Upload service · spike versus sustained impact'],scale:1,shift:0},guided:{name:['图片上传 · 跟随应用','Image upload · guided'],scale:2,shift:1},debug:{name:['报告导出 · 排查噪声','Report export · diagnose noise'],scale:1,shift:2},independent:{name:['附件提交 · 独立任务','Attachment submission · independent'],scale:3,shift:3},check:{name:['作业提交 · 新情境检验','Assignment submission · transfer check'],scale:2,shift:4}};
export function alertRows(mode='lesson'){
 const c=alertCases[mode]||alertCases.lesson;
 const rates={lesson:[8,6,7,8,6],guided:[9,7,8,9,7],debug:[12,8,9,10,8],independent:[10,6,9,10,7],check:[6,9,8,10,7]}[mode]||[8,6,7,8,6];
 const counts=[[1000,10,42,180],[1000,rates[0]*10,94,210],[1000,10,45,180],[1000,rates[1]*10,61,460],[1000,rates[2]*10,68,570],[1000,rates[3]*10,70,630],[1000,rates[4]*10,65,490],[1000,10,44,185],[10,1,39,190],[null,null,null,null],[1000,10,43,180],[1000,10,42,180]];
 return counts.map(([n,b,cpu,p95],i)=>({minute:i+1,requests:n==null?null:n*c.scale,errors:b==null?null:b*c.scale,cpu,p95,rate:n==null?null:100*b/n}));
}
export const defaultAlertRule={threshold:5,minRequests:100,forMinutes:2};
export function validAlertRule(r){return !!r&&['threshold','minRequests','forMinutes'].every(k=>(typeof r[k]==='number'||typeof r[k]==='string')&&String(r[k]).trim()!==''&&Number.isFinite(+r[k]))&&+r.threshold>0&&+r.threshold<=100&&Number.isInteger(+r.minRequests)&&+r.minRequests>=1&&+r.minRequests<=10000&&Number.isInteger(+r.forMinutes)&&+r.forMinutes>=0&&+r.forMinutes<=5;}
export function evaluateAlert(rows,rule){
 if(!validAlertRule(rule))return [];
 let start=null;
 return rows.map(row=>{const missing=row.requests===null||row.errors===null;const active=!missing&&row.requests>=+rule.minRequests&&row.rate>+rule.threshold;
  if(!active)start=null;else if(start===null)start=row.minute;
  return {...row,active,state:missing?'unknown':row.requests<+rule.minRequests?'low-traffic':!active?'inactive':row.minute-start>=+rule.forMinutes?'firing':'pending'};});
}
export function alertTaskCheck(mode,fields){
 const rule={threshold:fields.threshold,minRequests:fields.minRequests,forMinutes:fields.forMinutes};
 const rows=evaluateAlert(alertRows(mode),rule),issues=[];
 if(!validAlertRule(rule))issues.push('rule');
 if(fields.rate===''||fields.rate===undefined||!Number.isFinite(+fields.rate)||Math.abs(+fields.rate-alertRows(mode)[1].rate)>.001)issues.push('rate');
 const firing=rows.find(r=>r.state==='firing')?.minute;
 if(String(firing??'none')!==fields.first)issues.push('first');
 if(fields.missing!=='unknown')issues.push('missing');
 if(!rows.length||rows[1].state==='firing'||!rows.slice(3,7).some(r=>r.state==='firing')||rows[8].state==='firing')issues.push('behavior');
 return {kind:'alert-simulation',passed:issues.length===0,issues};
}
export const alertFeedback={rule:['规则需为0–100%的有效阈值、正整数请求下限、0–5分钟持续时间。','Use a valid percentage threshold,positive request minimum and0–5 minute duration.'],rate:['第2分钟：按本任务坏请求÷有效请求×100重新计算；不要用CPU作分母。','At minute2:recompute bad/valid requests×100 for this task;CPU is not the denominator.'],first:['按当前规则逐分钟核对首次firing；for=2m从首次满足起等待两分钟，三个相邻评估点才触发。','Trace first firing under your rule;for=2m waits two elapsed minutes,requiring three adjacent evaluation points.'],missing:['第10分钟没有观测，标记unknown；不能填成0%或服务恢复。','Minute10 has no observation:unknown,not0% or recovery.'],behavior:['约束：不因第2分钟短峰或第9分钟低样本触发；第4–7分钟持续异常内必须触发。可有多种合格规则。','Constraints:no firing for the minute2 spike or minute9 low sample;fire during sustained minutes4–7. Multiple rules can qualify.']};
