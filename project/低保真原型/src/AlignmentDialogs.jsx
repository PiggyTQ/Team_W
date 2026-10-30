import React,{useState} from 'react';
import {confirmed,cname,uid} from './model';
import {revisionRows,mergeReport,reportExportText,validScopeRefs,createSkillCandidates,reportBasisKey,consultationBody,reportUpdateBody,reportReferencesUnavailable,reportPrivateSnippets} from './alignment-model';
import {AI_CONSENT_VERSION,scopeKey,hasExternalConsent} from './agent-contract.js';
import {authMessage} from './auth-contract';

export function ReportRevision({s,f,update,close,go,fail}) {
  const prior=s.reports.find(r=>r.id===f.reportId),saved=s.reportMergeDrafts?.[f.reportId];
  const blocked=reportReferencesUnavailable(s,prior),base=reportBasisKey(s),restored=!blocked&&saved?.base===base;
  const rows=prior?revisionRows(s,prior,f.old,blocked?f.new:reportUpdateBody(prior,f.new)):[];
  const [choices,setChoices]=useState(restored?saved.choices:{}),[edits,setEdits]=useState(restored?saved.edits:{});
  const change=(c,e)=>{setChoices(c);setEdits(e);update({reportMergeDrafts:{...s.reportMergeDrafts,[prior.id]:{base,choices:c,edits:e}}});};
  if(!prior)return <p className="notice">原报告已不可访问，请返回报告列表重新选择。</p>;
  return <div className="alignment-dialog report-revision">
    <p>逐段检查新旧依据；未受影响的人工内容保留。旧引用仍受撤回检查，保留旧段落不等于已采用新依据。</p>
    {blocked?<p className="notice">旧引用已不可访问，不读取旧正文或处理草稿。请逐段采用当前有效依据；原报告保留，不复制受限内容。</p>:saved&&!restored&&<p className="notice">基线已更新，旧处理草稿不能直接应用，请重新核对。</p>}
    {rows.map(row=><section key={row.id} className="revision-row"><h3>{row.title} · {row.affected?'需要本人处理':'未受影响，保留人工内容'}</h3>{row.affected?<>
      <div className="cols2"><div><h4>旧人工内容 / 旧依据</h4><p className="preserve">{row.blocked?'原引用已不可访问，不展示缓存正文。':row.oldText||'原报告没有此章节'}</p></div><div><h4>当前依据草稿（模拟）</h4><p className="preserve">{row.newText}</p></div></div>
      <label className="field"><span>{row.title}的处理方式</span><select aria-label={`${row.title}的处理方式`} value={row.blocked&&choices[row.id]!=='new'?'':choices[row.id]||''} onChange={e=>change({...choices,[row.id]:e.target.value},edits)}><option value="">尚未处理</option>{!row.blocked&&<option value="old">保留人工段落及旧依据</option>}<option value="new">采用新依据段落</option>{!row.blocked&&<><option value="edit">手工合并（保留旧引用以供检查）</option><option value="reflection">移为私人反思，不进入默认报告正文</option></>}</select></label>
      {!row.blocked&&choices[row.id]==='edit'&&<label className="field"><span>手工合并：{row.title}</span><textarea aria-label={`手工合并：${row.title}`} value={edits[row.id]||''} onChange={e=>change(choices,{...edits,[row.id]:e.target.value})}/></label>}
    </>:<p className="preserve">{row.oldText}</p>}</section>)}
    <div className="actions"><button className="primary" disabled={blocked&&(s.adminSource.status==='已撤回'||!rows.length)} onClick={()=>{try{const n=mergeReport(s,prior,rows,choices,edits);update({reports:[...s.reports,n],reportMergeDrafts:{...s.reportMergeDrafts,[prior.id]:null}});close();go(`/reports/${n.id}`);}catch(e){fail(e.message);}}}>确认冲突，保存新版本</button><button onClick={close}>取消，保留旧版与草稿</button></div>
  </div>;
}

export function ReportExport({s,f,set,download,fail}) {
  const r=s.reports.find(r=>r.id===f.reportId),blocked=reportReferencesUnavailable(s,r);
  if(!r)return <p className="notice">原报告已不可访问，请返回报告列表重新选择。</p>;
  const snippets=reportPrivateSnippets(s,r);
  const chosen=f.private?snippets.filter(x=>(f.privateIds||[]).includes(x.id)):[];
  return <div className="alignment-dialog report-export"><p>输出已保存快照：{r.id} v{r.version}；这里只导出本地示例文本。</p>{r.sections.map(sec=><label className="check" key={sec}><input type="checkbox" checked={f.selection.includes(sec)} onChange={e=>set('selection',e.target.checked?[...f.selection,sec]:f.selection.filter(x=>x!==sec))}/>{sec}</label>)}<label className="check"><input type="checkbox" checked={f.private||false} onChange={e=>set('private',e.target.checked)}/>主动加入本人复盘片段（默认关闭）</label>{f.private&&<fieldset><legend>只选择本次允许导出的片段</legend>{snippets.length?snippets.map(x=><label className="private-snippet" key={x.id}><input type="checkbox" aria-label={`导出复盘片段：${x.title}`} checked={(f.privateIds||[]).includes(x.id)} onChange={e=>set('privateIds',e.target.checked?[...f.privateIds||[],x.id]:(f.privateIds||[]).filter(id=>id!==x.id))}/><span>{x.title}<small>{x.text||'没有正文，保持未知'}</small></span></label>):<p>没有可选的本人复盘，不补造内容。</p>}<p>已选 {chosen.length} 项；未勾选的记录不加入。</p></fieldset>}{blocked&&<p className="notice">存在失效引用，禁止导出。请按新依据更新并检查内容。</p>}<div className="actions"><button className="primary" disabled={blocked} onClick={()=>{if(!f.selection.length)return fail('至少选择一个报告片段。');if(f.private&&!chosen.length)return fail('请选择允许导出的私人片段，或关闭私人复盘。');try{download(`职业报告_模拟_v${r.version}.txt`,reportExportText(r,f.selection,chosen.map(x=>({...x})),s));}catch(error){fail(error.message);}}}>导出选中片段 TXT（本地示例）</button><button onClick={()=>fail('模拟导出服务故障：选择已保留，可重试。')}>模拟导出失败</button></div></div>;
}

export function ScopePicker({s,f,set,update,close,tell,external=false}) {
  const scope=f.scope||s.aiScope,refs=f.claimRefs||validScopeRefs(s),claims=confirmed(s);
  const selected=scope.includes('本人确认片段')?refs.filter(r=>claims.some(c=>c.id===r.id&&c.version===r.version)):[];
  const actual=selected.length?scope:scope.filter(x=>x!=='本人确认片段');
  const next={...s,aiScope:actual,aiClaimRefs:selected,authorized:selected.length>0},nextKey=scopeKey(next);
  const change=(key,value)=>{set(key,value);if(external)set('externalAgree',false);};
  const save=()=>{
    if(external&&(!f.externalAgree||nextKey===null))return;
    const reuse=hasExternalConsent(s)&&scopeKey(s)===nextKey;
    const consent=external?{version:AI_CONSENT_VERSION,provider:'DeepSeek',scopeKey:nextKey,accepted:true,grantId:reuse?s.aiExternalConsent.grantId:uid('ai-consent')}:null;
    update({aiScope:actual,aiClaimRefs:selected,authorized:selected.length>0,aiExternalConsent:consent,proposal:null});
    close();tell(external?'所选范围与 DeepSeek 外发授权已保存，可随时撤回。':`模拟范围已保存：${selected.length} 项确认片段；既有提议需重新预览。`);
  };
  return <div className={`alignment-dialog${external?' external-ai-scope':''}`}>
    {external?<><p>问题及你选择的资料将发送至 DeepSeek，用于生成只读回答。此前的模拟资料授权不会自动继承。</p><p className="agent-egress-summary">将发送：当前问题；选定片段的标题、原文与技能；若选择计划，则包含目标、预算、预计投入、任务标题、状态和依赖。不读取历史对话、私人复盘、原始文件或未确认候选。</p></>:<p>没有外部传输。只选择当前需要的范围及确认材料版本，拒绝后仍能手动完成主线。</p>}
    {['职业原创知识','当前目标与计划','本人确认片段'].map(item=><label className="check" key={item}><input type="checkbox" checked={scope.includes(item)} onChange={e=>change('scope',e.target.checked?[...scope,item]:scope.filter(x=>x!==item))}/>{item}</label>)}
    {scope.includes('本人确认片段')&&<fieldset><legend>确认材料片段（逐项选择，不默认全选）</legend>{external&&<p className="agent-scope-footnote">每次最多选择 12 项。标题、原文与技能标签会发送，材料改版后须重新选择。</p>}{claims.length?claims.map(c=>{
      const checked=refs.some(r=>r.id===c.id&&r.version===c.version);
      return <label className="private-snippet" key={c.id}><input type="checkbox" aria-label={`使用确认片段：${c.title}`} checked={checked} disabled={external&&!checked&&refs.length>=12} onChange={e=>change('claimRefs',e.target.checked?[...refs.filter(r=>r.id!==c.id),{id:c.id,version:c.version}]:refs.filter(r=>r.id!==c.id))}/><span>{c.title} · v{c.version}<small>{c.text}</small>{external?<small>本人确认，未独立核验</small>:<small>本人贡献：{c.contribution||'未知'}；未独立核验</small>}</span></label>;
    }):<p>没有确认材料；可以仅使用职业原创知识。</p>}</fieldset>}
    <p>私人复盘、原始文件和未确认候选均不在本次范围。材料改版后旧选择不自动切换到新版。</p>
    {external&&<><p className="agent-scope-footnote">问题或选定原文中的联系方式也会随文本发送，建议先删除不必要的个人信息。已发送的内容不能通过本地撤回追溯收回。</p><label className="check agent-consent-check"><input type="checkbox" checked={f.externalAgree===true} onChange={e=>set('externalAgree',e.target.checked)}/><span>我同意将本次所选范围下的问题及资料发送至 DeepSeek。范围变化后重新确认，可随时撤回后续外发授权。</span></label></>}
    <div className="actions"><button className="primary" disabled={external&&(!f.externalAgree||nextKey===null)} onClick={save}>{external?'确认所选范围与外发授权':'确认所选范围'}</button><button onClick={()=>{update({aiScope:['职业原创知识'],aiClaimRefs:[],authorized:false,aiExternalConsent:null,proposal:null});close();tell(external?'外发授权已撤回，后续请求已阻止，手动功能仍可使用。':'已拒绝个人范围，通用知识仍可用。');}}>{external?'拒绝或撤回外发授权':'拒绝个人资料，仅通用知识'}</button></div>
  </div>;
}

export function EvidencePicker({s,f,set,update,command,close,go,fail}) {
  const t=s.tasks.find(x=>x.id===f.taskId),attempt=t?.attempts.find(x=>x.id===f.attemptId),entries=f.skillEntries||f.skills.map(skill=>({skill,scope:'',location:''}));
  if(!t||!attempt)return <p>该成果版本不可访问；请回原任务选择现有产物。</p>;
  const patch=(i,key,value)=>set('skillEntries',entries.map((x,n)=>n===i?{...x,[key]:value}:x));
  return <div className="alignment-dialog evidence-picker"><label className="field"><span>提交版本</span><select aria-label="提交版本" value={f.attemptId} onChange={e=>set('attemptId',e.target.value)}>{t.attempts.map(a=><option key={a.id} value={a.id}>v{a.version} · {a.result}</option>)}</select></label><label className="field"><span>本人贡献范围</span><textarea aria-label="本人贡献范围" value={f.contribution||''} onChange={e=>set('contribution',e.target.value)}/></label>{entries.map((x,i)=><fieldset key={i}><legend>技能与产物条目 {i+1}</legend><label className="field"><span>技能名称 {i+1}</span><input aria-label={`技能名称 ${i+1}`} value={x.skill} onChange={e=>patch(i,'skill',e.target.value)}/></label><label className="field"><span>产物位置 {i+1}（可留待补充）</span><input aria-label={`产物位置 ${i+1}`} value={x.location} onChange={e=>patch(i,'location',e.target.value)}/></label><label className="field"><span>支持范围 {i+1}（可保持未知）</span><textarea aria-label={`支持范围 ${i+1}`} value={x.scope} onChange={e=>patch(i,'scope',e.target.value)}/></label>{entries.length>1&&<button onClick={()=>set('skillEntries',entries.filter((_,n)=>n!==i))}>移除技能条目 {i+1}</button>}</fieldset>)}<button onClick={()=>set('skillEntries',[...entries,{skill:'',scope:'',location:''}])}>增加另一技能支持条目</button><p>同一产物分别说明不同技能的范围。重复条目不重复建立候选，候选仍待本人确认；本人自检不等于实际能力核验。</p><div className="actions"><button className="primary" onClick={async()=>{if(!entries.some(x=>x.skill.trim()))return fail('至少填写一项技能；不猜测未知技能。');if(command){try{await command('evidence.candidates',{taskId:t.id,taskVersion:t.version,attemptId:attempt.id,entries,contribution:f.contribution||'',confirmation:'GENERATE_CANDIDATES'});close();go('/assessment?tab=原文确认');}catch(error){fail(authMessage(error.code));}return;}const list=createSkillCandidates(s,t,attempt,entries,f.contribution);update({claims:[...s.claims,...list],analysisStale:!!s.analysis,originTask:t.id,tasks:s.tasks.map(x=>x.id===t.id?{...x,claimStatus:'候选待本人确认'}:x)});close();go('/assessment?tab=原文确认');}}>生成候选并去本人逐项确认</button><button onClick={close}>稍后，返回完成回执</button></div></div>;
}

export function ReportReferences({s,r}) {
  if(reportReferencesUnavailable(s,r))return <p>原引用已撤回或删除，不展示缓存原文。请先使用有效依据更新报告。</p>;
  const refs=r.claimRefs||r.claimIds.map(id=>({id,version:null}));
  return <div className="report-frozen-references">{refs.map((ref,i)=>{const current=confirmed(s).find(c=>c.id===ref.id),old=r.claimSnapshots?.find(c=>c.id===ref.id&&c.version===ref.version),fact=current&&(old||(current.version===ref.version?current:null));return <details key={`${ref.id}-${ref.version}-${i}`}><summary>{ref.id} · {ref.version?`v${ref.version}`:'历史版本未登记'}</summary>{fact?<><p>{fact.title}</p><p>{fact.text}</p><small>保存时的材料版本；本人确认，未独立核验。</small></>:<p>{current?'旧快照未保存对应原文，不使用现有版本替代。':'该引用已撤回或删除，不展示缓存原文。'}</p>}</details>;})}</div>;
}

export function ReportPreflight({s,f,set,reportSnapshot,defaultBody,update,command,close,go,fail}) {
  const consult=f.kind==='consult',body=consult?consultationBody(s,f.help):(f.liveBody||defaultBody());
  const rows=body.split('\n'),titles=rows.map(x=>x.split('：')[0]),selection=f.selection||titles;
  return <div className="alignment-dialog"><label className="field"><span>报告标题</span><input aria-label="报告标题" value={f.title||''} onChange={e=>set('title',e.target.value)}/></label><label className="field"><span>输出用途</span><select aria-label="输出用途" value={f.kind||'report'} onChange={e=>{set('kind',e.target.value);set('selection',null);}}><option value="report">职业探索 / 阶段准备报告</option><option value="consult">咨询摘要（自行携带）</option></select></label>{consult&&<label className="field"><span>希望得到的帮助（本人填写，可留空）</span><textarea aria-label="希望得到的帮助（本人填写，可留空）" value={f.help||''} onChange={e=>set('help',e.target.value)}/></label>}<fieldset><legend>选择本次内容范围</legend>{titles.map(title=><label className="check" key={title}><input type="checkbox" checked={selection.includes(title)} onChange={e=>set('selection',e.target.checked?[...selection,title]:selection.filter(x=>x!==title))}/>{title}</label>)}</fieldset><p>确认材料 {confirmed(s).length} 项 · 资料 v{s.profileVersion}；目标 {cname(s.goal)}；任务 {s.tasks.length} 项 · 计划 v{s.planVersion}。选择后冻结输入，不改写旧报告。</p><p className="notice">缺失内容写待补充或未知，不生成能力结论。私人反思默认不进入正文；实际行动仍标本人记录。</p><label className="check"><input type="checkbox" checked={f.allowMissing||false} onChange={e=>set('allowMissing',e.target.checked)}/>{command?"我了解缺项和资料范围，创建带明确缺项的草稿。":"我了解缺项和模拟范围，创建带明确缺项的草稿。"}</label><div className="actions"><button className="primary" onClick={async()=>{if(s.adminSource.status==='已撤回')return fail('来源用途已撤回，请先替换来源或重新审阅。');if(!f.title?.trim()||!f.allowMissing||!selection.length)return fail('请填写标题、选择内容范围并确认缺项。');if(command){try{const receipt=await command('report.compose',{title:f.title,kind:f.kind||'report',help:consult?f.help||'':'',sections:selection,previewVersion:f.liveBaseVersion,previewDigest:f.liveDigest,confirmation:'COMPOSE_REPORT'});close();go('/reports/'+receipt.refs.reportId);}catch(error){fail(authMessage(error.code));}return;}const r={...reportSnapshot(f.title,rows.filter((_,i)=>selection.includes(titles[i])).join('\n')),kind:f.kind||'report',help:consult?f.help||'':''};update({reports:[...s.reports,r]});close();go(`/reports/${r.id}`);}}>{command?"冻结输入并建立报告草稿":"冻结输入并建立模拟草稿"}</button>{!command&&<button onClick={()=>fail('模拟生成失败，原输入保留；可重试或返回补材料。')}>模拟生成失败</button>}</div></div>;
}

