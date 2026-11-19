import paths from './i18n/report-skill-paths.json' with {type:'json'};
import {skillStudyKey,skillTreeRoute} from './skill-tree-model.js';

// Exact authored skill labels connect account evidence to public tree topics.
const aliases={
 data:{
  'metric-definition':['指标口径'],'sql-joins':['SQL'],'aggregation':['SQL'],
  missing:['数据质量','数据清洗'],'duplicate-conflict':['数据质量','数据清洗'],'quality-rules':['数据质量','数据清洗'],
  descriptive:['描述统计'],experiment:['实验设计'],'star-schema':['数据建模'],
  'pivot-tables':['表格处理'],'chart-choice':['图表表达'],'decision-brief':['领域分析']
 },
 ai:{'python-data':['Python','数据处理'],reproducibility:['Git','MLOps'],
  'eval-cases':['模型评估','输出检查'],'failure-review':['错误分析','输出检查'],
  'split-leakage':['数据质量'],'retrieval-grounding':['检索增强'],monitoring:['模型部署','MLOps']},
 security:{'network-path':['网络基础'],authentication:['访问控制'],authorization:['访问控制'],
  'event-logs':['日志分析'],triage:['风险判断'],'incident-handoff':['证据记录'],
  'verify-control':['安全加固'],'safe-input':['应用安全']},
 ops:{'service-account':['Linux'],'http-diagnosis':['网络基础'],'signal-triage':['Shell'],
  'four-signals':['监控告警'],'rollback-verify':['备份恢复','变更回退'],
  'canary-gate':['持续交付'],'infra-state':['基础设施自动化'],'slo-budget':['可靠性设计']},
 frontend:{'semantic-html':['HTML'],'responsive-css':['CSS'],'dom-events':['JavaScript'],
  'state-ownership':['组件与状态'],'async-ui':['接口协作'],keyboard:['可访问性'],
  'form-errors':['可访问性'],'web-vitals':['性能分析'],'browser-tests':['自动化检查']},
 backend:{'service-structure':['一门编程语言','Java'],'schema-constraints':['SQL'],'query-plan':['SQL'],
  'api-contract':['接口设计'],'object-authorization':['权限与校验'],'session-auth':['权限与校验'],
  'integration-tests':['单元测试']},
 engineering:{'transform-sql':['SQL'],'pipeline-tests':['数据质量','数据清洗'],'dedup-replay':['数据质量']},
 testing:{boundary:['测试设计'],'defect-reproduction':['缺陷复现'],'retest-regression':['回归验证'],
  'state-transition':['需求理解'],'test-data':['测试数据'],'ci-evidence':['自动化测试']},
 software:{'control-flow':['一门编程语言'],'structures-cost':['数据结构'],'git-branches':['Git'],
  'design-boundaries':['模块设计'],debugging:['调试'],'unit-tests':['单元测试']},
 delivery:{workflows:['需求记录'],handoff:['技术文档'],'role-matrix':['系统配置'],
  uat:['验收与培训'],migration:['数据迁移'],cutover:['自动化部署']}
};
const methodTopics={
 dataQuality:{data:['missing','duplicate-conflict','quality-rules'],engineering:['pipeline-tests','dedup-replay']},
 pairedEvaluation:{ai:['eval-cases','failure-review']},
 scopeOfConclusion:{data:['decision-brief'],ai:['human-oversight']},
 correlateLogs:{security:['event-logs']},triageAlert:{security:['triage','incident-handoff']},
 compareRecovery:{ops:['four-signals','signal-triage']},rollbackDecision:{ops:['canary-gate','rollback-verify']}
};
const labelKey=value=>typeof value==='string'?value.trim().toLocaleLowerCase('en-US'):'';
const labels=claim=>[...(Array.isArray(claim.skills)?claim.skills:[]),...(claim.skill||'').split(/[、,，;；\n]+/)].map(labelKey);
const relationTags=career=>new Set(Object.values(aliases[career]||{}).flat().map(labelKey));
const reportRoute=(career,branch,leaf,step='learn')=>skillTreeRoute(career,{branch:branch.id,skill:leaf.id,step})+'&from=report';

function roleProfile(state,role,evidence){
 const tree=paths[role.id];
 const confirmed=(state.claims||[]).filter(claim=>claim.status==='已确认'&&claim.text?.trim());
 const branches=tree.branches.map(branch=>({
  ...branch,leaves:branch.leaves.map(leaf=>{
   const accepted=new Set([leaf.title[0],...(aliases[role.id]?.[leaf.id]||[])].map(labelKey));
   const claims=confirmed.filter(claim=>labels(claim).some(label=>accepted.has(label)));
   const methods=evidence.methods.filter(method=>methodTopics[method.id]?.[role.id]?.includes(leaf.id));
   const assessment=state.skillStudy?.[skillStudyKey(role.id,leaf)]?.assessment;
   const passed=!!assessment?.passedAt;
   const status=passed?'passed':methods.length?'practiced':claims.length?'documented':'gap';
   return {...leaf,status,claims,methods,passed,to:reportRoute(role.id,branch,leaf),
    checkTo:reportRoute(role.id,branch,leaf,'check')};
  })
 }));
 const leaves=branches.flatMap(branch=>branch.leaves);
 const known=leaves.filter(leaf=>leaf.status!=='gap').length;
 return {...role,branches,leaves,coverage:{known,total:leaves.length,percent:Math.round(known/leaves.length*100)},
  passed:leaves.filter(leaf=>leaf.passed).length,
  practical:leaves.filter(leaf=>leaf.methods.length).length,
  frameworks:tree.frameworks};
}

export function reportInsights(state,report,evidence,selectedCareer){
 const profiles=report.comparisons.map(role=>roleProfile(state,role,evidence));
 const intendedId=state.goal||null;
 const intended=profiles.find(role=>role.id===intendedId)||null;
 const target=profiles.find(role=>role.id===selectedCareer)||intended||
  profiles.find(role=>role.id===report.work?.id)||profiles[0];
 const anchor=relationTags((intended||target).id);
 const adjacent=profiles.filter(role=>role.id!==(intended||target).id).map(role=>({
  ...role,shared:[...relationTags(role.id)].filter(label=>anchor.has(label)),
 })).filter(role=>role.coverage.known>0)
  .sort((a,b)=>b.coverage.percent-a.coverage.percent||b.projectCount-a.projectCount||b.shared.length-a.shared.length).slice(0,3);
 const gaps=target.branches.flatMap(branch=>branch.leaves.filter(leaf=>!leaf.passed).map(leaf=>({...leaf,branch})));
 // Continue a topic with practice or materials before starting a new branch.
 const ordered=[...gaps.filter(leaf=>leaf.status!=='gap'),...gaps.filter(leaf=>leaf.status==='gap')];
 const firstInBranch=ordered.filter((leaf,index)=>ordered.findIndex(other=>other.branch.id===leaf.branch.id)===index);
 const next=firstInBranch.slice(0,3);
 return {profiles,intended,target,adjacent,next};
}
