import React from 'react';
import ControlIcon from './ControlIcon';
import {preparationState,previewPlanChange} from './workspace-focus-model.js';
import {cname} from './model.js';
export function AssessmentPreparation({s,link,precheck}){
 const p=preparationState(s),c=p.career;
 const rows=[
  ['岗位条件','地域、工作方式与适用条件需看具体岗位。',s.jobs.filter(j=>j.career===c.id&&!j.archived).length?'已有本人岗位研究卡，适用性仍需核对':'还未核对具体岗位条件','/careers?tab=企业与岗位','查看具体岗位'],
  ['专业任务',`对照 ${c.skill} 相关任务，准备产物与过程说明。`,p.related.length?`${p.related.length} 项相关确认材料，支持范围待验证`:'尚无相关确认材料','/assessment','整理已有作品'],
  ['贡献与协作','说明自己负责的部分、协作过程与辅助来源。',p.contributions.length?`${p.contributions.length} 项材料填写了本人贡献`:'本人贡献与行为记录待补充','/assessment?tab=原文确认','核对原文与贡献'],
  ['反馈与改进','保留实际反馈、采取的调整与尚未解决的问题。',p.reviews?`${p.reviews} 份本人复盘，改进效果未核验`:'尚未记录实践反馈','/plan?tab=复盘','记录行动复盘']
 ];
 return <section className="preparation-review" aria-label="职业准备核对"><header><h2>先明确要核对什么，再开始评估</h2><p>{c.name} · 本人确认材料 {p.facts.length} 项{p.pending.length?`，另有 ${p.pending.length} 项待确认`:''}。这里整理准备事项，不生成能力分数。</p></header><div className="preparation-review-grid"><section className="preparation-task"><h3>这个方向在做什么？</h3><p>{c.task}</p><h3>可以准备什么产物？</h3><p>{c.output}</p><p className="muted">{c.env}。以上为原创职业示例，不是企业的统一招聘门槛。</p><div className="actions">{link('/assessment?tab=资料经历',p.pending.length?'继续整理与确认':'记录已有经历','button primary')}<button onClick={()=>precheck({title:c.name+'任务短验证',career:c.id,purpose:'核对我能否说明'+c.output+'的过程、本人贡献与限制',product:c.output})}>安排一次有限验证</button></div>{link('/careers?career='+c.id,'先了解这个职业的工作内容 →')}</section><section className="preparation-checklist"><h3>四类依据，逐项补充</h3><dl>{rows.map(([title,description,status,to,action])=><div key={title}><dt>{title}</dt><dd><p>{description}</p><span>{status}</span>{link(to,action+' →')}</dd></div>)}</dl></section></div><footer>{p.facts.length?'材料已可用于建立模拟快照，仍需核对其能支持的具体范围。':'没有材料也可以先探索；手填或导入后，先在“提取与确认”核对，再建立快照。'}</footer></section>;
}
export function ResumeStart({s,link,onUpload,onCreate}){
 const p=preparationState(s);
 return <section className="resume-start" aria-label="简历准备起点"><div className="resume-start-paths"><section><h3>已有简历，从原稿开始</h3><p>上传文本型 PDF 或粘贴文字，核对后把需要的经历加入确认队列。</p><button className="primary" onClick={onUpload}>上传 PDF / 粘贴简历</button></section><section><h3>用已确认材料制作</h3><p>{p.facts.length?`已有 ${p.facts.length} 项确认经历，可挑选与岗位相关的内容。`:'还没有确认经历。课程、项目或实际行动都可以先整理，不要求实习经历。'}</p><button onClick={onCreate}>{p.facts.length||p.education.length?'从已有材料制作':'打开简历编辑台'}</button>{link('/assessment?tab=资料经历','补充与确认材料 →')}</section></div><section className="resume-source-readiness"><h3>制作前，看看手边有哪些材料</h3><dl>{[['经历与产物',p.facts.length?`${p.facts.length} 项本人确认`:p.pending.length?`${p.pending.length} 项待本人确认`:'尚未整理','/assessment?tab=原文确认'],['教育经历',p.education.length?`${p.education.length} 项本人确认`:'未提供，可选填','/assessment'],['联系资料',p.profile?'已本人确认':'未提供，可选填','/assessment'],['目标岗位',s.jobs.length?`${s.jobs.length} 份本人岗位研究卡`:'可先制作通用简历','/careers?tab=我的机会']].map(([title,status,to])=><div key={title}><dt>{title}</dt><dd><span>{status}</span>{link(to,'查看与补充 →')}</dd></div>)}</dl><p>确认一种经历或教育记录即可开始编排。保存后按目标分别管理原稿、版本和当前使用的简历。</p></section></section>;
}
export function PlanChangePreview({s,draft}){
 const p=previewPlanChange(s,draft);
 return <section className="plan-change-preview" aria-label="计划变更影响"><div className="plan-change-summary"><div><span>主目标</span><p>{cname(s.goal)} → {cname(draft.goal)}</p></div><div><span>每周预算</span><p>{s.budget??'未定'} → {draft.budget} 小时</p></div><div><span>预计安排</span><p>{p.beforeHours} → {p.afterHours??'预算待确认'} 小时</p></div></div>{!p.valid?<p role="alert">请填写 0 至 168 小时之间的正数预算，再查看任务影响。</p>:s.tasks.length?<div className="table-wrap"><table><thead><tr><th>原任务</th><th>当前安排</th><th>应用后的安排</th></tr></thead><tbody>{p.tasks.map((t,i)=><tr key={t.id}><td>{t.title}</td><td>{s.tasks[i].hours}h · {s.tasks[i].status}</td><td>{t.hours}h · {t.status}{t.scopeReview?' · 成果范围待复核':''}{t.completed?' · 已有成果保留':''}</td></tr>)}</tbody></table></div>:<p>当前没有任务；应用只会调整目标与周预算，不会自动创建行动。</p>}<p>{p.stale?'基线已更新，须重新预览后才能应用。':`计划 v${s.planVersion}；${p.changes} 项任务安排会变化。已有尝试、产物、确认材料和复盘保留。`}</p></section>;
}
export function PlanAdjustment({s,open,update,expanded=false}){
 const draft=s.scenario;
 return <details className="plan-adjustment" open={expanded||!!draft} id="plan-adjustment">
  <summary><ControlIcon name="route" size={18}/><span>调整目标与预算</span><small>{draft?'有未应用的方案副本':'先预览影响'}</small><ControlIcon name="chevron" size={16}/></summary>
  <div className="plan-adjustment-body"><div className="section-heading"><div><h3>{draft?'继续核对方案副本':'先看清当前安排，再调整'}</h3><p>保存副本不改实际计划，本人确认后才应用。</p></div><button onClick={()=>open('scenario',draft||{budget:s.budget??0,goal:s.goal||'',base:s.planVersion,policy:'延后超额任务'})}>{draft?'继续预览与应用':'建立预算 / 范围方案'}</button></div>{draft?<><PlanChangePreview s={s} draft={draft}/><button onClick={()=>update({scenario:null})}>丢弃方案</button></>:<p className="plan-adjustment-note">可比较延期与缩小范围，已完成成果始终保留。</p>}</div>
 </details>;
}
export function SalaryContext({job,expanded=false}){
 return <details className="salary-context" id="salary-context" open={expanded}><summary>薪酬与适用条件</summary><dl><div><dt>岗位薪酬原文</dt><dd>{job.salaryRaw||'未提供'}</dd></div><div><dt>来源与日期</dt><dd>{job.source||'来源未知'} · {job.date||'日期未知'}</dd></div></dl><p>尚无获准且时效已核验的薪酬样本，暂不发布市场统计或个人预测。</p><h3>继续研究岗位时，核对这些信息</h3><ul><li>币种、计薪周期，以及固定与浮动部分是否分别说明。</li><li>地点、工时、试用期及适用对象是否与你关注的岗位一致。</li><li>来源与资料日期是否可追溯；面议或缺失信息保持未知。</li></ul><small>保留原值，不把面议记为零，不从缺少工时的标注推算月薪。私人岗位记录不参与目录聚合。</small></details>;
}
