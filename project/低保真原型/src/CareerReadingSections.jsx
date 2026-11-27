import React from 'react';
import ProductIcon from './ProductIcon';
import Example from './CareerArtifactExamples';
import CareerTrial from './CareerTrial';
import CareerGrowthCollaboration from './CareerGrowthCollaboration';

function ChapterHead({icon,title,description,children}){
 return <header className="career-chapter-head"><span className="career-chapter-symbol"><ProductIcon name={icon} size={29}/></span><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{children&&<div className="career-chapter-action">{children}</div>}</header>;
}

export function CareerOverviewSection({role,guide,tx,readingLink,sourceUrl,onSource}){
 const occupation=role.occupation;
 return <section className="career-reading-section career-overview-experience" id="career-overview" tabIndex={-1}>
  <ChapterHead icon="compass" title={tx('这份工作，具体怎么做','What the work looks like')} description={role.occupation.problem}>{readingLink('work',tx('看一个完整案例 →','See a complete case →'))}</ChapterHead>
  <ol className="career-work-moments">{guide.workMoments.map((moment,i)=><li key={moment.title}><span className="career-moment-number">{i+1}</span><h3>{moment.title}</h3><p>{moment.text}</p><div><ProductIcon name="file" size={18}/><span>{moment.output}</span></div></li>)}</ol>
  <div className="career-scope-layout"><section className="career-specialisations"><h3>{tx('同一方向，工作侧重也会不同','Different ways to work in this field')}</h3><dl>{occupation.tracks.map(track=><div key={track.title}><dt>{track.title}</dt><dd>{track.text}</dd></div>)}</dl></section><aside className="career-boundary-panel"><ProductIcon name="balance" size={30}/><h3>{tx('别把相近的工作混为一谈','Keep neighbouring roles distinct')}</h3><p>{guide.boundary}</p><details><summary>{tx('查看完整职业范围','Read the full scope')}</summary><p>{occupation.intro}</p><p>{occupation.boundary}</p></details></aside></div>
  <details className="career-full-workflow"><summary>{tx('从需求到维护的完整流程','The full journey from need to maintenance')}</summary><ol>{occupation.flow.map(step=><li key={step.title}><h4>{step.title}</h4><p>{step.text}</p></li>)}</ol></details>
  <SourceLinks role={role} sourceUrl={sourceUrl} onSource={onSource} ids={occupation.sourceIds} label={tx('职业活动与方法依据','Occupational and method references')}/>
 </section>;
}

export function CareerCaseSection({role,tx,readingLink,sourceUrl,onSource}){
 return <section className="career-reading-section" id="career-work" tabIndex={-1}>
  <ChapterHead icon="clipboard" title={role.case.title} description={role.lead}><span className="career-synthetic-label">{tx('本站原创合成教学示例','Original synthetic teaching case')}</span></ChapterHead>
  <div className="career-case-stage">
   <section className="career-case-brief"><div className="career-case-sender"><ProductIcon name="collaboration" size={21}/><span>{tx('任务委托','The brief')}<strong>{role.case.requester}</strong></span></div><h3 className="career-case-question">{role.case.question}</h3><div className="career-case-input"><h4>{tx('给定输入与限制','Inputs and constraints')}</h4><p>{role.case.input}</p>{role.practice.materials&&readingLink('practice',tx('查看本例原文与待审输入','Read this case’s source inputs'))}</div></section>
   <aside className="career-case-preview"><header><ProductIcon name="file" size={21}/><h3>{tx('先看一份实际产物','See a concrete deliverable')}</h3></header><div className="career-preview-paper"><Example value={role.case.preview}/></div><a className="career-preview-link" href="#career-deliverables">{tx('查看完整交付链 ↓','See the full delivery chain ↓')}</a></aside>
  </div>
  <div className="career-case-lens"><span>{role.focus}</span><p>{role.occupation.slice}</p></div>
  <div className="career-case-judgments"><section><h3><ProductIcon name="graph" size={22}/>{tx('怎样处理、作出什么判断','What work and judgments follow?')}</h3><ol>{role.case.decisions.map((r,i)=><li key={i}>{r}</li>)}</ol></section><section className="career-review-note"><h3><ProductIcon name="collaboration" size={22}/>{tx('谁来复核','Who reviews it?')}</h3><p>{role.case.review}</p></section></div>
  <SourceLinks role={role} sourceUrl={sourceUrl} onSource={onSource} ids={role.sourceRecords.filter(r=>role.sourceClaims[r.id]?.some(claim=>/^(case|workflow|deliverables)(\.|$)/.test(claim))).map(r=>r.id)} label={tx('本例方法依据','Methods used in this case')}/>
  <ol className="career-work-chain">{role.workflow.map((r,i)=><li key={i}><span className="career-chain-index">{String(i+1).padStart(2,'0')}</span><div><h3>{r.title}</h3><p>{r.description}</p><small><ProductIcon name="file" size={16}/>{r.output}</small></div></li>)}</ol>
  <div className="career-delivery-heading"><span><ProductIcon name="file" size={25}/></span><h2 id="career-deliverables" tabIndex={-1} className="career-delivery-title">{tx('最终交付什么：直接看内容','What is delivered: see the content')}</h2></div>
  <div className={'career-artifacts count-'+role.deliverables.length+(role.id==='data'?' data-artifacts':'')}>{role.deliverables.map((d,i)=><section className="career-artifact" data-example={d.example.kind} key={i}><header><span>{String(i+1).padStart(2,'0')}</span><div><h3>{d.title}</h3><p>{d.description}</p></div><ProductIcon name="file" size={24}/></header><div className="career-artifact-body"><div className="career-artifact-document"><Example value={d.example}/></div><aside><dl className="career-artifact-use"><div><dt>{tx('交给谁','Recipient')}</dt><dd>{d.audience}</dd></div><div><dt>{tx('解决什么','Purpose')}</dt><dd>{d.use}</dd></div></dl><h4>{tx('验收看什么','Acceptance checks')}</h4><ul className="career-quality-checks">{d.checks.map((v,j)=><li key={j}><ProductIcon name="check" size={16}/>{v}</li>)}</ul></aside></div></section>)}</div>
 </section>;
}

export function CareerPreparationSection({role,tx,evidence,link}){
 return <section className="career-reading-section" id="career-preparation" tabIndex={-1}>
  <ChapterHead icon="graduation" title={tx('可以展示哪些基础','Foundations you can demonstrate')} description={role.occupation.preparation}/>
  <div className="career-preparation-rows">{role.preparation.map((r,i)=><section className="career-readiness-item" key={i}><header><span>{String(i+1).padStart(2,'0')}</span><h3>{r.skill}</h3></header><div className="career-readiness-work"><h4>{tx('在工作中怎么用','How it is used at work')}</h4><p>{r.work}</p></div><div className="career-readiness-quality"><h4><ProductIcon name="check" size={19}/>{tx('质量落点','Quality outcome')}</h4><p>{r.quality}</p></div></section>)}</div>
  <aside className="career-evidence-note"><div><ProductIcon name="bookmark" size={28}/></div><section><h3>{tx('与自己的材料对照','Compare with your own evidence')}</h3><p>{evidence.length?tx('已有明确关联记录','Explicitly related records')+': '+evidence.length:tx('尚未选择明确关联的职业/技能材料；工具名相同不等于整个职业准备充分。','No explicitly related career/skill evidence is selected. Sharing a tool name does not establish career-wide readiness.')}</p>{evidence.length>0&&<ul>{evidence.map(c=><li key={c.id} translate="no">{c.title}</li>)}</ul>}<small>{tx('本人确认材料只代表相关任务自述；没有记录不等于没有能力。','Confirmed materials are self-reported task evidence; missing records do not imply inability.')}</small></section>{link('/assessment?tab='+encodeURIComponent('原文确认'),tx('核对材料与调整关联','Review materials and edit links'),'button')}</aside>
 </section>;
}

export function CareerGrowthSection({role}){return <CareerGrowthCollaboration key={role.id} role={role}/>;}

export function CareerPracticeSection({role,tx,s,update,sync,ownerKey,link,open}){
 return <section className="career-reading-section" id="career-practice" tabIndex={-1}>
  <ChapterHead icon="clipboard" title={role.practice.title} description={role.practice.brief}/>
  <div className="career-practice-sheet"><section><h3><ProductIcon name="file" size={22}/>{tx('拿到什么输入','Your input')}</h3><p>{role.practice.input}</p><h3>{tx('先完成什么','Your first task')}</h3><ol>{role.practice.steps.map((v,i)=><li key={i}>{v}</li>)}</ol></section><section className="career-practice-outcome"><h3><ProductIcon name="bookmark" size={22}/>{tx('留下一份小产物','Your small deliverable')}</h3><p>{role.practice.deliverable}</p><h3>{tx('怎样检查','How to check')}</h3><ul>{role.practice.checks.map((v,i)=><li key={i}>{v}</li>)}</ul></section></div>
  {role.practice.fork&&<section className="career-case-fork"><h3>{role.practice.fork.title}</h3><p>{role.practice.fork.question}</p>{role.practice.fork.example&&<Example value={role.practice.fork.example}/>}<small>{(()=>{const source=role.sourceRecords.find(r=>r.id===role.practice.fork.sourceId);return source&&<a href={source.url} target="_blank" rel="noreferrer">{source.title} · {role.practice.fork.section}</a>;})()}</small></section>}
  {role.practice.files&&<div className="career-file-links">{role.practice.files.map(f=><a key={f.url} href={f.url} download>{f.label}</a>)}</div>}
  <CareerTrial role={role} s={s} update={update} sync={sync} owner={ownerKey}/>
  <section className="career-reading-next"><h3>{tx('继续学习与实践','Continue learning and practicing')}</h3><p className="career-skill-transition">{tx('以下入口学习相关方法，会进入另一套练习材料；本例草稿留在此页。','The links below teach related methods using a different exercise. Your case draft stays here.')}</p><div className="career-practice-actions">{link(role.practice.route,tx('学习相关技能（另一套练习）','Learn the related skill (different exercise)'),'button primary')}{role.id==='data'&&link('/learning/projects/quality',tx('了解独立的数据质量项目','Explore the separate data-quality project'),'button')}{link('/career-map?career='+role.id,tx('查看技能树','View skill tree'))}<button type="button" onClick={()=>open('goal',{goal:role.id,reason:'',backup:s.backup||''})}>{tx('预览目标选择','Preview target choice')}</button></div><small>{tx('阅读或本页演示不会记为技能掌握；检验、学习记录及任务预算继续由原页面处理。','Reading or the local demo does not mark mastery. Existing pages handle checks, learning records and task budgets.')}</small></section>
 </section>;
}
const sourceTypes={
 occupational_standard:['职业标准','Occupational standard'],occupation_reference:['职业活动','Occupational activities'],
 technical_method:['技术方法','Technical method'],risk_framework:['专业框架','Professional framework'],
 vendor_method:['厂商方法','Vendor method'],professional_syllabus:['专业大纲','Professional syllabus'],
 optional_reference:['选读','Further reading'],historical_notice:['历史出处','Historical reference'],
};
const sourceStatuses={
 read_relevant_sections:['已核读所列章节','Listed sections reviewed'],
 read_institutional_copy:['已核读机构公开件','Institutional copy reviewed'],
 read_official_mirror:['已核读政务镜像','Government mirror reviewed'],
 read_index:['已核读目录，全文待核','Index reviewed; full text pending'],
 read_reposted_notice:['已核读机构转载件','Institutional repost reviewed'],
 metadata_only:['已核对版本和目录，正文待核','Version and contents checked; chapter review pending'],
};
function SourceLinks({role,ids,label,sourceUrl,onSource}){
 if(!ids.length)return null;
 return <div className="career-source-inline"><span>{label}</span>{ids.map(id=>{
  const record=role.sourceRecords.find(r=>r.id===id);
  return record&&<a key={id} href={sourceUrl(id)} onClick={event=>onSource(event,id)}>{record.title}</a>;
 })}</div>;
}
export function CareerSourcesSection({role,tx}){
 const dates=r=>[
  [tx('原文更新','Source updated'),r.originalUpdated||tx('未标注或待核','Not stated or unverified')],
  [tx('发布或创建','Published or created'),r.publicationDate],
  [tx('公告日期','Notice date'),r.noticeDate],
  [tx('镜像日期','Mirror date'),r.mirrorDate],
  [tx('范围版本日期','Scope version date'),r.scopeDate],
  [tx('批准日期','Approved'),r.approvalDate],
  [tx('核查访问','Reviewed on'),r.accessed],
 ].filter(([,v])=>v);
 return <section className="career-reading-section" id="career-sources" tabIndex={-1}>
  <ChapterHead icon="file" title={tx('来源与适用范围','Sources and scope')} description={tx('职业活动按所列地区和职业解读。技术方法、选用工具及本站的原创示例各有适用范围。','Read occupational activities within the listed region and occupation. Technical methods, optional tools and original examples each have their own scope.')}/>
  <p className="career-source-version">{tx('本站内容版本','Site content version')} <code>{role.version}</code></p>
  <div className="career-source-register">{role.sourceRecords.map(r=><details className="career-reference" id={'career-source-'+r.id} key={r.id}>
   <summary><ProductIcon name="file" size={22}/><span><strong>{r.title}</strong><span className="career-reference-publisher">{r.publisher} · {r.region}</span></span><small>{tx(...sourceTypes[r.type])}</small></summary>
   <div className="career-reference-body">
   <p>{r.coverage}</p>
   <p><strong>{tx('核读范围','Reviewed scope')} · </strong>{r.sections} · {tx(...sourceStatuses[r.status])}</p>
   <p><strong>{tx('支持的内容','Supports')} · </strong>{r.supports}</p>
   {r.note&&<p>{r.note}</p>}{r.fieldUpdates&&<p>{r.fieldUpdates}</p>}
   <dl>{[[tx('原文版本','Original version'),r.version],...dates(r)].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
   <div className="career-source-inline"><a href={r.url} target="_blank" rel="noreferrer">{tx('查看阅读件','Open source consulted')}</a>{r.publicationUrl&&<a href={r.publicationUrl} target="_blank" rel="noreferrer">{tx('版本或公告记录','Edition or notice record')}</a>}{r.originalUrl&&<a href={r.originalUrl} target="_blank" rel="noreferrer">{tx('中央原链（待核）','Central link (unverified)')}</a>}</div>
   <details><summary>{tx('许可、改编和使用方式','License, changes and use')}</summary><p>{r.license}</p><p>{r.usage}</p><div className="career-source-inline">{r.licenseUrl&&<a href={r.licenseUrl} target="_blank" rel="noreferrer">{tx('原站许可说明','Source license information')}</a>}{r.attributionLicenseUrl&&<a href={r.attributionLicenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>}</div></details>
   </div>
  </details>)}</div>
 </section>;
}
