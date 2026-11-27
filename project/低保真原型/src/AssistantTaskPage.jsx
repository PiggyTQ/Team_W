import React,{useState} from 'react';
import AssistantWorkspace from './AssistantWorkspace';
import DiscussionWorkbench,{SourceText} from './DiscussionWorkbench';
import {chooseTaskObject,chooseComparison,discussionRoute} from './assistant-task-model';
import {demoTaskSources,patchDemoTaskDiscussion,demoTaskReady} from './assistant-demo-task-model';
import {TaskPreparation,TaskSources} from './AssistantTaskPanels';
import AssistantSymbol from './AssistantSymbols';
import {useLanguage} from './i18n/render';
import {refKey} from './discussion-contract';
import './assistant-task-pages.css';

export default function AssistantTaskPage(props){
 const {state:s,conv,update,navigate,liveAgent}=props;
 const select=next=>{liveAgent?.cancel();update(next);const c=next.conversations.find(c=>c.id===next.conversationId);navigate(discussionRoute(c));};
 const taskActions={onTaskObject:object=>select(chooseTaskObject(s,conv.id,object)),onTaskPair:(left,right)=>select(chooseComparison(s,conv.id,left,right))};
 return <AssistantWorkspace {...props} s={s} aiContent={()=>props.user?<DiscussionWorkbench {...props} {...taskActions}/>:<DemoTaskConversation key={conv.id} {...props} {...taskActions}/>}/>;
}

/** Local preview keeps task identities and local drafts, without authenticated APIs. */
function DemoTaskConversation({state:s,conv,update,link,taskPage,onTaskObject,onTaskPair}){
 const language=useLanguage(),en=language==='en',tx=(zh,english)=>en?english:zh,d=conv.discussion;
 const [sourcesOpen,setSourcesOpen]=useState(false),[notice,setNotice]=useState('');
 const items=demoTaskSources(s,d,language),selected=items.filter(row=>d.refs.some(ref=>refKey(ref)===refKey(row.ref)));
 const change=patch=>{setNotice('');update(prev=>patchDemoTaskDiscussion(prev,conv.id,patch));};
 const sourceName=row=>en?(row.labelEn||row.label):row.label;
 const partLabel=part=>({plan:tx('计划概要','Plan summary'),output:tx('产物原文','Original artifact'),contribution:tx('本人贡献','My contribution'),profile:tx('职业介绍','Career introduction'),text:tx('材料原文','Original text')})[part]||part;
 const taskProps={s,d,items,tx,en,change,onObject:onTaskObject,onPair:onTaskPair,partLabel,sourceName,link,renderContent:value=><SourceText value={value} language={language}/>};
 const ready=demoTaskReady(d),question=d.question||'';
 const save=()=>{if(!ready||!question.trim())return;update(prev=>patchDemoTaskDiscussion(prev,conv.id,{question}));setNotice(tx('问题已保留在本机讨论中。可继续整理资料，或回原工作页手动编辑。','Your question is retained in this local discussion. Review sources or edit on the original work page.'));};
 return <div className={'discussion-workbench chat-first task-workbench task-'+taskPage} data-i18n="off" data-local-task={taskPage}>
  <TaskPreparation {...taskProps}/><div className="task-conversation">
   <div className="discussion-contextline"><button type="button" onClick={()=>setSourcesOpen(value=>!value)} aria-expanded={sourcesOpen}><AssistantSymbol name="attachment" size={18}/>{tx('本次资料','Sources')} · {selected.length}</button></div>
   {sourcesOpen&&<section className="discussion-sources" aria-label={tx('本次资料','Sources for this discussion')}><header><h3>{tx('本次资料','Sources for this discussion')}</h3><button type="button" aria-label={tx('收起资料','Close sources')} onClick={()=>setSourcesOpen(false)}><AssistantSymbol name="close"/></button></header><p>{tx('本机演示只在本机查看明确选中的内容，不向外部模型发送。','This local demo displays explicitly selected local content and sends nothing to an external model.')}</p><TaskSources {...taskProps}/></section>}
   <div className="task-discussion-empty"><img src="/illustrations/workbench/ai-laptop.png" alt=""/><h2>{taskPage==='compare'?tx('你更想了解哪一种工作？','Which kind of work would you like to explore?'):taskPage==='expression'?tx('把实际做过的事，讲清楚','Explain what you actually did'):tx('先从眼前这一步开始','Start with the next step in front of you')}</h2><p>{taskPage==='compare'?tx('对照是讨论的依据，不会替你决定目标。','The comparison informs discussion; the target remains your choice.'):taskPage==='expression'?tx('先选具体内容，再说做法、结果与局限。','Select specific content, then describe actions, results and limitations.'):tx('带上相关原任务，讨论范围与时间的取舍。','Use relevant original tasks to discuss scope and time trade-offs.')}</p></div>
   {selected.some(row=>row.personal)&&<details className="demo-source-summary"><summary>{tx('查看已选原文','Read selected original text')} · {selected.filter(row=>row.personal).length}</summary>{selected.filter(row=>row.personal).map(row=><section key={refKey(row.ref)}><h3 translate="no">{sourceName(row)}</h3><SourceText value={row.selectedContent} language={language}/>{link(row.to,tx('打开原工作','Open original work'))}</section>)}</details>}
   {conv.messages.length>0&&<details className="demo-source-summary"><summary>{tx('已有讨论记录','Existing discussion history')} · {conv.messages.length}</summary>{conv.messages.map(message=><article key={message.id}><small>{message.role==='user'?tx('本人问题','My question'):tx('原有演示记录','Earlier demo record')}</small><p translate="no">{message.text}</p></article>)}</details>}
   <form className="discussion-composer" onSubmit={event=>{event.preventDefault();save();}}><label className="sr-only" htmlFor={'local-task-question-'+conv.id}>{tx('当前问题','Current question')}</label><textarea id={'local-task-question-'+conv.id} value={question} maxLength={4000} rows={4} placeholder={tx('说说你现在想理清的事…','What would you like to work through?')} onChange={event=>change({question:event.target.value})} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&event.keyCode!==229){event.preventDefault();save();}}}/><div className="discussion-composer-tools"><button type="button" onClick={()=>setSourcesOpen(value=>!value)} aria-expanded={sourcesOpen}><AssistantSymbol name="attachment" size={22}/>{tx('本次资料','Sources')}</button><button type="submit" className="discussion-send" disabled={!ready||!question.trim()} aria-label={tx('保存问题','Save question')} title={tx('保存问题','Save question')}><AssistantSymbol name="note" size={20}/></button></div></form>
   <div className="discussion-service" role="status">{notice||tx('本机演示 · 问题与资料选择在本机保留，不调用模型或生成服务端建议。','Local demo · Questions and source choices stay on this device. No model calls or server-issued suggestions.')}</div>
   <div className="discussion-inline-actions">{link(taskPage==='expression'?'/assessment':taskPage==='compare'?'/careers':'/plan',taskPage==='expression'?tx('回个人评估编辑','Edit in personal assessment'):taskPage==='compare'?tx('阅读职业详情','Read career details'):tx('回原计划编辑','Edit the original plan'))}</div>
  </div>
 </div>;
}
