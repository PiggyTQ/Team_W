import {careers,cname,confirmed,usedHours,uid} from './model.js';

export function searchPresetDraft(p) {
  const scopes=['职业原创知识','获准岗位（无数据源）','本人私有研究卡','展示岗位样本'];
  return {query:typeof p.query==='string'?p.query:'',career:(p.career==='any'||careers.some(c=>c.id===p.career))?p.career:'any',location:p.location||'不限',form:['不限','远程','现场','混合'].includes(p.form)?p.form:'不限',scope:scopes.includes(p.scope)?p.scope:scopes[0],...(p.scope==='展示岗位样本'?{market:['CN','international_reference',''].includes(p.market)?p.market:'CN'}:{}),parsed:true,searched:false,date:new Date().toISOString().slice(0,10)};
}
export function saveSearchPreset(presets,filters) {
  const draft=searchPresetDraft(filters),same=p=>['career','location','form','scope',...(draft.scope==='展示岗位样本'?['market']:[])].every(k=>p[k]===draft[k]);
  const old=presets.find(same),record={...draft,id:old?.id||uid('preset'),notifications:false};
  return old?presets.map(p=>p.id===old.id?record:p):[...presets,record];
}
export function planningReportBody(s) {
  const facts=confirmed(s),career=careers.find(c=>c.id===s.goal),a=s.analysis;
  const rows=[
    ['个人概览与资料范围',`${s.preferences.stage||'学习阶段未知'}；当前意图：${s.preferences.intent||'未知'}。本人确认材料 ${facts.length} 项，待核对 ${s.claims.length-facts.length} 项；未确认内容不作为事实。`],
    ['目标与理由',`${cname(s.goal)}；${s.decision.reason||'理由待补充'}。${s.decision.question?'想验证的问题：'+s.decision.question+'；':''}备用：${cname(s.backup)}。`],
    ['职业要求与范围',career?`${career.name}；${career.branch}。典型任务：${career.task} 具体条件以本人保存的岗位原文为准。`:'尚未选择主职业目标，允许继续独立探索；不生成确定职业要求。'],
    ['四维依据',a?`已保存${cname(a.occupation)}的分析记录；${s.analysisStale?'依据已有变化，需复查':'可回评估页核对'}。职业条件与具体行为仍待核对；专业关联基于确认材料；改进过程有${a.reviewRefs?.length??0}份引用。`:'尚无分析快照。职业条件、专业任务关联、具体行为与改进过程均待核对。'],
    ['材料与差距',facts.length?facts.map(c=>`${c.title}（材料v${c.version}；${c.skill||'技能未知'}；贡献：${c.contribution||'待说明'}；本人确认，未独立实核）`).join('；')+'。缺材料、缺知识、未知分别回原页面核对。':'没有确认材料；先补已有经历，或通过有限验证形成产物，不判定为不会。'],
    ['候选与取舍',`${s.compare.length?s.compare.map(cname).join(' / '):'尚无比较候选'}；判断：${s.decision.result||'仍未知'}。`],
    ['职业桥接与技能路线',career?`当前示例起点为${career.skill}，按用途区分学习、验证或补材料。只使用已发布关系；跨职业与责任进阶关系尚需审核，不承诺晋升或转岗。`:'未指定路线，先按疑问选择小范围探索；不将全部技术列为必修。'],
    ['计划与预算',`计划v${s.planVersion}；每周总预算 ${s.budget??'未定'} 小时；当前有效任务预计 ${usedHours(s)} 小时，独立探索与岗位准备共计。${s.tasks.length?'已有任务按原ID和标准继续。':'尚无行动安排，可手编或从学习预览进入预算预检。'}预计投入不是实际耗时或能力指标。`],
    ['行动与成果',s.tasks.length?s.tasks.map(t=>`${t.title}（${t.status}；检查：${t.check}；${t.attempts.length?'成果v'+t.attempts.at(-1).version:'尚无提交版本'}；本人贡献：${t.contribution||'待补充'}）`).join('；')+'。任务完成、成果提交、检查与声明确认分别记录。':'尚无行动记录，不补造项目、访谈、实习或成果数字。'],
    ['复盘与调整',s.reviews.length?`已保存${s.reviews.length}份本人复盘。私人结果、困难和调整正文默认不进入报告；可到复盘页核对，导出时逐条主动选择片段。`:'尚未记录复盘；可在行动后保存实际反馈、困难与下一调整。'],
    ['引用与局限',`本人资料v${s.profileVersion}、计划v${s.planVersion}；原创合成知识v1；来源状态：${s.adminSource.status}，内容状态：${s.adminContent.status}。没有真实分析、实时招聘或独立能力核验；事实改动回个人评估、计划改动回目标计划。`],
  ];
  return rows.map(([title,text])=>title+'：'+text).join('\n');
}

export function recordAdminAction(current,action,reason='') {
  const history=[...(current.history||[]),{id:uid('admin-log'),action,version:current.version,date:new Date().toISOString(),reason:reason||current.reason||'本机合成演示；实际审核人未指派'}];
  return {...current,history};
}
