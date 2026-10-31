import React from 'react';
import {agentMessageAvailable,agentKnowledgeAvailable} from './agent-contract';
import {useAgentKnowledgeDigest} from './agent-knowledge-view';

export default function AgentNotes({s,open,update,confirmAction,close,go}){
  const digest=useAgentKnowledgeDigest();
  return <><p>保存笔记不创建任务、不改写确认材料。引用或外发授权失效后，相关正文与旧版本停止展示。</p>
    {s.aiNotes?.length?s.aiNotes.map(n=>{
      const privacyAvailable=agentMessageAvailable(s,n),available=privacyAvailable&&agentKnowledgeAvailable(n,digest);
      return <article className="record" key={n.id}>
        <h3>{n.date?.slice(0,10)} · {n.edited?'本人编辑笔记':n.retrievalFallback?'系统检索原文笔记':n.systemGenerated?'系统资料缺口笔记':n.provider==='deepseek'?'DeepSeek 回答笔记':'模拟回答笔记'}</h3>
        {available?<><p className="preserve" translate="no">{n.text}</p>
          <small>保存范围：{(n.scope||[]).join('、')}</small>
          <button onClick={()=>open('aiNoteEdit',{noteId:n.id})}>编辑笔记</button>
          {s.conversations.some(c=>c.id===n.conversationId)?<button onClick={()=>{update({conversationId:n.conversationId});close();go('/assistant');}}>回到保存来源</button>:<small>原讨论已删除，独立笔记仍可编辑。</small>}
          {n.history?.length>0&&<details><summary>查看笔记旧版本</summary>{n.history.map((h,i)=><p className="preserve" translate="no" key={i}>v{h.version} · {h.text}</p>)}</details>}
        </>:<p role="status">{privacyAvailable?'知识版本尚未核对或已变化，笔记正文与历史暂不展示。':'引用材料或授权已失效，笔记正文与历史已隐藏。请使用当前有效资料重新生成。'}</p>}
        <button onClick={()=>confirmAction('删除这份本人笔记？','只删除此笔记，保留原会话与独立任务。',()=>update({aiNotes:s.aiNotes.filter(x=>x.id!==n.id)}))}>删除此笔记</button>
      </article>;
    }):<p>尚无已保存笔记。可在有效回答下方主动保存。</p>}
  </>;
}
