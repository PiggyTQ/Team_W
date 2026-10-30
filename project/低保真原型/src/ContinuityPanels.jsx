import React,{useState} from 'react';
import {SERVER_AUTH} from './auth-client';
import {cname,careers} from './model';
import {searchPresetDraft,recordAdminAction} from './continuity-model';

export function SavedSearches({s,update,go,confirmAction}) {
  return <details className="saved-searches"><summary>保存的搜索条件（{s.presets.length}）</summary><p>{SERVER_AUTH?"条件保存在账户。":"条件保存在本机。"}载入后可修改，重新确认才会检索；不自动通知。</p>{s.presets.length?s.presets.map(p=><article className="saved-condition" key={p.id}><div><h3>{p.query||'未命名的筛选条件'}</h3><p>{p.career==='any'?'不限方向':cname(p.career)} · {p.location} · {p.form}</p><small>{p.scope} · 保存日期 {p.date||'未知'} · 通知未开启</small></div><div className="actions"><button onClick={()=>{update({searchFilters:searchPresetDraft(p)});go('/assistant?tab=自然语言检索');}}>载入并修改</button><button onClick={()=>confirmAction('删除这份搜索条件？','只删除这份保存条件，保留岗位卡、任务和讨论；取消可继续使用。',()=>update(x=>({...x,presets:x.presets.filter(item=>item.id!==p.id)})))}>删除条件</button></div></article>):<p>还没有保存条件。先在自然语言检索里纠正筛选，再保存以便下次继续。</p>}</details>;
}

export function LongTermBackground({s,update}) {
  const patch=(key,value)=>update({preferences:{...s.preferences,[key]:value}});
  return <div className="cols3"><label className="field"><span>长期探索意图</span><select aria-label="长期探索意图" value={s.preferences.intent} onChange={e=>patch('intent',e.target.value)}>{['方向未定','目标已定','已有作品'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>当前学习阶段</span><select aria-label="当前学习阶段" value={s.preferences.stage} onChange={e=>patch('stage',e.target.value)}>{['未知','本科在读','研究生在读','其他'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>地域偏好（可保持未知）</span><input aria-label="地域偏好（可保持未知）" value={s.preferences.location} onChange={e=>patch('location',e.target.value)}/></label></div>;
}

export function AdminHistory({record}) {
  return <section className="admin-local-history"><h2>本机审阅与版本记录</h2>{record.history?.length?<ol>{[...record.history].reverse().map(h=><li key={h.id}><h3>{h.action} · v{h.version}</h3><small>{h.date} · 本机模拟，实际审核人未指派</small><p>{h.reason}</p></li>)}</ol>:<p>尚无记录。保存草稿、模拟发布或撤回后可回查；不补造历史审核。</p>}</section>;
}

export function AdminReviewDraft({s,update}) {
  const saved=s.adminContent.reviewDraft;
  const [career,setCareer]=useState(saved?.career||'data'),[note,setNote]=useState(saved?.note||''),[message,setMessage]=useState('');
  return <form onSubmit={e=>{e.preventDefault();if(!note.trim()){setMessage('请填写审阅范围或待核对问题，不自动认定审核通过。');return;}update(x=>({...x,adminContent:recordAdminAction({...x.adminContent,reviewDraft:{career,note:note.trim(),date:new Date().toISOString()}},'保存条目审阅草稿',cname(career)+'：'+note.trim())}));setMessage('审阅草稿已保存到本机，可刷新续填；不代表正式审核或发布。');}}><label className="field"><span>待审条目</span><select aria-label="待审条目" value={career} onChange={e=>setCareer(e.target.value)}>{careers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="field"><span>审阅说明 / 待核对问题</span><textarea aria-label="审阅说明 / 待核对问题" value={note} onChange={e=>setNote(e.target.value)}/></label>{saved&&<p>上次保存：{cname(saved.career)} · {saved.date} · {saved.note}</p>}<button type="submit">保存条目审阅草稿</button>{message&&<p role="status">{message}</p>}</form>;
}
