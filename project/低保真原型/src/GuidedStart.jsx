import React,{useState} from 'react';
import {careers} from './model';
import './guided-start.css';
import GuidanceBubble from './GuidanceBubble';

export function GuidedStart({title,description,steps=[],children}){
 return <section className="guided-start"><div className="guided-start-heading"><h3>{title}</h3><GuidanceBubble label="查看操作步骤" title={title}><p>{description}</p>{steps.length>0&&<ol>{steps.map(step=><li key={step}>{step}</li>)}</ol>}</GuidanceBubble></div><div className="actions">{children}</div></section>;
}
export function ComparePicker({selected,toggle,link}){
 const [expanded,setExpanded]=useState(()=>selected.length<2),complete=selected.length>=2;
 return <section className="compare-setup"><header><div><h3>选择你想了解的工作方向</h3><p>比较日常任务、环境协作、典型产物和个人材料；不做适合度排名。</p></div><span className="pill">{selected.length} / 3</span></header>
 <p id="career-comparison-requirements" className="compare-selection-status" role="status">{selected.length===0?'先选择两个方向，就能看到同口径对照。':selected.length===1?'已保留一个方向，再选一个即可比较。':selected.length===3?'已选满三个方向，可先移除一项再更换。':'已可以比较，也可以再添加一个方向。'}</p>
 {(!complete||expanded)&&<fieldset className="compare-options"><legend>选择2至3个方向</legend>{careers.map(c=>{const checked=selected.includes(c.id);return <label className={'compare-option '+(checked?'is-selected':'')} key={c.id}><span><input type="checkbox" checked={checked} disabled={!checked&&selected.length>=3} onChange={()=>toggle(c.id)}/><strong>{c.name}</strong></span><p>{c.task}</p><small>{c.output}</small></label>;})}</fieldset>}
 <div className="compare-selected-items">{selected.map(id=><button key={id} onClick={()=>toggle(id)} aria-label={'移除'+careers.find(c=>c.id===id)?.name}>{careers.find(c=>c.id===id)?.name} ×</button>)}</div>
 <div className="actions"><button className="primary" disabled={!complete} aria-describedby="career-comparison-requirements" title={!complete?'至少选择两个方向后可查看比较':undefined} onClick={()=>document.getElementById('comparison-result')?.scrollIntoView({block:'start',behavior:'smooth'})}>查看比较</button>{complete&&<button aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'收起方向选择':'调整比较方向'}</button>}{link('/careers','先了解方向详情')}</div>
 {!complete&&<div className="comparison-preview"><h4>比较后你可以做什么？</h4><p>保留选择理由和待验证的问题，预览目标草稿，或安排一次小范围验证。选中方向不会改变当前主目标。</p></div>}
 </section>;
}

