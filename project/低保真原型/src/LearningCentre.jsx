import React from 'react';
import LearningCover from './LearningCover';
import {CheesePose} from './CheeseAvatar';
import LearningReadingGuide from './LearningReadingGuide';
import {learning,careers,cname} from './model';
import './learning-reading-guide.css';
import './learning-focus.css';
import './resource-centre.css';

export default function LearningCentre({s,url,link,open,precheck,startTask,move,live=false,catalog,catalogError,retryCatalog}) {
 const params=new URL(url,location.origin).searchParams;
 const direction=params.get('career')||'all',hours=params.get('hours')||'全部',selected=params.get('unit');
 const browseURL=patch=>{const next=new URL(url,location.origin);Object.entries(patch).forEach(([key,value])=>value==null?next.searchParams.delete(key):next.searchParams.set(key,value));return next.pathname+next.search;};
 const browse=patch=>move(browseURL(patch),true,{preserveScroll:true});
 const list=learning.filter(unit=>(direction==='all'||unit.career===direction)&&(params.get('scope')!=='当前目标相关'||unit.career===s.goal)&&(hours!=='2 小时以内'||unit.hours<=2)&&(hours!=='2 小时以上'||unit.hours>2));
 return <div className="library-layout learning-focus resource-centre"><aside className="library-filters"><h2>筛选项目</h2><div className="catalog-toolbar">
  <label className="field"><span>项目方向</span><select aria-label="项目方向" value={direction} onChange={e=>browse({career:e.target.value,scope:null})}><option value="all">全部方向</option>{careers.filter(c=>learning.some(unit=>unit.career===c.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  <label className="field"><span>预计投入</span><select aria-label="预计投入" value={hours} onChange={e=>browse({hours:e.target.value})}><option>全部</option><option>2 小时以内</option><option>2 小时以上</option></select></label>
 </div><p className="resource-filter-note">完成实践后，项目成果会自动归入“我的资源”。</p></aside>
 <section className="library-results" aria-label="资源中心项目"><div className="catalog-intent"><div><h2>选择一个项目，开始实践</h2><p>网站提供的实践项目。先了解要求与交付成果，再选择适合自己的实践范围。</p></div></div>
 {live&&!catalog?<div className="light-empty"><p role={catalogError?'alert':'status'}>{catalogError?'课程目录读取失败，已有记录保留。':'正在读取已发布课程…'}</p>{catalogError&&<button onClick={retryCatalog}>重试课程目录</button>}</div>:!list.length?<div className="light-empty cheese-learning-empty"><CheesePose pose="read" width={112} height={134}/><div><h3>当前筛选下没有项目</h3><p>试试其他项目方向或预计投入。</p><button onClick={()=>browse({career:null,hours:null,scope:null})}>重置筛选</button></div></div>:<div className="learning-grid">{list.map(unit=>{
  const pending=live&&catalog?.courses.find(course=>course.id===unit.id)?.status!=='published';
  const related=s.tasks.filter(task=>task.template===unit.id),active=related.find(task=>!task.completed&&['待开始','进行中','受阻'].includes(task.status));
  const done=related.filter(task=>task.completed===true&&task.status==='完成');
  const range=['最小范围','标准范围'].includes(params.get('range'))?params.get('range'):'最小范围';
  return <article className="learning-card" data-career={unit.career} key={unit.id}><div className="learning-media"><LearningCover career={unit.career}/></div><div className="learning-card-body"><div className="learning-card-content"><div className="learning-card-intro">
   <h3><span className="course-order" aria-hidden="true">{String(learning.findIndex(item=>item.id===unit.id)+1).padStart(2,'0')}</span>{unit.title}</h3>
   <div className="task-meta"><span>{cname(unit.career)}</span><span>{pending?'课程资料准备中':`${unit.hours}—${unit.standard}小时（示例估计）`}</span><span>{live?'中文正文 · 视频外链':'原创示例项目'}</span></div>
   <div className="learning-output"><span>项目成果</span><p>{pending?'正文、视频与实践要求将在资料收集完成后补充。':unit.product}</p></div>
   <div className="actions"><button className="primary" disabled={pending} aria-expanded={active?undefined:selected===unit.id} aria-controls={active?undefined:'practice-preview-'+unit.id} onClick={()=>active?startTask(active):browse({unit:selected===unit.id?null:unit.id,range:null})}>{pending?'课程资料准备中':active?'继续实践':selected===unit.id?'收起实践范围':'开始实践'}</button><button onClick={()=>open('reading',{template:unit.id,chapter:s.reading[unit.id]?.chapter||0})}>{s.reading[unit.id]?'继续阅读资料':'查看项目资料'}</button>{done.length>0&&link('/learning?tab=我的资源&source=practice','查看已完成成果','resource-completed-link')}</div>
  </div><LearningReadingGuide pending={pending} unit={unit} open={open} expanded={selected===unit.id} description={careers.find(c=>c.id===unit.career)?.task}/>
  {selected===unit.id&&!pending&&<div className="project-preview" id={'practice-preview-'+unit.id}><h4>选择这次实践的范围</h4><label className="field"><span>{unit.title}的实践范围</span><select aria-label={unit.title+'的实践范围'} value={range} onChange={e=>browse({unit:unit.id,range:e.target.value})}><option value="最小范围">最小范围 · {unit.hours}h</option><option value="标准范围">标准范围 · {unit.standard}h</option></select></label><div className="scope-pair"><div><span>最小范围</span><p>核心问题与限制记录。</p></div><div><span>标准范围</span><p>补充方法取舍、改进与表达。</p></div></div><p>开始前核对预计投入；完成后保留产物、本人贡献与限制说明。</p><div className="actions"><button className="primary" onClick={()=>precheck({title:unit.title,template:unit.id,career:unit.career,kind:live?'离线教学实践':'原创模拟实践',courseVersion:live?catalog.courses.find(course=>course.id===unit.id)?.content_version:undefined,hours:range==='标准范围'?unit.standard:unit.hours,purpose:`了解${cname(unit.career)}的代表任务与自身疑问`,product:unit.product,source:browseURL({unit:unit.id})})}>核对投入并创建实践</button><button onClick={()=>open('resource',{template:unit.id,unavailable:true})}>资源不可用怎么办？</button></div></div>}
  </div></div></article>;
 })}</div>}
 </section></div>;
}
