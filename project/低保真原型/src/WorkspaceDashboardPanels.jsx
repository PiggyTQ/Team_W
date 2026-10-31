import ProductIcon from './ProductIcon';
import React,{useState} from 'react';
import {confirmed,learning} from './model';
import {pendingMaterials} from './workspace-guidance';
import {profileInsights} from './profile-insights-model';
import ControlIcon from './ControlIcon';

const ACTION_STATUS_GROUPS=[
 {id:'waiting',label:'待开始',statuses:['待开始'],color:'#c4b8a4'},
 {id:'active',label:'进行中',statuses:['进行中'],color:'#cd755d'},
 {id:'blocked',label:'受阻',statuses:['受阻'],color:'#c5a24f'},
 {id:'complete',label:'已完成',statuses:['完成'],color:'#659c8d'},
 {id:'stopped',label:'暂缓 / 停止',statuses:['延期','取消','跳过'],color:'#d5d5ca'},
 {id:'other',label:'其他状态',statuses:[],color:'#8d9da4'}
];
const ACTION_PRIORITY={'受阻':0,'进行中':1,'待开始':2};

function PreparationSymbol({type}){
 const shapes={
  BR:<><path d="M10 20v-8h10m24 0h10v8m0 24v8H44m-24 0H10v-8"/><path d="m36 22 7 18-18 7 7-18Z"/><circle cx="34" cy="34" r="2" fill="currentColor" stroke="none"/></>,
  PS:<><path d="M11 23h18l6 7h18v23H11Z"/><path d="M17 23V13h29v17M24 13v-4h27v21M20 39h23m-23 7h15"/></>,
  TQ:<><rect x="10" y="11" width="25" height="25" rx="8"/><rect x="31" y="31" width="25" height="25" rx="8"/><path d="m25 32 8 8 9-12M15 47h8m-4-4v8M44 15h8m-4-4v8"/></>,
  DP:<><path d="M11 53h13V40h13V27h15V13M12 18h40m-9-9 9 9-9 9"/><circle cx="12" cy="18" r="3" fill="currentColor" stroke="none"/></>
 };
 return <ProductIcon className="preparation-symbol" size={64} name={{BR:"sliders",PS:"folder",TQ:"collaboration",DP:"history"}[type]||"clipboard"}/>;
}

export function DashboardPreparation({s,link}){
 const {dimensions,recorded}=profileInsights(s);
 return <section className="workbench-panel workbench-preparation" aria-labelledby="dashboard-preparation-title">
  <header className="workbench-panel-heading"><h2 className="workbench-panel-title" id="dashboard-preparation-title">我的准备概览</h2>{link('/assessment','查看完整画像 →')}</header>
  <p className="dashboard-coverage-summary"><strong>{recorded} / 4</strong><span>类已记录</span><span>· 非能力评分</span></p>
  <nav className="dashboard-dimension-links" aria-label="四维记录详情">{dimensions.map(d=>React.cloneElement(link(d.to,<>
   <span className="dimension-entry-art"><PreparationSymbol type={d.id}/><ProductIcon name="external" size={18}/></span>
   <span className="dimension-entry-label">{d.short}</span><span className="dimension-entry-count"><strong>{d.count}</strong><span>项记录</span></span><span className="dimension-entry-state"><i/>{d.has?'有记录':'待补充'}</span>
  </>,'dimension-entry'),{key:d.id,'data-dimension':d.id,'data-recorded':d.has}))}</nav>
 </section>;
}

export function DashboardMaterialPath({s,Icon}){
 const steps=[['file','经历材料',s.claims.length>0],['check','本人核对',confirmed(s).length>0],['grid','复用材料',Boolean(s.analysis||s.reports.length)]];
 return <div className="dashboard-material-path" aria-label="材料整理路径">{steps.map(([icon,label,ready],i)=><React.Fragment key={label}>{i>0&&<span className="dashboard-path-connector" aria-hidden="true"/>}<div data-recorded={ready}><span><Icon name={icon} size={22}/></span><small>{label}</small></div></React.Fragment>)}</div>;
}

export function DashboardMetrics({s,link,Icon}){
 const pending=pendingMaterials(s).length;
 const items=[
  {id:'materials',icon:'user',title:'本人确认材料',value:confirmed(s).length,unit:'项材料',note:pending?<>{pending} 项待核对</>:'查看原文与本人贡献',to:'/assessment?tab=原文确认'},
  {id:'actions',icon:'plan',title:'待推进的行动',value:s.tasks.filter(t=>!t.completed&&['待开始','进行中','受阻'].includes(t.status)).length,unit:'项行动',note:'查看任务与交付要求',to:'/plan?tab=执行'},
  {id:'reports',icon:'file',title:'已保存报告',value:s.reports.length,unit:'个版本',note:s.reports.length?'回看已保存的阶段记录':'从选择与行动中积累',to:'/reports'}
 ];
 return <nav className="workbench-metrics" aria-label="工作记录概览">{items.map(item=>React.cloneElement(link(item.to,<>
  <span className={'workbench-icon tone-'+item.id}><Icon name={item.icon} size={22}/></span>
  <div className="workbench-metric-copy"><span className="workbench-metric-heading">{item.title}</span><div className="workbench-metric-total"><strong className="workbench-metric-value">{item.value}</strong><span>{item.unit}</span><span className={'workbench-metric-note '+(item.id==='materials'&&pending?'':'sr-only')}>{item.note}</span></div></div>
  <Icon name="arrow" size={18}/>
 </>,'workbench-metric'),{key:item.id,'data-metric':item.id}))}</nav>;
}

export function DashboardActions({s,link,Icon}){
 const rank={'受阻':0,'进行中':1,'待开始':2};
 const tasks=[...s.tasks].sort((a,b)=>(rank[a.status]??3)-(rank[b.status]??3)).slice(0,3);
 const samples=(s.goal?learning.filter(item=>item.career===s.goal):[]).concat(learning).filter((item,i,all)=>all.findIndex(other=>other.id===item.id)===i).slice(0,2);
 return <section className="workbench-panel workbench-actions" aria-labelledby="workbench-actions-title">
  <header className="workbench-panel-heading"><h2 id="workbench-actions-title" className="workbench-panel-title">{tasks.length?'行动清单':'先选一个小实践'}</h2>{link(tasks.length?'/plan?tab=执行':'/learning',tasks.length?'全部行动':'全部实践')}</header>
  <div className="workbench-action-list">{tasks.length?tasks.map(t=><div className="workbench-action-row" key={t.id}>
   <span className={'workbench-action-symbol state-'+t.status}><Icon name={t.completed?'check':t.status==='受阻'?'clock':'plan'} size={22}/></span>
   <div><h3>{t.title}</h3><p><span className={'workbench-state state-'+t.status}>{t.status}</span><span>{t.hours} 小时预计投入</span></p></div>
   {link('/plan?tab=执行&task='+encodeURIComponent(t.id),<><span className="sr-only">查看任务：{t.title}</span><Icon name="arrow" size={20}/></>,'workbench-row-link')}
  </div>):samples.map(item=><div className="workbench-action-row" key={item.id}>
   <span className="workbench-action-symbol"><Icon name="book" size={22}/></span><div><h3>{item.title}</h3><p><span>{item.hours} 小时预计投入</span><span>先预览，再决定</span></p></div>
   {link('/learning?tab=短体验&unit='+encodeURIComponent(item.id),'预览','workbench-row-link')}
  </div>)}</div>
 </section>;
}

export function DashboardActionStatus({s,link}){
 const [selectedStatus,setSelectedStatus]=useState('all');
 const [hoveredStatus,setHoveredStatus]=useState(null);
 const [focusedStatus,setFocusedStatus]=useState(null);
 const groupedTasks=Object.fromEntries(ACTION_STATUS_GROUPS.map(group=>[group.id,[]]));
 for(const task of s.tasks){
  const group=ACTION_STATUS_GROUPS.find(item=>item.statuses.includes(task.status));
  groupedTasks[group?.id||'other'].push(task);
 }
 const actions=ACTION_STATUS_GROUPS.map(group=>({...group,count:groupedTasks[group.id].length}));
 const actionTotal=s.tasks.length;
 const selectedGroup=actions.find(group=>group.id===selectedStatus);
 const selectedTasks=selectedGroup?groupedTasks[selectedGroup.id]:s.tasks;
 const previewTask=selectedTasks.reduce((first,task)=>!first||(ACTION_PRIORITY[task.status]??3)<(ACTION_PRIORITY[first.status]??3)?task:first,null);
 const hasHours=previewTask&&previewTask.hours!==null&&previewTask.hours!==undefined&&String(previewTask.hours).trim()!==''&&Number.isFinite(Number(previewTask.hours))&&Number(previewTask.hours)>=0;
 const highlightedStatus=hoveredStatus??focusedStatus??selectedStatus;
 return <section className="workbench-panel workbench-status" aria-labelledby="workbench-status-title">
  <header className="workbench-panel-heading"><h2 id="workbench-status-title" className="workbench-panel-title">行动记录状态</h2>{link('/plan?tab=执行','全部行动 →')}</header>
  {actionTotal?<div className="workbench-status-body"><p className="dashboard-action-total"><strong>{actionTotal}</strong><span>项记录</span></p><div className="dashboard-status-chart dashboard-status-strip" role="img" aria-label={actions.map(group=>`${group.label} ${group.count}`).join('；')}>{actions.filter(group=>group.count>0).map(group=><span key={group.id} data-status={group.id} data-highlighted={highlightedStatus==='all'||highlightedStatus===group.id} style={{flexGrow:group.count,background:group.color}}/>)}</div>
   <div className="dashboard-status-filters" role="group" aria-label="按行动状态筛选">{actions.map(group=><button key={group.id} type="button" data-status={group.id} aria-pressed={selectedStatus===group.id} aria-controls="dashboard-status-preview" onPointerEnter={()=>setHoveredStatus(group.id)} onPointerLeave={()=>setHoveredStatus(null)} onFocus={()=>setFocusedStatus(group.id)} onBlur={()=>setFocusedStatus(null)} onClick={()=>setSelectedStatus(group.id)}><span><i style={{background:group.color}} aria-hidden="true"/>{group.label}</span><strong>{group.count}</strong></button>)}</div>
   <div className="dashboard-status-preview" id="dashboard-status-preview"><header><span>{selectedGroup?.label||'优先处理'}</span><button className="dashboard-status-reset" type="button" aria-pressed={selectedStatus==='all'} aria-controls="dashboard-status-preview" onClick={()=>setSelectedStatus('all')}>全部</button></header>
    {previewTask?link('/plan?tab=执行&task='+encodeURIComponent(previewTask.id),<><span className="dashboard-task-preview-title">{previewTask.title||'未命名行动'}</span><span className="dashboard-task-preview-meta"><span>{previewTask.status||'状态未记录'}</span>{' · '}<span>{hasHours?<>{Number(previewTask.hours)} 小时预计投入</>:'预计投入未定'}</span></span><ControlIcon name="arrow" size={18}/></>,'dashboard-task-preview'):<p className="dashboard-filter-empty">此状态下暂无行动</p>}
   </div>
   <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{selectedGroup?.label||'全部'}，{selectedTasks.length} 项行动</span>
  </div>:<div className="workbench-status-empty"><p>尚未安排行动</p><ol><li>预览实践</li><li>核对预算</li><li>保留行动记录</li></ol>{link('/learning','选择一次实践 →')}</div>}
  {actionTotal>0&&<p className="workbench-chart-note">按任务记录计数 · {link('/plan?tab=复盘','回看实践复盘 →')}</p>}
 </section>;
}

export function DashboardRecords({s,link,open,Icon}){
 const materials=s.claims.filter(c=>['已确认','待确认','疑似重复','矛盾'].includes(c.status)).slice(-1),latest=s.reports.at(-1),reading=Object.keys(s.reading).find(id=>learning.some(item=>item.id===id));
 return <div className="workbench-record-grid">
  <section className="workbench-panel" data-record="materials"><header className="workbench-panel-heading"><h2 className="workbench-panel-title">近期材料</h2>{link('/assessment','全部材料')}</header>
   {materials.length?<div className="workbench-material-list">{materials.map(item=><div className="workbench-material-row" key={item.id}><span className="workbench-record-icon"><Icon name="file" size={20}/></span><div><p>{item.title||'未命名材料'}</p><span className={'workbench-state '+(item.status==='已确认'?'is-confirmed':'is-pending')}>{item.status==='已确认'?'本人确认':item.status}</span></div>{link('/assessment?tab=原文确认','查看')}</div>)}</div>:<div className="workbench-inline-empty"><p>把做过的事，留成可复用的材料。</p><span>课程项目、实习与自主作品都可以记录。</span>{link('/assessment?tab=资料经历','添加第一段经历 →')}</div>}
  </section>
  <section className="workbench-panel" data-record="reports"><header className="workbench-panel-heading"><h2 className="workbench-panel-title">报告与阅读</h2>{link('/reports','全部报告')}</header>
   {latest?<div className="workbench-saved-report"><span className="workbench-record-icon"><Icon name="file" size={22}/></span><div><p>{latest.title}</p><span>保存版本 v{latest.version}</span></div>{link('/reports/'+encodeURIComponent(latest.id),'打开保存版本')}</div>:<div className="workbench-inline-empty"><p>让选择与行动，留下阶段记录。</p><span>整理选择理由与行动记录，保留阶段版本。</span>{link('/reports','查看报告结构 →')}</div>}
   {reading&&<div className="home-reading-resume"><Icon name="book" size={20}/><div><span>继续上次阅读</span><p>{learning.find(item=>item.id===reading)?.title}</p></div><button onClick={()=>open('reading',{template:reading,chapter:s.reading[reading]?.chapter||0})}>继续阅读</button></div>}
  </section>
  <section className="workbench-panel" data-record="resumes"><header className="workbench-panel-heading"><h2 className="workbench-panel-title">岗位简历</h2><Icon name="file" size={20}/></header><div className="dashboard-resume-preview" aria-hidden="true"><span/><span/><span/></div><div className="workbench-inline-empty"><p>{s.resumes.length?`${s.resumes.length} 个已保存版本`:'尚未保存简历'}</p>{link('/reports?tab=岗位简历','进入简历工作台 →')}</div></section>
 </div>;
}
