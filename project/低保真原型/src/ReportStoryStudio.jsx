import React,{useRef,useState} from 'react';
import {confirmed,cname} from './model';
import {planningReportBody} from './continuity-model';
import {reportRows,reportIsStale} from './alignment-model';
import {taskRoute} from './flow-navigation';
import {readableReport,reportChanges,reportLineage} from './report-studio-model';
import ControlIcon from './ControlIcon';
import ThematicReport from './ThematicReport';
import {groupReportRows} from './report-theme-model';

const groups=[
 {id:'choice',chapters:['目标与理由','候选与取舍','职业要求与范围','职业桥接与技能路线'],to:'/careers?tab=比较',action:'回到选择与取舍'},
 {id:'action',chapters:['行动与成果','计划与预算'],to:'/plan?tab=执行',action:'回到行动记录'},
 {id:'evidence',chapters:['个人概览与资料范围','材料与差距','四维依据','引用与局限'],to:'/assessment?tab=原文确认',action:'回到确认材料'},
 {id:'review',chapters:['复盘与调整'],to:'/plan?tab=复盘',action:'回到本人复盘'},
];
export default function ReportStoryStudio({s,link}){
 const body=planningReportBody(s),rows=reportRows(body),themes=groupReportRows(rows),[themeId,setThemeId]=useState('choice'),[expanded,setExpanded]=useState(false),paper=useRef(null);
 const current=themes.find(g=>g.id===themeId)||themes[0],index=themes.findIndex(g=>g.id===current.id),active=groups.find(g=>g.id===current.id)||groups[2],selected=active.id,facts=confirmed(s);
 const choose=theme=>{setThemeId(theme.id);if(expanded)requestAnimationFrame(()=>paper.current?.querySelector('[data-theme="'+theme.id+'"]')?.scrollIntoView({block:'start'}));};
 return <section className="report-story-studio report-archive-studio" aria-label="探索档案阅读台">
  <header className="story-studio-head"><div><h2>探索档案</h2><p>把相近内容组织成主题，一起看清选择、依据与行动。</p></div><span className="studio-state">当前记录预览 · 尚未保存</span></header>
  <div className="archive-reading-desk"><nav className="archive-chapter-nav report-theme-navigation" aria-label="报告主题导航"><h3>报告板块</h3>{themes.map((theme,i)=><button key={theme.id} aria-pressed={theme.id===current.id} onClick={()=>choose(theme)}><span>{String(i+1).padStart(2,'0')}</span><span>{theme.title}<small>{theme.rows.length} 项相关内容</small></span></button>)}</nav>
  <label className="archive-mobile-chapter field"><span>选择报告板块</span><select aria-label="选择报告板块" value={current.id} onChange={e=>choose(themes.find(g=>g.id===e.target.value))}>{themes.map((theme,i)=><option key={theme.id} value={theme.id}>{i+1} / {themes.length} · {theme.title}</option>)}</select></label>
  <article className="archive-paper" aria-label="报告章节编排预览" ref={paper}><header className="archive-edition-cover"><h3><span>{s.goal?cname(s.goal):'个人探索'}</span>探索档案</h3><div className="archive-cover-note"><p>把经历、选择与改变，<br/>写进同一份个人记录。</p><small>{s.goal?'当前方向已选定':'尚未选定，保留探索空间'}</small></div><dl className="archive-colophon"><div><dt>确认材料</dt><dd>{facts.length} 项</dd></div><div><dt>行动记录</dt><dd>{s.tasks.length} 项</dd></div><div><dt>复盘正文</dt><dd>默认不公开</dd></div></dl></header>
  <div className="archive-reading-mode"><span>{expanded?'全篇阅读':`第 ${index+1} 板块 / 共 ${themes.length} 板块 · ${rows.length} 项内容`}</span><button type="button" onClick={()=>setExpanded(!expanded)} aria-pressed={expanded}>{expanded?'返回单板块阅读':'展开全篇阅读'}</button></div>
  <ThematicReport body={body} activeId={current.id} all={expanded} idPrefix="preview-section-"/>
  <footer>基于当前记录的编排预览；保存时仍需检查用途、内容与缺项。</footer>
  {!expanded&&<nav className="archive-page-turn" aria-label="报告板块翻阅"><button disabled={index===0} onClick={()=>choose(themes[index-1])}>上一板块</button><span>{index+1} / {themes.length}</span><button disabled={index===themes.length-1} onClick={()=>choose(themes[index+1])}>下一板块</button></nav>}
  </article><details className="archive-source-notes archive-record-drawer" aria-label="本板块相关记录"><summary><span>本板块记录与依据</span><small>展开原始记录</small></summary><div className="archive-record-content">
   {selected==='choice'&&<><div className="story-source-record"><span>当前方向</span><h4>{s.goal?cname(s.goal):'还没有选定长期方向'}</h4><p>{s.decision.reason||'选择理由尚未记录，可以先带着问题探索。'}</p></div><div className="story-source-record"><span>想验证的问题</span><p>{s.decision.question||'暂未记录。可以回比较页，写下最想弄清的一件事。'}</p></div></>}
   {selected==='action'&&(s.tasks.length?s.tasks.map(t=><div className="story-source-record" key={t.id}><h4>{link(taskRoute(s,t),t.title)}</h4><p>{t.status} · {t.attempts.length?'成果 v'+t.attempts.at(-1).version:'尚无提交版本'} · {t.check}</p><small>{t.contribution||'本人贡献尚未补充'}；任务完成、提交和检查分别记录。</small></div>):<div className="studio-empty"><ControlIcon name="route" size={25}/><p>还没有实际行动记录。先选一次有限实践，之后再把发生的过程放进报告。</p>{link('/learning','先预览一次实践 →')}</div>)}
   {selected==='evidence'&&(facts.length?facts.map(c=><details className="story-source-record" key={c.id}><summary>{c.title}<small>材料 v{c.version} · {c.skill||'技能待说明'}</small></summary><p>{c.text}</p><p>本人贡献：{c.contribution||'待说明'}</p><small>{c.aid||'辅助方式未提供'}；本人确认，未独立实核。</small></details>):<div className="studio-empty"><ControlIcon name="file" size={25}/><p>还没有确认材料。已有课程项目、作品或实习经历都可以先整理。</p>{link('/assessment','整理并核对经历 →')}</div>)}
   {selected==='review'&&<><div className="studio-private"><ControlIcon name="file" size={23}/><div><h4>私人反思留在你手里。</h4><p>这里只展示复盘记录的存在。结果、困难和调整正文默认不进入报告；导出时再逐条主动选择。</p></div></div>{s.reviews.map(r=><div className="story-source-record" key={r.id}><h4>{r.date||'日期未知'} · {r.type||'本人复盘'}</h4>{link('/plan?tab=复盘'+(r.taskId?'&task='+encodeURIComponent(r.taskId):''),'回原处查看本人复盘 →')}</div>)}</>}
   <div className="story-source-action">{link(active.to,active.action+' →')}</div>
   {current.id==='action'&&<p>{link('/career-map'+(s.goal?'?career='+encodeURIComponent(s.goal):''),'到职业地图探索路径 →')}</p>}
   <p className="archive-source-limit">这里是与本板块相关的当前记录，不代表逐句引用核验。</p>
  </div></details></div>
 </section>;
}

export function ReportVersionTrail({s,report,link}){
 const current=report||s.reports.at(-1),[baseline,setBaseline]=useState('');
 if(!current)return null;
 const lineage=reportLineage(s,current);
 const others=lineage.filter(r=>r.id!==current.id),prior=others.find(r=>r.id===baseline)||others.at(-1),diff=prior?reportChanges(s,prior,current):null;
 return <section id="report-versions" className="report-version-trail" aria-label="报告版本变化"><header><div><h2>版本与修订记录</h2><p>对照保存时的章节内容，保留人工改写；版本增加不表示能力提升。</p></div><span className="studio-state">{reportIsStale(s,current)?'依据已有变化':'已保存快照'}</span></header>
  <nav aria-label="报告保存版本">{lineage.map(r=>React.cloneElement(link('/reports/'+encodeURIComponent(r.id),<><span>版本 {r.version}</span><small>{r.date?.slice(0,10)||'保存日期未知'}</small><span>{r.id===current.id?'当前查看':'打开此版本'}<ControlIcon name="arrow" size={14}/></span></>),{key:r.id,'aria-current':r.id===current.id?'page':undefined}))}</nav>
  {prior?<details className="version-difference"><summary>查看逐章内容变化<ControlIcon name="chevron" size={16}/></summary><label className="field"><span>选择报告比较版本</span><select aria-label="选择报告比较版本" value={prior.id} onChange={e=>setBaseline(e.target.value)}>{others.map(r=><option key={r.id} value={r.id}>版本 {r.version} · {r.date?.slice(0,10)||'日期未知'}</option>)}</select></label>{diff.blocked?<div className="notice">引用已撤回或删除，停止展示对照中的缓存正文。{link('/assessment','回事实源核对 →')}</div>:<>{diff.rows.filter(r=>r.state!=='same').map(row=><article className="chapter-version-diff" key={row.id}><header><h3>{row.title}</h3><span>{row.state==='added'?'本版新增':row.state==='removed'?'本版移除':'内容有变化'}</span></header><div><section><span>比较版</span><p>{row.before||'此版本没有这一章。'}</p></section><section><span>当前版</span><p>{row.after||'此版本没有这一章。'}</p></section></div></article>)}{diff.rows.every(r=>r.state==='same')&&<p>两份保存版本的章节正文一致，没有新增内容变化。</p>}</>}</details>:<p className="version-first-note">保存下一版本后，可在这里逐章查看变化，旧内容不会被自动覆盖。</p>}
  {!readableReport(s,current)&&<p className="notice">当前版本有不可访问的引用；请先回事实源处理。</p>}
 </section>;
}
