import React,{useEffect,useRef,useState} from 'react';
import {careerContent,careerRelatedEvidence} from './career-exploration-model';
import {useLanguage} from './i18n/render';
import ProductIcon from './ProductIcon';
import CareerCompareBasket from './CareerCompareBasket';
import Example from './CareerArtifactExamples';
import CareerTrial from './CareerTrial';
import './career-exploration-reading.css';
const sectionNames=[['overview','职业全貌','Career overview'],['work','代表案例','Representative case'],['preparation','能力与准备','Preparation'],['growth','成长与协作','Growth and collaboration'],['practice','入门体验','First practice'],['sources','来源与范围','Sources and scope']];
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
function SourceLinks({role,ids,label}){
 if(!ids.length)return null;
 return <div className="career-source-inline"><span>{label}</span>{ids.map(id=>{
  const record=role.sourceRecords.find(r=>r.id===id);
  return record&&<a key={id} href={'#career-source-'+id} onClick={()=>{const source=document.getElementById('career-source-'+id);if(source)source.open=true;}}>{record.title}</a>;
 })}</div>;
}
function CareerSources({role,tx}){
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
  <h2>{tx('来源与适用范围','Sources and scope')}</h2>
  <p className="career-measure">{tx('职业活动按所列地区和职业解读。技术方法、选用工具及本站的原创示例各有适用范围。','Read occupational activities within the listed region and occupation. Technical methods, optional tools and original examples each have their own scope.')}</p>
  <p>{tx('本站内容版本','Site content version')} <code>{role.version}</code></p>
  {role.sourceRecords.map(r=><details className="career-reference" id={'career-source-'+r.id} key={r.id}>
   <summary><strong>{r.title}</strong><small>{tx(...sourceTypes[r.type])}</small></summary>
   <p>{r.publisher} · {r.region}</p>
   <p>{r.coverage}</p>
   <p><strong>{tx('核读范围','Reviewed scope')} · </strong>{r.sections} · {tx(...sourceStatuses[r.status])}</p>
   <p><strong>{tx('支持的内容','Supports')} · </strong>{r.supports}</p>
   {r.note&&<p>{r.note}</p>}{r.fieldUpdates&&<p>{r.fieldUpdates}</p>}
   <dl>{[[tx('原文版本','Original version'),r.version],...dates(r)].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
   <div className="career-source-inline"><a href={r.url} target="_blank" rel="noreferrer">{tx('查看阅读件','Open source consulted')}</a>{r.publicationUrl&&<a href={r.publicationUrl} target="_blank" rel="noreferrer">{tx('版本或公告记录','Edition or notice record')}</a>}{r.originalUrl&&<a href={r.originalUrl} target="_blank" rel="noreferrer">{tx('中央原链（待核）','Central link (unverified)')}</a>}</div>
   <details><summary>{tx('许可、改编和使用方式','License, changes and use')}</summary><p>{r.license}</p><p>{r.usage}</p><div className="career-source-inline">{r.licenseUrl&&<a href={r.licenseUrl} target="_blank" rel="noreferrer">{tx('原站许可说明','Source license information')}</a>}{r.attributionLicenseUrl&&<a href={r.attributionLicenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>}</div></details>
  </details>)}
 </section>;
}
export default function CareerReadingPage({current,s,url,returnTo,link,open,toggleCompare,update,sync,ownerKey}){
 const language=useLanguage(),en=language==='en',tx=(z,e)=>en?e:z,role=careerContent(current.id,language),params=new URL(url,location.origin).searchParams,section=params.get('section'),heading=useRef(),[active,setActive]=useState(sectionNames.some(([id])=>id===section)?section:'overview');
 const occupation=role.occupation;
 const saved=s.favorites.includes(current.id),compared=s.compare.includes(current.id),evidence=careerRelatedEvidence(s,current.id);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   const sourceId=new URL(url,location.origin).hash.slice(1);
   const source=sourceId.startsWith('career-source-')?document.getElementById(sourceId):null;
   if(source){source.open=true;source.scrollIntoView({block:'start'});source.querySelector('summary')?.focus({preventScroll:true});return;}
   const target=sectionNames.some(([id])=>id===section)?document.getElementById('career-'+section):null;
   target?.scrollIntoView({block:'start'});
   (target||heading.current)?.focus({preventScroll:true});
  });
  return()=>cancelAnimationFrame(frame);
 },[current.id,section,url]);
 useEffect(()=>{const root=document.getElementById('main');let frame;const read=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const top=(root?.getBoundingClientRect().top||0)+110;let current='overview';for(const [id]of sectionNames){const el=document.getElementById('career-'+id);if(el&&el.getBoundingClientRect().top<=top)current=id;}setActive(current);});};root?.addEventListener('scroll',read,{passive:true});window.addEventListener('resize',read);read();return()=>{cancelAnimationFrame(frame);root?.removeEventListener('scroll',read);window.removeEventListener('resize',read);};},[current.id]);
 const route=id=>{const next=new URL(url,location.origin);next.searchParams.set('section',id);return next.pathname+next.search;};
 return <article className="career-reading" data-i18n="off">
 <nav className="career-reading-back">{link(returnTo,tx('← 返回职业列表','← Back to career list'))}<CareerCompareBasket s={s} link={link} toggleCompare={toggleCompare}/></nav>
 <header className="career-reading-hero">
  <div className="career-hero-title"><img src="/illustrations/cheese-scenes/explore.png" alt=""/><div><h1 ref={heading} tabIndex={-1}>{role.name}</h1>{!en&&<p className="career-english-name" lang="en">{role.englishName}</p>}<p className="career-occupation-intro">{occupation.intro}</p></div></div>
  <div className="career-hero-actions"><button type="button" aria-pressed={saved} onClick={()=>update({favorites:saved?s.favorites.filter(id=>id!==current.id):[...s.favorites,current.id]})}><ProductIcon name="bookmark" size={18}/>{saved?tx('已收藏','Saved'):tx('收藏方向','Save career')}</button><button type="button" className={compared?'':'primary'} aria-pressed={compared} onClick={()=>toggleCompare(current.id)}><ProductIcon name={compared?'check':'plus'} size={18}/>{compared?tx('已加入比较','Added to comparison'):tx('加入比较','Add to comparison')}</button></div>
 </header>
 <nav className="career-section-nav" aria-label={tx('职业阅读导航','Career reading sections')}><strong>{role.name}</strong>{sectionNames.map(([id,z,e])=>React.cloneElement(link(route(id),en?e:z),{'aria-current':active===id?'location':undefined}))}</nav>
 {section&&!sectionNames.some(([id])=>id===section)&&<p role="status">{tx('阅读位置不可用，已从职业全貌开始。','This reading position is unavailable. Start with the career overview.')}</p>}
 <section className="career-reading-section" id="career-overview" tabIndex={-1}>
  <h2>{tx('职业全貌','Career overview')}</h2>
  <p className="career-measure">{occupation.boundary}</p>
  <div className="career-occupation-grid">
   <section><h3>{tx('从需求到维护','From need to maintenance')}</h3><ol>{occupation.flow.map(step=><li key={step.title}><h4>{step.title}</h4><p>{step.text}</p></li>)}</ol></section>
   <section><h3>{tx('常见工作侧重','Common specialisations')}</h3><dl>{occupation.tracks.map(track=><div key={track.title}><dt>{track.title}</dt><dd>{track.text}</dd></div>)}</dl><small>{tx('本站按工作活动归纳，实际分工因组织而异。','Avemly groups these by activity. Responsibilities vary by organisation.')}</small></section>
  </div>
  <div className="career-occupation-summary"><p><strong>{tx('典型产物','Typical outputs')} · </strong>{occupation.outputs}</p><p><strong>{tx('常见协作','Typical collaborators')} · </strong>{occupation.collaboration}</p></div>
  <SourceLinks role={role} ids={occupation.sourceIds} label={tx('职业活动与方法依据','Occupational and method references')}/>
 </section>
 <section className="career-reading-section" id="career-work" tabIndex={-1}><div className="career-section-heading"><h2>{role.case.title}</h2><span>{tx('本站原创合成教学示例','Original synthetic teaching case')}</span></div>
 <p className="career-case-lens"><strong>{role.focus}</strong> · {occupation.slice}</p>
 <p className="career-measure">{role.lead}</p>
 <div className="career-case-overview"><div><h3>{tx('谁带来什么问题','Who brings the question?')}</h3><strong>{role.case.requester}</strong><p>{role.case.question}</p><h3>{tx('给定输入与限制','Inputs and constraints')}</h3><p>{role.case.input}</p>{role.practice.materials&&link(route('practice'),tx('查看本例原文与待审输入','Read this case’s source inputs'))}</div><aside className="career-case-preview"><h3>{tx('先看一份实际产物','See a concrete deliverable')}</h3><Example value={role.case.preview}/><a href="#career-deliverables">{tx('查看完整交付链 ↓','See the full delivery chain ↓')}</a></aside></div>
 <div className="career-case-judgments"><section><h3>{tx('怎样处理、作出什么判断','What work and judgments follow?')}</h3><ol>{role.case.decisions.map((r,i)=><li key={i}>{r}</li>)}</ol></section><section><h3>{tx('谁来复核','Who reviews it?')}</h3><p>{role.case.review}</p></section></div>
 <SourceLinks role={role} ids={role.sourceRecords.filter(r=>role.sourceClaims[r.id]?.some(claim=>/^(case|workflow|deliverables)(\.|$)/.test(claim))).map(r=>r.id)} label={tx('本例方法依据','Methods used in this case')}/>
 <ol className="career-work-chain">{role.workflow.map((r,i)=><li key={i}><ProductIcon name={['clipboard','layers','file'][i%3]} size={23}/><div><h3>{r.title}</h3><p>{r.description}</p><small>{r.output}</small></div></li>)}</ol>
 <h2 id="career-deliverables" tabIndex={-1} className="career-delivery-title">{tx('最终交付什么：直接看内容','What is delivered: see the content')}</h2>
 <div className={'career-artifacts count-'+role.deliverables.length+(role.id==='data'?' data-artifacts':'')}>{role.deliverables.map((d,i)=><section className="career-artifact" data-example={d.example.kind} key={i}><header><span>{String(i+1).padStart(2,'0')}</span><h3>{d.title}</h3></header><p>{d.description}</p><div className="career-artifact-body"><div><Example value={d.example}/></div><aside><dl className="career-artifact-use"><div><dt>{tx('交给谁','Recipient')}</dt><dd>{d.audience}</dd></div><div><dt>{tx('解决什么','Purpose')}</dt><dd>{d.use}</dd></div></dl><h4>{tx('验收看什么','Acceptance checks')}</h4><ul className="career-quality-checks">{d.checks.map((v,j)=><li key={j}><ProductIcon name="check" size={16}/>{v}</li>)}</ul></aside></div></section>)}</div></section>
 <section className="career-reading-section" id="career-preparation" tabIndex={-1}><h2>{tx('可以展示哪些基础','Foundations you can demonstrate')}</h2><p className="career-measure">{occupation.preparation}</p><h3>{tx('在本例中如何观察','What to look for in this case')}</h3><div className="career-preparation-rows">{role.preparation.map((r,i)=><div key={i}><h3>{r.skill}</h3><p>{r.work}</p><p><strong>{tx('质量落点','Quality outcome')}: </strong>{r.quality}</p></div>)}</div><div className="career-evidence-note"><h3>{tx('与自己的材料对照','Compare with your own evidence')}</h3><p>{evidence.length?tx('已有明确关联记录','Explicitly related records')+': '+evidence.length:tx('尚未选择明确关联的职业/技能材料；工具名相同不等于整个职业准备充分。','No explicitly related career/skill evidence is selected. Sharing a tool name does not establish career-wide readiness.')}</p><p>{tx('本人确认材料只代表相关任务自述；没有记录不等于没有能力。','Confirmed materials are self-reported task evidence; missing records do not imply inability.')}</p>{evidence.length>0&&<ul>{evidence.map(c=><li key={c.id} translate="no">{c.title}</li>)}</ul>}{link('/assessment?tab='+encodeURIComponent('原文确认'),tx('核对材料与调整关联','Review materials and edit links'))}</div></section>
 <section className="career-reading-section" id="career-growth" tabIndex={-1}><h2>{tx('范围、协作与责任如何变化','Scope, collaboration and responsibility')}</h2><p className="career-measure">{occupation.responsibility}</p><p className="career-measure">{tx('这是本站提供的责任观察维度。岗位分工和职级由实际组织决定。','These are Avemly’s indicators of responsibility. The organisation defines its work and job levels.')}</p><h3>{tx('环境怎样改变工作','How context changes the work')}</h3><p className="career-measure">{occupation.environment}</p><h3>{tx('回到本例的协作与交付','Collaboration and delivery in this case')}</h3><div className="career-collaboration">{role.collaboration.map((r,i)=><div key={i}><ProductIcon name="people" size={24}/><h3>{r.role}</h3><p>{r.exchange}</p></div>)}</div><div className="career-growth-list">{role.growth.map((r,i)=><section key={i}><h3>{r.title}</h3><p>{r.description}</p></section>)}</div><h3>{tx('典型难点与环境','Challenges and working context')}</h3><p className="career-measure">{role.environment}</p><ul className="career-pitfalls">{role.pitfalls.map((r,i)=><li key={i}>{r}</li>)}</ul></section>
 <section className="career-reading-section" id="career-practice" tabIndex={-1}><h2>{role.practice.title}</h2><p>{role.practice.brief}</p><div className="career-practice-sheet"><section><h3>{tx('拿到什么输入','Your input')}</h3><p>{role.practice.input}</p><h3>{tx('先完成什么','Your first task')}</h3><ol>{role.practice.steps.map((v,i)=><li key={i}>{v}</li>)}</ol></section><section><h3>{tx('留下一份小产物','Your small deliverable')}</h3><p>{role.practice.deliverable}</p><h3>{tx('怎样检查','How to check')}</h3><ul>{role.practice.checks.map((v,i)=><li key={i}>{v}</li>)}</ul></section></div>{role.practice.fork&&<section className="career-case-fork"><h3>{role.practice.fork.title}</h3><p>{role.practice.fork.question}</p>{role.practice.fork.example&&<Example value={role.practice.fork.example}/>}<small>{(()=>{const source=role.sourceRecords.find(r=>r.id===role.practice.fork.sourceId);return source&&<a href={source.url} target="_blank" rel="noreferrer">{source.title} · {role.practice.fork.section}</a>;})()}</small></section>}{role.practice.files&&<div className="career-file-links">{role.practice.files.map(f=><a key={f.url} href={f.url} download>{f.label}</a>)}</div>}<CareerTrial role={role} s={s} update={update} sync={sync} owner={ownerKey}/><p className="career-skill-transition">{tx('以下入口学习相关方法，会进入另一套练习材料；本例草稿留在此页。','The links below teach related methods using a different exercise. Your case draft stays here.')}</p><div className="career-practice-actions">{link(role.practice.route,tx('学习相关技能（另一套练习）','Learn the related skill (different exercise)'),'button')}{current.id==='data'&&link('/learning/projects/quality',tx('了解独立的数据质量项目','Explore the separate data-quality project'))}{link('/career-map?career='+current.id,tx('查看技能树','View skill tree'))}<button type="button" onClick={()=>open('goal',{goal:current.id,reason:'',backup:s.backup||''})}>{tx('预览目标选择','Preview target choice')}</button></div><p className="career-source-inline">{tx('阅读或本页演示不会记为技能掌握；检验、学习记录及任务预算继续由原页面处理。','Reading or the local demo does not mark mastery. Existing pages handle checks, learning records and task budgets.')}</p></section>
 <CareerSources role={role} tx={tx}/>
 <CareerCompareBasket s={s} link={link} toggleCompare={toggleCompare} returnTo={returnTo}/></article>;
}
