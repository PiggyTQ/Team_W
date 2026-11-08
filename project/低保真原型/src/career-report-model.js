import {careers,learning} from './model.js';
import {careerDetailContent,careerDetailNotes} from './career-detail-content.js';
import {capabilityMastery} from './capability-puzzle-model.js';
import {getInterestGroup,getInterestType,interestTraits} from './interest-assessment-model.js';
import {hasProfileValue} from './profile-insights-model.js';

const array=value=>Array.isArray(value)?value:[];
const text=value=>typeof value==='string'?value.trim():'';
const known=value=>hasProfileValue(value)?text(value):'';
const copy=value=>JSON.parse(JSON.stringify(value));
const pick=(value,fields)=>Object.fromEntries(fields.filter(field=>value[field]!==undefined).map(field=>[field,copy(value[field])]));
const inline=value=>text(value).replace(/[\r\n]+/g,'；');
const excerpt=(value,max=400)=>{const line=inline(value);return line.length>max?line.slice(0,max)+'…（详见原文）':line;};
const summarize=(items,render,max=40)=>items.slice(0,max).map(render).join('；')+(items.length>max?`；另有 ${items.length-max} 项保留在原始记录中。`:'');
const unique=(items,key)=>items.filter((item,index)=>items.findIndex(other=>key(other)===key(item))===index);
const roleFor=id=>careers.find(role=>role.id===id)||null;
const finished=task=>task.completed===true&&task.status==='完成';
const roleSkills=role=>array(careerDetailContent[role.id]?.skills).flatMap(group=>group.items.map(name=>({id:name,name,level:group.label,description:group.application})));
const skillKey=value=>text(value).toLocaleLowerCase('en-US');
// Match explicit skill labels only. Titles, MBTI, education and project categories
// never establish a technical skill, and Java must not match JavaScript.
const skillLabels=record=>unique([...array(record.skills).filter(value=>typeof value==='string'),...text(record.skill).split(/[、,，;；\n]+/)].map(text).filter(Boolean),skillKey);
const sourceRef=(kind,record)=>({kind,id:record.id||null,version:record.version??null});
const vector=role=>[role.coverage.known,role.projectCount,role.selfCoverage.known];
const compare=(left,right)=>{const a=vector(left),b=vector(right);for(let i=0;i<a.length;i++)if(a[i]!==b[i])return b[i]-a[i];return 0;};
const percent=(knownCount,total)=>total?Math.round(knownCount/total*100):null;

/** Only the reviewed, bounded goal snapshot can cross the report boundary.
 * Drafts, notes, task metadata and local storage are intentionally not read. */
export function normalizeReportPlanRecords(value){
 if(value===null||value===undefined)return null;
 const invalid=()=>{throw new TypeError('Invalid report goal snapshot');};
 if(typeof value!=='object'||Array.isArray(value)||!Array.isArray(value.goals)||value.goals.length>200)invalid();
 const ids=new Set(),day=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;
 const goals=value.goals.map(goal=>{
  if(!goal||typeof goal!=='object'||Array.isArray(goal)||typeof goal.id!=='string'||!goal.id.trim()||goal.id.length>120||ids.has(goal.id)||typeof goal.title!=='string'||!goal.title.trim()||goal.title.length>500||!['week','month','year'].includes(goal.period)||!day(goal.periodStart)||!day(goal.due)||!Number.isFinite(goal.progress)||goal.progress<0||goal.progress>100||!['高','中','低'].includes(goal.priority))invalid();
  ids.add(goal.id);return {id:goal.id,title:goal.title.trim(),period:goal.period,periodStart:goal.periodStart,due:goal.due,progress:goal.progress,priority:goal.priority};
 });
 return {version:1,goals};
}

function completedProjects(state,uploads){
 const tasks=unique(array(state.tasks).filter(finished),record=>record.id);
 const fromTasks=tasks.map(task=>{
  const last=array(task.attempts).at(-1),unit=learning.find(item=>item.id===task.template);
  const explicitSkill=known(task.atlas?.skill)||known(task.skill);
  return {id:task.id,title:text(task.title)||'未命名项目',career:roleFor(task.career)?.id||roleFor(task.atlas?.career)?.id||unit?.career||null,
   description:known(last?.text)||known(task.note),contribution:known(task.contribution)||known(last?.contribution),
   source:unit||task.atlas?'practice':'external',skills:explicitSkill?[explicitSkill]:[],
   references:[sourceRef('task',task),...(last?[sourceRef('attempt',last)]:[])],
   to:unit?'/learning?tab=我的资源':task.mode==='S2'?'/work/'+encodeURIComponent(task.id)+'?tab=完成回执':'/plan?tab=执行&practice='+encodeURIComponent(task.id)+'&step=record'};
 });
 const fromUploads=unique(array(uploads).filter(item=>item.completed===true&&known(item.title)&&known(item.description)),record=>record.id).map(item=>({
  id:item.id,title:text(item.title),career:roleFor(item.career)?.id||null,description:text(item.description),contribution:known(item.contribution),source:'upload',
  // Upload metadata currently has no user-confirmed skill field. A selected
  // career category is a project link, never evidence for every skill in it.
  skills:[],file:copy(item.file||{}),references:[sourceRef('upload',item)],to:'/learning?tab=我的资源&source=upload'
 }));
 return [...fromTasks,...fromUploads];
}

function personalityOf(preferences){
 const type=getInterestType(preferences.interestType),group=type?.group||getInterestGroup(preferences.interestGroup);
 return {provided:!!group,type:type?.id||null,group:group?.id||null,groupName:group?.name||null,preference:group?.preference||'工作方式偏好尚未记录',traits:type?copy(interestTraits[type.id]||[]):[],
  limitation:'MBTI 是本人选择的工作偏好线索，不能据此判定职业、技术能力或胜任程度。'};
}

function recommendationFor(role,{claims,projects,mastery,personality}){
 const skills=roleSkills(role),relatedProjects=projects.filter(project=>project.career===role.id);
 const matchedSkills=skills.map(skill=>{
  const refs=[...claims.filter(claim=>known(claim.text)&&skillLabels(claim).some(label=>skillKey(label)===skillKey(skill.name))).map(claim=>sourceRef('claim',claim)),
   ...projects.filter(project=>project.skills.some(label=>skillKey(label)===skillKey(skill.name))).flatMap(project=>project.references.filter(ref=>ref.kind==='task'))];
  return {...skill,references:unique(refs,ref=>ref.kind+':'+ref.id+':'+ref.version),selfReported:mastery[skill.name]===true,learning:mastery[skill.name]===false};
 });
 const matched=matchedSkills.filter(skill=>skill.references.length),missing=matchedSkills.filter(skill=>!skill.references.length),self=matchedSkills.filter(skill=>skill.selfReported);
 const coverage={known:matched.length,total:skills.length,percent:percent(matched.length,skills.length),label:'技能依据覆盖'};
 const selfCoverage={known:self.length,total:skills.length,percent:percent(self.length,skills.length),label:'本人自评覆盖'};
 const content=careerDetailContent[role.id],reasons=[];
 if(matched.length)reasons.push(`${matched.length} / ${skills.length} 项技能有明确标签关联的材料，可逐项回查原文。`);
 if(relatedProjects.length)reasons.push(`${relatedProjects.length} 个已完成项目由本人关联到这个方向，项目方向不等于技能已掌握。`);
 if(self.length)reasons.push(`${self.length} 项能力被本人标记为已掌握，自评与作品依据分开显示。`);
 return {id:role.id,name:role.name,coverage,selfCoverage,projectCount:relatedProjects.length,projects:copy(relatedProjects),matchedSkills:matched,missingSkills:missing,skills:matchedSkills,reasons,
  preference:personality.provided?`${personality.preference}可通过“${content.workflow[0].title}”及与${content.collaboration[0].role}的协作，核对实际工作方式是否符合自己的偏好。`:'工作方式偏好未知，可先体验代表任务并记录感受。',
  hasEvidence:matched.length>0||relatedProjects.length>0,limitation:'覆盖程度说明现有资料能对应多少项技能标签，不是能力熟练度、适岗概率或录用概率。'};
}

function planOf(state,planRecords){
 const active=array(state.tasks).filter(task=>!finished(task)&&!['完成','取消','跳过','延期'].includes(task.status));
 const weekly=state.budget===null||state.budget===undefined||state.budget===''?null:Number(state.budget);
 return {goal:copy(roleFor(state.goal)),backup:copy(roleFor(state.backup)),reason:known(state.decision?.reason),question:known(state.decision?.question),
  weeklyHours:Number.isFinite(weekly)&&weekly>0?weekly:null,
  activeTasks:active.map(task=>({id:task.id,title:text(task.title),career:roleFor(task.career)?.id||null,status:text(task.status),due:known(task.due),hours:task.hours===null||task.hours===undefined||task.hours===''||!Number.isFinite(Number(task.hours))?null:Number(task.hours),purpose:known(task.purpose)})),
  periodGoalsIncluded:!!planRecords&&Array.isArray(planRecords.goals),periodGoals:copy(array(planRecords?.goals))};
}

function suggestionsFor(report,state){
 const target=report.work;
 if(!target)return [{id:'explore',career:null,title:'先完成一次方向探索小实践',kind:'explore',reason:'现有材料不足以选出优先岗位，先比较真实任务并留下本人产物。',focusSkills:[],steps:['从资源中心选择一个感兴趣的有限项目。','保留实际产物、本人贡献与工作感受。','完成后再对照岗位任务和能力要求。'],deliverable:'一次实践产物、贡献说明与仍待核对的问题',checks:['未把阅读或收藏当作完成','未依据性格类型推断技能'],to:'/learning?tab=资源中心'}];
 const candidate=report.comparisons.find(item=>item.id===target.id),active=report.plan.activeTasks.find(task=>task.career===target.id),practice=target.practice;
 const focusSkills=candidate.missingSkills.filter(skill=>skill.level!=='进阶').slice(0,3).map(skill=>skill.name);
 if(active)return [{id:'continue:'+active.id,career:target.id,title:active.title,kind:'continue',reason:'已有同方向行动尚未完成，先沿用原任务与交付要求，避免重复安排。',focusSkills,steps:copy(practice.steps),deliverable:practice.deliverable,checks:copy(practice.checks),to:'/learning?task='+encodeURIComponent(active.id)}];
 const existing=report.projects.find(project=>project.career===target.id),unit=learning.find(item=>item.career===target.id);
 return [{id:(existing?'extend:':'practice:')+target.id,career:target.id,title:existing?'扩展已完成项目：'+practice.title:unit?.title||practice.title,kind:existing?'extend':'practice',
  reason:focusSkills.length?'围绕尚缺明确材料的技能补充可回查产物：'+focusSkills.join('、')+'。':'已有技能标签均有材料关联，下一次实践可补充复现、反馈和改进依据。',
  focusSkills,steps:copy(practice.steps),deliverable:practice.deliverable,checks:copy(practice.checks),
  to:unit?'/learning?tab=资源中心&unit='+encodeURIComponent(unit.id):'/career-map?career='+encodeURIComponent(target.id),
  ...(existing?{projectId:existing.id}:{})}];
}

function reportSections(report){
 const {background,personality,plan,work}=report;
 const education=background.education.length?summarize(background.education,item=>[item.school,item.major,item.degree].filter(Boolean).map(value=>excerpt(value,160)).join(' / '),20):'教育经历尚未确认';
 const projects=report.projects.length?summarize(report.projects,item=>`${excerpt(item.title,120)}（${item.source==='upload'?'自主上传':item.source==='practice'?'平台实践':'本人记录'}；成果：${excerpt(item.description,500)||'内容待补充'}；本人贡献：${excerpt(item.contribution,200)||'待说明'}）`):'尚无已完成项目';
 const facts=background.claims.length?summarize(background.claims,item=>`${excerpt(item.title,120)||'已确认经历'}〔${excerpt(item.skill,80)||'技能标签未知'}〕`):'尚无本人确认经历';
 const self=background.capabilities.mastered.length?background.capabilities.mastered.join('、'):'尚未记录已掌握的能力';
 const personalityText=personality.provided?`${personality.type||personality.groupName}；${personality.preference}`:'工作方式偏好未知';
 let recommendation='材料不足，暂不生成最高推荐岗位。';
 if(report.recommendationStatus==='recommended')recommendation=`优先核对方向：${report.recommended.name}。`;
 if(report.recommendationStatus==='tie')recommendation=`现有依据并列支持${report.recommendedIds.map(id=>roleFor(id).name).join('、')}，暂不强行选出唯一最推荐岗位。`;
 const comparisons=report.recommendations.slice(0,3).map(item=>`${item.name}：技能依据覆盖 ${item.coverage.known}/${item.coverage.total}（${item.coverage.percent}%）；已完成相关项目 ${item.projectCount} 个；本人自评 ${item.selfCoverage.known}/${item.selfCoverage.total}；${item.preference}`).join('；');
 const working=work?`${work.name}：${work.lead}工作过程：${work.workflow.map(item=>item.title+'—'+item.description).join('；')}协作对象：${work.collaboration.map(item=>item.role).join('、')}。工作条件：${work.conditions}；具体岗位是否满足本人地域与工作约束仍需核对。所需能力（学习组织参考）：${work.skills.map(group=>group.label+'：'+group.items.join('、')).join('；')}。`:'尚无优先方向或本人主目标，岗位特点与所需能力待选定方向后展开。';
 const suggestion=report.learningSuggestions.map(item=>`${excerpt(item.title,200)}：${item.reason}交付：${item.deliverable}；步骤：${item.steps.join(' → ')}`).join('；');
 const planning=`主目标：${plan.goal?.name||'尚未确定'}；选择理由：${excerpt(plan.reason,500)||'待补充'}；待验证问题：${excerpt(plan.question,500)||'未知'}；每周预计预算：${plan.weeklyHours===null?'未知':plan.weeklyHours+' 小时'}；当前行动：${summarize(plan.activeTasks,item=>excerpt(item.title,120))||'暂无'}；周期目标：${plan.periodGoalsIncluded?summarize(plan.periodGoals,item=>excerpt(item.title,120))||'暂无':'本次未载入本机周期目标'}。`;
 return [
  {id:'background',title:'已完成项目与能力背景',text:`${background.stage||'学习阶段未知'}；${education}。已完成项目：${projects}。本人确认经历：${facts}。能力拼图自评：${self}。个人偏好与条件：${background.conditions.map(item=>item.title+'：'+excerpt(item.text,300)).join('；')||'地域与工作约束待补充'}。自评、经历与项目均不代表独立能力核验。`},
  {id:'recommendation',title:'推荐岗位与匹配依据',text:`${recommendation}${comparisons}工作偏好：${personalityText}。${personality.limitation}匹配程度采用技能依据覆盖，分母为站内岗位的技能标签数量，不能解释为胜任或录用概率。`},
  {id:'requirements',title:'岗位工作特点与所需能力',text:working},
  {id:'projects',title:'建议补充的项目',text:suggestion+'计划衔接：'+planning},
  {id:'limits',title:'引用与局限',text:report.limitations.join(' ')}
 ];
}

/** Pure shared report model. Independent upload and local period-goal records
 * must be supplied by the caller; their absence is shown rather than invented. */
export function buildCareerReport(state={},options={}){
 const preferences=state.preferences||{},claims=unique(array(state.claims).filter(claim=>claim.status==='已确认'),record=>record.id),mastery=capabilityMastery(preferences);
 const projects=completedProjects(state,options.uploads),personality=personalityOf(preferences),plan=planOf(state,normalizeReportPlanRecords(options.planRecords));
 const comparisons=careers.filter(role=>Object.hasOwn(careerDetailContent,role.id)).map(role=>recommendationFor(role,{claims,projects,mastery,personality})).sort(compare);
 const recommendations=comparisons.filter(item=>item.hasEvidence),best=recommendations[0],top=best?recommendations.filter(item=>compare(item,best)===0):[];
 const recommended=top.length===1?top[0]:null,target=roleFor(recommended?.id)||plan.goal;
 const background={stage:known(preferences.stage),education:array(state.education).filter(item=>item.status==='已确认').map(item=>pick(item,['id','version','withdrawnThrough','status','school','major','degree','courses','gpa','ranking','start','end','ongoing'])),claims:claims.map(item=>pick(item,['id','version','status','title','text','contribution','skill','skills','supportScope','artifactLocation','aid','type'])),pendingCount:array(state.claims).filter(item=>['待确认','疑似重复','矛盾'].includes(item.status)).length,
  conditions:[['地域偏好',preferences.location],['工作与时间约束',preferences.constraint],['个人兴趣',preferences.interest]].filter(([,value])=>known(value)).map(([title,value])=>({title,text:known(value)})),
  capabilities:{mastered:Object.keys(mastery).filter(skill=>mastery[skill]),learning:Object.keys(mastery).filter(skill=>!mastery[skill])}};
 const work=target?{id:target.id,name:target.name,lead:careerDetailContent[target.id].lead,conditions:target.env,workflow:copy(careerDetailContent[target.id].workflow),skills:copy(careerDetailContent[target.id].skills),deliverables:copy(careerDetailContent[target.id].deliverables),collaboration:copy(careerDetailContent[target.id].collaboration),practice:copy(careerDetailContent[target.id].practice),source:copy(careerDetailContent[target.id].source),pitfalls:copy(careerDetailContent[target.id].pitfalls)}:null;
 const limitations=['技能依据覆盖是明确技能标签与当前材料的对应数量，不衡量熟练度、胜任概率或录用概率。','候选顺序依次参考技能依据覆盖、本人关联的已完成项目数量和能力自评；性格不参与技能计算或强制职业分配。',personality.limitation,'材料采用本人确认经历、已完成任务与完成后上传的项目；本人确认、自检和上传均不是独立实核。',careerDetailNotes.skills,
  `资料版本 ${state.profileVersion??'未知'}；计划版本 ${state.planVersion??'未知'}。${state.analysisStale?'既有评估快照已过期，本报告未沿用其结论。':''}`,
  ...(!Array.isArray(options.uploads)?['本次未载入独立存储的上传项目；上传项目没有被推断为空或用作排序。']:[]),
  ...(!plan.periodGoalsIncluded?['本次未载入本机周期目标；不会补造周期安排或目标进度。']:[])];
 const report={model:'career-report-v1',background,projects,personality,plan,comparisons,recommendations,recommended,recommendedIds:top.map(item=>item.id),recommendationStatus:!best?'insufficient':recommended?'recommended':'tie',work,learningSuggestions:[],limitations,
  sourceStatus:{uploads:Array.isArray(options.uploads)?'loaded':'not-provided',planRecords:plan.periodGoalsIncluded?'loaded':'not-provided'}};
 report.learningSuggestions=suggestionsFor(report,state);report.sections=reportSections(report);return report;
}

export function careerReportBody(stateOrReport,options){
 const report=stateOrReport?.model==='career-report-v1'?stateOrReport:buildCareerReport(stateOrReport,options);
 return report.sections.map(section=>section.title+'：'+section.text).join('\n');
}
