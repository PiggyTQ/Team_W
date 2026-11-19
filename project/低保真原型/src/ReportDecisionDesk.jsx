import React,{useEffect,useRef,useState} from 'react';
import {taskCopy} from './native-task-copy.js';
import {buildCareerReport} from './career-report-model';
import {reportIsStale,reportRows} from './alignment-model';
import {savedReportBrief} from './output-workspace-model';
import {CareerJourneyStages} from './CareerJourney';
import CareerReportEvidence from './CareerReportEvidence';
import {buildCareerEvidence} from './career-evidence-model';
import {reportInsights} from './report-insights-model';
import {ReportGrowth,ReportMatches,ReportRequirements,ReportNext} from './CareerReportPanels';
import {useLanguage} from './i18n/render';
import copy from './i18n/report-full-ui.json';
import './career-report.css';

export function ReportSnapshotBrief({report,blocked}){
 if(blocked)return <div className="notice">引用已不可访问，停止展示缓存摘要与正文。请使用有效依据建立新草稿。</div>;
 const entries=report.format==='career-report-v1'?reportRows(report.body).filter(row=>row.title!=='引用与局限').map(row=>({title:row.title,text:row.text.slice(row.text.indexOf('：')+1)})):savedReportBrief(report);
 return <details className="output-snapshot-summary" aria-label="保存报告摘要"><summary>查看这份报告的摘要</summary><p>以下内容取自这份保存快照，后续资料不会自动改写它。</p><dl>{entries.map(row=><div key={row.title}><dt>{row.title}</dt><dd>{row.text}</dd></div>)}</dl></details>;
}

const chapters=['profile','recommendations','requirements','projects'];
const initialChapter=()=>chapters.includes(location.hash.slice(1))?location.hash.slice(1):'profile';

export default function ReportDecisionDesk({s,link}){
 const language=useLanguage(),t=copy[language];
 const sources=s.reportSources||{status:'loading'};
 const report=buildCareerReport(s,{uploads:sources.status==='ready'?sources.uploads:undefined,
  planRecords:sources.planRecords,getSkillTree:sources.getSkillTree});
 const evidence=buildCareerEvidence(s,report.projects);
 const [active,setActive]=useState(initialChapter),[target,setTarget]=useState(()=>new URLSearchParams(location.search).get('career')),[animate,setAnimate]=useState(false);
 const insights=reportInsights(s,report,evidence,target);
 const journey=sources.live?sources.journey:report.journey;
 const ready=sources.status==='ready'&&!sources.planError;
 const sections=useRef({}),tabs=useRef({});
 const taskTitle=(id,title)=>{
  const task=s.tasks.find(row=>row.id===id);
  return task?.title?.trim()===title?taskCopy(task,'title'):title;
 };
 const choose=(id,motion=false)=>{
  setAnimate(motion);
  setActive(id);
  history.replaceState(history.state,'',location.pathname+location.search+'#'+id);
  requestAnimationFrame(()=>sections.current[id]?.querySelector('h2')?.focus({preventScroll:true}));
 };
 const keyboard=(event,index)=>{
  const next={ArrowRight:(index+1)%4,ArrowLeft:(index+3)%4,Home:0,End:3}[event.key];
  if(next===undefined)return;
  event.preventDefault();
  const id=chapters[next];
  setAnimate(false);setActive(id);tabs.current[id]?.focus();
  history.replaceState(history.state,'',location.pathname+location.search+'#'+id);
 };
 useEffect(()=>{
  const readHash=()=>{if(chapters.includes(location.hash.slice(1))){setAnimate(false);setActive(location.hash.slice(1));}};
  window.addEventListener('hashchange',readHash);
  return()=>window.removeEventListener('hashchange',readHash);
 },[]);
 const changeTarget=id=>{
  setTarget(id);
  const params=new URLSearchParams(location.search);
  params.set('career',id);
  history.replaceState(history.state,'',location.pathname+'?'+params+'#'+active);
 };
 const inspect=id=>{changeTarget(id);choose('requirements',true);};
 const saved=[...s.reports].reverse();
 const common={s,report,evidence,insights,onTarget:changeTarget,taskTitle,t,link};
 return <div className="career-report report-full" aria-label="职业综合报告预览">
  {!ready&&<div className="notice" role={sources.status==='loading'?'status':'alert'}>
   <p>{sources.status==='loading'?'正在汇总项目与目标记录…':sources.planError?'目标记录无法读取，请先回目标计划检查，原记录不会被覆盖。':'项目来源读取失败，请重试后查看综合报告。'}</p>
   {sources.status!=='loading'&&<button onClick={()=>sources.reload?.().catch(()=>{})}>重新读取报告来源</button>}
  </div>}
  <div className="career-report-layout">
   <nav className="career-report-nav" role="tablist" aria-label="综合报告章节">
    {chapters.map((id,index)=><button key={id} ref={el=>{tabs.current[id]=el;}} type="button" role="tab"
     id={'report-tab-'+id} aria-controls={'career-report-'+id} aria-selected={active===id} tabIndex={active===id?0:-1}
     onKeyDown={event=>keyboard(event,index)} onClick={event=>choose(id,event.detail>0)}>{t.tabs[index]}</button>)}
   </nav>
   <div className="career-report-body">
    {chapters.map((id,index)=><section key={id} role="tabpanel" tabIndex={-1}
      className={'career-report-section'+(active===id&&animate?' is-entering':'')}
      aria-labelledby={'report-tab-'+id} hidden={active!==id}
      id={'career-report-'+id} data-report-section={id} ref={el=>{sections.current[id]=el;}}>
     <header><h2 tabIndex={-1}>{t.tabs[index]}</h2>
      {id==='profile'&&<CareerReportEvidence {...{evidence,link,ready,taskTitle}}/>}
     </header>
     {id==='profile'&&<>
      <ReportGrowth {...common}/>
      {journey&&<div className="report-journey-open"><CareerJourneyStages {...{journey,link}}/></div>}
     </>}
     {id==='recommendations'&&<ReportMatches {...common} onInspect={inspect}/>}
     {id==='requirements'&&<ReportRequirements {...common}/>}
     {id==='projects'&&<ReportNext {...common}/>}
    </section>)}
   </div>
  </div>
  <details className="career-report-limits"><summary>报告依据与匹配方式说明</summary><ul>{report.limitations.map(line=><li key={line}>{line}</li>)}</ul></details>
  {saved.length>0&&<details className="career-report-library" aria-label="已保存的阶段报告"><summary>已保存的报告 <span>{saved.length}</span></summary>{saved.map(item=><article key={item.id}><div><h3>{link('/reports/'+encodeURIComponent(item.id),item.title)}</h3><p>{item.date?.slice(0,10)} · {reportIsStale(s,item)?'依据有变化':'保存快照'}</p></div>{link('/reports/'+encodeURIComponent(item.id),'打开报告 →','button')}</article>)}</details>}
 </div>;
}
