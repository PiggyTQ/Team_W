import React from 'react';
import ProductIcon from './ProductIcon';
import {displayPublicText} from './i18n/render';
import './career-journey.css';

const assessmentLabels={saved:'评估已保存',stale:'评估待更新',missing:'尚未保存评估'};
const excerpt=(value,limit=220)=>value.length>limit?value.slice(0,limit)+'…':value;

function Stage({icon,title,to,link,children}) {
  return <li>
    <i className="career-journey-icon"><ProductIcon name={icon} size={23} accent={false}/></i>
    <h3>{link(to,<>{title} <ProductIcon name="arrow" size={14}/></>)}</h3>
    <div>{children}</div>
  </li>;
}

export function CareerJourneyStages({journey,link}) {
  const {assessment,plan,practice,outcomes}=journey;
  return <>
    {plan.goal&&<div className="career-journey-goal">
      <span>当前主目标</span><strong>{displayPublicText(plan.goal)}</strong>
      {plan.reason&&<p translate="no">{excerpt(plan.reason)}</p>}
    </div>}
    <ol className="career-journey-stages">
      <Stage icon="clipboard" title="个人评估" to="/assessment" link={link}>
        <p><strong>{assessment.confirmed}</strong> <span>项已确认材料</span></p>
        <p>{assessmentLabels[assessment.status]}</p>
      </Stage>
      <Stage icon="target" title="目标计划" to="/plan" link={link}>
        {plan.goal?<p><strong>{plan.related}</strong> <span>项同方向待完成行动</span></p>:<p>尚未设置主目标</p>}
        {plan.weeklyHours!==null&&<p><span>每周预计投入</span> <strong>{plan.weeklyHours}</strong> <span>小时</span></p>}
        {!plan.goal&&plan.active>0&&<p><strong>{plan.active}</strong> <span>项未完成行动</span></p>}
      </Stage>
      <Stage icon="book" title="学习实践" to="/learning" link={link}>
        <p><strong>{practice.reading}</strong> <span>个项目有阅读记录</span></p>
        {practice.passed!==null&&<p>{link('/career-map',<><strong>{practice.passed}</strong> <span>项通过技能检验</span></>)}</p>}
      </Stage>
      <Stage icon="folder" title="成果与复盘" to="/learning?tab=我的资源" link={link}>
        <p><strong>{outcomes.total}</strong> <span>项已完成成果</span></p>
        <p>{link('/plan?tab=复盘',<><strong>{outcomes.reviewed}</strong> <span>项已复盘行动</span></>)}</p>
      </Stage>
    </ol>
  </>;
}

