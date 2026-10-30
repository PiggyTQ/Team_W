import {confirmed} from './model.js';
import {educationFacts,jdRequirements,tailoringError} from './completion-model.js';
import {reportRows,reportReferencesUnavailable} from './alignment-model.js';

export function resumeStudioDraft(s){
 const d=s.resumeStudioDraft||{},seed=s.resumeTarget||'',seedChanged=d.targetSeed!==undefined&&d.targetSeed!==seed;
 return {name:d.name||'',sourceResumeId:d.sourceResumeId||null,includeProfile:d.includeProfile!==false,placements:d.placements||{},target:seedChanged?seed:(d.target??seed),targetSeed:seed,claimIds:(d.claimIds??confirmed(s).map(c=>c.id)).filter(id=>confirmed(s).some(c=>c.id===id)),educationIds:(d.educationIds??educationFacts(s).map(e=>e.id)).filter(id=>educationFacts(s).some(e=>e.id===id)),tailoring:seedChanged?{}:(d.tailoring||{})};
}
export function orderedResumeFacts(s,d){const facts=confirmed(s);return [...d.claimIds.map(id=>facts.find(c=>c.id===id)).filter(Boolean),...facts.filter(c=>!d.claimIds.includes(c.id))];}
export function targetResumeStudio(s,target){
 const d=resumeStudioDraft(s);
 return {...s,resumeTarget:target,resumeStudioDraft:{...d,target,targetSeed:target,tailoring:d.target===target?d.tailoring:{}}};
}
export function selectResumeFact(d,id,selected){
 const ids=selected?[...new Set([...d.claimIds,id])]:d.claimIds.filter(x=>x!==id);
 const rows=Object.fromEntries(Object.entries(d.tailoring.rows||{}).map(([key,row])=>[key,!selected&&row.claimIds?.includes(id)?{...row,claimIds:row.claimIds.filter(x=>x!==id),wording:'',confirmed:false}:row]));
 return {...d,claimIds:ids,tailoring:{...d.tailoring,rows}};
}
export function toggleResumeRelation(s,d,index,claimId){
 const job=s.jobs.find(j=>j.id===d.target),facts=confirmed(s).filter(c=>d.claimIds.includes(c.id));
 if(!job||!jdRequirements(job)[index]||!facts.some(c=>c.id===claimId))return d;
 const current=d.tailoring.jobText===job.text?d.tailoring:{},row=current.rows?.[index]||{},ids=row.claimIds||[];
 return {...d,tailoring:{...current,jobText:job.text,rows:{...current.rows,[index]:{...row,claimIds:ids.includes(claimId)?ids.filter(id=>id!==claimId):[...ids,claimId],claimRefs:Object.fromEntries(facts.map(c=>[c.id,c.version])),wording:'',confirmed:false}}}};
}
export function resumeRelations(s,d){
 const job=s.jobs.find(j=>j.id===d.target),facts=confirmed(s).filter(c=>d.claimIds.includes(c.id));
 // Unsaved wording stays editable; only source validity controls graph visibility.
 const sourceOnly={...d.tailoring,rows:Object.fromEntries(Object.entries(d.tailoring.rows||{}).map(([key,row])=>[key,{...row,wording:'',confirmed:false}]))};
 const issue=tailoringError(job,facts,sourceOnly);
 if(issue)return {issue,edges:[]};
 const edges=[];for(const [key,row]of Object.entries(d.tailoring.rows||{})){if(!jdRequirements(job)[Number(key)])continue;for(const id of row.claimIds||[])edges.push({source:id,target:String(key)});}
 return {issue:'',edges};
}
export function resumeExpressionRows(s,d){
 const job=s.jobs.find(j=>j.id===d.target),requirements=jdRequirements(job);
 if(resumeRelations(s,d).issue)return [];
 return Object.entries(d.tailoring.rows||{}).filter(([key,row])=>requirements[Number(key)]&&row.wording?.trim()&&row.claimIds?.length&&row.claimIds.every(id=>d.claimIds.includes(id))).map(([key,row])=>({key,requirement:requirements[Number(key)],wording:row.wording,claimIds:[...row.claimIds],confirmed:row.confirmed===true}));
}
export const readableReport=(s,r)=>!reportReferencesUnavailable(s,r);
export function reportLineage(s,current){
 const root=report=>{const visited=new Set();let node=report;while(node.prior&&!visited.has(node.id)){visited.add(node.id);const parent=s.reports.find(r=>r.id===node.prior);if(!parent)break;node=parent;}return node.id;};
 const rootId=root(current);return s.reports.filter(r=>root(r)===rootId);
}
export function reportChanges(s,prior,current){
 if(!readableReport(s,prior)||!readableReport(s,current))return {blocked:true,rows:[]};
 const a=reportRows(prior.body),b=reportRows(current.body),keys=[...new Set([...a.map(r=>r.id),...b.map(r=>r.id)])];
 return {blocked:false,rows:keys.map(id=>{const before=a.find(r=>r.id===id),after=b.find(r=>r.id===id);return {id,title:after?.title||before.title,before:before?.text||'',after:after?.text||'',state:!before?'added':!after?'removed':before.text===after.text?'same':'changed'};})};
}
