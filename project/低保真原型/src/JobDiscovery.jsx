import React, { useEffect, useState } from 'react';
import {SERVER_AUTH} from './auth-client';
import CatalogJobs from './CatalogJobs';
import { careers, cname, uid } from './model';
import {SalaryContext} from './WorkspacePreparation';
import DetailDrawer from './DetailDrawer';
import './opportunity-focus.css';
import './job-disclosure.css';

// Only these explicitly authored demo records belong to discovery. Private jobs never enter it.
export const discoveryJobs = [
  { id:'demo-analysis', legacyId:'job-a', title:'分析方向岗位研究 A（合成）', company:'合成组织 A', career:'data', location:'未知', form:'未知', text:'熟悉 SQL 或表格工具；具体条件未知。', source:'原创合成材料，不代表在招', date:'2026-10-16', scope:'整理数据、核对口径并解释结果的研究示例。', salaryRaw:'未提供' },
  { id:'demo-ops', legacyId:'job-b', title:'运维方向岗位研究 B（合成）', company:'合成组织 B', career:'ops', location:'未知', form:'未知', text:'值守要求待核对；薪酬未提供。', source:'原创合成材料，不代表在招', date:'2026-10-16', scope:'了解恢复、回退与值守边界的研究示例。', salaryRaw:'未提供' },
];
export const savedDiscoveryJob = (jobs, source) => jobs.find(j=>j.catalogId===source.id || j.id===source.legacyId&&j.source===source.source);
export const isArchivedJob = job => !!job.archived || job.status==='归档';

export default function JobDiscovery(props){return SERVER_AUTH?<CatalogJobs {...props}/>:<DemoJobDiscovery {...props}/>;}
function DemoJobDiscovery({ s, update, link, url }) {
  const params = new URL(url || location.href,location.origin).searchParams;
  const requestedId = params.get('source') || params.get('job');
  const requestedRecord = requestedId && s.jobs.find(j=>j.id===requestedId);
  const requestedSource = requestedId && discoveryJobs.find(j=>j.id===requestedId || j.legacyId===requestedId || j.id===requestedRecord?.catalogId);
  const deepLinkId = requestedSource?.id || (!requestedId && params.get('focus')==='salary' ? discoveryJobs[0]?.id : null);
  const [query,setQuery]=useState(deepLinkId ? '' : s.discoveryView?.query || ''),[career,setCareer]=useState(deepLinkId ? '全部' : s.discoveryView?.career || '全部'),[selected,setSelected]=useState(deepLinkId),[compare,setCompare]=useState([]),[showCompare,setShowCompare]=useState(false),[message,setMessage]=useState('');
  const [filtersOpen,setFiltersOpen]=useState(false);
  useEffect(()=>{setSelected(deepLinkId);if(deepLinkId){setQuery('');setCareer('全部');}},[deepLinkId]);
  const filterView = patch => {const next={query,career,...patch};setQuery(next.query);setCareer(next.career);update({discoveryView:next});};
  const inspect = source => setSelected(source.id);
  const visible=discoveryJobs.filter(j=>(career==='全部'||j.career===career)&&`${j.title} ${j.company} ${j.text}`.toLowerCase().includes(query.trim().toLowerCase()));
  const job=discoveryJobs.find(j=>j.id===selected), saved=job&&savedDiscoveryJob(s.jobs,job);
  const save = source => {
    update(prev=>{if(savedDiscoveryJob(prev.jobs,source))return prev;const {id,legacyId,...fields}=source;return {...prev,jobs:[...prev.jobs,{...fields,id:uid('job'),catalogId:id,sourceSnapshot:{...fields,catalogId:id},status:'收藏',note:'',taskId:null,archived:false}]};});
    setMessage('已加入我的机会。只建立本人研究卡，未记录申请、未创建准备任务、未改变主目标。');
  };
  const toggle = id => {if(!compare.includes(id)&&compare.length>=3){setMessage('最多比较三个岗位字段。');return;}setCompare(compare.includes(id)?compare.filter(x=>x!==id):[...compare,id]);};
  return <div className={`job-discovery information-discovery ${filtersOpen?'filters-open':''}`}><div className="discovery-intro"><p>在这里查看岗位来源和要求；保存到“我的机会”后，记录准备事项、投递和面试进展。</p>{link('/careers?tab=我的机会',`查看我的机会（${s.jobs.length}） →`,'button')}</div><details className="discovery-source-note"><summary>来源范围：原创合成示例，非在招岗位</summary><p>未接入真实招聘源。以下仅为两个原创合成研究示例，不代表真实企业或在招岗位；本人私有岗位输入不会出现在此目录。</p></details>{message&&!job&&<p className="discovery-receipt" role="status">{message}</p>}
    <button className="discovery-filter-toggle" aria-expanded={filtersOpen} aria-controls="discovery-filter-panel" onClick={()=>setFiltersOpen(!filtersOpen)}><span>{filtersOpen?'收起筛选与岗位比较':'筛选与岗位比较'}</span><small>{compare.length} / 3</small></button><div className="discovery-layout"><aside className="discovery-filter" id="discovery-filter-panel"><h3>查找与筛选</h3><label className="field"><span>搜索岗位或组织</span><input aria-label="搜索岗位或组织" value={query} onChange={e=>filterView({query:e.target.value})} placeholder="合成示例关键词"/></label><label className="field"><span>岗位职业方向</span><select aria-label="岗位职业方向" value={career} onChange={e=>filterView({career:e.target.value})}><option value="全部">全部</option>{careers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><p className="caption">来源范围：原创合成示例。真实岗位与授权数据接入后，继续按来源与时效分层。</p><button onClick={()=>{filterView({query:'',career:'全部'});}}>清空筛选</button><hr/><h3>岗位字段比较</h3><p>{compare.length} / 3 项已选</p><button disabled={compare.length<2} aria-describedby="job-comparison-requirements" title={compare.length<2?'至少选择两个岗位后可比较':undefined} onClick={()=>setShowCompare(!showCompare)}>{showCompare?'收起字段比较':'比较所选岗位'}</button><p id="job-comparison-requirements" className="caption">选择2至3个岗位后，可比较职责与条件；不生成企业文化星级或综合匹配分。</p></aside>
      <section className="discovery-results" aria-label="岗位发现结果"><div className="section-heading"><h2>研究示例</h2><span>{visible.length} 条合成示例</span></div>{!visible.length?<div className="empty"><h3>当前筛选没有结果</h3><p>试试其他关键词，或清空职业方向筛选后再查找。</p><button onClick={()=>filterView({query:'',career:'全部'})}>重置查找条件</button></div>:visible.map(source=>{const own=savedDiscoveryJob(s.jobs,source);return <article className="discovery-job-card" key={source.id}><span className="status-chip">原创合成 · 在招未核验</span><h3>{source.title}</h3><p>{source.company} · {cname(source.career)} · 地点未知</p><p>{source.text}</p><small>资料日期 {source.date} · 截止日未知 · 薪酬未提供</small><div className="actions"><button aria-expanded={job?.id===source.id} aria-haspopup="dialog" onClick={()=>inspect(source)}>查看岗位详情</button>{own?link(`/careers?tab=我的机会&job=${encodeURIComponent(own.id)}`,'在我的机会查看','button'): <button className="primary" onClick={()=>save(source)}>加入我的机会</button>}<button aria-pressed={compare.includes(source.id)} onClick={()=>toggle(source.id)}>{compare.includes(source.id)?'取消比较':'加入比较'}</button></div></article>;})}</section>
    </div>
    {job&&<DetailDrawer title={job.title} onClose={()=>setSelected(null)} className="job-discovery-drawer"><section className="discovery-detail" aria-label="岗位来源与要求详情"><span className="status-chip">原创合成 · 在招未核验</span><p>{job.scope}</p><dl className="facts"><dt>企业资料</dt><dd>{job.company}（合成标识）；规模、文化与经营信息未知</dd><dt>要求原文</dt><dd>{job.text} 必要、优先、备选保持原意，不扩成职业统一门槛。</dd><dt>来源 / 日期</dt><dd>{job.source} · {job.date}；不是在招核验日期</dd><dt>有效性</dt><dd>未核验；截止日未知</dd><dt>薪酬原文</dt><dd>{job.salaryRaw}；不换算或聚合</dd></dl><SalaryContext job={job} expanded={params.get('focus')==='salary'}/><div className="actions">{saved?link(`/careers?tab=我的机会&job=${encodeURIComponent(saved.id)}`,isArchivedJob(saved)?'查看已归档的本人记录':'打开本人研究卡','button primary'):<button className="primary" onClick={()=>save(job)}>加入我的机会</button>}{link(`/careers?career=${job.career}`,'了解对应职业','button')}</div><p className="caption">本区不展示私人笔记、材料快照或申请进展。加入后用来源 ID 关联，私人记录独立保存。</p>{message&&<p className="discovery-receipt" role="status">{message}</p>}</section></DetailDrawer>}
    {showCompare&&<section className="discovery-comparison"><div className="section-heading"><h2>并排比较岗位要求</h2><button onClick={()=>setShowCompare(false)}>关闭字段比较</button></div><div className="table-wrap"><table><thead><tr><th>字段</th>{compare.map(id=><th key={id}>{discoveryJobs.find(j=>j.id===id).title}</th>)}</tr></thead><tbody>{[['组织','company'],['要求原文','text'],['来源','source'],['资料日期','date'],['薪酬原文','salaryRaw']].map(([title,key])=><tr key={key}><th>{title}</th>{compare.map(id=><td key={id}>{discoveryJobs.find(j=>j.id===id)[key]}</td>)}</tr>)}</tbody></table></div></section>}
  </div>;
}

export function OpportunitySummary({ s, link, onStatus }) {
  return <section className="personal-opportunity-summary" aria-label="本人机会概览"><div className="opportunity-counts"><button onClick={()=>onStatus('全部')}><strong>{s.jobs.filter(j=>!isArchivedJob(j)).length}</strong><span>当前研究卡</span></button><button onClick={()=>onStatus('准备')}><strong>{s.jobs.filter(j=>!isArchivedJob(j)&&j.status==='准备').length}</strong><span>准备中的机会</span></button><div><strong>{s.events.length}</strong><span>本人求职事件</span></div><button onClick={()=>onStatus('归档')}><strong>{s.jobs.filter(j=>isArchivedJob(j)).length}</strong><span>已归档记录</span></button></div>{link('/careers?tab=企业与岗位','发现更多企业与岗位 →')}</section>;
}


