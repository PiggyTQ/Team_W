import React,{useEffect,useState} from 'react';
import {apiRequest,SERVER_AUTH} from './auth-client';
import {careers} from './model';
import './catalog-data.css';
import {localizedElement as renderLocalized,getLanguage} from './i18n/render';

export function useCatalog(path){
  const [state,setState]=useState({loading:true,data:null,error:''}),[retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!SERVER_AUTH||!path)return;
    const controller=new AbortController();setState({loading:true,data:null,error:''});
    apiRequest(path,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({loading:false,data,error:''});}).catch(error=>{if(!controller.signal.aborted)setState({loading:false,data:null,error:error.code==='SESSION_EXPIRED'?'登录已过期，请重新登录。':'数据读取失败，请重试。'});});
    return()=>controller.abort();
  },[path,retry]);
  return {...state,retry:()=>setRetry(x=>x+1)};
}
export function CatalogState({request,children}){
  return request.loading?<p role="status">正在读取展示资料…</p>:request.error?<p role="alert">{request.error} <button onClick={request.retry}>重试读取</button></p>:renderLocalized(React.Fragment,{'data-i18n':'public'},children);
}
const list=value=>Array.isArray(value)?value:value?.items||[];
const relationName=id=>careers.find(c=>({SW_BE:'backend',SW_FE:'frontend',SW_TEST:'testing',SW_GENERAL:'software',IMPLEMENTATION:'delivery',ML_AI:'ai',DATA_ENG:'engineering',DATA_ANALYST:'data',CYBERSEC:'security',DEVOPS_SRE:'ops'})[id?.split('.')[0]]===c.id)?.name||id;

export function CareerKnowledge({career,precheck,link}){
  const [open,setOpen]=useState(false);
  return SERVER_AUTH?<details className="panel catalog-panel" onToggle={e=>setOpen(e.currentTarget.open)}><summary>查看已入库职业资料、细分方向与实践建议</summary>{open&&<CareerKnowledgeBody key={career} career={career} precheck={precheck} link={link}/>}</details>:null;
}
function CareerKnowledgeBody({career,precheck,link}){
  const request=useCatalog('/api/catalog/profiles/'+encodeURIComponent(career)),d=request.data,p=d?.profile;
  return <CatalogState request={request}>{p&&<><p className="caption">{d.notice}</p><p>{p.definition}</p><p>{p.scope_and_boundaries}</p><h3>典型任务</h3><ul>{list(p.typical_tasks).map(text=><li key={text}>{text}</li>)}</ul><h3>建议学习重点</h3><p>{d.skills.map(r=>r.name).join('、')||'待补充'}。技术路线有备选关系，不要求全部掌握。</p><h3>细分方向与职责</h3><ul>{d.children.map(row=><li key={row.id}><strong>{row.title}</strong>：{row.definition}</li>)}</ul>{d.relations.length>0&&<details><summary>查看相关职业学习关系</summary><ul>{d.relations.map(r=><li key={r.relation_id}>{relationName(r.from_profile_id)} → {relationName(r.to_profile_id)}：{r.bridge_task||r.definition||r.shared_foundation||r.relation_type}。这是学习关系，不是转岗概率。</li>)}</ul></details>}<h3>{d.action.title||'职业实践建议'}</h3><ul>{(d.action.deliverables||[]).map(t=><li key={t}>{t}</li>)}</ul><details><summary>查看成果自查标准</summary><ul>{(d.action.acceptance_checks||[]).map(t=><li key={t}>{t}</li>)}</ul></details><div className="actions">{precheck&&<button onClick={()=>precheck({template:'external',career,title:d.action.title,purpose:'通过职业实践了解工作任务与个人准备',product:(d.action.deliverables||[]).join('；'),source:'/careers?career='+career})}>预览实践任务与投入</button>}{link?.('/careers?tab=企业与岗位','查询岗位样本 →')}</div><details><summary>数据版本与来源编号</summary><p>{p.profile_id} · {p.profile_version} · {p.built_on}</p><p>{(p.reference_ids||[]).join('、')||'未提供'}</p>{d.sources.map(source=><p key={source.id}>{source.title||source.name||source.id}{source.url&&/^https?:/.test(source.url)&&<> · <a href={source.url} target="_blank" rel="noreferrer">查看来源</a></>}</p>)}<p>原始审核状态未修改；样本数量和提及频次不作为能力权重。</p></details></>}</CatalogState>;
}
export function KnowledgeIndex({mode='summary',career,link}){
  const [open,setOpen]=useState(mode==='summary');
  if(!SERVER_AUTH)return null;
  return <details className="panel catalog-panel" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{mode==='summary'?'展示数据库与来源说明':mode==='resources'?'查看已收集的外部资源链接':'查看入库技能词典与职业关系'}</summary>{open&&<KnowledgeIndexBody mode={mode} career={career} link={link}/>}</details>;
}
function KnowledgeIndexBody({mode,link}){
  const [query,setQuery]=useState(''),[page,setPage]=useState(1);
  const request=useCatalog(mode==='summary'?'/api/catalog/summary':mode==='resources'?'/api/catalog/resources':'/api/catalog/skills');
  const d=request.data,rows=(d?.items||[]).filter(r=>!query||JSON.stringify(r).toLowerCase().includes(query.toLowerCase())),visible=rows.slice((page-1)*15,page*15);
  return <CatalogState request={request}>{d&&<><p className="caption">{d.notice}</p>{mode==='summary'?<><dl className="catalog-counts">{[['职业画像','profiles'],['技能','skills'],['岗位快照','jobs'],['技能提及记录','mentions'],['职业关系','relations'],['资源链接','resources']].map(([name,key])=><div key={key}><dt>{name}</dt><dd>{d.counts[key]||0}</dd></div>)}</dl><p>岗位采集：{d.metadata.snapshotDate}；画像版本日期：{d.metadata.profileDate}。人工审核按本次小组展示要求跳过，未将原始记录改为已审核。</p>{link?.('/careers?tab=企业与岗位','查询全部岗位样本 →')}<details><summary>查看原始数据文件和指纹</summary>{d.metadata.sourceManifest.map(r=><p key={r.path}>{r.path}<br/><code>{r.sha256}</code></p>)}</details></>:<><label className="field"><span>{mode==='resources'?'搜索资源或技能':'搜索技能或别名'}</span><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label><p>{rows.length} 条结果</p><ul className="catalog-result-list">{visible.map(r=><li key={r.id||r.resource_id}><strong>{r.name||r.canonical_name||r.title}</strong>{mode==='resources'?<><p>{r.provider} · 记录日期 {r.checked_on||'未知'} · 仅保存外部链接，当前可用性与费用需在原站核对。</p>{/^https?:/.test(r.url)&&<a href={r.url} target="_blank" rel="noreferrer">打开资源网站 ↗</a>}</>:<p>{r.id} · {r.dimension} · 别名：{String(r.aliases||'未提供')}</p>}</li>)}</ul><div className="actions"><button disabled={page<=1} onClick={()=>setPage(x=>x-1)}>上一页</button><span>第 {page} / {Math.max(1,Math.ceil(rows.length/15))} 页</span><button disabled={page*15>=rows.length} onClick={()=>setPage(x=>x+1)}>下一页</button></div></>}</>}</CatalogState>;
}

export function ServerReportExport({sync,download}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  if(!SERVER_AUTH)return null;
  return <section className="panel catalog-panel"><h2>从账户记录导出职业准备文档</h2><p>按已保存的目标、确认材料和行动记录生成 Markdown 文件，包含来源编号与待补内容；此功能未调用 AI。</p><button disabled={busy} onClick={async()=>{setBusy(true);setMessage('');try{const receipt=await sync.command('report.compile',{language:getLanguage(),confirmation:'COMPILE_REPORT'});const record=sync.current().state.reports.find(row=>row.id===receipt.refs.reportId);if(!record)throw Error('NOT_FOUND');download('career-preparation.md',record.body);setMessage('文档已生成，已发起下载。');}catch{setMessage('文档生成失败，请确认保存状态后重试。');}finally{setBusy(false);}}}>{busy?'正在生成…':'导出职业准备文档'}</button>{message&&<p role="status">{message}</p>}</section>;
}

export function PracticeTemplates({precheck}){
  const [open,setOpen]=useState(false);
  if(!SERVER_AUTH)return null;
  return <details className="panel catalog-panel" onToggle={e=>setOpen(e.currentTarget.open)}><summary>查看已收集的外部实践任务模板</summary>{open&&<PracticeTemplatesBody precheck={precheck}/>}</details>;
}
function PracticeTemplatesBody({precheck}){
  const request=useCatalog('/api/catalog/actions');
  return <CatalogState request={request}>{request.data&&<><p>以下为项目编写的实践建议，不是待收集的四套课程，也不提供自动能力认证。展开后可自行准备素材，并预览投入与任务。</p>{request.data.items.map(action=><details key={action.action_id}><summary>{action.title}</summary><h3>交付内容</h3><ul>{(action.deliverables||[]).map(t=><li key={t}>{t}</li>)}</ul><h3>自查标准</h3><ul>{(action.acceptance||[]).map(t=><li key={t}>{t}</li>)}</ul><button onClick={()=>precheck({template:'external',title:action.title,purpose:'按实践模板了解工作任务并记录个人贡献',product:(action.deliverables||[]).join('；'),source:'/learning'})}>预览任务与时间预算</button></details>)}</>}</CatalogState>;
}
