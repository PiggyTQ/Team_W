import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import AssistantPageHeader from './AssistantPageHeader';
import AssistantSymbol from './AssistantSymbols';

export default function AssistantWorkspace({ s, conv, link, update, open, aiContent, tabs, confirmAction }) {
  const [history, setHistory] = useState(false), [query, setQuery] = useState(''), [compactActions,setCompactActions]=useState(false);
  const dialog = useRef(null), trigger = useRef(null), sectionBar=useRef(null), managementTrigger=useRef(null);
  useLayoutEffect(()=>{const el=sectionBar.current;if(!el)return;const fit=()=>setCompactActions(el.clientWidth<900);fit();const observer=new ResizeObserver(fit);observer.observe(el);return()=>observer.disconnect();},[]);
  useEffect(() => {
    if (history) dialog.current?.showModal();
    else if (dialog.current?.open) {
      dialog.current.close();
      if(trigger.current?.checkVisibility())trigger.current.focus();else managementTrigger.current?.focus();
    }
  }, [history]);
  const close = () => { setHistory(false); };
  const create = () => {
    const item = { id: `conv-${Date.now()}`, title: '新的职业规划讨论', messages: [], mode: '职业咨询' };
    update({ conversations: [...s.conversations, item], conversationId: item.id, proposal: null });
    close();
  };
  const management=<><button onClick={()=>open('aiNotes')}><AssistantSymbol name="note" size={17}/>本人笔记<span className="assistant-action-count">{s.aiNotes?.length||0}</span></button><button ref={trigger} onClick={() => setHistory(true)}><AssistantSymbol name="history" size={17}/>历史讨论<span className="assistant-action-count">{s.conversations.length}</span></button><button className="assistant-create" onClick={create}><AssistantSymbol name="plus" size={17}/>新建讨论</button></>;
  return <div className="assistant-page assistant-page-focused"><AssistantPageHeader s={s} link={link} compact={compactActions} /><img className="assistant-top-art" src="/illustrations/workbench/ai-laptop.png" alt="" aria-hidden="true"/>
    <div className="assistant-section-bar" ref={sectionBar}>{tabs(['咨询与方案', '自然语言检索'])}{compactActions?<details className="assistant-management-menu"><summary ref={managementTrigger} aria-label="讨论管理" title="讨论管理"><span className="assistant-management-label">讨论管理</span><AssistantSymbol name="more" className="assistant-management-symbol"/></summary><div onClick={e=>{if(e.target.closest('button'))e.currentTarget.parentElement.open=false;}}>{management}</div></details>:<div>{management}</div>}</div>
    <section className="assistant-main" aria-label="AI 职业咨询">{aiContent()}</section>
    <dialog ref={dialog} className="chat-history-drawer" aria-labelledby="history-title" onCancel={e => { e.preventDefault(); close(); }}>
      <header className="section-head"><h2 id="history-title">讨论历史</h2><button onClick={close}>关闭历史</button></header>
      <p className="muted">切换讨论会保留当前问题草稿；只有主动删除才移除历史。</p>
      <label className="field"><span>查找讨论标题</span><input value={query} onChange={e => setQuery(e.target.value)} /></label>
      <button className="primary" onClick={create}>新建讨论</button>
      {s.conversations.filter(c => c.title.includes(query)).map(c => <article className="history-row" key={c.id}><button className="history-select" aria-pressed={c.id === conv.id} onClick={() => { update({ conversationId: c.id, proposal: null }); close(); }}><span>{c.title}</span><small>{c.messages.length} 条消息 · {c.archived ? '已归档' : c.mode || '职业咨询'}</small></button><div className="actions"><button onClick={() => { close(); open('rename', { convId: c.id, title: c.title }); }}>改名</button><button onClick={() => update({ conversations: s.conversations.map(x => x.id === c.id ? { ...x, archived: !x.archived } : x) })}>{c.archived ? '恢复讨论' : '归档'}</button><button onClick={() => { close(); confirmAction('删除会话？', '删除本地会话正文，已保存的本人笔记、独立任务和材料保留。', () => {
        const list = s.conversations.filter(x => x.id !== c.id);
        const fallback = { id: `conv-${Date.now()}`, title: '新的职业规划讨论', messages: [], mode: '职业咨询' };
        update({ conversations: list.length ? list : [fallback], conversationId: c.id === conv.id ? list.find(x => !x.archived)?.id || list[0]?.id || fallback.id : s.conversationId, proposal: null });
      }); }}>删除</button></div></article>)}
      {!s.conversations.some(c => c.title.includes(query)) && <p>没有符合标题的讨论。可以修改关键词或清空搜索。</p>}
    </dialog>
  </div>;
}
