import React,{useEffect,useRef,useState} from 'react';
import {apiRequest} from './auth-client';
import {useCatalog,CatalogState} from './CatalogData';
import {careers,cname,uid} from './model';
import DetailDrawer from './DetailDrawer';
import {saveSearchPreset} from './continuity-model';
import {SalaryContext} from './WorkspacePreparation';
import './opportunity-focus.css';
import './job-disclosure.css';
import './catalog-search.css';

function JobDetail({id,onClose,save,saved,link}){
  const request=useCatalog('/api/catalog/jobs/'+encodeURIComponent(id)),job=request.data?.job;
  return <DetailDrawer title={job?.title||'岗位资料'} onClose={onClose} className="job-discovery-drawer"><CatalogState request={request}>{job&&<section className="discovery-detail"><span className="status-chip">历史岗位快照 · 未人工复核</span><p>{job.company} · {job.location} · {job.market==='CN'?'国内样本':'国际参考'}</p><dl className="facts"><dt>资料采集日期</dt><dd>{job.date}</dd><dt>平台提供的日期</dt><dd>{job.publishedAt||'未知'}；日期依据：{job.dateBasis}</dd><dt>在招状态</dt><dd>未核验；不提供投递承诺</dd><dt>薪酬原文</dt><dd>{job.salaryRaw}</dd><dt>来源</dt><dd>{job.source}{job.sourceUrl&&<> · <a href={job.sourceUrl} target="_blank" rel="noreferrer">查看原始页面 ↗</a></>}</dd></dl><h3>岗位职责与要求原文</h3><p className="catalog-job-text">{job.text}</p><details><summary>查看技能提及与原始条件记录</summary><ul>{job.skills.map((r,i)=><li key={r.skillId+'-'+i}>{r.name} · 原文提及，不代表已判定为必要条件</li>)}</ul>{job.conditions?.length>0&&<ul>{job.conditions.map(r=><li key={r.condition_id}>{r.enclosing_text||r.text||r.matched_text} · 条件含义待复核，不作为硬性筛选</li>)}</ul>}</details><SalaryContext job={job}/><div className="actions">{saved?link(`/careers?tab=我的机会&job=${encodeURIComponent(saved.id)}`,'打开我的研究卡','button primary'):<button className="primary" onClick={()=>save(job)}>加入我的机会</button>}{job.career&&link('/careers?career='+job.career,'查看对应职业','button')}</div><p className="caption">原始审核与来源用途标记保持不变，本次按小组作业展示使用。加入后只保存本人研究卡，不记录投递或改变目标。</p></section>}</CatalogState></DetailDrawer>;
}
export default function CatalogJobs({s,update,link,url,initialQuery='',initialCareer='',initialLocation='',initialMarket='CN',searchWorkspace=false}){
  const params=new URL(url||location.href,location.origin).searchParams,requested=params.get('source');
  const [query,setQuery]=useState(initialQuery||s.discoveryView?.query||''),[career,setCareer]=useState(initialCareer||''),[locationQuery,setLocationQuery]=useState(initialLocation),[market,setMarket]=useState(initialMarket),[page,setPage]=useState(1),[applied,setApplied]=useState(()=>({q:initialQuery||s.discoveryView?.query||'',career:initialCareer,location:initialLocation,market:initialMarket})),[selected,setSelected]=useState(requested),[message,setMessage]=useState(''),[comparison,setComparison]=useState([]),[showCompare,setShowCompare]=useState(false),[filtersOpen,setFiltersOpen]=useState(false);
  const effective=applied;
  const queryInput=useRef(null),results=useRef(null);
  const search=new URLSearchParams({...effective,page:String(page),limit:'15'});
  const request=useCatalog('/api/catalog/jobs?'+search),d=request.data;
  useEffect(()=>setSelected(requested),[requested]);
  useEffect(()=>{if(comparison.length<2)setShowCompare(false);},[comparison.length]);
  const apply=e=>{e?.preventDefault();setPage(1);setApplied({q:query.trim(),career,market,location:locationQuery.trim()});update({discoveryView:{query,career:career||'全部'}});if(matchMedia('(max-width:720px)').matches){setFiltersOpen(false);requestAnimationFrame(()=>{results.current?.scrollIntoView({block:'start',behavior:'instant'});results.current?.focus({preventScroll:true});});}};
  const reset=()=>{setQuery('');setCareer('');setMarket('CN');setLocationQuery('');setApplied({q:'',career:'',market:'CN',location:''});setPage(1);};
  const dirty=query.trim()!==applied.q||career!==applied.career||market!==applied.market||locationQuery.trim()!==applied.location;
  const own=job=>s.jobs.find(r=>r.catalogId===job.id);
  const save=job=>{update(prev=>{if(prev.jobs.some(r=>r.catalogId===job.id))return prev;const {id,...fields}=job;return {...prev,jobs:[...prev.jobs,{...fields,id:uid('job'),catalogId:id,catalogVersion:d?.catalogVersion,sourceSnapshot:{...fields,catalogId:id},status:'收藏',note:'',taskId:null,archived:false}]};});setMessage('已加入我的机会，未记录投递或创建任务。');};
  const compare=job=>{if(comparison.some(r=>r.id===job.id)){setComparison(rows=>rows.filter(r=>r.id!==job.id));return;}if(comparison.length>=3){setMessage('最多比较三个岗位。');return;}setComparison(rows=>[...rows,job]);};
  return <div className={`job-discovery information-discovery catalog-jobs ${filtersOpen?'filters-open':''}`}>
    <header className="catalog-purpose">
      <div><h2>查清岗位要求，再决定怎么准备</h2><p>按关键词、职业和地区查找岗位样本，核对工作要求，比较后保存到“我的机会”。</p></div>
      {link('/careers?tab=我的机会',`我的机会（${s.jobs.length}） →`,'button')}
    </header>
    <ol className="catalog-workflow" aria-label="岗位研究步骤"><li><strong>设置筛选条件</strong><span>输入岗位或技能关键词</span></li><li><strong>核对岗位要求</strong><span>阅读原文、地区与来源</span></li><li><strong>比较并保存</strong><span>选择 2–3 个岗位比较，收藏后继续研究</span></li></ol>
    {searchWorkspace&&<p className="catalog-capability">当前支持关键词筛选；整句需求的自动理解暂未开放。</p>}
    <details className="discovery-source-note"><summary>数据范围与使用说明：历史样本，在招状态未核验</summary><p>已入库 3,515 条国内与国际岗位记录。默认查询国内样本，国际参考单独筛选；采集日期为 2026-10-12，不代表仍在招聘。原始数据的授权、审核和验证字段未改成已通过。</p></details>
    {message&&<p role="status" className="discovery-receipt">{message}</p>}
    <button className="discovery-filter-toggle" aria-expanded={filtersOpen} aria-controls="catalog-job-filters" onClick={()=>setFiltersOpen(x=>!x)}>{filtersOpen?'收起筛选条件':'筛选岗位 / 关键词与地区'}</button>
    <div className="discovery-layout">
      <aside className="discovery-filter" id="catalog-job-filters" aria-label="岗位筛选与比较">
        <form onSubmit={apply}><h3>筛选岗位</h3>
          <label className="field"><span>岗位、组织或技能关键词</span><input ref={queryInput} value={query} onChange={e=>setQuery(e.target.value)} maxLength={160} placeholder="例如 SQL、Java、测试"/></label>
          <label className="field"><span>职业方向</span><select value={career} onChange={e=>setCareer(e.target.value)}><option value="">全部方向</option>{careers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="field"><span>地区关键词</span><input value={locationQuery} onChange={e=>setLocationQuery(e.target.value)} maxLength={80} placeholder="例如 北京"/></label>
          <label className="field"><span>样本范围</span><select value={market} onChange={e=>setMarket(e.target.value)}><option value="CN">国内样本</option><option value="international_reference">国际参考</option><option value="">全部样本（明确分区）</option></select></label>
          <div className="catalog-filter-actions"><button className="primary" type="submit">查询岗位</button><button type="button" onClick={()=>{update(x=>({...x,presets:saveSearchPreset(x.presets,{query,career:career||'any',location:locationQuery||'不限',form:'不限',scope:'展示岗位样本',market})}));setMessage('查询条件已保存至账户，可在检索页载入并修改。');}}>保存查询条件</button><button type="button" className="catalog-reset" onClick={reset}>清空筛选</button></div>
          {dirty&&<p className="catalog-draft-note" role="status">条件已修改，点击“查询岗位”更新结果。</p>}
        </form>
        <section className="catalog-compare-picker" aria-label="已选比较岗位"><h3>岗位比较 <span>{comparison.length} / 3</span></h3><p>在结果中选择 2–3 个岗位，对照要求与地区。</p>
          {comparison.length>0&&<ul>{comparison.map(job=><li key={job.id}><span>{job.title}</span><button aria-label={'移出比较：'+job.title} onClick={()=>compare(job)}>移除</button></li>)}</ul>}
          <button disabled={comparison.length<2} aria-expanded={showCompare} aria-controls="catalog-comparison" onClick={()=>setShowCompare(x=>!x)}>{showCompare?'收起比较':'比较所选岗位'}</button>
        </section>
      </aside>
      <section className="discovery-results" aria-label="入库岗位查询结果" tabIndex={-1} ref={results} aria-busy={request.loading}>
        {showCompare&&<section className="discovery-comparison" id="catalog-comparison"><div className="section-heading"><h2>岗位字段比较</h2><button onClick={()=>setShowCompare(false)}>收起比较</button></div><div className="table-wrap"><table><thead><tr><th>字段</th>{comparison.map(j=><th key={j.id}>{j.title}</th>)}</tr></thead><tbody>{[['公司','company'],['地区','location'],['要求摘录','text'],['采集日期','date'],['薪酬原文','salaryRaw']].map(([title,key])=><tr key={key}><th>{title}</th>{comparison.map(j=><td key={j.id}>{j[key]}</td>)}</tr>)}</tbody></table></div><p>字段并排查看，不计算匹配分或薪酬预测。</p></section>}
        <CatalogState request={request}>{d&&<>
          <header className="catalog-result-heading"><div><h2>查询结果</h2><p>{effective.q||'全部关键词'} · {effective.career?cname(effective.career):'全部方向'} · {effective.location||'不限地区'} · {effective.market==='CN'?'国内样本':effective.market==='international_reference'?'国际参考':'全部样本'}</p></div><span role="status">共 {d.total} 条</span></header>
          {d.items.length?<div className="catalog-result-grid">{d.items.map(job=><article className="discovery-job-card" key={job.id}>
            <span className="status-chip">{job.market==='CN'?'国内历史样本':'国际参考'} · 在招未核验</span><h3>{job.title}</h3><p className="catalog-job-organization">{job.company}</p><p className="catalog-job-location">{job.location} · {job.career?cname(job.career):job.occupation}</p>
            <div className="catalog-excerpt"><h4>要求原文摘录</h4><p>{job.text}</p></div>
            <dl className="catalog-job-facts"><div><dt>薪酬原文</dt><dd>{job.salaryRaw||'未提供'}</dd></div><div><dt>采集日期</dt><dd>{job.date||'未知'}</dd></div></dl>
            <div className="actions"><button className="primary" aria-haspopup="dialog" onClick={()=>setSelected(job.id)}>查看完整要求</button><button aria-pressed={comparison.some(r=>r.id===job.id)} onClick={()=>compare(job)}>{comparison.some(r=>r.id===job.id)?'取消比较':'加入比较'}</button>{own(job)&&link('/careers?tab=我的机会&job='+encodeURIComponent(own(job).id),'查看已存研究卡','button')}</div>
          </article>)}</div>:<div className="catalog-empty"><h3>没有符合条件的岗位样本</h3><p>试试更短的技能关键词，或放宽职业与地区条件。</p><div className="actions"><button onClick={()=>{setFiltersOpen(true);requestAnimationFrame(()=>queryInput.current?.focus());}}>修改筛选条件</button><button onClick={reset}>清空筛选</button></div></div>}
          <nav className="catalog-pagination" aria-label="岗位结果翻页"><button disabled={page<=1} onClick={()=>setPage(x=>x-1)}>上一页</button><span>第 {page} / {Math.max(1,Math.ceil(d.total/d.limit))} 页</span><button disabled={page*d.limit>=d.total} onClick={()=>setPage(x=>x+1)}>下一页</button></nav>
        </>}</CatalogState>
      </section>
    </div>
    {selected&&<JobDetail id={selected} onClose={()=>setSelected(null)} save={save} saved={s.jobs.find(r=>r.catalogId===selected)} link={link}/>}
  </div>;
}
