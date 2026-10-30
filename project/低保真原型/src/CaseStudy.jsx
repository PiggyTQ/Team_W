import React,{useState} from 'react';
import {useLanguage} from './i18n/render';
import './case-study.css';
import {CheeseMascot} from './HomeSceneDesign';
import './case-cheese.css';

const tools={
 sql:{title:['SQL 查询','SQL query'],skill:'SQL',method:['用查询定位重复，保留条件与处理理由。','Locate duplicates with a query; keep the conditions and reasoning.'],output:['查询记录与问题清单','Query notes and issue list']},
 table:{title:['表格工具','Spreadsheet'],skill:'表格工具',method:['筛选空值、标记重复，保留原值与处理理由。','Filter missing values and mark duplicates; keep original values and reasoning.'],output:['整理记录与问题清单','Preparation notes and issue list']}
};
function ArchiveDrawing({tool,output,en,replay}){
 const t=(zh,english)=>en?english:zh;
 return <><svg key={replay} className={'archive-drawing'+(replay?' is-replaying':'')} viewBox="0 0 1320 410" role="img" aria-label={t('练习样本经过工具检查，汇成问题清单和待验证记录','Exercise samples flow through a tool into an issue list and an open question')}>
  <defs><filter id="archive-paper-shadow" x="-20%" y="-20%" width="150%" height="160%"><feDropShadow dx="0" dy="9" stdDeviation="9" floodOpacity=".07"/></filter></defs>
  <path d="M45 363H1273" stroke="#d5d5ce" strokeDasharray="3 9"/>
  <g fill="none" stroke="#b1b1a7" strokeWidth="1.2"><path d="M235 91C425 91 325 205 500 205M270 203H500M245 307C410 307 350 205 500 205M574 205C640 205 656 140 721 140"/><path d="m711 133 10 7-10 7"/></g>
  <g className="archive-slips" filter="url(#archive-paper-shadow)">
   <g transform="translate(48 43) rotate(-8 143 39)"><rect width="286" height="78" rx="4" fill="#fff" stroke="#c3c3b9"/><text x="22" y="47" fontSize="25" fill="#42423b">R01</text><path d="M112 30H260M112 47H219" stroke="#bdbdb4"/><circle cx="258" cy="57" r="3" fill="#bbbcb0"/></g>
   <g transform="translate(83 164) rotate(3 143 39)"><rect width="286" height="78" rx="4" fill="#fff" stroke="#aaa99c"/><text x="22" y="47" fontSize="25" fill="#42423b">R02</text><rect x="112" y="23" width="148" height="29" rx="2" fill="#f8f8f4" stroke="#a8a89a" strokeDasharray="4 4"/><path d="M155 38H218" stroke="#b4b4a9"/></g>
   <g transform="translate(52 280) rotate(-5 143 39)"><rect width="286" height="78" rx="4" fill="#fff" stroke="#c3c3b9"/><text x="22" y="47" fontSize="25" fill="#42423b">R02</text><path d="M22 56H72" stroke="#88887a"/><path d="M112 30H260M112 47H219" stroke="#bdbdb4"/><circle cx="258" cy="57" r="3" fill="#bbbcb0"/></g>
  </g>
  <g className="archive-instrument"><circle cx="518" cy="205" r="91" fill="none" stroke="#d1d1c6"/><path d="M518 98V113M518 297V312M411 205H426M610 205H625" stroke="#b2b2a4"/><circle cx="518" cy="205" r="72" fill="#e1e1d8" stroke="#c8c8bb"/><circle cx="518" cy="205" r="60" fill="#33352f"/>
   {tool==='sql'?<text x="518" y="216" textAnchor="middle" fontSize="31" fill="#fbfbf5" letterSpacing="-1">SQL</text>:<g fill="none" stroke="#fbfbf5" strokeWidth="2"><rect x="494" y="183" width="48" height="44" rx="3"/><path d="M494 197H542M494 212H542M510 183V227M526 183V227"/></g>}
   <text x="518" y="340" textAnchor="middle" fill="#7c7c70" fontSize="14">{t('定位缺失与重复','Inspect gaps and duplicates')}</text>
  </g>
  <g className="archive-result" filter="url(#archive-paper-shadow)"><g transform="translate(728 13) rotate(2 273 186)">
   <path d="M12 16H493L546 69V382H12Z" fill="#dbdbd2" stroke="#c9c9bc"/>
   <path d="M0 0H481L534 53V366H0Z" fill="white" stroke="#c2c2b6"/>
   <path d="M481 0V53H534" fill="#f0f0e9" stroke="#c2c2b6"/>
   <text x="32" y="38" fontSize="12" fill="#89897e">{t('准备留下 / 探索记录','TO KEEP / EXPLORATION RECORD')}</text>
   <text x="32" y="99" fontSize={en?'27':'33'} fill="#30322b" letterSpacing="-1">{output}</text>
   <path d="M32 124H496" stroke="#dcdcd4"/>
   <g className="archive-findings"><text x="32" y="175" fontSize="26" fill="#414339">{t('缺失字段','Missing field')}</text><text x="280" y="175" fontSize="26" fill="#414339">{t('重复记录','Repeated record')}</text>
   <rect x="32" y="195" width="180" height="31" rx="3" fill="#f4f4ef" stroke="#cecec2" strokeDasharray="4 4"/><path d="M83 210H160" stroke="#b5b5a8"/>
   <text x="280" y="218" fontSize="19" fill="#87897b">R02</text><text x="348" y="218" fontSize="19" fill="#87897b">R02</text><path d="M280 228H390" stroke="#a5a797"/>
   <text x="32" y="257" fontSize="12" fill="#8e8f81">{t('保留原值与处理理由','Keep original values and reasoning')}</text><text x="280" y="257" fontSize="12" fill="#8e8f81">{t('保留检查条件','Keep inspection conditions')}</text></g>
   <path d="M32 283H496" stroke="#deded5"/><circle cx="37" cy="315" r="4" fill="none" stroke="#a0a28f"/><text x="52" y="320" fontSize="14" fill="#858877">{t('独立分析范围仍未知','Independent analysis scope remains unknown')}</text>
   <text x="32" y="347" fontSize="10" fill="#a5a698">{t('合成示例 · 拟做记录，不表示实践已经完成','SAMPLE · PLANNED RECORD, NOT COMPLETED PRACTICE')}</text>
  </g></g>
  <g className="archive-passing-note" aria-hidden="true"><circle cx="360" cy="205" r="5" fill="#747767"/><circle cx="653" cy="165" r="5" fill="#747767"/></g>
  <text x="49" y="397" fontSize="11" fill="#9a9a8d">{t('合成练习样本 / 原值保留','SYNTHETIC SAMPLES / ORIGINAL VALUES RETAINED')}</text>
 </svg><div key={'mobile-'+replay} className={'archive-mobile'+(replay?' is-replaying':'')} aria-label={t('样本汇成探索记录','Samples become an exploration record')}>
  <div className="archive-mobile-slips"><span>R01<small>{t('原始记录','Original')}</small></span><span>R02<small>{t('缺失字段','Missing field')}</small></span><span>R02<small>{t('重复记录','Repeated')}</small></span></div>
  <div className="archive-mobile-tool"><span aria-hidden="true">↓</span><strong>{tool==='sql'?'SQL':t('表格工具','Spreadsheet')}</strong><span aria-hidden="true">↓</span></div>
  <article className="archive-mobile-record"><span>{t('准备留下 / 探索记录','TO KEEP / EXPLORATION RECORD')}</span><h3>{output}</h3><div><p>{t('缺失字段','Missing field')}<small>{t('保留原值与处理理由','Keep original values and reasoning')}</small></p><p>{t('重复记录','Repeated record')}<small>{t('保留检查条件','Keep inspection conditions')}</small></p></div><footer>{t('独立分析范围仍未知 · 合成示例','Independent analysis scope is unknown · sample')}</footer></article>
 </div></>;
}
export default function CaseStudy({go,open,link}){
 const en=useLanguage()==='en',n=en?1:0,t=(zh,english)=>en?english:zh;
 const [tool,setTool]=useState('sql'),[plan,setPlan]=useState(0),[replay,setReplay]=useState(0),picked=tools[tool];
 const pick=(key,event)=>{setTool(key);if(event.detail>0)setReplay(value=>value+1);};
 return <section id="case-study" className="landing-section case-study case-single dossier-stage archive-stage" data-single-case aria-labelledby="story-continuation-title" data-i18n="off">
  <div className="archive-cheese-top" aria-hidden="true"><CheeseMascot pose="explore"/></div>
  <span id="skills" className="project-anchor" aria-hidden="true"/><span id="ai" className="project-anchor" aria-hidden="true"/><span id="report-preview" className="project-anchor" aria-hidden="true"/>
  <header className="archive-heading"><div><h2 id="story-continuation-title">{t('让尝试，','Make each attempt')}<br className="archive-mobile-break"/>{t('有据可循。',' worth revisiting.')}</h2><p>{t('将零散的发现，整理成下一次行动的依据。','Turn scattered findings into evidence for your next step.')}</p></div><div className="archive-switch"><nav aria-label={t('本次示例工具','Example tool')}>{Object.entries(tools).map(([key,item])=><button key={key} aria-pressed={tool===key} aria-controls="project-live-record" onClick={event=>pick(key,event)}>{item.title[n]}</button>)}</nav><button className="archive-replay" onClick={()=>setReplay(value=>value+1)}>{t('回放示例','Replay example')} <span aria-hidden="true">↻</span></button></div></header>
  <div className="archive-scene dossier-visual" id="project-live-record" aria-label={t('联动探索记录','Interactive exploration record')}>
   <div className="archive-cheese-decor" aria-hidden="true"><svg viewBox="0 0 1440 600" preserveAspectRatio="none"><path d="M0 330C-60 100 240-100 300 90S600 150 640 320 210 530 80 430Z" fill="#fff0c9"/><path d="M880 60C1020-90 1420 0 1440 150S1280 410 1050 320 800 180 880 60Z" fill="#fff2d4"/><g fill="none" stroke="#ffca35" strokeWidth="10" strokeLinecap="round"><path d="m155 180 22 22m8-60 8 27M1290 95l12-25m11 49 26-6M600 145l20-20m-5 52 25-4"/></g><path d="M0 340c70 15 130-75 86-80-47-6-35 89 50 53" fill="none" stroke="#08417e" strokeWidth="5" strokeLinecap="round"/></svg><CheeseMascot pose="report" className="archive-cheese-peek"/></div>
   <ArchiveDrawing tool={tool} output={picked.output[n]} en={en} replay={replay}/>
   <div className="archive-caption"><div className="archive-method"><span>{t('本次做法','Method')}</span><p>{picked.method[n]}</p><button onClick={()=>open('skill',{skill:picked.skill,career:'data'})}>{t('查看练习说明 ↗','View exercise notes ↗')}</button></div>
    <div className="archive-plan"><span>{t('下一步安排','Next step')}</span><nav aria-label={t('示例时间安排','Example scope')}>{[t('缩小范围','Reduce scope'),t('延长周期','Extend timeline')].map((label,i)=><button key={i} aria-pressed={plan===i} onClick={()=>setPlan(i)}>{label}</button>)}</nav><p>{plan===0?t('2h 练习 + 1h 余量 · 合成预算','2h practice + 1h buffer · sample budget'):t('先核对预算，再调整后续安排。','Check the budget before changing the next steps.')}</p></div>
    <div className="archive-actions"><button className="primary" onClick={()=>open('example',{step:4})}>{t('看看这份记录','View this record')} <span aria-hidden="true">↗</span></button>{link('/career-map?tab=技能先修',t('开始我的探索 →','Start my exploration →'))}</div>
   </div>
  </div>
  <footer className="archive-footer"><span>{t('合成示例，不读取或修改个人资料。','A synthetic example; your personal data is not read or changed.')}</span><button onClick={()=>go('/assistant')}>{t('需要调整？去讨论 ↗','Need an adjustment? Discuss it ↗')}</button></footer>
 </section>;
}
