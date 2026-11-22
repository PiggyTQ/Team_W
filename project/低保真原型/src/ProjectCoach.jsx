import React,{useState} from 'react';
import ProductIcon from './ProductIcon';

export default function ProjectCoach({project, step, task, state, liveAgent, workspace, language, link}) {
  const en = language === 'en';
  const copy = value => value[language];
  const [hint,setHint]=useState(false);
  const sources=project.sources.filter(source=>step.sourceIds.includes(source.id));
  return <>
    <section className="project-coach" id="project-practice-assistant" data-i18n="off"><div className="project-coach-heading"><ProductIcon name="brain" size={23}/><h3>{en?'Course step guidance':'课程本步提示'}</h3><button type="button" onClick={()=>setHint(v=>!v)} aria-expanded={hint}>{en?'Show step hint':'查看本步提示'}</button></div><p>{copy(step.title)}</p>{hint&&<div className="project-coach-hint"><p>{copy(step.hint)}</p><p>{copy(step.check)}</p><ul>{sources.map(source=><li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></div>}</section>
  </>;
}
