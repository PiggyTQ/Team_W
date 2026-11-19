import {careers,learning} from './model.js';
import {skillStudyKey,skillTreeRoute} from './skill-tree-model.js';

export function careerRecordDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) return null;
  const day = value.slice(0,10);
  const parsed = new Date(day + 'T00:00:00Z');
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0,10) === day ? day : null;
}

export function careerAssessment(state) {
  const analysis = state.analysis;
  const recorded = !!analysis?.id;
  const stale = recorded && (state.analysisStale || analysis.profileVersion !== state.profileVersion);
  const career = recorded && careers.find(item => item.id === (analysis.occupation || analysis.career));
  return {status:recorded ? (stale ? 'stale' : 'saved') : 'missing',
    date:recorded ? careerRecordDate(analysis.date) : null,career:career?.name || null};
}

export const careerReadingCount = state => learning.filter(({id}) => {
  const position = state.reading?.[id];
  return Number.isInteger(position?.chapter) && position.chapter >= 0;
}).length;

export function careerReviewRefs(state) {
  const completed = new Set((state.tasks || []).filter(task => task.completed === true && task.status === '完成').map(task => task.id));
  return (state.reviews || []).filter(review => completed.has(review.taskId))
    .map(review => ({taskId:review.taskId,date:careerRecordDate(review.updatedAt || review.date)}))
    .sort((left,right)=>left.taskId.localeCompare(right.taskId)||(left.date||'').localeCompare(right.date||''));
}

function passedSkills(state,getTree) {
  return careers.flatMap(({id}) => (getTree(id)?.branches || []).flatMap(branch => branch.leaves.flatMap(leaf => {
    const date = careerRecordDate(state.skillStudy?.[skillStudyKey(id,leaf)]?.assessment?.passedAt);
    return date ? [{id:'skill:'+id+':'+leaf.id,kind:'skill',title:leaf.title[0],titleEn:leaf.title[1],date,to:skillTreeRoute(id,{branch:branch.id,skill:leaf.id,step:'check'})}] : [];
  })));
}

const newest = (left,right) => (right.date || '').localeCompare(left.date || '');

export function buildCareerJourney(state,{background,projects,plan,learningSuggestions},getTree) {
  const assessment = {...careerAssessment(state),confirmed:background.claims.length,pending:background.pendingCount};
  const reviewed = careerReviewRefs(state);
  const skills = getTree ? passedSkills(state,getTree) : [];
  const relatedTasks = plan.goal ? plan.activeTasks.filter(task => task.career === plan.goal.id) : [];
  const ordered = [...projects].sort(newest);
  const activity = [
    ...skills,
    ...ordered.filter(item => item.date).map(item => ({
      id:item.source+':'+item.id,kind:item.source==='upload'?'upload':(item.completedAt?'project':'submission'),
      title:item.title,date:item.date,to:item.to
    })),
    ...reviewed.filter(item => item.date).map(({taskId,date}) => ({
      id:'review:'+taskId+':'+date,kind:'review',title:ordered.find(item => item.id === taskId && item.source !== 'upload')?.title,
      date,to:'/plan?tab=复盘&task='+encodeURIComponent(taskId)
    })),
    ...(assessment.date ? [{id:'assessment',kind:'assessment',title:assessment.career,date:assessment.date,to:'/assessment?tab=四维与差距'}] : [])
  ];
  const suggested = learningSuggestions[0];
  let next = {kind:'suggestion',title:suggested?.title || null,to:suggested?.to || '/learning?tab=资源中心'};
  if (assessment.pending || assessment.status === 'stale') {
    next = assessment.pending ? {kind:'confirm',to:'/assessment?tab=原文确认'} : {kind:'assess',to:'/assessment?tab=四维与差距'};
  } else if (relatedTasks.length) {
    next = {kind:'continue',title:relatedTasks[0].title,to:'/plan?tab=执行&task='+encodeURIComponent(relatedTasks[0].id)};
  } else if (!plan.goal) {
    next = {kind:'plan',to:'/plan'};
  } else if (suggested?.career !== plan.goal.id) {
    next = {kind:'skillMap',to:skillTreeRoute(plan.goal.id)};
  }
  const unique = new Map(activity.sort(newest).map(event => [event.id,event]));
  return {
    assessment,
    plan:{goal:plan.goal?.name || null,reason:plan.goal ? plan.reason : '',weeklyHours:plan.goal ? plan.weeklyHours : null,
      active:plan.activeTasks.length,related:relatedTasks.length},
    practice:{reading:careerReadingCount(state),passed:getTree ? skills.length : null},
    outcomes:{total:projects.length,reviewed:new Set(reviewed.map(item => item.taskId)).size},
    activity:[...unique.values()].slice(0,5),next
  };
}
