import {careers, confirmed} from './model.js';

// Information coverage is categorical. Counts never represent ability or verification.
export const hasProfileValue = value => typeof value === 'string' && !/^(未知|未填写|未提供|待补充|无|未定|unknown|n\/a|[-—])$/i.test(value.trim()) && Boolean(value.trim());
export function profileInsights(s) {
  const facts = confirmed(s), pending = s.claims.filter(c => ['待确认','疑似重复','矛盾'].includes(c.status));
  const contributions = facts.filter(c => hasProfileValue(c.contribution));
  const career = careers.find(c => c.id === (s.assessmentCareer || s.goal)) || careers[0];
  const related = facts.filter(c => c.skill === career.skill);
  const conditions = [['地域偏好',s.preferences.location],['时间与工作约束',s.preferences.constraint]].filter(([,v]) => hasProfileValue(v));
  const reviews = (s.reviews || []).filter(r => ['result','feedback','reason','next'].some(k => hasProfileValue(r[k])));
  const dimensions = [
    {id:'BR',title:'条件与可行性',short:'工作条件',count:conditions.length,unit:'项偏好或约束',
      known:'已记录你的地域偏好或工作约束，可用来提出需要核对的问题。',
      unknown:'尚未记录地域、时间或值守条件，岗位是否适合当前生活安排仍待了解。',
      limit:'偏好属于本人自述；具体岗位的可行性仍需逐项核对。',
      items:conditions.map(([title,text])=>({title,text})),action:'补充工作条件',to:'/settings?tab=偏好与通知'},
    {id:'PS',title:'专业任务与材料',short:'专业实践',count:facts.length,unit:'项确认经历',
      known:'已有本人确认的经历，可以回看任务、产物和关联技能。',
      unknown:'还没有本人确认的经历。课程项目、个人作品或一次实际尝试都可以作为起点。',
      limit:'材料数量和技能标签不能说明熟练程度，也不等于通过实际核验。',
      items:facts.map(c=>({id:c.id,title:c.title,text:c.skill})),action:pending.length?'核对待确认材料':'记录一段经历',to:pending.length?'/assessment?tab=原文确认':'/assessment'},
    {id:'TQ',title:'行为与协作',short:'个人贡献',count:contributions.length,unit:'项贡献说明',
      known:'你已说明自己在部分经历中负责的内容，可以进一步补充沟通与协作情境。',
      unknown:'还缺少明确的本人贡献说明，暂时无法分清个人负责部分与团队成果。',
      limit:'贡献说明不等于协作能力证明；具体沟通行为与人格特征不作自动推断。',
      items:contributions.map(c=>({id:c.id,title:c.title,text:c.contribution})),action:'补充本人贡献',to:facts.length?'/assessment?tab=原文确认':'/assessment'},
    {id:'DP',title:'学习与改进',short:'复盘过程',count:reviews.length,unit:'次复盘记录',
      known:'已有本人复盘，可以回看反馈、遇到的问题和下一次准备怎样调整。',
      unknown:'还没有可回看的复盘内容。先记录一次尝试中的问题和下一次做法。',
      limit:'记录过复盘不代表已经改进；效果需要后续产物和反馈继续说明。',
      items:reviews.map((r,i)=>({id:r.id,title:`复盘记录 ${i+1}`,text:r.type || '本人复盘'})),action:'记录与回看复盘',to:'/plan?tab=复盘'}
  ].map(d=>({...d,has:d.count>0}));
  const gaps = [];
  if (pending.length) gaps.push({id:'pending',title:'先核对已有候选',detail:'待确认、重复或矛盾的候选不会作为画像依据。',count:pending.length,unit:'项待核对',action:'核对候选',to:'/assessment?tab=原文确认'});
  if (!related.length) gaps.push({id:'related',title:'补一份与当前方向相关的经历',detail:'当前方向的示例任务关联技能尚无确认材料。先写做过的部分，不必等到完成大项目。',context:career.skill,action:'整理相关经历',to:'/assessment'});
  if (facts.length > contributions.length) gaps.push({id:'contribution',title:'把自己的负责部分写清楚',detail:'有些确认经历还没有有效的贡献说明，补上你做了什么、产物在哪里。',count:facts.length-contributions.length,unit:'项待说明',action:'补充贡献',to:'/assessment?tab=原文确认'});
  if (!conditions.length) gaps.push({id:'conditions',title:'补充适合你的工作条件',detail:'地域、可投入时间或值守限制，会帮助你具体核对岗位条件。',action:'填写偏好与约束',to:'/settings?tab=偏好与通知'});
  if (!reviews.length) gaps.push({id:'review',title:'留下一次尝试后的复盘',detail:'记录遇到的问题、收到的反馈和下次做法，让画像不止停留在成果清单。',action:'开始复盘',to:'/plan?tab=复盘'});
  return {facts,pending,contributions,conditions,reviews,career,related,dimensions,gaps,
    recorded:dimensions.filter(d=>d.has).length,
    narrative:!facts.length?'先让一段真实经历，成为画像的起点。':!related.length?'你的经历已留下记录，当前方向还需要具体材料。':!contributions.length?'已有相关经历，接下来把自己的负责部分讲清楚。':!reviews.length?'经历与贡献已有依据，再补上尝试之后的思考。':'经历、贡献与复盘已连起来，继续用新产物说明变化。'};
}
export function profileArchive(claims,filter) {
  if (filter==='confirmed') return claims.filter(c=>c.status==='已确认');
  if (filter==='pending') return claims.filter(c=>['待确认','疑似重复','矛盾'].includes(c.status));
  if (filter==='excluded') return claims.filter(c=>!['已确认','待确认','疑似重复','矛盾'].includes(c.status));
  return claims;
}
