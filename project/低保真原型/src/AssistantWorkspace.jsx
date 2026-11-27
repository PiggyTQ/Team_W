import {assistantTasks,newTaskConversation,discussionRoute} from './assistant-task-model';
import {useLanguage,displayPublicText} from './i18n/render';
import {careers} from './model';
import WorkspaceGuide from './WorkspaceGuide';
import React, { useEffect, useRef, useState } from 'react';
import AssistantPageHeader from './AssistantPageHeader';
import AssistantSymbol from './AssistantSymbols';
import './assistant-reference-layout.css';

export default function AssistantWorkspace({ s, conv, link, update, open, aiContent, tabs, confirmAction, taskPage=null, navigate }) {
  const en=useLanguage()==='en',config=assistantTasks[taskPage];
  const [history, setHistory] = useState(false), [query, setQuery] = useState('');
  const dialog = useRef(null), trigger = useRef(null);
  useEffect(() => {
    if (history) dialog.current?.showModal();
    else if (dialog.current?.open) {
      dialog.current.close();
      trigger.current?.focus();
    }
  }, [history]);
  const close = () => { setHistory(false); };
  const create = () => {
    const item = taskPage?newTaskConversation(s,taskPage):{ id: `conv-${Date.now()}`, title: '新的职业规划讨论', messages: [], mode: '职业咨询' };
    update({ conversations: [...s.conversations, item], conversationId: item.id, aiDraft: '', proposal: null });
    close();navigate?.(discussionRoute(item));
  };
  const management=<><button ref={trigger} onClick={() => setHistory(true)}><AssistantSymbol name="history" size={17}/>历史讨论</button><button onClick={()=>open('aiNotes')}><AssistantSymbol name="note" size={17}/>本人笔记</button><button className="assistant-create" onClick={create}><AssistantSymbol name="plus" size={19}/>新讨论</button></>;
  return <div className={"assistant-page assistant-page-focused assistant-reference-page"+(taskPage?" assistant-task-page":"")}>{taskPage&&<div className="assistant-task-back">{link('/assistant',en?'Back to AI workspace':'返回 AI 工作台')}</div>}<div className="assistant-chat-top">{taskPage?<header className="assistant-task-heading"><div><AssistantSymbol name={config.icon} size={36}/><h1>{config.title[en?1:0]}</h1></div><p>{config.description[en?1:0]}</p></header>:<AssistantPageHeader s={s} link={link}/>}<div className="assistant-chat-actions">{management}</div></div>
    <section className="assistant-main" aria-label="AI 职业咨询">{aiContent()}</section>
    <dialog ref={dialog} className="chat-history-drawer" aria-labelledby="history-title" onCancel={e => { e.preventDefault(); close(); }}>
      <header className="section-head"><h2 id="history-title">讨论历史</h2><button onClick={close}>关闭历史</button></header>
      <WorkspaceGuide s={s} path="/assistant"/><p className="muted">切换讨论会保留当前问题草稿；只有主动删除才移除历史。</p>
      <label className="field"><span>查找讨论标题</span><input value={query} onChange={e => setQuery(e.target.value)} /></label>
      <button className="primary" onClick={create}>新建讨论</button>
      {s.conversations.filter(c => c.title.includes(query)).map(c => <article className="history-row" key={c.id}><button className="history-select" disabled={!!c.archived} aria-pressed={c.id === conv.id} onClick={() => { update({ conversationId: c.id, proposal: null }); close();navigate?.(discussionRoute(c)); }}><span>{c.title}</span>{c.discussion?.task&&<small>{assistantTasks[c.discussion.task.page].title[en?1:0]}{c.discussion.task.object?' · '+(s.tasks.find(t=>t.id===c.discussion.task.object.id)?.title||s.claims.find(t=>t.id===c.discussion.task.object.id)?.title||''):c.discussion.task.left?' · '+displayPublicText(careers.find(v=>v.id===c.discussion.task.left)?.name||'—')+' / '+displayPublicText(careers.find(v=>v.id===c.discussion.task.right)?.name||'—'):''}</small>}<small>{c.messages.length} 条消息 · {c.archived ? '已归档' : c.mode || '职业咨询'}</small></button><div className="actions"><button onClick={() => { close(); open('rename', { convId: c.id, title: c.title }); }}>改名</button><button onClick={() => {update({ conversations: s.conversations.map(x => x.id === c.id ? { ...x, archived: !x.archived } : x) });if(!c.archived&&c.id===conv.id&&taskPage){close();navigate?.(config.path);}}}>{c.archived ? '恢复讨论' : '归档'}</button><button onClick={() => { close(); confirmAction('删除会话？', '删除本地会话正文，已保存的本人笔记、独立任务和材料保留。', () => {
        const list = s.conversations.filter(x => x.id !== c.id);
        const fallback = { id: `conv-${Date.now()}`, title: '新的职业规划讨论', messages: [], mode: '职业咨询' };
        update({ conversations: list.length ? list : [fallback], conversationId: c.id === conv.id ? list.find(x => !x.archived)?.id || list[0]?.id || fallback.id : s.conversationId, proposal: null });if(c.id===conv.id&&taskPage)navigate?.(config.path);
      }); }}>删除</button></div></article>)}
      {!s.conversations.some(c => c.title.includes(query)) && <p>没有符合标题的讨论。可以修改关键词或清空搜索。</p>}
    </dialog>
  </div>;
}
