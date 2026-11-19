import React,{useState} from 'react';
import ProductIcon from './ProductIcon';
import {taskCopy} from './native-task-copy';
import {displayPublicText,useLanguage} from './i18n/render';
import {careerDetailContent} from './career-detail-content';
import {taskRoute} from './flow-navigation';
import {skillTreeRoute} from './skill-tree-model';
import './report-full.css';

const excerpt=(value,length=500)=>typeof value==='string'&&value.length>length?value.slice(0,length)+'…':value;
const publicText=value=>displayPublicText(value);
const pair=(value,language)=>value[language==='en'?1:0];
const methodDemo=leaf=>leaf.methods.length>0&&leaf.methods.every(method=>method.demo);
const stateLabel=(leaf,t)=>leaf.status==='practiced'&&methodDemo(leaf)?t.demoPractice:t[leaf.status];

export function RoleSelector({insights,onTarget,t}){
 return <label className="report-role-selector"><span>{t.chooseRole}</span><select value={insights.target.id} onChange={event=>onTarget(event.target.value)}>
  {insights.profiles.map(role=><option key={role.id} value={role.id}>{publicText(role.name)}</option>)}
 </select></label>;
}

function Outcome({project,record,task,title,t,link}){
 const scope=record?.steps.scope?.note||taskCopy(task,'purpose');
 const result=record?.steps.decision?.note||project.summary||project.description;
 return <article className="report-outcome" data-report-project={project.id}>
  <header><div><h3>{title}</h3><span className="report-outcome-meta">
   {record?.demo&&<span className="report-status is-demo">{t.demo}</span>}
   {project.date&&<time dateTime={project.date}>{project.date}</time>}
  </span></div>{link(project.to,<>{t.openOutcome}<ProductIcon name="arrow" size={15}/></>)}</header>
  <dl>
   {scope&&<div><dt>{t.did}</dt><dd translate="no">{excerpt(scope)}</dd></div>}
   <div className="report-outcome-result"><dt>{t.result}</dt><dd translate="no">{excerpt(result)||'—'}</dd></div>
   {project.contribution&&<div><dt>{t.contribution}</dt><dd translate="no">{excerpt(project.contribution,320)}</dd></div>}
   {project.limits&&<div><dt>{t.limits}</dt><dd translate="no">{excerpt(project.limits,240)}</dd></div>}
  </dl>
  {record?.review&&<footer>{link(record.review.to,t.openReview)}</footer>}
 </article>;
}

export function SkillsProfile({insights,onTarget,t,link}){
 const language=useLanguage();
 const [selected,setSelected]=useState(null);
 const role=insights.target;
 const leaf=role.leaves.find(item=>item.id===selected)||role.leaves.find(item=>item.status!=='gap')||role.leaves[0];
 return <section className="report-skills-profile" aria-labelledby="report-profile-title">
  <header className="report-subhead"><h3 id="report-profile-title">{t.profileTitle}</h3><RoleSelector {...{insights,onTarget,t}}/></header>
  <div className="report-profile-legend">
   {['passed','practiced','documented','gap'].map(status=><span key={status}><i className={'is-'+status}/>{t[status]}</span>)}
   <span>{t.recorded} {role.coverage.known} / {role.coverage.total}</span>
  </div>
  <div className="report-skill-branches">{role.branches.map(branch=><div className="report-skill-branch" key={branch.id}>
   <h4>{pair(branch.title,language)}</h4><div>{branch.leaves.map(item=><button type="button" key={item.id}
    className={'report-topic is-'+item.status} aria-pressed={leaf.id===item.id} onClick={()=>setSelected(item.id)}>
     <i aria-hidden="true"/>{pair(item.title,language)}
   </button>)}</div>
  </div>)}</div>
  <div className="report-topic-detail" aria-live="polite">
   <div><h4>{pair(leaf.title,language)}<span className={'report-status is-'+leaf.status}>{stateLabel(leaf,t)}</span></h4>
    <p>{pair(leaf.lesson,language)}</p>
    <div className="report-topic-sources">
     {leaf.methods.flatMap(method=>method.evidence.map(({project,to})=><span key={method.id+project.id}>{link(to,taskCopy(project,'title')||project.title)}</span>))}
     {leaf.claims.length>0&&link('/assessment?tab=原文确认',t.openClaim)}
     {leaf.passed&&link(leaf.checkTo,t.openCheck)}
    </div>
   </div>{link(leaf.to,t.openTree,'button')}
  </div>
 </section>;
}

export function ReportGrowth({s,report,evidence,insights,onTarget,taskTitle,t,link}){
 const records=new Map(evidence.outcomes.map(row=>[row.source+':'+row.id,row]));
 return <>
  <section className="report-results" aria-labelledby="report-outcomes-heading">
   <h3 id="report-outcomes-heading">{t.growthTitle}</h3>
   {report.projects.length?<div className="report-outcome-grid">{report.projects.map(project=><Outcome key={project.source+project.id}
    record={records.get(project.source+':'+project.id)} task={s.tasks.find(task=>task.id===project.id)} title={project.source==='upload'?project.title:taskTitle(project.id,project.title)}
    {...{project,t,link}}/>)}</div>:<div className="report-empty"><p>{t.noOutcomes}</p>{link('/learning',t.choosePractice,'button')}</div>}
  </section>
  <SkillsProfile {...{insights,onTarget,t,link}}/>
 </>;
}

function MatchCard({role,job,intended,onInspect,t,link}){
 const names=role.leaves.filter(leaf=>leaf.status!=='gap').map(leaf=>leaf.title);
 const language=useLanguage();
 return <article className={'report-match '+(intended?'is-intended':'')} data-report-recommendation={role.id}>
  <header><div>{intended&&<span className="report-match-label">{t.intent}</span>}<h3>{publicText(role.name)}</h3>
   {job&&<p translate="no">{job.title}</p>}</div>
   <div className="report-match-score"><strong>{role.coverage.percent}%</strong><span>{t.coverage}</span></div></header>
  <div className="report-match-meter" aria-label={t.coverage} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={role.coverage.percent}><span style={{width:role.coverage.percent+'%'}}/></div>
  <p className="report-match-count">{t.matched} {role.coverage.known} / {role.coverage.total}</p>
  <div className="report-tags">{names.slice(0,5).map((title,index)=><span key={index}>{pair(title,language)}</span>)}</div>
  {!names.length&&<p>{t.matchEmpty}</p>}
  <footer><button type="button" onClick={()=>onInspect(role.id)}>{t.inspect}<ProductIcon name="arrow" size={15}/></button>{link('/career-map?career='+role.id+'&from=report',t.fullTree)}</footer>
 </article>;
}

export function ReportMatches({s,evidence,insights,onInspect,t,link}){
 return <>
  {insights.intended?<MatchCard role={insights.intended} job={evidence.job?.career===insights.intended.id?evidence.job:null} intended {...{onInspect,t,link}}/>:
   <div className="report-empty"><h3>{t.noIntent}</h3>{link('/plan',t.setIntent,'button')}</div>}
  <header className="report-subhead"><h3>{t.related}</h3></header>
  {insights.adjacent.length?<div className="report-related-matches">{insights.adjacent.map(role=><MatchCard key={role.id} {...{role,onInspect,t,link}}/>)}</div>:<p>{t.noRelated}</p>}
  <p className="report-footnote">{t.matchMethod}{evidence.outcomes.some(row=>row.demo)&&' '+t.demoMethod}</p>
 </>;
}

export function ReportRequirements({insights,onTarget,t,link}){
 const language=useLanguage(),role=insights.target,work=careerDetailContent[role.id];
 return <>
  <header className="report-subhead"><h3>{publicText(role.name)}</h3><RoleSelector {...{insights,onTarget,t}}/></header>
  <p className="report-work-lead">{publicText(work.lead)}</p>
  <ol className="report-workflow">{work.workflow.map(step=><li key={step.title}><h4>{publicText(step.title)}</h4><p>{publicText(step.description)}</p><span>{publicText(step.output)}</span></li>)}</ol>
  <div className="report-collaborators"><strong>{t.workWith}</strong>{work.collaboration.map(item=><span key={item.role}>{publicText(item.role)}</span>)}</div>
  <header className="report-subhead"><h3>{t.required}</h3></header>
  <div className="report-requirement-branches">{role.branches.map(branch=><section key={branch.id}>
   <header><h4>{pair(branch.title,language)}</h4><span>{branch.leaves.filter(leaf=>leaf.status!=='gap').length} / {branch.leaves.length}</span></header>
   <p>{pair(branch.purpose,language)}</p>
   <ul>{branch.leaves.map(leaf=><li key={leaf.id}>{link(leaf.to,pair(leaf.title,language))}<span className={'report-status is-'+leaf.status}>{stateLabel(leaf,t)}</span></li>)}</ul>
  </section>)}</div>
  <div className="report-frameworks"><h3>{t.official}</h3>{role.frameworks.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.title}<ProductIcon name="external" size={14}/></a>)}</div>
 </>;
}

export function ReportNext({s,insights,onTarget,t,link}){
 const language=useLanguage(),role=insights.target;
 const active=s.tasks.find(task=>task.career===role.id&&!task.completed&&['待开始','进行中','受阻'].includes(task.status));
 return <>
  <header className="report-subhead"><h3>{publicText(role.name)}</h3><RoleSelector {...{insights,onTarget,t}}/></header>
  {active&&<div className="report-continue"><div><span>{t.continue}</span><h3 translate="no">{taskCopy(active,'title')}</h3></div>{link(taskRoute(s,active),t.continueTask,'button')}</div>}
  <div className="report-next-paths">{insights.next.map(leaf=><article key={leaf.id} data-next-skill={leaf.id}>
   <div><span className="report-next-branch">{pair(leaf.branch.title,language)}</span><h3>{pair(leaf.title,language)}</h3>
    <p>{pair(leaf.lesson,language)}</p><span className={'report-status is-'+leaf.status}>{stateLabel(leaf,t)}</span></div>
   <nav aria-label={pair(leaf.title,language)}>
    {['learn','practice','check'].map((step,index)=>link(skillTreeRoute(role.id,{branch:leaf.branch.id,skill:leaf.id,step,from:'report'}),
     <><span>{t[{learn:'learn',practice:'practice',check:'check'}[step]]}</span>{index<2&&<ProductIcon name="arrow" size={14}/>}</>,step==='check'&&leaf.status!=='gap'?'is-recommended':''))}
   </nav>
  </article>)}</div>
  {!insights.next.length&&<p>{t.allPassed}</p>}
  <div className="report-return-path"><p>{t.returnFlow}</p>{link('/career-map?career='+role.id+'&from=report',t.fullTree,'button')}</div>
 </>;
}
