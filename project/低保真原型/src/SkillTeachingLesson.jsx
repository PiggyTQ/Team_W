import React,{useId,useState} from 'react';
import {skillTeaching,teachingFeedback,teachingRevision} from './skill-teaching';

export function TeachingWorkedExample({skillKey,packet,label,language}){
 const tx=(z,e)=>language==='en'?e:z;
 return <section className="teaching-worked" data-teaching-worked>
  <p className="teaching-eyebrow">{tx('完整示范 · 合成教学案例','Worked example · synthetic teaching case')}</p>
  <h3>{label(packet.worked.title)}</h3>
  <div className="teaching-given"><h4>{tx('已知材料','Given material')}</h4><p>{label(packet.worked.given)}</p></div>
  {skillKey==='security:threat-model'&&<UploadTrustFlow language={language}/>}
  <ol className="teaching-steps">{packet.worked.steps.map((s,i)=><li key={i}><span className="teaching-step-number" aria-hidden="true">{i+1}</span><div><h4>{label(s.title)}</h4><p>{label(s.detail)}</p></div></li>)}</ol>
  <div className="teaching-result"><h4>{tx('结果与依据','Result and rationale')}</h4><p>{label(packet.worked.result)}</p></div>
 </section>;
}

function UploadTrustFlow({language}){
 const [download,setDownload]=useState(false),tx=(z,e)=>language==='en'?e:z;
 return <figure className="teaching-flow" data-trust-flow>
  <figcaption>{tx('沿数据流找到控制应放在哪里','Follow the data to locate each control')}</figcaption>
  <div className="teaching-flow-switch"><button type="button" aria-pressed={!download} onClick={()=>setDownload(false)}>{tx('上传文件','Upload a file')}</button><button type="button" aria-pressed={download} onClick={()=>setDownload(true)}>{tx('下载文件','Download a file')}</button></div>
  <ol><li><strong>{tx('浏览器 · 用户 A','Browser · user A')}</strong><span>{download?tx('可修改请求中的文件 ID','Can change the requested file ID'):tx('可修改名称、内容和 owner_id','Can change name, bytes and owner_id')}</span></li><li><strong>{download?tx('下载 API','Download API'):tx('上传 API','Upload API')}</strong><span>{download?tx('可信会话 + 真实文件归属','Trusted session + actual ownership'):tx('可信会话 + 输入与容量限制','Trusted session + input and capacity bounds')}</span></li><li><strong>{tx('私有存储与元数据','Private storage and metadata')}</strong><span>{tx('只接受受控服务权限，保存真实归属','Controlled service access; actual ownership recorded')}</span></li></ol>
  <p className="teaching-flow-boundary">{tx('浏览器 → API：客户端输入不能决定身份或权限。API → 存储：服务权限不能直接交给浏览器。','Browser → API: client input cannot set identity or permission. API → storage: do not expose service privileges to the browser.')}</p>
  <p role="status">{download?tx('对照：A 下载自己的 F1 应允许；A 把 ID 改成 B 的 F2 应拒绝，响应不返回 F2 正文。扩展名检查解决不了这条边界上的对象授权。','Compare: allow A to download own F1; deny A requesting B’s F2 without returning F2 content. Extension checks cannot enforce object authorization at this boundary.'):tx('对照：A 提交 owner_id=B，系统应拒绝或仍按可信会话归属 A；文件名只作显示信息，不能直接决定存储路径。','Compare: if A submits owner_id=B, reject it or retain A from the trusted session. A display filename must not directly choose the storage path.')}</p>
 </figure>;
}

export function TeachingSelfCheck({skillKey,label,language,lessonState={},onLessonState=()=>{}}){
 const packet=skillTeaching[skillKey],id=useId(),tx=(z,e)=>language==='en'?e:z;
 if(!packet)return null;
 const feedback=teachingFeedback(packet,lessonState);
 const choice=lessonState.teachingRevision===teachingRevision(packet)?lessonState.teachingChoice:'';
 return <div className="teaching-self-check" data-teaching-check={skillKey}>
  <section className="teaching-question">
   <p className="teaching-eyebrow">{tx('换个情境，看看是否理解','Check your understanding in a new situation')}</p>
   <h3>{tx('先自己做一个判断','Make your own decision')}</h3>
   <fieldset><legend>{label(packet.check.prompt)}</legend>{packet.check.options.map(o=><label key={o.id} className="teaching-option" data-selected={choice===o.id}>
    <input type="radio" name={id} value={o.id} checked={choice===o.id} onChange={()=>onLessonState({teachingChoice:o.id,teachingChecked:false,teachingRevision:teachingRevision(packet)})}/><span>{label(o.text)}</span>
   </label>)}</fieldset>
   <button type="button" className="skill-control skill-primary" disabled={!choice} onClick={()=>onLessonState({teachingChecked:true,teachingRevision:teachingRevision(packet)})}>{tx('核对判断与理由','Check the decision and rationale')}</button>
   {feedback&&<div className="teaching-feedback" role="status" data-correct={feedback.correct}><strong>{feedback.correct?tx('这个判断有依据','This decision is supported'):tx('这里需要修正','Revise this decision')}</strong><p>{label(feedback.feedback)}</p></div>}
  </section>
  <section className="teaching-pitfall"><h3>{tx('把一个常见错误改对','Correct a common mistake')}</h3><dl>
   <div><dt>{tx('错误做法','Mistake')}</dt><dd>{label(packet.pitfall.wrong)}</dd></div>
   <div><dt>{tx('错在哪里','Why it fails')}</dt><dd>{label(packet.pitfall.why)}</dd></div>
   <div><dt>{tx('怎样修正','Correction')}</dt><dd>{label(packet.pitfall.correct)}</dd></div>
  </dl></section>
  <section className="teaching-transfer"><h3>{tx('再换一份材料，写出你的做法','Apply the method to different material')}</h3><p>{label(packet.transfer.prompt)}</p>
   <label htmlFor={id+'-transfer'}>{tx('我的判断、步骤与核对依据','My decision, steps and verification')}</label>
   <textarea id={id+'-transfer'} rows={4} maxLength={2500} value={lessonState.teachingTransfer||''} data-i18n="off" onChange={e=>onLessonState({teachingTransfer:e.target.value})}/>
   <details className="teaching-compare"><summary>{tx('对照一种做法与自查条件','Compare an approach and review criteria')}</summary><p>{label(packet.transfer.sample)}</p><ul>{packet.transfer.criteria.map((c,i)=><li key={i}>{label(c)}</li>)}</ul></details>
   <p className="teaching-note">{tx('这里保存的是随堂作答。开放解释请按条件自行复核，阅读和随堂核对不会增加树叶；后续练习与最终检验另行进行。','This saves classroom work. Review open reasoning against the criteria. Reading and classroom checks award no leaves; practice and the final check follow separately.')}</p>
  </section>
 </div>;
}

export function TeachingReferences({packet,depth,lesson,label,language,children}){
 const tx=(z,e)=>language==='en'?e:z;
 const sources=new Map((depth.sources||[]).map(s=>[s.url,s]));
 for(const url of packet.sourceUrls||[])if(!sources.has(url))sources.set(url,{url,title:new URL(url).hostname+' · '+decodeURIComponent(new URL(url).pathname).replaceAll('/',' › ').replace(/^ › | › $/g,'')});
 return <details className="teaching-references"><summary>{tx('方法来源、课前准备与适用范围','Method sources, prerequisites and scope')}</summary>
  <p>{label(lesson.prerequisite)}</p><p>{label(lesson.context)}</p><p>{label(lesson.scope)}</p><p>{label(depth.limits)}</p>
  <ul className="lesson-citations">{[...sources.values()].map(s=><li key={s.url}>{s.publisher&&<strong>{s.publisher}{s.version?' · '+s.version:''}</strong>}<a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a></li>)}</ul>
  <details><summary>{tx('关联项目与扩展','Related projects and further study')}</summary>{children}</details>
 </details>;
}
