import React,{useEffect,useRef,useState} from 'react';
import {apiRequest} from './auth-client';
import {useCatalog,CatalogState} from './CatalogData';
import {careers,cname,uid} from './model';
import DetailDrawer from './DetailDrawer';
import ProductIcon from './ProductIcon';
import OfficialCareerSources from './OfficialCareerSources';
import {saveSearchPreset} from './continuity-model';
import {SalaryContext} from './WorkspacePreparation';
import './opportunity-focus.css';
import './job-disclosure.css';
import './catalog-search.css';
import './career-jobs-experience.css';

function JobDetail({id,onClose,save,saved,link}){
  const request=useCatalog('/api/catalog/jobs/'+encodeURIComponent(id)),job=request.data?.job;
  return <DetailDrawer title={job?.title||'岗位资料'} onClose={onClose} className="job-discovery-drawer"><CatalogState request={request}>{job&&<section className="discovery-detail"><span className="status-chip">历史岗位快照 · 未人工复核</span><p>{job.company} · {job.location} · {job.market==='CN'?'国内样本':'国际参考'}</p><dl className="facts"><dt>资料采集日期</dt><dd>{job.date}</dd><dt>平台提供的日期</dt><dd>{job.publishedAt||'未知'}；日期依据：{job.dateBasis}</dd><dt>在招状态</dt><dd>未核验；不提供投递承诺</dd><dt>薪酬原文</dt><dd>{job.salaryRaw}</dd><dt>来源</dt><dd>{job.source}{job.sourceUrl&&<> · <a href={job.sourceUrl} target="_blank" rel="noreferrer">查看原始页面 ↗</a></>}</dd></dl><h3>岗位职责与要求原文</h3><p className="catalog-job-text" translate="no">{job.text}</p><details><summary>查看技能提及与原始条件记录</summary><ul>{job.skills.map((r,i)=><li key={r.skillId+'-'+i}>{r.name} · 原文提及，不代表已判定为必要条件</li>)}</ul>{job.conditions?.length>0&&<ul>{job.conditions.map(r=><li key={r.condition_id}>{r.enclosing_text||r.text||r.matched_text} · 条件含义待复核，不作为硬性筛选</li>)}</ul>}</details><SalaryContext job={job}/><div className="actions">{saved?link(`/careers?tab=我的机会&job=${encodeURIComponent(saved.id)}`,'打开我的研究卡','button primary'):<button className="primary" onClick={()=>save(job)}>加入我的机会</button>}{job.career&&link('/careers?career='+job.career,'查看对应职业','button')}</div><p className="caption">原始审核与来源用途标记保持不变，本次按小组作业展示使用。加入后只保存本人研究卡，不记录投递或改变目标。</p></section>}</CatalogState></DetailDrawer>;
}
export default function CatalogJobs({s,update,link,url,initialQuery='',initialCareer='',initialLocation='',initialMarket='CN',searchWorkspace=false}){
  const params=new URL(url||location.href,location.origin).searchParams,requested=params.get('source');
  const [query,setQuery]=useState(initialQuery||s.discoveryView?.query||''),[career,setCareer]=useState(initialCareer||''),[locationQuery,setLocationQuery]=useState(initialLocation),[market,setMarket]=useState(initialMarket),[page,setPage]=useState(1),[applied,setApplied]=useState(()=>({q:initialQuery||s.discoveryView?.query||'',career:initialCareer,location:initialLocation,market:initialMarket})),[selected,setSelected]=useState(requested),[message,setMessage]=useState(''),[comparison,setComparison]=useState([]),[showCompare,setShowCompare]=useState(false);
  const effective=applied;
  const queryInput=useRef(null),results=useRef(null);
  const search=new URLSearchParams({...effective,page:String(page),limit:'15'});
  const request=useCatalog('/api/catalog/jobs?'+search),d=request.data;
  useEffect(()=>setSelected(requested),[requested]);
  useEffect(()=>{if(comparison.length<2)setShowCompare(false);},[comparison.length]);
  const apply=e=>{e?.preventDefault();setPage(1);setApplied({q:query.trim(),career,market,location:locationQuery.trim()});update({discoveryView:{query,career:career||'全部'}});if(matchMedia('(max-width:720px)').matches){requestAnimationFrame(()=>{results.current?.scrollIntoView({block:'start',behavior:'instant'});results.current?.focus({preventScroll:true});});}};
  const reset=()=>{setQuery('');setCareer('');setMarket('CN');setLocationQuery('');setApplied({q:'',career:'',market:'CN',location:''});setPage(1);update({discoveryView:{query:'',career:'全部'}});};
  const dirty=query.trim()!==applied.q||career!==applied.career||market!==applied.market||locationQuery.trim()!==applied.location;
  const own=job=>s.jobs.find(r=>r.catalogId===job.id);
  const save=job=>{update(prev=>{if(prev.jobs.some(r=>r.catalogId===job.id))return prev;const {id,...fields}=job;return {...prev,jobs:[...prev.jobs,{...fields,id:uid('job'),catalogId:id,catalogVersion:d?.catalogVersion,sourceSnapshot:{...fields,catalogId:id},status:'收藏',note:'',taskId:null,archived:false}]};});setMessage('已加入我的机会，未记录投递或创建任务。');};
  const compare=job=>{if(comparison.some(r=>r.id===job.id)){setComparison(rows=>rows.filter(r=>r.id!==job.id));return;}if(comparison.length>=3){setMessage('最多比较三个岗位。');return;}setComparison(rows=>[...rows,job]);};
  return <div className="job-discovery information-discovery catalog-jobs career-jobs-experience">

    <ExternalJobLinks link={link}/>
    {searchWorkspace&&<p className="catalog-capability">当前支持关键词筛选；整句需求的自动理解暂未开放。</p>}
    <form onSubmit={apply} className="jobs-querybar catalog-querybar" id="catalog-job-filters" aria-label="岗位筛选与比较">
      <label className="field"><span>岗位、组织或技能关键词</span><input ref={queryInput} value={query} onChange={e=>setQuery(e.target.value)} maxLength={160} placeholder="例如 SQL、Java、测试"/></label>
      <label className="field"><span>职业方向</span><select value={career} onChange={e=>setCareer(e.target.value)}><option value="">全部方向</option>{careers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="field"><span>地区关键词</span><input value={locationQuery} onChange={e=>setLocationQuery(e.target.value)} maxLength={80} placeholder="例如 北京"/></label>
      <label className="field"><span>样本范围</span><select value={market} onChange={e=>setMarket(e.target.value)}><option value="CN">国内样本</option><option value="international_reference">国际参考</option><option value="">全部样本（明确分区）</option></select></label>
      <div className="catalog-filter-actions"><button className="primary" type="submit"><ProductIcon name="search" size={18}/>查询岗位</button><button type="button" onClick={()=>{update(x=>({...x,presets:saveSearchPreset(x.presets,{query,career:career||'any',location:locationQuery||'不限',form:'不限',scope:'展示岗位样本',market})}));setMessage('查询条件已保存至账户，可在检索页载入并修改。');}}>保存查询条件</button><button type="button" className="catalog-reset" onClick={reset}>清空筛选</button>{dirty&&<p className="catalog-draft-note" role="status">条件已修改，点击“查询岗位”更新结果。</p>}</div>
    </form>
    {comparison.length>0&&<section className="jobs-comparison-bar" aria-label="已选比较岗位"><div><ProductIcon name="compare" size={21}/><strong>岗位字段比较</strong><span>{comparison.length} / 3</span></div>{comparison.length>0?<ul>{comparison.map(job=><li key={job.id}><span translate="no">{job.title}</span><button aria-label={'移出比较：'+job.title} onClick={()=>compare(job)}><ProductIcon name="close" size={16}/></button></li>)}</ul>:<p>选两份岗位要求，看看工作和条件有什么不同。</p>}<button disabled={comparison.length<2} aria-expanded={showCompare} aria-controls="catalog-comparison" onClick={()=>setShowCompare(x=>!x)}>{showCompare?'收起比较':'比较所选岗位'}</button></section>}
    {message&&<p role="status" className="discovery-receipt">{message}</p>}
    {showCompare&&<JobFieldComparison id="catalog-comparison" jobs={comparison} onRemove={compare} onClose={()=>setShowCompare(false)}/>}
    <section className="discovery-results" aria-label="入库岗位查询结果" tabIndex={-1} ref={results} aria-busy={request.loading}>
      <CatalogState request={request}>{d&&<>
        <header className="catalog-result-heading jobs-results-header"><div><h2>查询结果 <span className="jobs-result-total" role="status">{d.total} 条</span></h2><p>{effective.q||'全部关键词'} · {effective.career?cname(effective.career):'全部方向'} · {effective.location||'不限地区'} · {effective.market==='CN'?'国内样本':effective.market==='international_reference'?'国际参考':'全部样本'}</p></div><details className="discovery-source-note"><summary>历史样本，在招未核验</summary><p>国内与国际岗位样本分区查询。这里展示入库时的资料，不保证当前仍在招聘；具体采集日期、来源及原始页面可在完整要求中核对。原始授权、审核和验证字段保持不变。</p></details></header>
        {d.items.length?<div className="catalog-result-grid jobs-research-grid">{d.items.map(job=><article className="discovery-job-card jobs-research-card" key={job.id}>
          <header><span className="jobs-card-icon"><ProductIcon name={job.career||'briefcase'} size={27}/></span><div><span className="status-chip">{job.market==='CN'?'国内历史样本':'国际参考'} · 在招未核验</span><h3 translate="no">{job.title}</h3><p className="catalog-job-organization" translate="no">{job.company}</p></div></header>
          <p className="catalog-job-location">{job.location} · {job.career?cname(job.career):job.occupation}</p>
          <div className="catalog-excerpt jobs-research-excerpt"><h4>要求原文摘录</h4><p translate="no">{job.text}</p></div>
          <dl className="catalog-job-facts jobs-card-facts"><div><dt>薪酬原文</dt><dd>{job.salaryRaw||'未提供'}</dd></div><div><dt>采集日期</dt><dd>{job.date||'未知'}</dd></div><div><dt>来源</dt><dd>{job.source||'见完整要求'}</dd></div></dl>
          <div className="actions"><button className="primary" aria-haspopup="dialog" onClick={()=>setSelected(job.id)}>查看完整要求</button>{own(job)?link('/careers?tab=我的机会&job='+encodeURIComponent(own(job).id),'查看已存研究卡','button'):<button onClick={()=>save(job)}>加入我的机会</button>}<button className="jobs-card-compare" aria-pressed={comparison.some(r=>r.id===job.id)} onClick={()=>compare(job)}><ProductIcon name={comparison.some(r=>r.id===job.id)?'check':'plus'} size={17}/>{comparison.some(r=>r.id===job.id)?'取消比较':'加入比较'}</button></div>
        </article>)}</div>:<div className="catalog-empty jobs-empty"><ProductIcon name="search" size={30}/><h3>没有符合条件的岗位样本</h3><p>试试更短的技能关键词，或放宽职业与地区条件。</p><div className="actions"><button onClick={()=>queryInput.current?.focus()}>修改筛选条件</button><button onClick={reset}>清空筛选</button></div></div>}
        <nav className="catalog-pagination" aria-label="岗位结果翻页"><button disabled={page<=1} onClick={()=>setPage(x=>x-1)}>上一页</button><span>第 {page} / {Math.max(1,Math.ceil(d.total/d.limit))} 页</span><button disabled={page*d.limit>=d.total} onClick={()=>setPage(x=>x+1)}>下一页</button></nav>
      </>}</CatalogState>
    </section>
    {selected&&<JobDetail id={selected} onClose={()=>setSelected(null)} save={save} saved={s.jobs.find(r=>r.catalogId===selected)} link={link}/>}
  </div>;
}

// Navigation only: no account context, query or private material is sent to the external site.
export function ExternalJobLinks(){return <OfficialCareerSources/>;}

export function JobFieldComparison({jobs,id,onRemove,onClose,publicExamples=false}){
 const groups=[{title:'工作与要求',rows:[['组织','company'],['地区','location'],['要求原文','text']]},{title:'来源与时效',rows:[['来源','source'],['资料日期','date'],['薪酬原文','salaryRaw']]}];
 return <section className="discovery-comparison job-field-comparison" data-i18n={publicExamples?'public':undefined} id={id} aria-label="岗位字段比较"><header><div><ProductIcon name="compare" size={24}/><h2>并排比较岗位要求</h2></div><button onClick={onClose}>关闭字段比较</button></header><div className="table-wrap"><table><caption className="sr-only">岗位职责、地区与来源对照，不计算匹配分</caption><thead><tr><th scope="col">比较内容</th>{jobs.map(job=><th key={job.id} scope="col"><span translate={publicExamples?undefined:'no'}>{job.title}</span><button aria-label={'移出比较：'+job.title} onClick={()=>onRemove(job)}><ProductIcon name="close" size={17}/></button></th>)}</tr></thead>{groups.map(group=><tbody key={group.title}><tr className="job-compare-group"><th scope="rowgroup" colSpan={jobs.length+1}>{group.title}</th></tr>{group.rows.map(([label,key])=><tr key={key}><th scope="row">{label}</th>{jobs.map(job=><td key={job.id} translate={!publicExamples&&job[key]?'no':undefined}>{job[key]||'未知'}</td>)}</tr>)}</tbody>)}</table></div><p>字段并排查看，不计算匹配分或薪酬预测。</p></section>;
}
