import ProductIcon from './ProductIcon';
import {SceneDecor} from './HomeSceneDesign';
import BrandLogo from './BrandLogo';
import React,{useEffect,useRef,useState} from 'react';
import {MotionText} from './HomeMotion';
import {useContentTransition} from './content-transition';
import CaseStudy from './CaseStudy';
import {useLanguage} from './i18n/render';
import {StudioIcon} from './CareerPreviewStage';

const anchors=[['how','如何使用'],['directions','了解 IT 职业'],['case-study','项目示例'],['trust','数据与隐私'],['questions','使用疑问']];

export function PublicNavigation({logged,go,open,Icon}){
  const menu=useRef(null);
  const closeMenu=()=>{if(menu.current)menu.current.open=false;};
  return <nav className="publicnav publicnav-v5" aria-label="首页导航">
    <a className="brand" href="#main"><BrandLogo/></a>
    <div className="public-links">{anchors.map(([id,title])=><a href={'#'+id} key={id}>{title}</a>)}</div>
    <details className="public-mobile-menu" ref={menu} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();closeMenu();menu.current.querySelector('summary').focus();}}}><summary>页面导航</summary><div>{anchors.map(([id,title])=><a href={'#'+id} key={id} onClick={closeMenu}>{title}<span aria-hidden="true">↗</span></a>)}</div></details>
    <button onClick={()=>logged?go('/app'):open('auth',{intent:'/app'})}>{logged?'进入工作区':'登录 / 开始'}</button>
  </nav>;
}

function AnswerRow({id,anchor,title,children,expanded,toggle}){
  const answer=useRef(null);useContentTransition(answer,expanded);
  return <details id={anchor} className="start-answer" open={expanded} data-i18n="off"><summary onClick={event=>{event.preventDefault();toggle(id);}}><span>{title}</span><ProductIcon name="chevronDown" className="usage-chevron" size={22}/></summary><div ref={answer}>{children}</div></details>;
}

const usageAnswers=[
 {id:'start',title:['没有简历、还没定方向，可以开始吗？','Can I start without a résumé or a career direction?'],text:['可以。先比较职业，或手填课程、项目和本人贡献。之后可以调整方向与计划，已完成成果会保留；没有材料支持的部分保持未知。','Yes. Start by comparing careers or recording courses, projects and your contribution. You can change your direction and plan later while keeping completed work. Unsupported information remains unknown.']},
 {id:'manual',title:['AI 不可用，还能继续吗？','Can I continue when AI is unavailable?'],text:['可以。材料确认、职业比较、计划和报告都保留手动入口。当前原型的 AI 展示为模拟或预录流程，并未连接真实模型。','Yes. Material confirmation, career comparison, plans and reports retain manual options. AI in this prototype is simulated or prerecorded, with no live model connection.']},
 {id:'example',title:['示例内容和材料确认代表什么？','What do the examples and material confirmation mean?'],text:['职业与练习内容为原创合成示例，不是真实招聘或用户成果；具体岗位条件仍需核对原文。本人确认只代表核对所述内容，不等于能力核验，也不把材料数量当作能力分数。','Career and exercise content is synthetic, not live recruitment or user achievements. Check the original vacancy for actual requirements. Personal confirmation means checking the stated content, not verifying ability; material counts are not ability scores.']},
 {id:'privacy',anchor:'trust',title:['个人资料和 AI 使用范围由谁决定？','Who controls personal data and AI access?'],text:['由你选择。可拒绝或撤回 AI 授权，私人反思默认排除，不自动投递或联系企业。删除资料前会说明影响；当前仅为本机模拟，后台删除及外部服务仍需接入后验证。','You do. You may refuse or withdraw AI access; private reflections are excluded by default. Nothing is automatically submitted and no employers are contacted. Deletion explains its impact first. This is a local prototype; backend deletion and external services still need integration and verification.']}
];
function BeforeStarting({open}){
 const index=useLanguage()==='en'?1:0;
 const [expanded,setExpanded]=useState([]),allOpen=expanded.length===usageAnswers.length;
 const toggle=id=>setExpanded(previous=>previous.includes(id)?previous.filter(key=>key!==id):[...previous,id]);
 return <section id="before-start" className="landing-section before-start" aria-labelledby="tail-before-title"><SceneDecor scene="faq"/><header><h2 id="tail-before-title"><MotionText lines={['关于使用、示例和个人资料']}/></h2><p data-i18n="off">{index?'Four essentials. Open a question for details.':'保留四个关键问题，点击展开说明。'}</p></header><div className="start-list-toolbar"><button aria-controls="start-answers" aria-expanded={allOpen} onClick={()=>setExpanded(allOpen?[]:usageAnswers.map(row=>row.id))}>{allOpen?'全部收起':'全部展开'}<ProductIcon name="chevronDown" className="usage-chevron" size={22}/></button></div><div id="start-answers"><div id="questions" className="usage-single-list">{usageAnswers.map(row=><AnswerRow key={row.id} id={row.id} anchor={row.anchor} title={row.title[index]} expanded={expanded.includes(row.id)} toggle={toggle}><p>{row.text[index]}</p></AnswerRow>)}</div></div><footer><button className="tail-text-button" onClick={()=>open('legal')}>查看数据与隐私说明 <span aria-hidden="true">↗</span></button><a href="#report-preview">回看报告示例 <span aria-hidden="true">↑</span></a></footer></section>;
}

function Closing({go}){
  const frame=useRef(null),[arrived,setArrived]=useState(false);
  useEffect(()=>{const observer=new IntersectionObserver(items=>{if(items.some(x=>x.isIntersecting)){setArrived(true);observer.disconnect();}},{threshold:.25});observer.observe(frame.current);return()=>observer.disconnect();},[]);
  return <><section className="tail-closing tail-section" aria-labelledby="tail-closing-title"><div className="tail-closing-frame" ref={frame} data-arrived={arrived}><SceneDecor scene="closing"/><div className="story-end-line" aria-hidden="true"><span/></div><h2 id="tail-closing-title"><MotionText lines={['从了解一个 IT 职业开始']}/></h2><p>还没想好做什么，就先比较职业；<br/>有了目标，再安排学习、项目和求职准备。</p><button className="primary" onClick={()=>go('/careers')}>开始探索 IT 职业 <span aria-hidden="true">→</span></button><a href="#starting-points">再选一个适合我的起点 ↑</a><small>示例可直接浏览；个人流程使用模拟认证。</small></div></section>
    <nav className="tail-footer-nav" aria-label="页尾导航">{anchors.map(([id,title])=><a href={'#'+id} key={id}>{title}</a>)}<a href="#main">回到顶部 ↑</a></nav></>;
}

export default function LandingTail({go,open,link}){
 return <><CaseStudy go={go} open={open} link={link}/><BeforeStarting open={open}/><Closing go={go}/></>;
}
