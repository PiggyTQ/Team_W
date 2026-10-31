import React,{useLayoutEffect,useRef,useState} from 'react';
import {confirmed} from './model';
import {jdRequirements} from './completion-model';
import {resumeRelations,toggleResumeRelation} from './report-studio-model';
import ControlIcon from './ControlIcon';

export default function ResumeEvidenceStudio({s,draft,change,link,preview,selectedId,onInspect}){
 const facts=draft.claimIds.map(id=>confirmed(s).find(c=>c.id===id)).filter(Boolean),job=s.jobs.find(j=>j.id===draft.target),requirements=jdRequirements(job);
 const [inspected,setInspected]=useState(''),fact=facts.find(c=>c.id===(selectedId??inspected))||facts[0],relation=resumeRelations(s,draft),map=useRef(null),[drawing,setDrawing]=useState({w:1,h:1,paths:[]});
 useLayoutEffect(()=>{
  const el=map.current;if(!el)return;let frame;
  const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const box=el.getBoundingClientRect(),paths=[];
   for(const edge of relation.edges){const from=Array.from(el.querySelectorAll('[data-source]')).find(e=>e.dataset.source===edge.source),to=Array.from(el.querySelectorAll('[data-target]')).find(e=>e.dataset.target===edge.target);if(!from||!to)continue;const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),x1=a.right-box.left,y1=a.top+a.height/2-box.top,x2=b.left-box.left,y2=b.top+b.height/2-box.top,m=(x1+x2)/2;paths.push({...edge,d:`M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`});}
   const next={w:box.width,h:box.height,paths};setDrawing(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
  });};
  const observer=new ResizeObserver(measure);observer.observe(el);el.querySelectorAll('[data-source],[data-target]').forEach(e=>observer.observe(e));const text=new MutationObserver(measure);text.observe(el,{childList:true,subtree:true,characterData:true});measure();return()=>{cancelAnimationFrame(frame);observer.disconnect();text.disconnect();};
 },[facts.map(c=>c.id+'@'+c.version).join('|'),requirements.join('|'),JSON.stringify(relation.edges)]);
 return <section className="resume-evidence-studio" aria-label="简历经历与岗位依据图"><header className="story-studio-head"><div><h2>从一段经历，到一句有依据的表达。</h2><p>{job?'先选经历，再点岗位要求建立关联。关联是本人编排，不是自动判定胜任。':'先选一段已确认经历，看清原文、本人贡献和表达边界。无需先确定岗位。'}</p></div><span className="studio-state">本地草稿 · 自动保留</span></header>
  {relation.issue&&<div className="notice"><p>{relation.issue} 已保存的简历版本不受本次清理影响。</p><button type="button" onClick={()=>change({tailoring:{jobText:job?.text,rows:{}}})}>清空失效关联并重新编排</button></div>}
  <div className="resume-weave-layout"><div className="resume-weave-map" ref={map}>
   <svg viewBox={`0 0 ${drawing.w} ${drawing.h}`} preserveAspectRatio="none" aria-hidden="true">{drawing.paths.map(edge=><path key={edge.source+'-'+edge.target} d={edge.d} className={edge.source===fact?.id?'is-active':''}/>)}</svg>
   <section className="weave-sources"><h3>已选的确认经历</h3>{facts.length?facts.map(c=><button type="button" className="weave-source-node" key={c.id} data-source={c.id} aria-pressed={c.id===fact?.id} onClick={()=>{setInspected(c.id);onInspect?.(c.id);}}><ControlIcon name="file" size={17}/><span>{c.title}<small>{c.skill||'技能待说明'} · 材料 v{c.version}</small></span></button>):<div className="studio-empty"><p>先选择确认经历。没有经历时，可以从已有课程项目开始整理。</p>{link('/assessment','整理并确认经历 →')}</div>}</section>
   <section className="weave-targets"><h3>{job?'目标岗位的原文要求':draft.target?'所选岗位已不可用':'这段经历可以呈现什么'}</h3>{job?<>{requirements.map((req,i)=>{const edges=relation.edges.filter(e=>e.target===String(i)),connected=edges.some(e=>e.source===fact?.id);return <button type="button" key={i} className="weave-requirement-node" data-target={i} aria-label={'关联岗位要求 '+(i+1)+'：'+req} aria-pressed={connected} disabled={!fact||!!relation.issue} onClick={()=>change({tailoring:toggleResumeRelation(s,draft,i,fact.id).tailoring})}><span>{req}</span><small>{edges.length?'关联 '+edges.length+' 项经历 · 待本人核对':'尚未关联，保持未知'}</small>{connected&&<span className="relation-selected"><ControlIcon name="check" size={13}/>已关联当前经历</span>}</button>;})}<p className="weave-source-caption">{job.source||'本人保存的岗位原文'} · {job.date||'日期未知'}；在招与适用条件未核验。</p></>:draft.target?<div className="studio-empty"><p>原岗位已移除。请在下方重新选择岗位，或明确选择通用简历。</p>{link('/careers?tab=我的机会','回本人机会 →')}</div>:<div className="weave-expression-structure">{[['本人贡献',fact?.contribution],['产物与支持范围',fact?.supportScope],['辅助与核验',fact?.aid?fact.aid+'；本人确认，未独立实核':null]].map(([label,value])=><div key={label}><span>{label}</span><p>{value||'待补充，保留未知'}</p></div>)}</div>}</section>
  </div><aside className="weave-inspector"><header><ControlIcon name="file" size={20}/><h3>这段表达的来处</h3></header>{fact?<><span className="weave-inspector-version">{fact.id} · 材料 v{fact.version}</span><h4>{fact.title}</h4><dl><dt>经历原文</dt><dd>{fact.text}</dd><dt>本人贡献</dt><dd>{fact.contribution||'未说明，不自动补写。'}</dd><dt>保留的边界</dt><dd>{fact.aid||'辅助方式未提供'}；本人确认，未独立实核。</dd></dl><button type="button" onClick={preview}>查看原文与措辞差异<ControlIcon name="arrow" size={16}/></button>{link('/assessment?tab=原文确认','回事实源修改 →')}</>:<p>选中一段确认经历后，在这里核对它能支持什么。</p>}</aside></div>
  <p className="studio-footnote">{job?'连线仅表示你选择的材料关联；未关联要求仍是未知。更换岗位或材料版本后需重新核对。':'当前为通用简历。选择目标岗位后，可以逐条建立经历与岗位原文的关联。'}</p>
 </section>;
}
