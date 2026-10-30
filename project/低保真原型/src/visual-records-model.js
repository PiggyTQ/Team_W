import {usedHours} from './model.js';

const stopped=['完成','取消','跳过','延期'];
export function budgetVisual(s){
 const tasks=s.tasks.filter(t=>!stopped.includes(t.status)),used=usedHours(s),budget=Number(s.budget),known=Number.isFinite(budget)&&budget>0;
 const scale=known?Math.max(used,budget):null;
 return {tasks,used,budget,known,scale,over:known&&used>budget,remaining:known?Math.max(0,budget-used):null,
  excess:known?Math.max(0,used-budget):null,budgetPosition:known?budget/scale:null,
  segments:tasks.map(t=>({id:t.id,title:t.title,hours:Number(t.hours),share:known?Number(t.hours)/scale:null}))};
}

// Mutually exclusive record counts. These are neither ability nor completion scores.
export function reportVisual(s){
 const confirmed=s.claims.filter(c=>c.status==='已确认').length,pending=s.claims.filter(c=>['待确认','疑似重复','矛盾'].includes(c.status)).length;
 const materials=[{id:'confirmed',label:'本人确认',count:confirmed},{id:'pending',label:'待核对',count:pending},{id:'excluded',label:'未采用 / 已撤回',count:s.claims.length-confirmed-pending}];
 const states=[['waiting','待开始',['待开始']],['active','进行中',['进行中']],['blocked','受阻',['受阻']],['complete','已完成',['完成']],['stopped','暂缓 / 停止',['延期','取消','跳过']]];
 const actions=states.map(([id,label,statuses])=>({id,label,count:s.tasks.filter(t=>statuses.includes(t.status)).length}));
 const other=s.tasks.length-actions.reduce((n,g)=>n+g.count,0);if(other)actions.push({id:'other',label:'其他状态',count:other});
 return {materials,materialTotal:s.claims.length,actions,actionTotal:s.tasks.length,actionMax:Math.max(1,...actions.map(g=>g.count)),
  submissions:s.tasks.reduce((n,t)=>n+(t.attempts?.length||0),0),saved:s.reports.length};
}
