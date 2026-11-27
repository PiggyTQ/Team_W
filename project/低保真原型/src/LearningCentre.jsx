import React from 'react';
import {careers, cname, learning} from './model';
import {practiceRegistry, practiceRoutes} from './practice-registry';
import {useLanguage} from './i18n/render';
import {projectRoute} from './practice-project-model';
import ProductIcon from './ProductIcon';
import './practice-growth.css';

const legacyBriefs={"quality": {"zh": "交通分析组准备发布一份碰撞记录简报。你负责判断这张表能否支持按限速分组的描述统计，并提交一份同事能复算的质量记录。", "en": "A transport analysis team is preparing a collision brief. Decide whether the table can support summaries by recorded speed limit, and hand over a quality record a colleague can reproduce."}, "ai-eval": {"zh": "客服团队要比较两版订单助手。你负责定义通过标准，对同一批离线工单做对照，决定哪一版可以进入下一轮验证。", "en": "A support team is comparing two order assistants. Define the acceptance criteria, review the same offline cases for both versions and decide what can move to the next round."}, "log": {"zh": "安全运营值班收到一条远程登录告警。你需要把认证、权限和变更记录按时间对齐，判断是否升级调查，并留下接班人能继续查的事件链。", "en": "A security operations shift receives a remote-login alert. Align authentication, privilege and change records, decide whether to escalate and leave an evidence trail for the next shift."}, "restore": {"zh": "边缘网关的规则更新正在小流量发布。候选组出现 502 和 CPU 异常。你负责判断是否暂停、如何回退，以及什么时候可以宣告恢复。", "en": "A gateway rule update is being canaried. The candidate group shows 502 errors and abnormal CPU. Decide whether to pause, how to roll back and when recovery can be declared."}};
const careerIcons={data:'database',ai:'brain',security:'shield',ops:'server',frontend:'browser',backend:'code',engineering:'database',testing:'testing',software:'code',delivery:'briefcase'};
const careerNames={data:'Data analysis',ai:'Applied AI',security:'Cybersecurity',ops:'Operations and reliability',frontend:'Frontend development',backend:'Backend development',engineering:'Data engineering',testing:'Software testing',software:'Software engineering',delivery:'Implementation and delivery'};

export default function LearningCentre({s,url,move,link,catalog,catalogError,retryCatalog,startTask}) {
 const en=useLanguage()==='en',language=en?'en':'zh',tx=(zh,english)=>en?english:zh;
 const params=new URL(url,location.origin).searchParams;
 const selected=params.get('career')||s.goal||s.assessmentCareer||'all';
 const direction=careers.some(c=>c.id===selected)?selected:'all';
 const level=params.get('level')||'all';
 const hours=params.get('hours')||'all',goalScope=params.get('scope')==='当前目标相关';
 const hoursFor=p=>{const unit=p.legacy&&learning.find(item=>item.id===p.id);return unit?[unit.hours,unit.standard]:p.estimatedHours;};
 const visible=practiceRegistry.filter(p=>(direction==='all'||p.career===direction||p.relatedCareers.includes(direction))&&(level==='all'||String(p.level)===level)&&(!goalScope||p.career===s.goal||p.relatedCareers.includes(s.goal))&&(hours!=='2 小时以内'||hoursFor(p)[0]<=2)&&(hours!=='2 小时以上'||hoursFor(p)[1]>2));
 const browse=patch=>{const next=new URL(url,location.origin);Object.entries(patch).forEach(([key,value])=>value==null?next.searchParams.delete(key):next.searchParams.set(key,value));move(next.pathname+next.search,true,{preserveScroll:true});};
 const ongoing=s.tasks.filter(t=>practiceRegistry.some(p=>p.id===t.template)&&!t.completed&&!['取消','跳过','延期'].includes(t.status));
 const groups=direction==='all'?careers:careers.filter(c=>c.id===direction);
 const route=ids=>ids.filter(id=>visible.some(p=>p.id===id));
 const stage=value=>({1:tx('入门实践','Foundation'),2:tx('增加约束','Extend constraints'),3:tx('独立交付','Independent delivery'),integrated:tx('跨职业交接','Cross-career handoff')}[value]);
 const careerTitle=id=>en?careerNames[id]:cname(id);
 const row=id=>{
   const p=practiceRegistry.find(p=>p.id===id),course=catalog?.courses.find(c=>c.id===id),unit=learning.find(l=>l.id===id),active=ongoing.find(t=>t.template===id),state=course?.status||'draft';
   const finished=s.tasks.some(t=>t.template===id&&t.completed);
   const output=p.outputs?.[language]?.join(' · ')||course?.projectSummary?.outcome?.[language]||(en?{quality:'Quality issue log, metric definitions and release advice','ai-eval':'Evaluation records, serious errors and a release recommendation',log:'An incident timeline, alternatives and an escalation handoff',restore:'Recovery evidence, rollback decisions and follow-up actions'}[id]:unit?.product);
   return <article className="growth-project-row" key={id} data-learning-project={id} data-career={p.career}>
    <div className="growth-card-top"><span className="growth-card-icon"><ProductIcon name={careerIcons[p.career]} size={32}/></span><span className="growth-stage">{p.kind==='cross-career'?<ProductIcon name="route" size={16}/>:<b>{String(p.level).padStart(2,'0')}</b>}{stage(p.level)}</span><span className={'growth-project-state '+(state==='published'?'is-published':'')}>{state==='published'?tx('正式项目','Published'):state==='local_trial'?tx('本地试用','Local trial'):state==='retired'?tx('已退役','Retired'):tx('材料待就绪','Materials pending')}</span></div>
    <h3>{link(projectRoute(id),p.title[language])}</h3>
    <p className="growth-card-brief">{p.brief?.[language]||course?.projectSummary?.brief?.[language]||(course?.content_version>=2?legacyBriefs[id]?.[language]:null)||tx('沿用现有项目与历史实践记录','Existing project and historical practice records')}</p>
    {output&&<div className="growth-card-output"><ProductIcon name="file" size={19}/><div><span>{tx('你将交付','You will deliver')}</span><p>{output}</p></div></div>}
    <div className="growth-card-foot"><span><ProductIcon name="clock" size={17}/>{hoursFor(p).join('–')} {tx('小时','hours')}<small>{tx('预计投入','Estimated effort')}</small></span>{(active||finished)&&<span className="growth-personal-state"><ProductIcon name={finished?'check':'book'} size={16}/>{active?tx('有进行中的任务','Task in progress'):tx('有已归档成果','Artifact archived')}</span>}</div>
    <div className="growth-actions">{active&&state==='retired'?link(projectRoute(id,{task:active.id}),tx('回看历史','View history'),'button'):active?<button className="primary" onClick={()=>startTask(active)}>{tx('继续任务','Continue task')}<ProductIcon name="arrow" size={18}/></button>:link(projectRoute(id),<>{tx('查看任务与材料','View task and materials')}<ProductIcon name="arrow" size={18}/></>,'button growth-card-action')}{state==='retired'&&<small>{tx('可回看历史记录','Historical records remain readable')}</small>}</div>
    {p.id==='quality'&&<p className="growth-source">{course?.content_version>=2?tx('本站设计 · 数据：英国交通部 · 案例参考：GDS支出报送质量改进','Avemly-designed · Data: UK DfT · Case reference: GDS spending-report quality improvement'):tx('来源以所选材料版本的记录为准','See source records for the selected material version')}</p>}
   </article>;
 };
 const published=catalog?.courses.filter(c=>c.status==='published').length;
 const trials=catalog?.courses.filter(c=>c.status==='local_trial').length;
 return <div className="growth-library" data-i18n="off">
  <header className="growth-library-header">
   <div className="growth-library-intro"><span className="growth-eyebrow"><ProductIcon name="book" size={18}/>{tx('把学习变成可展示的成果','Turn learning into something you can show')}</span><h2>{tx('从一个项目，走向下一项能力','One project. Your next capability.')}</h2><p>{tx('先动手解决一个问题，再增加约束、独立交付，沿着职业路线继续探索。','Solve a concrete problem, add constraints, then deliver independently along your career path.')}</p><div className="growth-catalog-facts"><span><b>{practiceRegistry.length}</b>{tx('个实践项目','practice projects')}</span><span><b>{careers.length}</b>{tx('个职业方向','career directions')}</span><span>{tx('材料、产物与核对标准均可查阅','Materials, deliverables and check criteria included')}</span></div></div>
   <div className="growth-library-art" aria-hidden="true"><span className="growth-art-orbit"/><img src="/illustrations/cheese-scenes/laptop.png" alt=""/><span className="growth-art-label"><ProductIcon name="file" size={18}/>{tx('做出你的下一份作品','Create your next piece of work')}</span></div>
  </header>
  <section className="growth-filterbar" aria-label={tx('筛选项目','Filter projects')}><div className="growth-filter-fields"><label htmlFor="growth-career"><span>{tx('项目方向','Career direction')}</span><select id="growth-career" value={direction} onChange={e=>browse({career:e.target.value})}><option value="all">{tx('全部方向','All directions')}</option>{careers.map(c=><option key={c.id} value={c.id}>{careerTitle(c.id)}</option>)}</select></label><label htmlFor="growth-stage"><span>{tx('实践阶段','Practice stage')}</span><select id="growth-stage" value={level} onChange={e=>browse({level:e.target.value})}><option value="all">{tx('全部阶段','All stages')}</option><option value="1">{stage(1)}</option><option value="2">{stage(2)}</option><option value="3">{stage(3)}</option><option value="integrated">{stage('integrated')}</option></select></label></div><div className="growth-filter-result"><span role="status">{tx('找到','Showing')} <b>{visible.length}</b> {tx('个项目','projects')}</span><button onClick={()=>browse({career:'all',level:'all',hours:null,scope:null})}>{tx('查看全部方向','View all directions')}<ProductIcon name="arrow" size={17}/></button></div></section>
  {ongoing.length>0&&<section className="growth-continue"><div><ProductIcon name="book" size={25}/><h2>{tx('接着上次的实践','Pick up where you left off')}</h2></div><div className="growth-continue-tasks">{ongoing.slice(0,3).map(t=><button key={t.id} onClick={()=>startTask(t)}><span translate="no">{t.title}</span><ProductIcon name="arrow" size={17}/></button>)}</div></section>}
  {catalogError&&<p className="growth-notice" role="alert">{tx('课程目录读取失败，已有记录保留。','Course catalog failed to load; existing records are retained.')} <button onClick={retryCatalog}>{tx('重试','Retry')}</button></p>}
  {!visible.length&&<div className="growth-empty"><ProductIcon name="search" size={42}/><h2>{tx('换个方向，继续找找','Try another direction')}</h2><p>{tx('当前筛选下没有项目，可改选方向或阶段。','No projects match. Choose another career or stage.')}</p><button onClick={()=>browse({career:'all',level:'all',hours:null,scope:null})}>{tx('查看全部方向','View all directions')}</button></div>}
  {groups.map(c=>{
   const ids=route(practiceRoutes[c.id]);if(!ids.length)return null;
   const heading=<><span className="growth-family-icon"><ProductIcon name={careerIcons[c.id]} size={27}/></span><div><h2>{careerTitle(c.id)}{direction!=='all'&&tx('实践路线',' practice path')}</h2><p>{tx('入门实践 → 增加约束 → 独立交付','Foundation → Extend constraints → Independent delivery')}</p></div><span className="growth-family-count">{ids.length} {tx('个项目','projects')}</span></>;
   const content=<div className="growth-project-grid">{ids.map(row)}</div>;
   return direction==='all'?<details className="growth-family" open={c.id===(s.goal||'data')} key={c.id}><summary>{heading}<ProductIcon className="growth-family-chevron" name="chevronDown" size={20}/></summary>{content}</details>:<section className="growth-family" key={c.id}><header className="growth-family-heading">{heading}</header>{content}</section>;
  })}
  {visible.some(p=>p.kind==='cross-career')&&<section className="growth-family growth-cross-family"><header className="growth-family-heading"><span className="growth-family-icon"><ProductIcon name="route" size={27}/></span><div><h2>{tx('让成果走向下一个角色','Take your work across roles')}</h2><p>{tx('轮换角色、接手材料、修订再交付，完成单人模拟的协作项目。','Rotate roles, consume handoffs and revise in a single-person collaboration simulation.')}</p></div><span className="growth-family-count">{visible.filter(p=>p.kind==='cross-career').length} {tx('个项目','projects')}</span></header><div className="growth-project-grid">{visible.filter(p=>p.kind==='cross-career').map(p=>row(p.id))}</div></section>}
  <div className="growth-library-note"><ProductIcon name="info" size={19}/><p>{tx('时间为编辑估算，供安排学习、制作与调试参考。','Times are editorial estimates for learning, building and debugging.')} {published!==undefined&&<>{tx('目录状态：','Catalog status: ')}{published} {tx('项正式项目','published projects')} · {trials} {tx('项本地试用，试用不代表已正式发布或通过真人试学。','local trials. A trial label does not mean formal publication or a human pilot.')}</>}</p></div>
 </div>;
}
