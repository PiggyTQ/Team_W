import {careerRecordDate} from './career-journey-model.js';
import {guidedTask,projectRoute} from './practice-project-model.js';
import {skillTreeRoute} from './skill-tree-model.js';
import nativeCopy from './i18n/native-task-copy.json' with {type:'json'};

// Each method is supported by a specific decision in a submitted practice.
const methodRules = [
  {id:'dataQuality',templates:{quality:[['evidence','source','exclude']]}},
  {id:'pairedEvaluation',templates:{'ai-eval':[['evidence','paired'],['scope','policy']]}},
  {id:'scopeOfConclusion',templates:{
    quality:[['decision','publish-limited','hold'],['scope','describe']],
    'ai-eval':[['decision','pilot','hold'],['scope','policy']]
  }},
  {id:'correlateLogs',templates:{log:[['evidence','correlate']]}},
  {id:'triageAlert',templates:{log:[['decision','escalate','close'],['evidence','correlate']]}},
  {id:'compareRecovery',templates:{restore:[['evidence','compare']]}},
  {id:'rollbackDecision',templates:{restore:[['decision','rollback','pause'],['scope','canary']]}}
];

const text = value => typeof value === 'string' ? value.trim() : '';
const bounded = (value, length) => value.length > length ? value.slice(0,length).trimEnd() + '…' : value;
const newest = (left,right) => (right.date || '').localeCompare(left.date || '');

function readStep(task,attempt,step) {
  const response = attempt?.practiceSnapshot?.responses?.[step];
  const note = text(response?.note);
  if (!note || !text(response?.choice)) return null;
  return {step,choice:response.choice,note,to:projectRoute(task.template,{view:'practice',task:task.id,step})};
}

function completedPractice(project,task,review) {
  const attempt = task?.attempts?.at(-1);
  const steps = guidedTask(task) && task.completed === true && task.status === '完成' && attempt?.result === '自检记录'
    ? Object.fromEntries(['scope','evidence','decision','delivery'].map(step => [step,readStep(task,attempt,step)])) : {};
  return {
    id:project.id,source:project.source,title:project.title,to:project.to,date:project.date,steps,
    demo:task?.kind === '演示实践',template:task?.template,courseVersion:task?.courseVersion,
    summary:project.summary||project.description,contribution:project.contribution,limits:project.limits,
    review:review ? {step:'review',date:review.date,to:'/plan?tab=复盘&task='+encodeURIComponent(task.id)} : null
  };
}

function jobIntent(state) {
  const jobs = (state.jobs || []).filter(job => !job.archived && job.status !== '归档' && text(job.title));
  const ordered = [...jobs].sort((a,b) => Number(b.career === state.goal) - Number(a.career === state.goal) || newest(a,b));
  const job = ordered[0];
  return job ? {title:job.title,career:job.career,to:'/careers?tab=我的机会&job='+encodeURIComponent(job.id)} : null;
}

function passedSkillRecords(state) {
  return Object.entries(state.skillStudy || {}).flatMap(([key,entry])=>{
    const [career,skill,version] = key.split(':');
    const leaf = nativeCopy.skills[career]?.[skill];
    const date = careerRecordDate(entry?.assessment?.passedAt);
    return date && leaf?.version && 'v'+leaf.version===version
      ? [{id:key,title:leaf.title,date,to:skillTreeRoute(career,{skill,step:'check'})}]
      : [];
  }).sort(newest);
}

export function buildCareerEvidence(state,projects) {
  const tasks = new Map((state.tasks || []).map(task => [task.id,task]));
  const reviewDates = new Map();
  for (const review of state.reviews || []) {
    const date = careerRecordDate(review.updatedAt || review.date);
    if (date && (!reviewDates.has(review.taskId) || reviewDates.get(review.taskId).date < date)) {
      reviewDates.set(review.taskId,{date});
    }
  }
  const outcomes = projects.map(project => {
    const task = project.source === 'upload' ? null : tasks.get(project.id);
    return completedPractice(project,task,task && reviewDates.get(task.id));
  }).sort(newest);
  const methods = methodRules.flatMap(({id,templates}) => {
    const evidence = outcomes.flatMap(project => {
      const requirements = templates[project.template];
      if (!Array.isArray(requirements) || !requirements.every(([step,...choices]) => choices.includes(project.steps[step]?.choice))) return [];
      const [step] = requirements[0];
      return [{project,...project.steps[step]}];
    }).sort((left,right) => Number(left.project.demo) - Number(right.project.demo));
    return evidence.length ? [{id,evidence,demo:evidence.every(source=>source.project.demo)}] : [];
  });
  return {outcomes,methods,job:jobIntent(state),passedSkills:passedSkillRecords(state)};
}

export function careerEvidenceExport(evidence,labels,projectName,origin,language='zh') {
  const out = [labels.exportTitle];
  if (evidence.job) out.push(labels.jobIntent+' · '+bounded(evidence.job.title,200));
  if (evidence.outcomes.length) out.push('',labels.outcomes);
  for (const project of evidence.outcomes) {
    out.push('',projectName(project)+(project.demo?' · '+labels.demo:''));
    const scope=project.steps.scope?.note;
    const result=project.steps.decision?.note||project.summary;
    if(scope)out.push(labels.steps.scope+' · '+scope);
    if(result)out.push(labels.steps.decision+' · '+result);
    if(project.contribution)out.push(labels.contribution+' · '+project.contribution);
    if(project.limits)out.push(labels.limits+' · '+project.limits);
    out.push(new URL(project.to,origin).href);
    if(project.review)out.push([labels.openReview,project.review.date,new URL(project.review.to,origin).href].join(' · '));
  }
  if (evidence.methods.length) out.push('',labels.mapTitle);
  for (const method of evidence.methods) {
    const copy = labels.methods[method.id];
    out.push('',copy.title+' · '+(method.demo?labels.demoPractice:labels.practiced),copy.description);
    for (const {project,step,to} of method.evidence) {
      const source = projectName(project)+(project.demo?' · '+labels.demo:'');
      out.push([source,labels.steps[step],new URL(to,origin).href].join(' · '));
    }
  }
  if (evidence.passedSkills.length) out.push('',labels.skillChecks);
  for (const skill of evidence.passedSkills) {
    out.push(labels.skillCheck+' · '+skill.title[language]+' · '+skill.date+' · '+new URL(skill.to,origin).href);
  }
  return out.join('\n')+'\n';
}
