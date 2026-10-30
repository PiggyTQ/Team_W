import ProductIcon from './ProductIcon';
import React,{useState,useRef} from 'react';
import {SERVER_AUTH} from './auth-client';
import CatalogJobs from './CatalogJobs';
import {careers,cname} from './model';
import {parseSearchRequest,filteredResearch} from './site-quality-model';
import {saveSearchPreset} from './continuity-model';
import {displayText} from './i18n/render';
import './search-workbench.css';

function SearchSymbol({kind='search'}){
 return <ProductIcon name="check" size={18}/>;
}

export default function SearchWorkbench(props){const f=props.s.searchFilters;const catalog=!f||f.scope==='展示岗位样本';return SERVER_AUTH&&catalog?<CatalogJobs searchWorkspace key={JSON.stringify(f)} {...props} initialQuery={f?.query||''} initialCareer={f?.career==='any'?'':f?.career||''} initialLocation={f?.location==='不限'?'':f?.location||''} initialMarket={f?.market??'CN'}/>:<DemoSearchWorkbench {...props}/>;}
function DemoSearchWorkbench({s,update,link,tell}){
 const f=s.searchFilters||{query:'',career:'any',location:'不限',form:'不限',scope:'职业原创知识'},[error,setError]=useState(''),query=useRef(null),result=useRef(null);
 const patch=values=>{update({searchFilters:{...f,...values,searched:false}});setError('');};
 const parse=e=>{e.preventDefault();try{update({searchFilters:parseSearchRequest(f.query,f)});setError('');}catch(e){setError(e.message);query.current?.focus();}};
 const rows=f.searched?filteredResearch(s,f):[];
 const step=f.searched?2:f.parsed?1:0;

 return <div className="quality-surface research-search">
  <header className="quality-purpose">
   <h2>把想了解的工作，变成可核对的条件</h2>
   <p>先说明需求，再纠正筛选。只有确认后才会查询已有内容，未识别的方向保持不限。</p>
  </header>
  <ol className="search-path" aria-label="检索步骤">
   {['描述需求','核对条件','查看来源'].map((label,index)=><li key={label} aria-current={index===step?'step':undefined} data-complete={index<step}>
    <span className="search-step-index" aria-hidden="true">{index<step?<SearchSymbol kind="check"/>:index+1}</span>
    <span className="search-step-label">{label}</span>
   </li>)}
  </ol>
  <div className="research-query-layout">
   <section className="research-query-main">
    <form onSubmit={parse} className="research-query-composer">
     <label className="field">
      <span className="research-input-label"><SearchSymbol/>描述需求</span>
      <textarea ref={query} aria-label={displayText('描述需求')} aria-invalid={error?true:undefined} aria-describedby={error?'research-query-error':'research-simulation-note'} value={f.query} onChange={e=>patch({query:e.target.value,parsed:false})} placeholder={displayText('例如：想了解前端开发，或查找本人保存的数据岗位')}/>
     </label>
     {error&&<p id="research-query-error" role="alert" className="error">{error}</p>}
     <div className="research-compose-actions"><button className="primary" type="submit">生成模拟筛选草稿<SearchSymbol kind="arrow"/></button></div>
    </form>
   </section>
   <aside className="research-prompt-rail">
    <h3>从一个具体问题开始</h3>
    <p>点击只填入问题，条件仍由你核对。</p>
    <div className="research-prompt-list">{['想了解前端开发','上海的数据分析，希望远程','了解软件测试的工作'].map(text=><button type="button" className="quality-prompt" key={text} onClick={()=>{patch({query:displayText(text),parsed:false});query.current?.focus();}}><span>{text}</span><SearchSymbol kind="arrow"/></button>)}</div>
   </aside>
   <small id="research-simulation-note" className="research-simulation-note">仅使用确定性示例规则。未连接真实 AI 或实时招聘源。</small>
  </div>
  {f.parsed&&<section className="research-filter-editor" aria-label="核对检索条件">
   <header className="research-section-heading"><span className="research-section-symbol"><SearchSymbol kind="filter"/></span><div>
    <h3>这些条件，是否符合你的意思？</h3>
    <p>{f.recognized?.length===1?'识别到一个方向，请核对后再继续。':f.recognized?.length>1?'描述中有多个方向，暂保留不限，可手动选择其中一个。':'没有识别到唯一方向，保留不限；不会默认指定数据分析。'}</p>
   </div></header>
   <div className="quality-fields">
    <label className="field"><span>方向</span><select aria-label="方向" value={f.career} onChange={e=>patch({career:e.target.value})}><option value="any">不限方向</option>{careers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="field"><span>地点</span><input aria-label="地点" value={f.location} onChange={e=>patch({location:e.target.value||'不限'})}/></label>
    <label className="field"><span>工作形式</span><select aria-label="工作形式" value={f.form} onChange={e=>patch({form:e.target.value})}>{['不限','远程','现场','混合'].map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="field"><span>检索资料层</span><select aria-label="检索资料层" value={f.scope} onChange={e=>patch({scope:e.target.value})}>{['职业原创知识','本人私有研究卡','获准岗位（无数据源）'].map(x=><option key={x}>{x}</option>)}</select></label>
   </div>
   <p className="quality-note">这里只按上方字段检索，其余描述未自动转为条件。职业知识不适用地域和工作形式；本人研究卡与公开目录分开。</p>
   {s.stage!=='S2'&&<p className="notice">当前可起草条件，S2 才开放模拟检索操作。</p>}
   <div className="quality-actions">
    <button className="primary" disabled={s.stage!=='S2'} onClick={()=>{update({searchFilters:{...f,searched:true,date:new Date().toISOString().slice(0,10)}});requestAnimationFrame(()=>{result.current?.scrollIntoView({block:'start'});result.current?.focus({preventScroll:true});});}}>确认筛选并检索（模拟）<SearchSymbol kind="arrow"/></button>
    <button onClick={()=>{update(x=>({...x,presets:saveSearchPreset(x.presets,f)}));tell('已保存条件，没有开启通知。');}}>保存搜索条件，不开通知</button>
   </div>
  </section>}
  {f.searched&&<section className="research-result-list" ref={result} tabIndex={-1} aria-label="检索结果与来源范围">
   <header className="research-section-heading"><span className="research-section-symbol"><SearchSymbol kind="source"/></span><div><h3>检索结果与来源范围</h3><p>{f.scope} · {f.career==='any'?'不限方向':cname(f.career)} · {rows.length} 条已有内容</p></div></header>
   {rows.length?rows.map(r=><article key={r.id}>
    <div><h4>{r.name||r.title}</h4><p translate={r.name?undefined:'no'}>{r.task||r.text}</p><small>{r.name?'原创合成 v1 · 职业知识，不是在招岗位':(r.source||'来源未知')+' · '+(r.date||'日期未知')+' · 在招未核验'}</small></div>
    {link(r.name?'/careers?career='+r.id:'/careers?tab=我的机会&job='+encodeURIComponent(r.id),r.name?'了解这个职业 →':'打开已保存研究卡 →','button')}
   </article>):<div className="quality-empty">
    <span className="research-empty-symbol"><SearchSymbol/></span>
    <div><h4>没有找到符合条件的内容</h4><p>{f.scope==='获准岗位（无数据源）'?'当前没有获准的招聘源，不用合成示例冒充真实岗位。':'当前保存记录未满足这些字段。可以改条件或补充本人允许处理的岗位原文。'}</p><div className="quality-actions"><button onClick={()=>patch({location:'不限',form:'不限',scope:'职业原创知识'})}>放宽并重新确认</button>{link('/careers?tab=我的机会','手动添加岗位','button')}</div></div>
   </div>}
  </section>}
 </div>;
}
