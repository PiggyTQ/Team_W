import React,{useRef} from 'react';
import {careers} from './model';
import ProductIcon from './ProductIcon';
import Example from './CareerArtifactExamples';
import {displayPublicText} from './i18n/render';
import {assistantComparisonModes,comparisonMode,discussionCareerProfile,sameCasePracticeRoute,hasDetailedComparison} from './assistant-career-comparison-model';
import './assistant-career-comparison.css';

export default function AssistantCareerComparison({d,items,tx,en,onPair,onFocus,link,error}){
 const left=d.task.left||'',right=d.task.right||'',focus=comparisonMode(d.task.focus),tabs=useRef({}),language=en?'en':'zh';
 const name=id=>displayPublicText(careers.find(c=>c.id===id)?.name||tx('尚未选择','Not selected'));
 const roles=[left,right].map(id=>discussionCareerProfile(items,id,language));
 const both=Boolean(left&&right&&left!==right),ready=both&&roles.every(Boolean);
 const modes=[['work','briefcase',tx('工作方式','Ways of working'),tx('问题、过程与判断','Problems, process and judgment')],['outputs','file',tx('交付成果','Deliverables'),tx('产物、使用者与验收','Outputs, users and acceptance')],['starting','graduation',tx('入门实践','First practice'),tx('材料、任务与检查','Inputs, task and checks')]];
 const keys=(event,index)=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:-1)+3)%3;tabs.current[assistantComparisonModes[next]]?.focus();onFocus(assistantComparisonModes[next]);};
 const row=(mode,id,label,icon,render)=><div className="assistant-compare-row" role="row" key={id}><div className="assistant-compare-row-label" role="rowheader"><ProductIcon name={icon} size={20}/><strong>{label}</strong></div>{roles.map((role,index)=><div className="assistant-compare-cell" role="cell" key={[left,right][index]}>{hasDetailedComparison(role,mode)?render(role,[left,right][index]):<LegacyProfile role={role} focus={mode} tx={tx} language={language}/>}</div>)}</div>;
 const header=mode=><div className={'assistant-compare-head mode-'+mode} role="row"><span className="assistant-compare-heading-key" role="columnheader">{tx('对照内容','Compare')}</span>{roles.map((role,index)=><div role="columnheader" key={index}><span className="assistant-compare-career-icon"><ProductIcon name={[left,right][index]} size={27}/></span><div><small>{tx('职业','Career')} {index===0?'A':'B'}</small><h3>{name([left,right][index])}</h3><p>{tx('本例','This case')} · {role.focus||role.title}</p></div></div>)}</div>;
 const matrix=(mode,children)=><div className="assistant-compare-matrix" role="table" aria-label={modes.find(([key])=>key===mode)[2]}>{header(mode)}{children}</div>;
 return <section className="task-comparison assistant-career-comparison" data-compare-focus={focus} aria-label={tx('职业对照','Career comparison')}>
  <div className="task-comparison-controls"><div className="task-pair"><label>{tx('职业 A','Career A')}<select aria-label={tx('职业 A','Career A')} value={left} onChange={event=>onPair(event.target.value,right)}><option value="">{tx('选择一个职业','Choose a career')}</option>{careers.map(c=><option key={c.id} value={c.id}>{name(c.id)}</option>)}</select></label><button type="button" disabled={!left||!right} onClick={()=>onPair(right,left)} aria-label={tx('交换两方','Swap careers')}><ProductIcon name="compare" size={20}/></button><label>{tx('职业 B','Career B')}<select aria-label={tx('职业 B','Career B')} value={right} onChange={event=>onPair(left,event.target.value)}><option value="">{tx('选择另一职业','Choose another career')}</option>{careers.map(c=><option key={c.id} value={c.id}>{name(c.id)}</option>)}</select></label></div></div>
  <div className="task-focus assistant-compare-tabs" role="tablist" aria-label={tx('这次重点看','Focus on')}>{modes.map(([id,icon,label,detail],index)=><button type="button" role="tab" key={id} id={'assistant-compare-tab-'+id} ref={element=>{tabs.current[id]=element;}} aria-controls={ready?'assistant-compare-panel-'+id:undefined} aria-selected={focus===id} tabIndex={focus===id?0:-1} onClick={()=>onFocus(id)} onKeyDown={event=>keys(event,index)}><ProductIcon name={icon} size={25}/><span><strong>{label}</strong><small>{detail}</small></span></button>)}</div>
  {!ready&&<div className="assistant-compare-empty" role={left===right&&left?'alert':'status'}><ProductIcon name="balance" size={34}/><div><h2>{left===right&&left?tx('请选择两个不同职业。','Choose two different careers.'):both?tx('双方资料齐全后展示对照','Both source profiles are needed'):tx('先明确本次比较的两个方向','Choose two careers for this discussion')}</h2><p>{both?tx('当前有职业资料未载入，保留你的选择；请使用本次资料入口核对或重试。','A source profile is unavailable. Your choices are retained; review or retry through the sources control.'):tx('分别选择职业A与职业B，再看同一问题下的不同工作。比较不会更改主目标。','Select Career A and Career B to compare the same questions. Your main target stays unchanged.')}</p></div></div>}
  {ready&&<div className="assistant-compare-panels">
   <section className="assistant-compare-panel" role="tabpanel" id="assistant-compare-panel-work" aria-labelledby="assistant-compare-tab-work" tabIndex={0} hidden={focus!=='work'}>
    <div className="assistant-compare-section-title"><h2>{tx('在工作中，具体怎么做','What the work involves')}</h2><p>{tx('沿代表案例，对照问题、处理步骤与判断。','Compare the problem, process and judgments in each representative case.')}</p></div>
    {matrix('work',<>
     {row('work','problem',tx('问题与输入','Problem and inputs'),'clipboard',role=><><h4 className="assistant-compare-question">{role.case.question}</h4><p className="assistant-compare-requester">{role.case.requester}</p><div className="assistant-compare-input"><span>{tx('拿到什么','Given inputs')}</span><p>{role.case.input}</p></div></>)}
     {row('work','process',tx('实际怎么推进','How the work proceeds'),'graph',role=><ol className="assistant-compare-workflow">{role.workflow.map((step,index)=><li key={index}><span>{index+1}</span><div><h4>{step.title}</h4><p>{step.description}</p><small>{step.output}</small></div></li>)}</ol>)}
     {row('work','judgment',tx('判断与复核','Judgment and review'),'testing',role=><><ul className="assistant-compare-checks">{role.case.decisions.map((item,index)=><li key={index}><ProductIcon name="check" size={16}/><span>{item}</span></li>)}</ul><div className="assistant-compare-review"><strong>{tx('谁来复核','Who reviews it?')}</strong><p>{role.case.review}</p></div></>)}
     {row('work','collaboration',tx('常见协作','Collaboration'),'collaboration',role=><dl className="assistant-compare-collaborators">{role.collaboration.map((item,index)=><div key={index}><dt>{item.role}</dt><dd>{item.exchange}</dd></div>)}</dl>)}
    </>)}
   </section>
   <section className="assistant-compare-panel" role="tabpanel" id="assistant-compare-panel-outputs" aria-labelledby="assistant-compare-tab-outputs" tabIndex={0} hidden={focus!=='outputs'}>
    <div className="assistant-compare-section-title"><h2>{tx('做完后，交给别人什么','What you hand over')}</h2><p>{tx('直接看原案例的产物内容，再比较使用与验收方式。','Inspect an output from each case, then compare who uses it and how it is checked.')}</p></div>
    {matrix('outputs',<>
     {row('outputs','preview',tx('先看一份产物','Inspect an output'),'file',role=><section className="assistant-compare-preview"><header><ProductIcon name="file" size={21}/><div><h4>{role.deliverables[0].title}</h4><small>{tx('本站原创合成教学示例','Original synthetic teaching case')}</small></div></header><p>{role.deliverables[0].description}</p><div className="assistant-compare-document"><Example value={role.deliverables[0].example}/></div></section>)}
     {row('outputs','acceptance',tx('使用与验收','Use and acceptance'),'testing',role=><><dl className="assistant-compare-output-use"><div><dt>{tx('交给谁','Recipient')}</dt><dd>{role.deliverables[0].audience}</dd></div><div><dt>{tx('解决什么','Purpose')}</dt><dd>{role.deliverables[0].use}</dd></div></dl><h4 className="assistant-compare-check-label">{tx('验收看什么','Acceptance checks')}</h4><ul className="assistant-compare-checks">{role.deliverables[0].checks.map((item,index)=><li key={index}><ProductIcon name="check" size={16}/><span>{item}</span></li>)}</ul></>)}
     {row('outputs','other-outputs',tx('还会交付什么','Other outputs'),'folder',(role,id)=><><ul className="assistant-compare-other-outputs">{role.deliverables.slice(1).map((item,index)=><li key={index}><ProductIcon name="file" size={19}/><div><h4>{item.title}</h4><p>{item.use}</p></div></li>)}</ul>{link('/careers?career='+id+'&section=work#career-deliverables',tx('查看本例全部产物 →','View all outputs from this case →'))}</>)}
    </>)}
   </section>
   <section className="assistant-compare-panel" role="tabpanel" id="assistant-compare-panel-starting" aria-labelledby="assistant-compare-tab-starting" tabIndex={0} hidden={focus!=='starting'}>
    <div className="assistant-compare-section-title"><h2>{tx('先亲手试哪件事','Your first hands-on task')}</h2><p>{tx('用本例材料完成小产物，观察自己对工作过程的感受。','Use the case inputs to make a small output and experience the work.')}</p></div>
    {matrix('starting',<>
     {row('starting','materials',tx('给你什么材料','Your starting inputs'),'folder',role=><><h4 className="assistant-compare-practice-title">{role.practice.title}</h4><p>{role.practice.input}</p>{role.practice.materials?.length>0&&<ul className="assistant-compare-materials">{role.practice.materials.map(item=><li key={item.id}><ProductIcon name="file" size={16}/>{item.title}</li>)}</ul>}</>)}
     {row('starting','first-task',tx('先做哪几步','Your first steps'),'clipboard',role=><ol className="assistant-compare-practice-steps">{role.practice.steps.map((step,index)=><li key={index}><span>{index+1}</span><p>{step}</p></li>)}</ol>)}
     {row('starting','trial-output',tx('留下什么产物','Your small output'),'file',role=><div className="assistant-compare-trial-output"><ProductIcon name="file" size={24}/><p>{role.practice.deliverable}</p></div>)}
     {row('starting','trial-checks',tx('如何检查','How to check'),'testing',role=><ul className="assistant-compare-checks">{role.practice.checks.map((item,index)=><li key={index}><ProductIcon name="check" size={16}/><span>{item}</span></li>)}</ul>)}
     {row('starting','start',tx('打开同例体验','Try the same case'),'graduation',(_role,id)=><>{link(sameCasePracticeRoute(id),name(id)+' · '+tx('开始本例体验','Try this case'),'button primary')}<small className="assistant-compare-trial-boundary">{tx('体验稿由本人完成与保存，不直接记为技能掌握。','You write and save the trial draft. This does not mark skill mastery.')}</small></>)}
    </>)}
   </section>
  </div>}
  {ready&&<details className="assistant-compare-provenance"><summary>{tx('职业范围、来源与版本','Career scope, sources and versions')}</summary><div>{roles.map((role,index)=><section key={index}><h3>{name([left,right][index])}</h3><p>{role.occupation?.boundary||role.provenance?.referenceNote}</p><small>{role.provenance?.version||role.version}</small><div>{link('/careers?career='+[left,right][index],tx('职业介绍','Career details'))}{link('/career-map?career='+[left,right][index],tx('查看技能树','Skill tree'))}{role.provenance?.reference?.url&&<a href={role.provenance.reference.url} target="_blank" rel="noreferrer">{role.provenance.reference.label}</a>}</div></section>)}</div></details>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}

function LegacyProfile({role,focus,tx}){
 const value=focus==='work'?role.daily||role.occupation?.problem:focus==='outputs'?role.output||role.occupation?.outputs||role.outputs||role.deliverables?.map(item=>item.title):typeof role.practice==='object'?role.practice?.deliverable:role.practice;
 const summary=Array.isArray(value)?value.filter(item=>typeof item==='string').join(' · '):typeof value==='string'?value:'';
 return <div className="assistant-compare-legacy"><p>{summary||tx('原资料未载明','Not stated in this source')}</p><small>{tx('这份资料版本没有此项详细实例，保留原摘要。','This source version has no detailed example here. Its original summary is retained.')}</small></div>;
}
