import React from 'react';
import {usedHours} from './model';
import InvestigationFields from './InvestigationFields';

export function TaskPrecheckFields({s,data,input,area,select,change}){
  return <section className="focused-intake task-precheck-fields" aria-label="核对本次行动">
    <div className="intake-purpose"><h3>先核对这次做什么、投入多少</h3><p>已有内容可以直接修改；补充信息按需展开。</p></div>
    <dl className="intake-budget"><div><dt>本周总预算</dt><dd>{s.budget??'未定'}{s.budget!=null&&' 小时'}</dd></div><div><dt>已安排</dt><dd>{usedHours(s)} 小时</dd></div><div><dt>本次预计</dt><dd>{data.hours??'未定'}{data.hours!=null&&' 小时'}</dd></div></dl>
    {input('行动标题','title')}
    {area('为什么做 / 要回答的问题','purpose')}
    <div className="intake-delivery">{input('交付物与退出条件','product')}{input('预计投入（本周期小时）','hours','number')}</div>
    <details className="intake-disclosure"><summary>归属、活动与实践方式 <small>{data.association} · {data.kind}</small></summary><div className="intake-expanded">
      <div className="intake-pair">{select('归属（无主目标可独立）','association',['独立探索','主计划'])}{select('活动类型','kind',['本人记录的外部行动','原创模拟实践','自主学习'])}</div>
      <InvestigationFields data={data} change={change}/>
    </div></details>
  </section>;
}

export function JobResearchFields({data,input,area,select,careers}){
  return <section className="focused-intake job-research-fields" aria-label="岗位研究内容">
    <div className="intake-purpose"><h3>先保存岗位名称和要求原文</h3><p>这两项必填，其余信息可稍后补充；保存前请确认本地使用范围。</p></div>
    {input('岗位研究标题','title')}
    {area('本人允许处理的要求原文','text')}
    {select('对应职业方向','career',careers.map(c=>[c.id,c.name]))}
    <details className="intake-disclosure"><summary>企业、地点与来源 <small>选填 · {data.company||'企业未知'} · {data.location||'地点未知'}</small></summary><div className="intake-expanded">
      {input('企业 / 组织（未知可留空，不自动合并）','company')}
      <div className="intake-pair">{input('地点（未知保留）','location')}{select('工作形式','form',['未知','现场','远程','混合'])}</div>
      {input('来源说明 / URL（可留空）','source')}
      {input('资料日期（不等于在招核验）','date','date')}
    </div></details>
    <details className="intake-disclosure"><summary>研究状态、笔记与薪酬 <small>{data.status||'收藏'} · 选填</small></summary><div className="intake-expanded">
      {select('研究准备状态（与申请事件无关）','status',['收藏','调研中','准备','暂停','归档'])}
      {area('关注理由和私人笔记','note')}
      {input('薪酬原文（可空，不能推算）','salaryRaw')}
    </div></details>
  </section>;
}
