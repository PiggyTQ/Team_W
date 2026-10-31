import React from 'react';
const choices=['SQL','Python','日志分析','Linux','JavaScript','Java'];
export default function SkillPicker({draft,change,allowUnknown=false}){
 const other=!choices.includes(draft.skill)&&(!allowUnknown||!['未知',''].includes(draft.skill)),custom=other&&!['未知','其他',''].includes(draft.skill)?draft.skill:'';
 return <div className="skill-picker"><label className="field"><span>关联技能（本人选择，非自动判断）</span><select aria-label="关联技能（本人选择，非自动判断）" value={allowUnknown&&['未知',''].includes(draft.skill)?'未知':other?'其他':draft.skill} onChange={e=>change({...draft,skill:e.target.value==='其他'?(allowUnknown?'其他':'未知'):e.target.value})}>{allowUnknown&&<option value="未知">暂不关联（可稍后补充）</option>}{[...choices,'其他'].map(x=><option key={x}>{x}</option>)}</select></label>{other&&<label className="field"><span>其他技能名称（可选）</span><input aria-label="其他技能名称（可选）" value={custom} maxLength={80} onChange={e=>change({...draft,skill:e.target.value||(allowUnknown?'其他':'未知')})} placeholder="如：Figma、需求记录"/><small>留空时不推断技能，已有材料的未知状态仍保留。</small></label>}</div>;
}
