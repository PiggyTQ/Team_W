import React from 'react';
import ProductIcon from './ProductIcon';
import {useLanguage} from './i18n/render';
import './career-opportunities-experience.css';
import './career-jobs-typography.css';

export default function OpportunityWelcome({onAdd,link}) {
 const en=useLanguage()==='en',tx=(zh,english)=>en?english:zh;
 return <section className="opportunity-start" data-i18n="off">
  <div className="opportunity-start-main"><div>
   <h2>{tx('从一份感兴趣的岗位开始','Start with a role you want to explore')}</h2>
   <p>{tx('保存岗位原文，对照自己的经历，再安排真正需要的准备。发生申请或面试后，在同一张研究卡里记录。','Save the job description, compare it with your experience, and plan the preparation you need. Record applications and interviews on the same research card when they happen.')}</p>
   <div className="actions"><button type="button" className="primary" onClick={onAdd}><ProductIcon name="plus" size={18}/>{tx('添加岗位研究卡','Add a job research card')}</button>{link('/careers?tab='+encodeURIComponent('企业与岗位'),tx('先浏览岗位资料 →','Browse job material first →'),'button')}</div>
   <p className="opportunity-start-inputs">{tx('开始只需岗位名称和允许处理的要求原文；来源、笔记与其他条件可以稍后补充。','Start with a role title and description you permit the site to process. Add sources, notes and other conditions later.')}</p>
  </div><img src="/illustrations/cheese-scenes/explore.png" alt=""/></div>
  <section className="opportunity-research-example" aria-labelledby="opportunity-example-title">
   <header><div><p className="opportunity-example-label">{tx('本站原创阅读示例 · 非在招岗位','Original reading example · not a live vacancy')}</p><h3 id="opportunity-example-title">{tx('把岗位要求，读成可以准备的事情','Turn a job requirement into something you can prepare')}</h3></div><ProductIcon name="file" size={30}/></header>
   <blockquote><span>{tx('岗位原文示例','Example description')}</span><p>{tx('协助维护业务周报，熟悉 SQL，有可视化经验者优先。','Help maintain weekly business reports. SQL proficiency is required; visualization experience is preferred.')}</p></blockquote>
   <div className="opportunity-example-findings">
    <section><h4><ProductIcon name="file" size={21}/>{tx('先看交付，而不只看工具','Look for the deliverable')}</h4><p>{tx('要交出能持续更新的业务周报。指标、使用者和复核方式还需从职责原文或沟通中确认。','The output is a business report that can be updated each week. Confirm its metrics, users and review process from the full description or a conversation.')}</p><small>{tx('研究卡里留住：工作对象、产物和使用场景。','Keep the work context, output and intended use on your card.')}</small></section>
    <section><h4><ProductIcon name="clipboard" size={21}/>{tx('分清要求，再找本人依据','Separate requirements and evidence')}</h4><p>{tx('SQL 是这句话中的要求，可视化是优先条件。可准备自己做过的查询、汇总表或报告，讲清本人贡献与检查方法。','SQL is a requirement in this example; visualization is preferred. Prepare a query, summary table or report you made, with your contribution and checking method.')}</p><small>{link('/assessment?tab='+encodeURIComponent('资料经历'),tx('整理我的经历与材料 →','Organize my experience and material →'))}</small></section>
    <section><h4><ProductIcon name="search" size={21}/>{tx('把没写清的，留下来问','Keep unanswered questions')}</h4><p>{tx('周报由谁使用？协助工作的责任边界是什么？数据从哪里来、能否访问？原文没写清时，先记为待核对。','Who uses the report? Which parts will you assist with? Where does the data come from, and can you access it? Keep these as open questions until confirmed.')}</p><small>{tx('研究卡里留住：关注理由与待问条件。','Keep your reasons for interest and questions to clarify on your card.')}</small></section>
   </div>
  </section>
  <p className="opportunity-start-note">{tx('研究卡由本人保存；浏览、收藏与准备任务不会自动记为已投递。示例不会写入你的记录。','You save your own research cards. Browsing, saving and preparation do not record an application. This example is not added to your records.')}</p>
 </section>;
}
export function OpportunityProgress({job,task,events,onPart}){
 const en=useLanguage()==='en',tx=(zh,english)=>en?english:zh,last=events[0];
 const items=[{part:'概览与来源',icon:'file',title:tx('岗位研究','Research'),value:job.text?.trim()?tx('已保存原文与来源','Description and source saved'):tx('待补岗位原文','Add the job description'),has:Boolean(job.text?.trim())},{part:'笔记与准备',icon:'clipboard',title:tx('准备行动','Preparation'),value:task?tx('已关联任务','Linked task')+' · '+(en?({'待开始':'Ready','进行中':'In progress','完成':'Completed','取消':'Cancelled','延期':'Deferred','暂停':'Paused','待复核':'Review pending','跳过':'Skipped','受阻':'Blocked'}[task.status]||task.status):task.status):tx('尚未安排准备任务','No preparation task yet'),has:Boolean(task)},{part:'申请进展',icon:'calendar',title:tx('本人求职事件','Your application events'),value:last?(en?({'投递':'Application','面试':'Interview','反馈':'Feedback','结果':'Result','录用':'Offer','未录用':'Rejection','撤回':'Withdrawal','无回复':'No reply'}[last.type]||last.type):last.type)+' · '+last.date:tx('发生后再记录','Record events when they happen'),has:Boolean(last)}];
 return <nav className="opportunity-progress" aria-label={tx('当前岗位的研究与进展','Research and progress for this role')} data-i18n="off">{items.map(item=><button className={item.has?'has-record':''} key={item.part} onClick={()=>onPart(item.part)}><span className="opportunity-progress-symbol"><ProductIcon name={item.icon} size={23}/></span><span><strong>{item.title}</strong><small>{item.value}</small></span><ProductIcon name="arrow" size={16}/></button>)}</nav>;
}
