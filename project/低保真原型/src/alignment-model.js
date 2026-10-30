import {fresh,makeTask,confirmed,uid,cname} from './model.js';
import {claimSnapshotsUnavailable} from './reference-contract.js';

// Start from an allowlist so future derived caches cannot survive this deletion.
export function purgePrivateMaterials(s) {
  return {...fresh(),logged:s.logged,onboard:s.onboard,stage:s.stage,role:s.role,version:s.version+1,profileVersion:s.profileVersion+1,planVersion:s.planVersion+1,preferences:{...s.preferences},budget:s.budget,goal:s.goal,backup:s.backup,notifications:s.notifications,favorites:[...s.favorites],compare:[...s.compare],reading:{...s.reading},adminSource:{...s.adminSource},adminContent:{...s.adminContent},audit:s.audit.map(a=>({id:a.id,action:a.action,date:a.date})),tasks:s.tasks.map(t=>({...makeTask(s,{title:'材料已删除的任务',purpose:'原始目的与内容已删除',hours:t.hours,template:'external',association:t.association}),id:t.id,status:t.status,completed:t.completed,mode:t.mode,check:'材料已删除',claimStatus:'材料已删除',due:t.due||''})),deleted:true,deletion:{status:'本地处理完成',date:new Date().toISOString().slice(0,10),detail:'本机材料、历史快照、私人研究和草稿已清除；任务仅保留脱敏状态。真实服务与备份不在本原型内。'}};
}

export const validScopeRefs=s=>!s.authorized||!s.aiScope.includes('本人确认片段')?[]:(s.aiClaimRefs||[]).filter(ref=>confirmed(s).some(c=>c.id===ref.id&&c.version===ref.version));
export const reportRows=body=>{const used=new Map();return (body||'').split('\n').filter(t=>t.trim()).map((text,i)=>{const at=text.indexOf('：'),title=at>=0?text.slice(0,at):`章节 ${i+1}`,n=used.get(title)||0;used.set(title,n+1);return {id:`${title}:${n}`,title,text};});};
export function reportUpdateBody(prior,fullBody) {
  const allowed=new Set([...(prior.sections||[]),...reportRows(prior.body).map(row=>row.title)]);
  return reportRows(fullBody).filter(row=>allowed.has(row.title)).map(row=>row.text).join('\n');
}
const clone=v=>JSON.parse(JSON.stringify(v));
export function reportReferencesUnavailable(s,r) {
  return !r||s.adminSource.status==='已撤回'||claimSnapshotsUnavailable(s,r);
}
export function reportPrivateSnippets(s,r) {
  const reviews=s.reviews.map(x=>({id:x.id,title:`${x.date||'日期未知'} · ${s.tasks.find(t=>t.id===x.taskId)?.title||'本人复盘'}`,text:[x.result,x.reason,x.next].filter(Boolean).join('；'),sourceReviewId:x.id,reviewVersion:x.version||1}));
  const reflections=(r.privateReflections||[]).filter(x=>{
    const source=s.reports.find(report=>report.id===x.sourceReportId);
    return !!source&&!reportReferencesUnavailable(s,source)&&!reportReferencesUnavailable(s,x);
  });
  return [...reviews,...reflections];
}
const basis=s=>({goal:s.goal,backup:s.backup,reason:s.decision.reason,question:s.decision.question,decisionResult:s.decision.result,compare:[...s.compare],background:{intent:s.preferences.intent,stage:s.preferences.stage},budget:s.budget,analysis:s.analysis?{id:s.analysis.id,rule:s.analysis.rule,profileVersion:s.analysis.profileVersion}:null,analysisStale:s.analysisStale,sourceVersion:s.adminSource.version,contentVersion:s.adminContent.version,claims:confirmed(s).map(c=>({id:c.id,version:c.version})),tasks:s.tasks.map(t=>({id:t.id,version:t.version,status:t.status,check:t.check,title:t.title,note:t.note,contribution:t.contribution,externalFeedback:t.externalFeedback,observationType:t.observationType,occurredOn:t.occurredOn,investigationMethod:t.investigationMethod,investigationSource:t.investigationSource})),reviews:s.reviews.map(r=>({id:r.id,date:r.date,version:r.version||1}))});
export const reportBasisKey=s=>JSON.stringify(basis(s));
export const reportIsStale=(s,r)=>r.profileVersion!==s.profileVersion||r.planVersion!==s.planVersion||!!r.inputSnapshot&&JSON.stringify(r.inputSnapshot)!==reportBasisKey(s);
export function freezeReport(s,title,body,prior) {
  const rows=reportRows(body);
  return {id:uid('report'),title,body,kind:prior?.kind||'report',help:prior?.help||'',version:(prior?.version||0)+1,profileVersion:s.profileVersion,planVersion:s.planVersion,claimIds:confirmed(s).map(c=>c.id),claimRefs:confirmed(s).map(c=>({id:c.id,version:c.version})),claimSnapshots:clone(confirmed(s)),inputSnapshot:clone(basis(s)),sectionRecords:rows,goal:s.goal,sections:rows.map(r=>r.title),saved:true,date:new Date().toISOString(),manual:!!prior,prior:prior?.id};
}
export function revisionRows(s,prior,oldBody,newBody) {
  // Revoked text must never reach the conflict editor, including a saved merge draft.
  if(reportReferencesUnavailable(s,prior)) {
    const allowed=new Set(prior?.sections||[]);
    return reportRows(newBody).filter(row=>allowed.has(row.title)).map(row=>({...row,oldText:'',newText:row.text,affected:true,blocked:true}));
  }
  const old=reportRows(oldBody),next=reportRows(newBody),now=basis(s),before=prior.inputSnapshot;
  const changed=(title,oldBasis=before)=>{if(!oldBasis)return title==='目标与理由'?prior.goal!==s.goal:title==='行动与成果'||title==='复盘与调整'?prior.planVersion!==s.planVersion:prior.profileVersion!==s.profileVersion;
    const keys=title==='目标与理由'?['goal','backup','reason','question']:title==='候选与取舍'?['compare','reason','question','decisionResult']:title==='待问问题'?['question']:title==='材料与差距'?['claims']:title==='行动与成果'||title==='已做行动'?['tasks']:title==='复盘与调整'?['reviews']:title==='个人概览与资料范围'?['background','claims']:title==='四维依据'?['analysis','analysisStale','claims','reviews']:title==='计划与预算'?['budget','tasks']:title==='职业要求与范围'||title==='职业桥接与技能路线'?['goal','sourceVersion','contentVersion']:['goal','reason','claims','tasks','reviews','question','compare','sourceVersion','contentVersion'];
    return keys.some(k=>JSON.stringify(now[k])!==JSON.stringify(oldBasis[k]));};
  const rows=old.map(row=>{const n=next.find(r=>r.id===row.id),oldBasis=prior.sectionRecords?.find(r=>r.id===row.id)?.referenceBasis||before;return {...row,referenceBasis:oldBasis,oldText:row.text,newText:n?.text||'',affected:!!n&&changed(row.title,oldBasis)&&(row.text!==n.text||row.title==='四维依据')};});
  for(const row of next)if(!old.some(r=>r.id===row.id))rows.push({...row,oldText:'',newText:row.text,affected:true});
  return rows;
}
export function mergeReport(s,prior,rows,choices,edits) {
  if(!prior)throw new Error('原报告已不可访问，请返回报告列表重新选择。');
  const unavailable=reportReferencesUnavailable(s,prior);
  if(unavailable&&(s.adminSource.status==='已撤回'||!rows.length||rows.some(r=>!r.affected||choices[r.id]!=='new')))throw new Error('旧引用已不可访问，只能采用当前有效依据；不能保留、改写或移出旧正文。');
  const unresolved=rows.filter(r=>r.affected&&(!choices[r.id]||choices[r.id]==='edit'&&!edits[r.id]?.trim()));
  if(unresolved.length)throw new Error('请逐段处理受影响内容；手工合并需要填写正文。');
  const kept=rows.filter(r=>!r.affected||choices[r.id]!=='reflection');
  const body=kept.map(r=>!r.affected?r.oldText:choices[r.id]==='new'?r.newText:choices[r.id]==='edit'?edits[r.id]:r.oldText).join('\n');
  const n=freezeReport(s,prior.title,body,prior);
  const keepOld=rows.some(r=>!r.affected||choices[r.id]==='old'||choices[r.id]==='edit');
  const refs=keepOld?[...(prior.claimRefs||prior.claimIds.map(id=>({id,version:null}))),...n.claimRefs]:n.claimRefs;
  n.claimRefs=refs.filter((r,i)=>refs.findIndex(x=>x.id===r.id&&x.version===r.version)===i);
  n.claimIds=[...new Set(n.claimRefs.map(r=>r.id))];
  n.claimSnapshots=[...(keepOld?prior.claimSnapshots||[]:[]),...n.claimSnapshots].filter((r,i,all)=>all.findIndex(x=>x.id===r.id&&x.version===r.version)===i);
  n.sectionRecords=kept.map(r=>({...r,text:!r.affected?r.oldText:choices[r.id]==='new'?r.newText:choices[r.id]==='edit'?edits[r.id]:r.oldText,referenceBasis:choices[r.id]==='new'?basis(s):r.referenceBasis,choice:r.affected?choices[r.id]:'unchanged',priorReportId:prior.id}));
  n.retainedOldReferences=keepOld;
  n.privateReflections=rows.filter(r=>choices[r.id]==='reflection').map(r=>({id:uid('reflection'),title:r.title,text:r.oldText||r.newText,sourceReportId:prior.id,claimIds:[...(prior.claimIds||[])],claimRefs:clone(prior.claimRefs||[])}));
  return n;
}
export function reportExportText(r,selection,privateSnippets=[],s) {
  if(s&&reportReferencesUnavailable(s,r))throw new Error('存在失效引用，禁止导出。请使用有效依据更新报告。');
  if(!s&&privateSnippets.some(x=>x.sourceReportId))throw new Error('私人片段需要核对原报告引用后才能导出。');
  if(s){const allowed=reportPrivateSnippets(s,r);if(privateSnippets.some(x=>!allowed.some(a=>a.id===x.id&&a.text===x.text)))throw new Error('所选私人片段或原引用已变化，请重新选择导出范围。');}
  const rows=r.sectionRecords||reportRows(r.body);
  return `【低保真原型 / 示例输出】\n${r.title} v${r.version}\n${selection.map(title=>rows.filter(row=>row.title===title).map(row=>row.text).join('\n')||`${title}：待补充（未知）`).join('\n')}\n引用与局限：报告 ${r.id} v${r.version}；本人确认不等于实核。${privateSnippets.length?'\n主动选中的私人片段：\n'+privateSnippets.map(x=>`${x.title}\n${x.text}`).join('\n'):''}`;
}
export function createSkillCandidates(s,t,attempt,entries,contribution) {
  const result=[];for(const entry of entries){const skill=entry.skill?.trim();if(!skill)continue;if(s.claims.some(c=>c.attemptId===attempt.id&&c.skill===skill)||result.some(c=>c.skill===skill))continue;result.push({id:uid('claim'),version:1,status:'待确认',title:`${t.title} · 成果 v${attempt.version} · ${skill}`,text:attempt.text,contribution,skill,supportScope:entry.scope?.trim()||'支持范围待本人核对',artifactLocation:entry.location?.trim()||'位置待本人补充',aid:attempt.aid,taskId:t.id,attemptId:attempt.id,origin:'任务产物 / 本人记录',type:t.kind});}return result;
}
export const consultationBody=(s,help)=>`候选与取舍：${s.compare.length?s.compare.map(cname).join('、'):'尚无比较候选'}；${s.decision.reason||'选择理由待补充'}。\n已做行动：${s.tasks.filter(t=>t.note?.trim()).map(t=>`${t.title}：${t.note}（本人记录；${t.id}）`).join('；')||'尚无实际行动结果，不补造过程'}。\n待问问题：${s.decision.question||'待本人补充'}。\n希望得到的帮助：${help?.trim()||'待本人填写'}。\n引用与局限：本人自述与合成知识分开；未实际核验。此摘要供自行携带，不自动发送或预约。`;

