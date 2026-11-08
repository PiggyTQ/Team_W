import React,{useEffect,useRef,useState} from 'react';
import {careers,cname} from './model';
import {CheesePose} from './CheeseAvatar';
import LearningCover from './LearningCover';
import {personalResources,completedPracticeResources} from './my-resources-model';
import {listResourceProjects,uploadResourceProject,downloadResourceProject,deleteResourceProject,RESOURCE_PROJECT_ACCEPT,resourceProjectErrorMessage} from './resource-project-client';
import './resource-centre.css';

export default function MyResources({s,url,move,link,live=false,ownerId}){
 const params=new URL(url,location.origin).searchParams;
 const source=['practice','upload'].includes(params.get('source'))?params.get('source'):'all',career=params.get('career')||'all';
 const [uploads,setUploads]=useState([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[retry,setRetry]=useState(0);
 const [uploadOpen,setUploadOpen]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(''),[removeId,setRemoveId]=useState(null);
 const titleRef=useRef(null),errorRef=useRef(null),uploadTrigger=useRef(null);
 const browse=patch=>{const next=new URL(url,location.origin);Object.entries(patch).forEach(([key,value])=>value==null?next.searchParams.delete(key):next.searchParams.set(key,value));move(next.pathname+next.search,true,{preserveScroll:true});};
 useEffect(()=>{let active=true;setLoading(true);setLoadError('');listResourceProjects({live,ownerId}).then(items=>{if(active)setUploads(items);}).catch(err=>{if(active)setLoadError(resourceProjectErrorMessage(err));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[live,ownerId,retry]);
 useEffect(()=>{if(uploadOpen)titleRef.current?.focus();},[uploadOpen]);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 const items=personalResources(s,uploads,{source,career}),practiceCount=completedPracticeResources(s).length;
 const cancelUpload=()=>{setUploadOpen(false);setError('');uploadTrigger.current?.focus();};
 async function upload(event){
  event.preventDefault();if(busy)return;const form=event.currentTarget,data=new FormData(form);setError('');setNotice('');setBusy('upload');
  try{
   const project=await uploadResourceProject({title:data.get('title'),description:data.get('description'),contribution:data.get('contribution'),career:data.get('career'),completed:data.get('completed')==='on'},data.get('file'),{live,ownerId});
   setUploads(previous=>[project,...previous]);setUploadOpen(false);setNotice('项目已保存到我的资源。');browse({source:'upload',career:null});uploadTrigger.current?.focus();
  }catch(err){setError(resourceProjectErrorMessage(err));}finally{setBusy('');}
 }
 async function download(item){
  setBusy(item.id);setError('');setNotice('');
  try{const {blob,filename}=await downloadResourceProject(item.id,{live,ownerId}),href=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=href;anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}
  catch(err){setError(resourceProjectErrorMessage(err));}finally{setBusy('');}
 }
 async function remove(item){
  setBusy(item.id);setError('');
  try{await deleteResourceProject(item.id,{live,ownerId});setUploads(previous=>previous.filter(project=>project.id!==item.id));setRemoveId(null);setNotice('上传项目已移除。');}
  catch(err){setError(resourceProjectErrorMessage(err));}finally{setBusy('');}
 }
 return <div className="library-layout learning-focus resource-centre my-resources"><aside className="library-filters"><h2>项目来源</h2><nav className="learning-collections" aria-label="我的资源来源">{[['all','全部项目',practiceCount+uploads.length],['practice','平台实践',practiceCount],['upload','自主上传',uploads.length]].map(([key,label,count])=><button key={key} className="button" aria-pressed={source===key} onClick={()=>browse({source:key})}><span>{label}</span><small>{count}</small></button>)}</nav><div className="catalog-toolbar"><label className="field"><span>项目方向</span><select aria-label="项目方向" value={career} onChange={e=>browse({career:e.target.value})}><option value="all">全部方向</option>{careers.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}<option value="other">其他方向</option></select></label></div><p className="resource-filter-note">这里保留你已完成的项目，方便查看成果与本人贡献。</p></aside>
 <section className="library-results" aria-label="我的资源列表"><div className="catalog-intent personal-resource-heading"><div><h2>把完成的项目，留在这里</h2><p>包括在资源中心完成的实践项目，以及你自行完成并上传的项目。</p></div><button ref={uploadTrigger} className="primary" aria-expanded={uploadOpen} aria-controls="resource-project-upload" onClick={()=>{setUploadOpen(!uploadOpen);setError('');}}>上传项目</button></div>
 {notice&&<p className="resource-notice" role="status">{notice}</p>}
 {uploadOpen&&<form id="resource-project-upload" className="resource-upload-form" aria-label="上传已完成项目" onSubmit={upload}><h3>上传已完成项目</h3><p>添加项目说明和成果文件，保存到你的个人资源中。</p><div className="resource-form-grid"><label className="field"><span>项目名称</span><input name="title" ref={titleRef} required maxLength={120}/></label><label className="field"><span>项目方向</span><select name="career" defaultValue="other">{careers.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}<option value="other">其他方向</option></select></label></div><label className="field"><span>成果说明</span><textarea name="description" rows={3} required maxLength={5000}/></label><label className="field"><span>本人贡献</span><textarea name="contribution" rows={2} required maxLength={2000}/></label><label className="field"><span>项目文件</span><input name="file" type="file" accept={RESOURCE_PROJECT_ACCEPT} required aria-describedby="resource-file-help"/></label><p id="resource-file-help" className="caption">支持 PDF、ZIP、DOCX、TXT、MD、JSON、CSV、PNG、JPG，单个文件不超过 10 MB。</p><label className="check"><input type="checkbox" name="completed" required/>我已完成这个项目，以上内容是本人实际成果。</label>{error&&<p ref={errorRef} className="resource-error" role="alert" tabIndex={-1}>{error}</p>}<div className="actions"><button className="primary" type="submit" disabled={!!busy}>{busy==='upload'?'正在保存项目…':'保存到我的资源'}</button><button type="button" disabled={!!busy} onClick={cancelUpload}>取消上传</button></div></form>}
 {!uploadOpen&&error&&<p ref={errorRef} className="resource-error" role="alert" tabIndex={-1}>{error}</p>}
 {loading&&<p role="status">正在读取上传项目…</p>}{loadError&&<div className="resource-error" role="alert"><p>{loadError}</p><button onClick={()=>setRetry(value=>value+1)}>重试读取项目</button></div>}
 {!items.length&&!loading&&!loadError?<div className="light-empty cheese-learning-empty"><CheesePose pose="read" width={112} height={134}/><div><h3>{source==='practice'?'还没有完成的平台项目':source==='upload'?'还没有上传项目':career!=='all'?'当前方向没有已完成项目':'还没有已完成项目'}</h3><p>完成资源中心的实践后会自动收录，也可以上传自己的项目成果。</p><div className="actions">{link('/learning?tab=资源中心','去资源中心','button')}{career!=='all'&&<button onClick={()=>browse({career:null})}>查看全部方向</button>}</div></div></div>:<div className="learning-grid">{items.map(item=><article className="learning-card personal-resource-card" key={item.source+'-'+item.id} data-resource-id={item.id} data-resource-source={item.source} data-career={item.career}><div className="learning-media"><LearningCover career={item.career}/></div><div className="learning-card-body"><div className="personal-resource-meta"><span className="resource-source-label">{item.source==='practice'?'平台实践':'自主上传'}</span><span>已完成</span><span>{item.career==='other'?'其他方向':cname(item.career)}</span></div><h3 translate="no">{item.title}</h3><p className="resource-description" translate="no">{item.description}</p>{item.contribution&&<p className="resource-contribution"><strong>本人贡献</strong><span translate="no">{item.contribution}</span></p>}<div className="actions">{item.source==='practice'?link(item.to,'查看项目成果','button primary'):<><button className="primary" disabled={!!busy} onClick={()=>download(item)}>{busy===item.id?'正在处理…':'下载成果文件'}</button><span className="resource-file-name" translate="no">{item.file.name}</span></>}</div>{item.source==='upload'&&<details className="resource-project-details"><summary>项目详情与管理</summary><dl><div><dt>保存时间</dt><dd>{new Date(item.createdAt).toLocaleDateString(document.documentElement.lang)}</dd></div><div><dt>文件大小</dt><dd>{Math.ceil(item.file.size/1024)} KB</dd></div></dl>{removeId===item.id?<div className="resource-remove-confirm"><p>移除后将删除这个上传项目及其成果文件。</p><button disabled={!!busy} onClick={()=>remove(item)}>确认移除</button><button onClick={()=>setRemoveId(null)}>保留项目</button></div>:<button onClick={()=>setRemoveId(item.id)}>移除上传项目</button>}</details>}</div></article>)}</div>}
 </section></div>;
}


