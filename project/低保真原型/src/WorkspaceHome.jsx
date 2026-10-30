import React,{useState} from 'react';
import {cname} from './model';
import {workspacePath} from './workspace-guidance';
import './workspace-home.css';
import SegmentedControl from './SegmentedControl';
import BudgetCapacity from './BudgetCapacity';
import {PageIntroduction} from './PageGuidance';
import WorkspaceGuide from './WorkspaceGuide';
import GuidanceBubble from './GuidanceBubble';
import {DashboardMetrics,DashboardPreparation,DashboardMaterialPath,DashboardActionStatus,DashboardRecords} from './WorkspaceDashboardPanels';
import DetailDrawer from './DetailDrawer';
import WorkspaceModules,{HomeEntryMetrics,HomeActionContext,HomeWeekSummary} from './WorkspaceModules';
import {getFormattingLocale,useLanguage} from './i18n/render';

export default function WorkspaceHome({s,link,open,startTask,update,tell,action,pending,Icon,suggestions}){
 useLanguage();
 const [section,setSection]=useState('growth');
 const [detail,setDetail]=useState(null);
 const today=new Date();
 const fresh=!s.goal&&!s.claims.length&&!s.tasks.length,next=action;
 const hasWorkspaceRecords=!fresh||['reports','resumes','jobs','reviews','events','education','favorites','compare'].some(key=>s[key]?.length)||Object.keys(s.reading||{}).length>0||s.conversations.some(conversation=>conversation.messages.length>0);
 const detailTitles={preparation:'准备概览',actions:'行动状态',records:'材料与产出'};
 const catalogue={
  growth:[
   ['compass','职业探索','比较日常任务、所需基础和典型产物。','/careers','比较职业方向'],
   ['user','经历整理','写清自己负责的部分，逐项核对原文。','/assessment','整理与确认经历'],
   ['search','差距分析','对照目标要求，区分已有依据与未知。','/assessment?tab=四维与差距','查看差距与未知'],
   ['plan','目标计划','按每周可用时间安排下一步行动。','/plan','规划目标与行动'],
   ['book','学习实践','预览学习内容，选择短体验或综合项目。','/learning','选择学习与实践'],
   ['file','职业报告','整理目标、成果与复盘，保留阶段版本。','/reports','整理职业报告']
  ],
  jobs:[
   ['search','企业与岗位','阅读岗位要求，记录要准备的技能与材料。','/careers?tab=企业与岗位','研究岗位要求'],
   ['plan','我的机会','跟进关注的岗位，记录本人投递与面试。','/careers?tab=我的机会','跟进我的机会'],
   ['file','岗位简历','选择确认过的经历，准备通用或岗位简历。','/reports?tab=岗位简历','整理岗位简历'],
   ['search','薪酬参考','先查看来源、样本与适用范围。','/careers?tab=薪酬参考','核对薪酬参考']
  ],
  tools:[
   ['map','职业与技能地图','查看方向联系，以及学习技能的先后顺序。','/career-map','查看职业关系'],
   ['map','技能路线','查看技能依赖与可选学习路径。','/career-map?tab=技能先修','查看技能先修'],
   ['chat','AI 工作台','讨论问题，比较准备方案后再决定行动。','/assistant','咨询与方案'],
   ['search','自然语言检索','用问题检索职业知识，核对资料来源。','/assistant?tab=自然语言检索','检索职业知识'],
   ['settings','账户与数据','管理背景、授权、反馈以及导出与删除。','/settings','管理账户与数据']
  ]
 };
 const groups=[['growth','职业成长'],['jobs','求职准备'],['tools','工具与账户']];
 return <div className="home-hub studio-workspace-home workbench-home-body workspace-complete">
  <header className="home-hub-heading workbench-heading"><div><h1>我的职业工作台</h1><p className="workbench-intro">查看准备状态，接着本周行动继续。</p><PageIntroduction title="我的职业工作台" description="查看待处理事项、当前任务和本周安排。"/></div><div className="workbench-heading-tools"><time dateTime={today.toISOString().slice(0,10)}><Icon name="calendar" size={18}/>{new Intl.DateTimeFormat(getFormattingLocale(),{month:'long',day:'numeric',weekday:'short'}).format(today)}</time><span id="workspace-help"><GuidanceBubble label="工作区怎么用？" title="查看成长路径与记录规则" className="workbench-help"><p>先解决当前一个问题。路径可以跳转，方向未定也能独立探索；已有经历可以直接整理。</p><nav className="workspace-help-path" aria-label="工作区成长路径">{workspacePath(s).map(step=>React.cloneElement(link(step.to,<><span>{step.title}</span><small>{step.status}</small></>),{key:step.title}))}</nav><p>个人材料需由你确认；计划调整先预览，保存版本不会被自动覆盖。</p>{link('/assistant','不知道从哪里开始？先讨论一个问题 →')}</GuidanceBubble></span><WorkspaceGuide s={s} path="/app" link={link}/></div></header>
  {hasWorkspaceRecords?<DashboardMetrics s={s} link={link} Icon={Icon}/>:<HomeEntryMetrics link={link}/>}
  <div className="workbench-grid">
   <section className={'home-next home-action-panel workbench-focus '+(fresh?'home-first-action':'home-current')} aria-labelledby="home-next-title">
    <div className="home-focus-main">
    <div className="home-section-title"><h2 id="home-next-title">{fresh?'整理你的第一段经历':next.title}</h2>{!fresh&&<span className="status-chip">{s.analysisStale?'需要更新':pending.length?'资料待确认':next.task?next.task.status:'职业准备'}</span>}</div>
    <div className="home-next-content"><p>{fresh?'从课程项目、实习或自主作品开始，写清自己负责的部分，再逐项确认。':next.desc}</p>
     {!s.analysisStale&&pending.length>0&&<ul className="home-pending-items">{pending.slice(0,2).map(item=><li key={item.id}>{item.title||'未命名材料'}</li>)}{pending.length>2&&<li>另有 {pending.length-2} 项待核对</li>}</ul>}
     {next.task?.status==='受阻'&&<p className="home-task-blocked">先记录困难，或调整任务安排后再继续。</p>}
     {next.task?.standard&&<dl className="home-task-standard"><dt>交付要求</dt><dd>{next.task.standard}</dd></dl>}
    </div>
    <div className="actions">{fresh?<>{link('/assessment?tab=资料经历','整理已有经历 →','button primary')}{link('/learning','先预览一次小实践 →','button')}</>:<>
     {next.task?.status==='受阻'?link('/plan?tab=执行&task='+encodeURIComponent(next.task.id),next.label+' →','button primary'):next.task?<button className="primary" onClick={()=>startTask(next.task)}>{next.label}<Icon name="arrow" size={18}/></button>:link(next.to,next.label+' →','button primary')}
     {next.task&&link('/plan?tab=执行','查看或调整安排','button')}
     {next.task&&<button className="home-defer" onClick={()=>{update({deferred:!s.deferred});tell(s.deferred?'已恢复提醒。':'已暂缓此项，任务和材料都保留。');}}>{s.deferred?'恢复提醒':'暂缓提醒'}</button>}
    </>}</div>
    {s.deferred&&next.task&&<small>此提醒已暂缓，原有内容保留。</small>}
    </div>
    <HomeActionContext s={s} task={next.task} fresh={fresh}/>
   </section>
   <aside className="workbench-panel workbench-week" aria-labelledby="home-week-title"><header className="workbench-panel-heading"><h2 id="home-week-title" className="workbench-panel-title">本周安排</h2><div className="workbench-goal"><Icon name="compass" size={18}/><span>{s.goal?cname(s.goal):'方向尚未确定'}</span>{link('/plan','调整')}</div></header><BudgetCapacity s={s} compact/><p className="capacity-note">预计投入，不代表实际学习时长。</p><HomeWeekSummary s={s} link={link}/>{link('/plan?tab=执行&view=calendar','查看本周日程 →','workbench-week-link')}</aside>
  </div>
  {suggestions}
  <WorkspaceModules s={s} link={link} open={open} showDetail={setDetail}/>
  <details className="home-catalogue workbench-all-tools"><summary><span>全部功能</span><Icon name="chevron" size={20}/></summary><div>
   <SegmentedControl as="div" className="home-catalogue-tabs" role="group" aria-label="功能分组">{groups.map(([id,title])=><button key={id} aria-pressed={section===id} onClick={()=>setSection(id)}>{title}</button>)}</SegmentedControl>
   <div className="home-entry-grid" id="home-catalogue-items">{catalogue[section].map(([icon,title,desc,to,cta])=>React.cloneElement(link(to,<><Icon name={icon} size={20}/><span className="home-entry-copy"><span className="home-entry-heading">{title}</span><span className="home-entry-description">{desc}</span><span className="home-entry-cta">{cta} →</span></span></>,'home-entry'),{key:title}))}</div>
   {section==='tools'&&<div className="home-tool-shortcuts">{link('/settings?tab=资料授权','资料授权')}{link('/settings?tab=反馈状态','反馈状态')}{link('/settings?tab=导出与删除','导出与删除')}<button onClick={()=>open('aiEntry')}>打开 AI 侧栏</button></div>}
   <div className="home-map-entry"><div><Icon name="map" size={22}/><h3>工作、技能与成果</h3></div><nav className="home-map-route" aria-label="工作、工具与成果入口">{link('/careers?career='+(s.goal||'data'),'工作内容')}{link('/career-map?career='+(s.goal||'data')+'&tab=技能先修','技能工具')}{link('/assessment?tab=成果档案#assessment-profile','我的成果')}{link('/career-map?career='+(s.goal||'data'),'打开职业与技能地图 →')}</nav></div>
  </div></details>
  {detail&&<DetailDrawer title={detailTitles[detail]} onClose={()=>setDetail(null)} className="workspace-detail-drawer">
   {detail==='preparation'&&<><DashboardPreparation s={s} link={link}/><section className="workspace-material-path-detail" aria-label="材料整理路径"><h3>材料整理路径</h3><DashboardMaterialPath s={s} Icon={Icon}/></section></>}
   {detail==='actions'&&<DashboardActionStatus s={s} link={link}/>}
   {detail==='records'&&<DashboardRecords s={s} link={link} open={open} Icon={Icon}/>}
  </DetailDrawer>}
 </div>;
}
