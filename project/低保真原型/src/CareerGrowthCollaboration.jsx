import React,{useEffect,useId,useRef,useState} from 'react';
import {useLanguage} from './i18n/render';
import ProductIcon from './ProductIcon';
import {careerGrowthCase} from './career-growth-collaboration';
import './career-growth-collaboration.css';

export default function CareerGrowthCollaboration({role}){
 const language=useLanguage(),tx=(z,e)=>language==='en'?e:z,content=careerGrowthCase(role.id,language);
 const [selected,setSelected]=useState(0),id=useId(),tabs=useRef([]);
 useEffect(()=>setSelected(0),[role.id]);
 if(!content)return null;
 const stage=content.stages[selected]||content.stages[0];
 function keys(event,index){
  const next=event.key==='ArrowRight'?(index+1)%3:event.key==='ArrowLeft'?(index+2)%3:event.key==='Home'?0:event.key==='End'?2:null;
  if(next===null)return;event.preventDefault();event.stopPropagation();setSelected(next);tabs.current[next]?.focus();
 }
 return <section className="career-reading-section career-growth-case" id="career-growth" tabIndex={-1} data-growth-career={role.id}>
  <header className="career-chapter-head"><span className="career-chapter-symbol"><ProductIcon name="collaboration" size={29}/></span><div><h2>{content.caseTitle}</h2><p>{content.caseContext}</p></div></header>
  <div className="growth-responsibility-tabs" role="tablist" aria-label={tx('比较三种责任范围','Compare three responsibility scopes')}>{content.stages.map((s,i)=><button type="button" role="tab" key={i} id={id+'-tab-'+i} aria-selected={selected===i} aria-controls={id+'-stage'} tabIndex={selected===i?0:-1} ref={el=>tabs.current[i]=el} onClick={()=>setSelected(i)} onKeyDown={event=>keys(event,i)}><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span><strong>{s.title}</strong></button>)}</div>
  <section className="growth-scope-paper" id={id+'-stage'} role="tabpanel" aria-labelledby={id+'-tab-'+selected} tabIndex={0} data-growth-stage={selected}>
   <div className="growth-current-work"><p className="growth-eyebrow">{tx('这个范围内，你实际承担什么','The work you actually take on')}</p><h3>{stage.title}</h3><p>{stage.task}</p></div>
   <section className="growth-artifact-paper"><header><ProductIcon name="file" size={22}/><h4>{stage.artifact.title}</h4><small>{tx('本例交付片段 · 合成材料','Case deliverable excerpt · synthetic material')}</small></header><blockquote>{stage.artifact.excerpt}</blockquote></section>
   <dl className="growth-decision-evidence"><div><dt><ProductIcon name="compass" size={20}/>{tx('可以决定什么，谁来复核','Decision authority and review')}</dt><dd>{stage.authority}</dd></div><div><dt><ProductIcon name="check" size={20}/>{tx('扩大责任前，拿出什么证据','Evidence for a broader scope')}</dt><dd>{stage.evidence}</dd></div></dl>
  </section>
  <p className="growth-scope-note">{tx('这是同一案例的三种责任范围，用于理解工作变化；不对应固定职级、晋升年限或个人能力评分。','These are three responsibility scopes in one case, not fixed job levels, promotion timelines or a score of your ability.')}</p>
  <section className="growth-handoff-paper"><header><span className="growth-section-icon"><ProductIcon name="collaboration" size={25}/></span><div><p className="growth-eyebrow">{tx('把协作放进一次具体的交付过程','See collaboration through a concrete handoff')}</p><h3>{content.handoff.title}</h3></div></header><div className="growth-handoff-input"><h4>{tx('先收到什么','What arrives first')}</h4><p>{content.handoff.input}</p></div>
   <ol className="growth-handoff-steps">{content.handoff.steps.map((s,i)=><li key={i}><div className="growth-handoff-actor"><span>{i+1}</span><h4>{s.actor}</h4></div><div><p>{s.action}</p><div className="growth-handoff-output"><span>{tx('传下去的具体内容','What is handed over')}</span><p>{s.output}</p></div></div></li>)}</ol>
   <div className="growth-handoff-acceptance"><ProductIcon name="check" size={22}/><div><h4>{tx('对方怎样接受这份交付','How the recipient accepts the work')}</h4><p>{content.handoff.acceptance}</p></div></div>
  </section>
  <section className="growth-rework-paper"><header><ProductIcon name="clipboard" size={25}/><h3>{tx('一次返工，怎样让结果更可靠','How one revision improves the result')}</h3></header><dl><div><dt>{tx('退回的原因','Why it was returned')}</dt><dd>{content.handoff.rework.problem}</dd></div><div><dt>{tx('实际改了什么','What changed')}</dt><dd>{content.handoff.rework.revision}</dd></div><div><dt>{tx('修改后的结果','Result after revision')}</dt><dd>{content.handoff.rework.result}</dd></div></dl></section>
  <details className="growth-context-reference"><summary>{tx('补充：工作环境与常见误区','Further context and common mistakes')}</summary><p>{role.occupation.environment}</p><p>{role.environment}</p><ul>{role.pitfalls.map((p,i)=><li key={i}>{p}</li>)}</ul></details>
  <details className="growth-method-sources"><summary>{tx('本页方法来源与适用范围','Method sources and scope for this page')}</summary><p>{tx('以下资料支持工作方法；案例、交付片段及责任范围由本站原创，不代表来源机构的职级标准或真实企业记录。','These references support methods. The case, excerpts and scopes are original examples, not the institutions’ job-level standards or real employer records.')}</p><ul>{content.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a><p>{s.supports}</p></li>)}</ul><small>{content.version}</small></details>
 </section>;
}
