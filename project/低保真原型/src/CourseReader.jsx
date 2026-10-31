import React,{useState} from 'react';
import {apiRequest} from './auth-client';
import {authMessage} from './auth-contract';
import CourseMarkdown from './CourseMarkdown';
import {useCatalog,CatalogState} from './CatalogData';
import './course-reader.css';

export function CourseDownload({asset}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <span className="course-download"><button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const result=await apiRequest(asset.url,{binary:true});const url=URL.createObjectURL(result.blob),a=document.createElement('a');a.href=url;a.download=asset.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(authMessage(e.code));}finally{setBusy(false);}}}>{busy?'正在下载…':'下载 '+asset.filename}</button><small>{Math.max(1,Math.ceil(asset.bytes/1024))} KB</small>{error&&<span role="alert">{error}</span>}</span>;
}
function Downloads({course,roles}){
  const rows=course.assets.filter(a=>roles.includes(a.role));
  return rows.length?<ul className="course-asset-list">{rows.map(asset=><li key={asset.id}><div><strong>{asset.relative_path}</strong><small>内容 v{course.content_version}</small></div><CourseDownload asset={asset}/></li>)}</ul>:<p>这部分没有可下载文件。</p>;
}
export function CoursePractice({course,includeReference=true}){
  return <div className="course-practice" data-i18n="public"><h3>实践任务</h3><CourseMarkdown text={course.practice}/><h3>输入与字段说明</h3><Downloads course={course} roles={['input','dictionary','task']}/><details><summary>展开本任务自查标准</summary><CourseMarkdown text={course.rubric}/><Downloads course={course} roles={['rubric']}/></details>{includeReference&&<details><summary>展开参考成果（先独立尝试，再对照）</summary><CourseMarkdown text={course.reference}/><Downloads course={course} roles={['reference']}/></details>}<details><summary>资料来源与使用范围</summary><p>正文与任务由项目编写；数据质量课包含公开数据及教学派生，其他案例为离线合成。自检不构成独立能力认证。</p><Downloads course={course} roles={['source']}/></details></div>;
}
export default function CourseReader({course,chapter=0,onPosition,onSave,precheck}){
  const [selected,setSelected]=useState(Math.max(0,Math.min(course.chapters.length-1,Number(chapter)||0))),[mode,setMode]=useState('正文阅读');
  const select=index=>{setSelected(index);setMode('正文阅读');onPosition?.(index,course);};
  const chapterRow=course.chapters[selected];
  return <section className="course-reader" data-i18n="public"><p className="course-reader-context">{course.title} · 内容 v{course.content_version}。阅读位置单独保存，不代表任务完成。</p><nav className="course-mode-tabs" aria-label="课程内容">{['正文阅读','实践与素材','参考与自查','视频参考'].map(label=><button key={label} aria-pressed={mode===label} onClick={()=>setMode(label)}>{label}</button>)}</nav><div className="course-reader-layout"><nav className="course-chapters" aria-label="课程章节">{course.chapters.map((ch,i)=><button key={ch.id} aria-current={mode==='正文阅读'&&selected===i?'step':undefined} onClick={()=>select(i)}>{i+1}. {ch.title}</button>)}</nav><div className="course-reader-body" key={mode+selected}>
    {mode==='正文阅读'&&<><CourseMarkdown text={chapterRow.body}/><div className="actions"><button disabled={selected===0} onClick={()=>select(selected-1)}>上一章</button><button disabled={selected===course.chapters.length-1} onClick={()=>select(selected+1)}>下一章</button></div></>}
    {mode==='实践与素材'&&<CoursePractice course={course} includeReference={false}/>}
    {mode==='参考与自查'&&<><p>参考成果用于对照本资料包的固定口径；不是对本人能力的自动判定。</p><CourseMarkdown text={course.rubric}/><Downloads course={course} roles={['rubric','reference']}/><details><summary>查看参考说明</summary><CourseMarkdown text={course.reference}/></details></>}
    {mode==='视频参考'&&<><h3>外部视频参考</h3>{course.videos.map(v=><article className="course-video-reference" key={v.id}><h4>{v.title}</h4><p>{v.provider} · 英文参考</p><p>{v.viewing_guide_zh}</p><p>时长未知；完整播放尚未验证。外部来源可能受网络或平台条件影响。</p><a className="button" href={v.source_url} target="_blank" rel="noreferrer">打开视频来源</a><p className="caption">打开外链不记为已观看或课程完成；正文与实践文件可以独立使用。</p></article>)}</>}
  </div></div><div className="course-reader-actions actions"><button onClick={()=>onSave?.(selected,course)}>保留阅读位置并返回</button>{precheck&&<button className="primary" onClick={()=>precheck({title:course.title,template:course.id,career:course.career_id,courseVersion:course.content_version,purpose:'通过课程实践了解工作任务并记录自己的产物与贡献',product:course.title+'：按实践任务和自查标准提交产物',kind:'离线教学实践',source:'/learning?unit='+course.id})}>预览实践范围与预算</button>}</div></section>;
}
export function CourseTaskMaterials({task}){
  const request=useCatalog(`/api/catalog/courses/${task.template}${task.courseVersion?'?version='+task.courseVersion:''}`),course=request.data?.course;
  return <details className="panel course-task-materials"><summary>课程任务素材、自查标准与参考 · v{task.courseVersion||1}</summary><CatalogState request={request}>{course?.status==='published'&&<CoursePractice course={course}/>}</CatalogState></details>;
}
export function CourseTaskReading({task,...props}){
  const request=useCatalog(`/api/catalog/courses/${task.template}${task.courseVersion?'?version='+task.courseVersion:''}`),course=request.data?.course;
  return <CatalogState request={request}>{course?.status==='published'&&<CourseReader key={course.id+course.content_version} course={course} {...props}/>}</CatalogState>;
}
