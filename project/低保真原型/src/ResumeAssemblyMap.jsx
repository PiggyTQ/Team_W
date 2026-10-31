import React,{useState} from 'react';
import {resumeModules,resumeFactSection} from './resume-content-model';
import ControlIcon from './ControlIcon';

export default function ResumeAssemblyMap({data,draft,choose,inspect,showPreview,editRequirement,link}){
 const {facts,education,job,requirements,relations,expressions}=data;
 const [expanded,setExpanded]=useState(()=>!matchMedia('(max-width:720px)').matches);
 const modules=resumeModules.filter(m=>!['profile','education'].includes(m.id)).map(m=>({...m,count:facts.filter(f=>resumeFactSection(f,draft.placements)===m.id).length})).filter(m=>m.count);
 if(education.length)modules.unshift({id:'education',title:'教育经历',count:education.length});
 return <details className="resume-assembly" open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}>
  <summary><h3>简历内容与依据</h3><span>{facts.length} 项经历 · {education.length} 项教育</span><ControlIcon name="chevron" size={16}/></summary>
  <div className="resume-assembly-flow">
   <section className="assembly-sources"><button type="button" className="assembly-heading" onClick={()=>choose('content')}>选入内容<ControlIcon name="arrow" size={15}/></button>
    {facts.length?<ul>{facts.slice(0,2).map(c=><li key={c.id}><button type="button" onClick={e=>inspect(c.id,e)}>{c.title}<small>查看本人确认原文</small></button></li>)}</ul>:<p>尚未选入确认经历</p>}
    {facts.length>2&&<button type="button" className="assembly-more" onClick={()=>choose('content')}>查看全部所选经历 →</button>}
    {education.length>0&&<small>{education.length} 项教育记录已选入</small>}{!facts.length&&!education.length&&link('/assessment?tab=资料经历','添加经历或教育 →')}
   </section><ControlIcon name="arrow" size={20}/>
   <section className="assembly-requirements"><button type="button" className="assembly-heading" onClick={()=>choose('tailor')}>{job?'岗位原文关联':'通用简历'}<ControlIcon name="arrow" size={15}/></button>
    {job?<><p>{data.linked} / {requirements.length} 条要求已由本人关联</p><div className="assembly-requirement-cells" role="group" aria-label="查看岗位要求的关联">{requirements.slice(0,6).map((req,i)=><button type="button" key={i} className={relations.edges.some(e=>e.target===String(i))?'is-linked':''} aria-label={'编辑岗位要求 '+(i+1)+'：'+req} title={req} onClick={()=>editRequirement(i)}>{i+1}</button>)}</div>{requirements.length>6&&<button type="button" className="assembly-more" onClick={()=>choose('tailor')}>查看全部岗位要求 →</button>}<small>本人关联，不表示满足岗位要求。</small></>:<p>{draft.target?'原岗位已不可用，请重新选择。':'无需岗位定向关联，按所选材料独立编排。'}</p>}
   </section><ControlIcon name="arrow" size={20}/>
   <section className="assembly-document"><button type="button" className="assembly-heading" onClick={showPreview}>成稿结构<ControlIcon name="arrow" size={15}/></button>
    {modules.length?<ul>{modules.map(m=><li key={m.id}><span>{m.title}</span><i aria-hidden="true"/><span>{m.count}</span></li>)}</ul>:<div className="assembly-empty-page"><span>暂无选入内容</span><i/><i/><i/></div>}
    <small>{expressions.filter(r=>r.confirmed).length} 条岗位表达已由本人确认</small>
   </section>
  </div>
 </details>;
}

export function ResumeEmptyOutline(){
 return <div className="resume-empty-outline" aria-label="待填写的简历结构">{['教育经历','项目与工作经历','本人贡献与产物'].map(label=><div key={label}><span>{label}</span><div aria-hidden="true"><i/><i/></div></div>)}</div>;
}
