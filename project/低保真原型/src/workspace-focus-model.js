import {careers,confirmed,usedHours} from './model.js';
import {educationFacts} from './completion-model.js';
import {confirmedResumeProfile} from './resume-content-model.js';
export function preparationState(s){
 const career=careers.find(c=>c.id===(s.assessmentCareer||s.goal))||careers[0],facts=confirmed(s);
 return {career,facts,related:facts.filter(c=>c.skill===career.skill),pending:s.claims.filter(c=>['待确认','疑似重复','矛盾'].includes(c.status)),contributions:facts.filter(c=>c.contribution?.trim()),reviews:s.reviews.length,education:educationFacts(s),profile:confirmedResumeProfile(s)};
}
export function previewPlanChange(s,d){
 const budget=Number(d.budget),valid=Number.isFinite(budget)&&budget>0&&budget<=168;
 let remaining=budget;
 const tasks=s.tasks.map(t=>{
  if(!valid||['完成','跳过','取消','延期'].includes(t.status))return t;
  if(Number(t.hours)<=remaining){remaining-=Number(t.hours);return t;}
  if(d.policy==='缩小后续任务范围'&&remaining>0){const next={...t,hours:remaining,standard:`缩范围草稿，待本人复核：${t.standard}`,scopeReview:true};remaining=0;return next;}
  return {...t,status:'延期'};
 });
 return {valid,stale:!!d.stale||d.base!==s.planVersion,beforeHours:usedHours(s),afterHours:valid?usedHours({...s,tasks}):null,tasks,changes:tasks.filter((t,i)=>t.status!==s.tasks[i].status||t.hours!==s.tasks[i].hours).length};
}
export function applyPlanChange(s,d){
 const result=previewPlanChange(s,d);
 if(result.stale)throw Error('基线已过期，请先重新预览，禁止覆盖新版本。');
 if(!result.valid)throw Error('预算应为 0 至 168 小时之间的正数。');
 if(d.goal&&!careers.some(c=>c.id===d.goal))throw Error('请选择有效目标，或保留独立探索。');
 return {...s,budget:Number(d.budget),goal:d.goal||null,tasks:result.tasks,planVersion:s.planVersion+1,scenario:null,proposal:null};
}
