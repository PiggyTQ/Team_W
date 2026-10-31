import ProductIcon from './ProductIcon';
import React, {useEffect, useRef, useState} from 'react';
import {careers, confirmed} from './model';
import {CareerKnowledge} from './CatalogData';
import {careerDetailContent} from './career-detail-content';

const sections = [
  ['overview', '职业概览'], ['skills', '能力与准备'], ['growth', '成长路径'],
  ['environment', '环境与协作'], ['practice', '入门实践'],
];

function CheckList({items}) {
  return <ul className="career-checks">{items.map(item => <li key={item}><ProductIcon name="check" size={18}/><span>{item}</span></li>)}</ul>;
}

function WorkProcess({content}) {
  const [step, setStep] = useState(0);
  const item = content.workflow[step];
  return <section className="career-process" aria-labelledby="career-process-title">
    <div className="career-section-title"><h3 id="career-process-title">一项工作，怎样形成结果</h3><span>点选步骤查看具体任务</span></div>
    <ol className="career-process-track">{content.workflow.map((node, index) => <li key={node.title}>
      <button type="button" aria-pressed={step === index} aria-controls="career-process-detail" onClick={() => setStep(index)}><span className="career-step-number">{index + 1}</span><strong>{node.title}</strong></button>
    </li>)}</ol>
    <div className="career-process-detail" id="career-process-detail" aria-live="polite" aria-atomic="true"><div><h4>{item.title}</h4><p>{item.description}</p></div><div><span>这一步留下</span><p>{item.output}</p></div></div>
  </section>;
}

export default function CareerDetail({current, s, q, link, open, toggleCompare, update}) {
  const content = careerDetailContent[current.id];
  const [section, setSection] = useState('overview');
  const heading = useRef(null);
  const saved = s.favorites.includes(current.id), compared = s.compare.includes(current.id);
  const evidence = confirmed(s).filter(item => item.skill === current.skill);
  const index = careers.findIndex(item => item.id === current.id);
  const careerLink = id => `/careers?career=${id}&q=${encodeURIComponent(q)}`;
  useEffect(() => {heading.current?.focus({preventScroll:true});}, [current.id]);
  function switchWithKeyboard(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const at = sections.findIndex(([id]) => id === section);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1 : (at + (event.key === 'ArrowRight' ? 1 : -1) + sections.length) % sections.length;
    setSection(sections[next][0]);
    event.currentTarget.querySelectorAll('[role="tab"]')[next].focus();
  }
  return <div className="career-profile">
    <nav className="career-profile-navigation" aria-label="职业详情导航">{link(`/careers?q=${encodeURIComponent(q)}`, '← 返回筛选列表')}<span>{index + 1} / {careers.length} 个方向</span></nav>
    <article className="career-detail career-profile-sheet">
      <header className="career-profile-heading"><div><h2 ref={heading} tabIndex={-1}>{current.name}</h2><p className="career-english-name" lang="en">{content.englishName}</p><p className="career-profile-lead">{content.lead}</p></div><button type="button" className="career-profile-save" aria-pressed={saved} onClick={() => update({favorites:saved ? s.favorites.filter(id => id !== current.id) : [...s.favorites, current.id]})}><ProductIcon name="bookmark" size={20} filled={saved}/>{saved ? '已收藏' : '收藏方向'}</button></header>
      <dl className="career-profile-facts"><div><dt>主要产物</dt><dd>{current.output}</dd></div><div><dt>核心起点</dt><dd>{current.skill}</dd></div><div><dt>细分方向</dt><dd>{current.branch}</dd></div></dl>
      <div className="career-profile-tabs" role="tablist" aria-label="职业详情内容" onKeyDown={switchWithKeyboard}>{sections.map(([id, label]) => <button type="button" role="tab" key={id} id={`career-tab-${id}`} aria-selected={section === id} aria-controls="career-profile-panel" tabIndex={section === id ? 0 : -1} onClick={() => setSection(id)}>{label}</button>)}</div>
      <div className="career-profile-body" id="career-profile-panel" role="tabpanel" aria-labelledby={`career-tab-${section}`} tabIndex={0}>
        {section === 'overview' && <>
          <section className="career-scenario"><div><h3>把职业放进一个具体问题</h3><p>{content.scenario}</p></div></section>
          <WorkProcess content={content}/>
          <section className="career-deliverables"><div className="career-section-title"><h3>最终交付什么</h3><span>产物与检查点一起看</span></div><div className="career-deliverable-list">{content.deliverables.map(item => <div key={item.title}><h4>{item.title}</h4><p>{item.description}</p><details><summary>查看交付检查点</summary><CheckList items={item.checks}/></details></div>)}</div></section>
          <button className="career-reading-next" onClick={() => {setSection('skills'); document.getElementById('career-tab-skills')?.focus();}}>继续了解能力与准备 <span aria-hidden="true">→</span></button>
        </>}
        {section === 'skills' && <>
          <div className="career-section-title"><div><h3>从基础到实际应用</h3><p>按任务理解能力；工具可以替换，工作方法需要解释清楚。</p></div></div>
          <div className="career-skill-layers">{content.skills.map((layer, i) => <section key={layer.label}><span className="career-layer-mark" aria-hidden="true">{i + 1}</span><div><h4>{layer.label}</h4><div className="career-skill-tags">{layer.items.map(item => <span key={item}>{item}</span>)}</div><p>{layer.application}</p></div></section>)}</div>
          <section className="career-personal-evidence"><h3>我的准备情况</h3><p><strong>{current.skill}</strong> 相关材料：{evidence.length ? `${evidence.length} 项本人已确认记录` : '尚无本人已确认记录'}</p><p>材料记录用于回看已有依据；尚未记录的部分保留未知。</p><div className="career-inline-actions">{link('/assessment?tab=四维与差距', '查看本人材料与职业评估 →')}<button onClick={() => open('skill', {skill:current.skill, career:current.id})}>查看 {current.skill} 节点</button></div></section>
          <details className="career-context-note"><summary>学历、经验和资格如何判断？</summary><p>以目标岗位原文为准，区分必要条件、优先条件与可替代经历。这里的能力分层是学习参考，不是统一招聘门槛。</p>{link('/careers?tab=企业与岗位', '核对具体岗位条件 →')}</details>
        </>}
        {section === 'growth' && <>
          <div className="career-section-title"><div><h3>责任如何逐步扩大</h3><p>按任务范围和交付责任理解成长，不按年限自动晋级。</p></div></div>
          <ol className="career-growth-route">{content.growth.map(item => <li key={item.stage}><span className="career-growth-dot" aria-hidden="true"/><div><span className="career-growth-stage">{item.stage}</span><h4>{item.title}</h4><p>{item.description}</p></div></li>)}</ol>
          <div className="career-inline-actions">{link(`/career-map?tab=技能先修&career=${current.id}`, '打开技能路线与先修关系 →')}</div>
          <section className="career-related"><h3>也可以继续探索</h3><p>比较相邻工作的关注点，找到想进一步了解的任务。</p><div>{content.related.map(id => {const career = careers.find(item => item.id === id); return career && <div key={id}>{link(careerLink(id), `${career.name} →`)}<p>{career.task}</p></div>;})}</div></section>
        </>}
        {section === 'environment' && <>
          <div className="career-section-title"><div><h3>你会和谁一起完成工作</h3><p>连线表示任务中的信息交换，不代表组织汇报关系。</p></div></div>
          <figure className="career-collaboration"><div className="career-collaboration-center">{current.name}<span>围绕同一项交付协作</span></div><ul>{content.collaboration.map(item => <li key={item.role}><h4>{item.role}</h4><p>{item.exchange}</p></li>)}</ul><figcaption>典型协作示意 · 角色分工因团队而异</figcaption></figure>
          <div className="career-environment-notes"><section><h3>工作环境与边界</h3><p>{current.env}。</p><p>现场、远程、出差和值守安排，需要逐项核对具体岗位。</p></section><section><h3>需要澄清的常见误区</h3><CheckList items={content.pitfalls}/></section></div>
          <section className="career-personal-evidence"><h3>与自己的条件对照</h3><p>本人约束：<span translate="no">{s.preferences.constraint || '尚未记录'}</span>。生活约束不算能力缺陷。</p>{link('/settings', '修改本人偏好 →')}</section>
        </>}
        {section === 'practice' && <>
          <section className="career-practice-intro"><h3>{content.practice.title}</h3><p>{content.practice.brief}</p></section>
          <div className="career-practice-columns"><section><h3>动手步骤</h3><ol className="career-practice-steps">{content.practice.steps.map((step, i) => <li key={step}><span>{i + 1}</span><p>{step}</p></li>)}</ol></section><section className="career-practice-delivery"><h3>完成后留下</h3><p>{content.practice.deliverable}</p><h4>自查清单</h4><CheckList items={content.practice.checks}/></section></div>
          <div className="career-inline-actions">{link(`/career-map?tab=技能先修&career=${current.id}`, '选择学习或验证路径 →')}{link('/assessment?tab=资料经历', '整理已有实践材料 →')}</div><p className="career-context-caption">先了解练习，再在技能地图中选择具体内容；创建任务时仍需确认目标与时间预算。</p>
        </>}
      </div>
      <div className="career-profile-resources"><details><summary>内容来源与适用范围</summary><p>本页为职业认知与学习任务的原创整理；流程、产物和练习用于说明工作，不是本人经历或所有企业的统一标准。</p><p>参考 <a href={content.source.url} target="_blank" rel="noreferrer">{content.source.label} ↗</a> 的职业任务分类。成长与相关方向是探索参考，不保证晋级或转岗。</p><p>参考核对：2026-10-24 · 不同地区与岗位的学历、薪酬和工作条件请另行核对。</p></details><div className="career-job-link">{link('/careers?tab=企业与岗位', '研究企业与目标岗位 →')}{link('/careers?tab=企业与岗位&focus=salary', '核对岗位薪酬与条件 →')}</div></div>
      <footer className="career-detail-actions career-profile-actions"><div><h3>接下来，选一种探索方式</h3><p>先比较、做一次验证，或预览阶段目标。</p></div><div className="actions"><button onClick={() => toggleCompare(current.id)} aria-pressed={compared}>{compared ? '移出比较' : '加入比较'}</button><button className="primary" onClick={() => open('goal', {goal:current.id, reason:s.decision.reason || '', backup:s.backup || ''})}>预览目标选择</button></div></footer>
    </article>
    <CareerKnowledge career={current.id} link={link}/>
    <nav className="career-adjacent" aria-label="浏览其他职业">{index > 0 ? link(careerLink(careers[index - 1].id), `← ${careers[index - 1].name}`) : <span>已是第一个方向</span>}{index < careers.length - 1 ? link(careerLink(careers[index + 1].id), `${careers[index + 1].name} →`) : <span>已是最后一个方向</span>}</nav>
  </div>;
}
