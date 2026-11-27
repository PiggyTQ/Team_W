import React,{useState} from 'react';
import {lessonSections,resolveLessonSection} from './skill-lesson-sequence';
import WebVitalsDiagnosis from './WebVitalsDiagnosis';
import {skillTeaching} from './skill-teaching';
import {TeachingWorkedExample,TeachingSelfCheck,TeachingReferences} from './SkillTeachingLesson';
export function LessonCode({text,language}){const [copied,setCopied]=useState(false);return <div className="lesson-code"><div><span>{language==='en'?'Example / input':'示例 / 输入'}</span><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);}catch{const area=document.createElement('textarea');area.value=text;area.style.cssText='position:fixed;left:-9999px';document.body.append(area);area.select();setCopied(document.execCommand('copy'));area.remove();}}}>{copied?(language==='en'?'Copied':'已复制'):(language==='en'?'Copy':'复制')}</button></div><pre><code>{text}</code></pre></div>;}
export function LessonTable({text}){
 const rows=text.trim().split(/\n/).map(row=>row.split(','));
 if(rows.length<2||rows[0].length<2||rows.some(r=>r.length!==rows[0].length))return null;
 return <div className="lesson-table-wrap"><table><thead><tr>{rows[0].map((cell,i)=><th key={i} scope="col">{cell}</th>)}</tr></thead><tbody>{rows.slice(1).map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell||'—'}</td>)}</tr>)}</tbody></table></div>;
}
export function LessonMaterial({lab,language,label}){const table=lab.tables||null;const rows=lab.input.trim().split(/\n/).map(r=>r.split(','));const csv=rows.length>1&&rows[0].length>1&&rows.every(r=>r.length===rows[0].length);return table?<>{table.map((t,i)=><section key={i}><h4>{label(t.title)}</h4><LessonTable text={t.csv}/></section>)}</>:csv?<><LessonTable text={lab.input}/><details><summary>{language==='en'?'Copy raw material':'复制原始材料'}</summary><LessonCode text={lab.input} language={language}/></details></>:<LessonCode text={lab.input} language={language}/>;}
export default function SkillDeepLesson({skillKey,lesson,depth,section,setSection,label,language,onPractice,markRead,children,lessonState={},onLessonState=()=>{}}){
 const packet=skillTeaching[skillKey],en=language==='en',tx=(z,e)=>en?e:z,hasLab=!!lesson.lab;
 const ids=lessonSections(skillKey,hasLab),current=resolveLessonSection(skillKey,section,hasLab),index=ids.indexOf(current);
 const names={concept:tx('概念与原理','Concepts and principles'),method:tx('完整示范','Worked example'),examples:tx('操作与验证','Operations and verification'),mistakes:tx('自己试一遍','Try it yourself')};
 if(!packet)return null;
 return <div className="lesson-reading teaching-reading" data-teaching-lesson={skillKey}>
  <nav className="lesson-index" aria-label={tx('本课目录','Lesson contents')}>{ids.map((id,i)=><button type="button" key={id} aria-current={current===id?'location':undefined} onClick={()=>setSection(id)}><small>{String(i+1).padStart(2,'0')}</small>{names[id]}</button>)}</nav>
  <div className="lesson-body teaching-body" data-lesson-section={current}>
   {current==='concept'&&<>
    <section className="teaching-explanation"><p className="teaching-eyebrow">{tx('本课讲解','In this lesson')}</p><h3>{label(packet.title)}</h3>{packet.explain.map((p,i)=><p key={i}>{label(p)}</p>)}</section>
    <section className="teaching-case-preview"><h4>{tx('接下来一起解决的案例','The case we will work through')}</h4><p>{label(packet.worked.given)}</p><button type="button" className="skill-control" onClick={()=>setSection('method')}>{tx('看完整推演','See the complete walkthrough')} →</button></section>
    {skillKey==='frontend:web-vitals'&&<WebVitalsDiagnosis {...{language,lessonState,onLessonState}}/>}
    {skillKey==='testing:boundary'&&<BoundaryObservation language={language} value={lessonState.boundaryValue??2} setValue={value=>onLessonState({boundaryValue:value})}/>}
   </>}
   {current==='method'&&<>
    <TeachingWorkedExample {...{skillKey,packet,label,language}}/>
    <label className="teaching-prediction">{tx('把推演用自己的话复述一遍','Explain the reasoning in your own words')}<textarea rows={3} maxLength={600} data-i18n="off" value={lessonState.casePrediction||''} onChange={event=>onLessonState({casePrediction:event.target.value})}/></label>
    <details className="teaching-extra-example"><summary>{tx('再看原有案例与核对方法','See the additional case and verification method')}</summary>{label(depth.example).split('^').map((p,i)=><p key={i}>{p}</p>)}<p>{label(depth.verify)}</p></details>
   </>}
   {current==='examples'&&hasLab&&<section className="teaching-operations lesson-lab"><p className="teaching-eyebrow">{tx('把示范变成可复核的操作','Turn the worked example into verifiable operations')}</p><h3>{tx('材料、操作和检查结果','Material, operations and results')}</h3>
    <p className="depth-scope">{lesson.lab.scope?label(lesson.lab.scope):tx('合成材料；未标注实际执行的操作仍需在自己的隔离环境核对。','Synthetic material;operations without an execution note require verification in an isolated environment.')}</p>
    <LessonMaterial lab={lesson.lab} {...{label,language}}/><h4>{tx('操作示例','Operational example')}</h4><LessonCode text={lesson.lab.code} language={language}/><h4>{tx('怎样执行与比较','How to run and compare')}</h4><p>{label(lesson.lab.procedure)}</p><div className="teaching-result"><h4>{tx('用什么证据复核','Verification evidence')}</h4><p>{label(depth.verify)}</p></div>
   </section>}
   {current==='mistakes'&&<TeachingSelfCheck {...{skillKey,label,language,lessonState,onLessonState}}/>}
  </div>
  <TeachingReferences {...{packet,depth,lesson,label,language}}>{children}</TeachingReferences>
  <footer className="follow-course-actions">{index>0&&<button type="button" className="skill-control" onClick={()=>setSection(ids[index-1])}>{tx('上一节','Previous')}</button>}{index<ids.length-1?<button type="button" className="skill-control skill-primary" onClick={()=>setSection(ids[index+1])}>{names[ids[index+1]]} →</button>:<button type="button" className="skill-control skill-primary" onClick={()=>{markRead();onPractice();}}>{tx('记录阅读，进入练习','Record reading and practice')} →</button>}</footer>
 </div>;
}
function BoundaryObservation({language,value,setValue}){return <div className="follow-boundary-strip"><p>{language==='en'?'Teaching integer range:2–8 inclusive':'教学整数范围：2至8（含端点）'}</p><div>{[1,2,3,7,8,9].map(n=><button type="button" key={n} aria-pressed={value===n} data-inside={n>=2&&n<=8} onClick={()=>setValue(n)}>{n}</button>)}</div><p role="status">{value}{value>=2&&value<=8?(language==='en'?' is in the accepted interval':'在有效范围内'):(language==='en'?' is outside the accepted interval':'在有效范围外')}</p></div>;}
