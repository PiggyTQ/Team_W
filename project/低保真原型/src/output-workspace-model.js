import {confirmed,careers,cname} from './model.js';
import {educationFacts,jdRequirements} from './completion-model.js';
import {confirmedResumeProfile} from './resume-content-model.js';
import {resumeExpressionRows,resumeRelations} from './report-studio-model.js';
import {hasProfileValue} from './profile-insights-model.js';
import {reportRows} from './alignment-model.js';

export function reportDecisionBrief(s){
 const facts=confirmed(s),career=careers.find(c=>c.id===s.goal),pending=s.claims.filter(c=>['待确认','疑似重复','矛盾'].includes(c.status));
 const active=s.tasks.filter(t=>!['完成','跳过','取消','延期'].includes(t.status));
 const gaps=[];
 if(!hasProfileValue(s.decision.reason))gaps.push({title:'选择理由还没有写清楚',to:'/careers?tab=比较',action:'补充选择理由'});
 if(!facts.length)gaps.push({title:'还没有本人确认的经历依据',to:'/assessment',action:'整理一段经历'});
 if(pending.length)gaps.push({title:'已有候选还需要核对',to:'/assessment?tab=原文确认',action:'核对候选材料',count:pending.length});
 if(!hasProfileValue(s.preferences.constraint))gaps.push({title:'工作条件与时间限制待核对',to:'/settings?tab=偏好与通知',action:'补充个人约束'});
 if(s.analysisStale)gaps.push({title:'评估依据有变化，旧判断需要回查',to:'/assessment?tab=四维与差距',action:'回查职业评估'});
 const next=active[0];
 return {facts,career,pending,active,gaps,next,target:career?.name||'方向探索中',
   decision:hasProfileValue(s.decision.result)&&s.decision.result!=='仍未知'?s.decision.result:'阶段判断待本人补充',
   reason:hasProfileValue(s.decision.reason)?s.decision.reason:'先写下为什么关注这个方向，或最想排除的疑问。',
   question:hasProfileValue(s.decision.question)?s.decision.question:'还没有记录本阶段想验证的问题。',
   actionTitle:next?.title||'选一个范围明确的小实践',actionTo:next?'/work/'+encodeURIComponent(next.id):'/learning'};
}
export function savedReportBrief(report){
 const rows=reportRows(report.body),read=title=>{const row=rows.find(r=>r.title===title);return row?row.text.slice(row.text.indexOf('：')+1):'此快照未记录这一项。';};
 return [{title:'方向与选择',text:read('目标与理由')},{title:'依据与待核对',text:read('材料与差距')},{title:'安排与行动',text:read('计划与预算')}];
}
export function resumeReadiness(s,draft){
 const confirmedFacts=confirmed(s),facts=draft.claimIds.map(id=>confirmedFacts.find(c=>c.id===id)).filter(Boolean),education=educationFacts(s).filter(e=>draft.educationIds.includes(e.id)),profile=draft.includeProfile?confirmedResumeProfile(s):null;
 const job=s.jobs.find(j=>j.id===draft.target),relations=resumeRelations(s,draft),expressions=resumeExpressionRows(s,draft),requirements=jdRequirements(job);
 const linked=new Set(relations.edges.map(e=>e.target));
 return {facts,education,profile,job,requirements,relations,expressions,linked:linked.size,
   pending:expressions.filter(r=>!r.confirmed).length,
   checks:[
    {id:'content',title:'选入经历或教育',ready:!!(facts.length||education.length),text:facts.length||education.length?'已有可选用的确认内容':'至少选择一项确认经历或教育记录。',required:true},
    {id:'target',title:'确认本次目标',ready:!draft.target||!!job,text:job?job.title:draft.target?'原岗位已不可用，请重新选择。':'当前为通用简历，不做岗位定向对照。',required:true},
    {id:'source',title:'关联依据可用',ready:!relations.issue,text:relations.issue||'当前关联没有检测到来源失效。',required:true},
    {id:'wording',title:'核对岗位表达',ready:!expressions.some(r=>!r.confirmed),text:expressions.some(r=>!r.confirmed)?'仍有岗位表达待本人核对。':'仅将本人确认的岗位表达放入成稿。',required:true},
    {id:'profile',title:'联系资料（可选）',ready:!!profile,text:profile?'采用本人确认的联系资料。':'可回资料页补充，暂不生成联系方式。',required:false}
   ]};
}
