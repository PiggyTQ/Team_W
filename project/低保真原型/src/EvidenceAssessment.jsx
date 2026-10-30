import React, { useState } from 'react';
import { careers, confirmed } from './model';

function snapshotMaterials(s, snapshot) {
  return snapshot.claims.map(ref => {
    const current = s.claims.find(c=>c.id===ref.id && c.status==='已确认');
    if(!current) return {id:ref.id,version:ref.version,available:false};
    const old = snapshot.claimSnapshots?.find(c=>c.id===ref.id&&c.version===ref.version);
    return old ? {...old,available:true} : current.version===ref.version ? {...current,available:true} : {...ref,available:false};
  });
}

export default function EvidenceAssessment({ s, link, precheck, feedback }) {
  const a=s.analysis, [selected,setSelected]=useState('PS'),[baseline,setBaseline]=useState('');
  const career=careers.find(c=>c.id===a.occupation)||careers[0];
  const materials=snapshotMaterials(s,a), related=materials.filter(c=>c.available&&c.skill===career.skill);
  const reviews=a.reviewRefs;
  const dims=[
    {id:'BR',name:'条件与可行性',status:'具体条件仍待核对',text:'学历、地域与轮班等按具体岗位核对；生活约束不换算为能力缺陷。',to:'/careers?tab=企业与岗位',action:'核对具体岗位条件'},
    {id:'PS',name:'专业任务与材料',status:related.length?'有相关确认材料，范围待验证':'证据不足，保持未知',text:`当前方向的示例重点为 ${career.skill}。材料关联不等于掌握，不强制重学已有基础。`,to:'/assessment?tab=成果档案',action:'补充已有作品与贡献'},
    {id:'TQ',name:'具体行为与协作',status:'行为证据待逐项核对',text:'需要具体沟通、协作与取舍记录；不从文风、偏好或材料数量推断人格。',to:'/assessment',action:'记录具体行为经历'},
    {id:'DP',name:'学习与改进过程',status:reviews?.length?'有复盘过程记录，支持范围待核对':'过程证据未知',text:'以已记录的反馈和改进过程解释，不推断天赋或未来潜力。',to:'/plan?tab=复盘',action:'记录反馈与下一调整'},
  ];
  const active=dims.find(d=>d.id===selected)||dims[1];
  const history=[...(s.analysisHistory||[]),a].filter((x,i,all)=>all.findIndex(y=>y.id===x.id)===i);
  const compatible=history.filter(x=>x.id!==a.id&&x.occupation===a.occupation&&x.rule===a.rule);
  const prior=compatible.find(x=>x.id===baseline)||compatible.at(-1);
  const added=prior?a.claims.filter(c=>!prior.claims.some(p=>p.id===c.id&&p.version===c.version)):[];
  const removed=prior?prior.claims.filter(c=>!a.claims.some(p=>p.id===c.id&&p.version===c.version)):[];
  const stateAt = (snapshot, dimension) => dimension==='PS' ? snapshotMaterials(s,snapshot).some(c=>c.available&&c.skill===career.skill) ? '有相关材料；未独立实核' : '证据不足或当前不可还原' : dimension==='DP' ? snapshot.reviewRefs?.length ? '有保存的复盘过程引用' : '过程引用未知' : '具体依据待核对，保持未知';
  return <div className="evidence-assessment"><section className="assessment-band"><header className="section-heading"><div><h2>从四个维度查看职业准备</h2><p>{career.name} · 资料 v{a.profileVersion} · {a.rule} · {a.catalogVersion?"服务器规则快照":"本地模拟快照"}</p></div><span className="status-chip">{s.analysisStale?'依据已变化，显示旧快照':'当前保存快照'}</span></header><p>逐项查看经历能支持什么、哪些还需要补充。暂时无法判断的内容标为未知，不计为零分。</p><div className="dimension-state-grid">{dims.map(d=><button key={d.id} aria-pressed={d.id===selected} onClick={()=>setSelected(d.id)}><span>{d.id}</span><h3>{d.name}</h3><small>{d.status}</small></button>)}</div><div className="dimension-detail"><div><h3>{active.name}</h3><p>{active.text}</p>{link(active.to,active.action+' →')}</div><div><h3>该快照的依据</h3>{selected==='PS'? <><p>{related.length} 项与 {career.skill} 相关的可访问确认材料。</p>{related.map(c=><details key={c.id}><summary>{c.title} · v{c.version}</summary><p>{c.text}</p><p>本人贡献：{c.contribution||'待说明'}；核验：未知。</p></details>)}</> : selected==='DP'?<p>{reviews ? `${reviews.length} 份保存时纳入的复盘引用；有记录不等于已核验改进。`:'旧快照没有保存复盘引用，不能使用现在的记录补画历史。'}</p>:<p>当前没有已核验的适用判定条目；保持未知。全部材料引用可在下方逐项查看。</p>}</div></div></section>
    {a.skillRows&&<section className="assessment-band"><h2>入库职业学习重点与材料对照</h2><p>知识版本 {a.catalogVersion} · {a.knowledgeProfileId}。按本人选择的技能标签精确关联，不从原文猜测掌握程度。</p><div className="table-wrap"><table className="catalog-skill-table"><thead><tr><th>学习重点</th><th>材料状态</th><th>引用</th></tr></thead><tbody>{a.skillRows.map(row=><tr key={row.skillId}><th>{row.name}</th><td>{row.claimRefs.some(ref=>!s.claims.some(c=>c.id===ref.id&&c.version===ref.version&&c.status==='已确认'))?'依据已变更，请更新快照':row.status}</td><td>{row.claimRefs.map(ref=>ref.id+'@v'+ref.version).join('、')||'未知'}</td></tr>)}</tbody></table></div></section>}
    <section className="assessment-band"><header className="section-heading"><div><h2>已有材料能说明什么？</h2><p>按该快照实际引用的材料计数；没有审核后的适用分母，不计算能力或覆盖百分比。</p></div></header><div className="evidence-count-bands"><div><span>快照引用</span><strong>{a.claims.length} 项</strong></div><div><span>当前仍可访问的确认材料</span><strong>{materials.filter(c=>c.available).length} 项</strong></div><div><span>实际能力核验</span><strong>未知</strong></div></div><div className="reference-list">{materials.length?materials.map(c=><details key={c.id}><summary>{c.id}@v{c.version} · {c.available?'本人确认，未独立实核':'当前不可访问或历史原文未保存'}</summary>{c.available?<><p>{c.title}</p><p>{c.text}</p></>:<p>不显示撤回材料或用现有版本替代历史原文。</p>}</details>):<p>此快照没有确认材料引用；可补充经历，也可带未知安排独立验证。</p>}</div></section>
    <section className="assessment-band"><header className="section-heading"><div><h2>比较历次准备记录</h2><p>只在你明确更新后保存新快照；材料变化不自动画成能力提升。</p></div></header><ol className="snapshot-timeline">{history.map((x,i)=><li key={x.id}><span>{i+1}</span><div><strong>{careers.find(c=>c.id===x.occupation)?.name||'未知范围'} · 资料 v{x.profileVersion}</strong><small>{x.date?.slice(0,10)||'日期未知'} · {x.claims.length} 项引用 · {x.id===a.id?'当前快照':'历史记录'}</small></div></li>)}</ol>{compatible.length?<><label className="field"><span>选择同职业、同规则的比较基线</span><select aria-label="评估比较基线" value={prior?.id||''} onChange={e=>setBaseline(e.target.value)}>{compatible.map(x=><option key={x.id} value={x.id}>{x.id} · 资料 v{x.profileVersion}</option>)}</select></label><div className="table-wrap"><table className="snapshot-state-table"><thead><tr><th>维度</th><th>比较版依据状态</th><th>当前快照依据状态</th></tr></thead><tbody>{dims.map(d=><tr key={d.id}><td>{d.id} · {d.name}</td><td>{stateAt(prior,d.id)}</td><td>{stateAt(a,d.id)}</td></tr>)}</tbody></table></div><div className="snapshot-diff"><p>新增或新版本引用：{added.length} 项；移出或替换的旧引用：{removed.length} 项。</p><p>{[...added.map(c=>`＋ ${c.id}@v${c.version}`),...removed.map(c=>`－ ${c.id}@v${c.version}`)].join('；')||'材料引用未变；不据此推断能力变化。'}</p><small>这是依据变化记录，不是能力涨跌。不同职业或不同规则的快照不进行数值比较。</small></div></>:<div className="empty"><h3>还没有可比较的历史记录</h3><p>需要同一职业、同一规则的两次分析才能比较。确认新材料并更新分析后，可回到这里查看变化。</p></div>}</section>
    <section className="assessment-band"><h2>为待补内容安排实践</h2><div className="actions">{link('/assessment?tab=原文确认','补材料 / 核对原文','button')}<button onClick={()=>precheck({title:'未知项短验证',purpose:'验证尚未明确的具体任务范围'})}>安排一次验证任务</button>{link('/plan?tab=执行&view=calendar','查看行动日程','button')}<button onClick={feedback}>反馈这次分析的问题</button></div></section>
  </div>;
}
