import {uid,confirmed} from './model.js';
import {profileSnapshotUnavailable} from './resume-content-model.js';
import {claimSnapshotsUnavailable} from './reference-contract.js';
export const defaultLearningStages=[{id:'prepare',name:'理解与准备'},{id:'practice',name:'小范围实践'},{id:'reflect',name:'复盘与表达'}];
export const educationFacts=s=>(s.education||[]).filter(e=>e.status==='已确认');
export function saveEducation(s,d){
 if(!d.school?.trim())throw Error('请填写学校；不清楚的其他信息可以留空。');
 if(d.start&&d.end&&d.end<d.start)throw Error('结束时间不能早于开始时间。');
 if(!d.confirmed)throw Error('请核对教育事实并勾选本人确认。');
 const prior=(s.education||[]).find(x=>x.id===d.id);
 if(prior&&prior.version!==d.version)throw Error('教育记录已变化，请重新打开。');
 const record={id:prior?.id||uid('education'),school:d.school.trim(),major:d.major?.trim()||'',degree:d.degree||'',courses:(d.courses||'').trim(),gpa:(d.gpa||'').trim(),ranking:(d.ranking||'').trim(),start:d.start||'',end:d.ongoing?'':d.end||'',ongoing:!!d.ongoing,status:'已确认',version:(prior?.version||0)+1,withdrawnThrough:prior?.withdrawnThrough||(prior?.status==='已撤回'?prior.version-1:0),history:prior?[...(prior.history||[]),{...prior,history:undefined}]:[],date:new Date().toISOString()};
 return {...s,education:prior?s.education.map(e=>e.id===prior.id?record:e):[...(s.education||[]),record],profileVersion:s.profileVersion+1,analysisStale:!!s.analysis};
}
export function withdrawEducation(s,id){return {...s,education:(s.education||[]).map(e=>e.id===id?{...e,status:'已撤回',withdrawnThrough:e.version,history:[...(e.history||[]),{...e,history:undefined}],version:e.version+1}:e),profileVersion:s.profileVersion+1,analysisStale:!!s.analysis};}
export function resumeUnavailable(s,r){return profileSnapshotUnavailable(s,r.profileSnapshot)||claimSnapshotsUnavailable(s,r)||(r.educationFacts||[]).some(e=>!educationFacts(s).some(x=>x.id===e.id&&e.version>(x.withdrawnThrough||0)));}
export function placementError(s,t,d){
 const tasks=s.tasks,stages=s.learningStages||defaultLearningStages,deps=d.dependsOn||[];
 if(d.learningStage&&!stages.some(x=>x.id===d.learningStage))return '请选择有效阶段。';
 if(!['未排序','高','中','低'].includes(d.priority))return '请选择有效优先级。';
 if(!d.placementReason?.trim())return '请说明阶段与优先级的理由。';
 if(deps.some(id=>id===t.id||!tasks.some(x=>x.id===id)))return '依赖任务不存在或引用了自身。';
 const all=tasks.map(x=>x.id===t.id?{...x,...d}:x),visiting=new Set(),done=new Set();
 const visit=id=>{if(visiting.has(id))return true;if(done.has(id))return false;visiting.add(id);const cyc=(all.find(x=>x.id===id)?.dependsOn||[]).some(visit);visiting.delete(id);done.add(id);return cyc;};
 if(all.some(x=>visit(x.id)))return '任务依赖形成循环，请调整。';
 const rank=id=>stages.findIndex(x=>x.id===id);
 if(all.some(x=>(x.dependsOn||[]).some(id=>{const p=all.find(y=>y.id===id);return x.learningStage&&p?.learningStage&&rank(p.learningStage)>rank(x.learningStage)})))return '依赖任务不能安排在后面的阶段。';
 return '';
}
export function savePlacement(s,id,d,base){const t=s.tasks.find(x=>x.id===id);if(!t||t.version!==base.task||s.planVersion!==base.plan)throw Error('任务或计划版本已变化，请重新打开。');const error=placementError(s,t,d);if(error)throw Error(error);return {...s,tasks:s.tasks.map(x=>x.id===id?{...x,...d,version:x.version+1}:x),planVersion:s.planVersion+1,scenario:null,proposal:null};}
export const dependencyBlock=(s,t)=>(t.dependsOn||[]).some(id=>!s.tasks.some(x=>x.id===id&&x.completed&&x.status==='完成'));
export const jdRequirements=job=>job?.text?.split(/[\n；;。]+/).map(t=>t.trim()).filter(Boolean)||[];

export function tailoringError(job,facts,value={}){
 const rows=Object.values(value.rows||{});
 if(rows.length&&(!job||value.jobText!==job.text))return '岗位原文已变化，请重新逐项关联事实。';
 for(const row of rows){
  if((row.claimIds||[]).some(id=>!facts.some(c=>c.id===id&&c.status==='已确认'&&row.claimRefs?.[id]===c.version)))return '岗位表达引用的事实已变化，请重新关联并确认。';
  if(row.wording?.trim()&&(!row.confirmed||!row.claimIds?.length))return '请逐项确认修改后的岗位表达，或清空未采用的表达。';
 }
 return '';
}
