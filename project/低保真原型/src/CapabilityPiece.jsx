import React from 'react';
import {puzzleCell, puzzlePiecePath} from './capability-puzzle-model.js';

export function CapabilitySkillIcon({name}) {
  let drawing;
  if (/Git|版本/i.test(name)) drawing = <><circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="19" r="2.5"/><path d="M6 7.5v9M6 10c0 5 12 5 12-1.5"/></>;
  else if (/SQL|数据库|建模|存储/i.test(name)) drawing = <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></>;
  else if (/表格|数据处理|数据清洗/.test(name)) drawing = <><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 10h18M9 4v16m6-10v10"/></>;
  else if (/部署|Linux|服务器|环境|运维/i.test(name)) drawing = <><rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M12 6.5h5m-5 11h5"/></>;
  else if (/质量|安全|权限|控制|风险|加固/.test(name)) drawing = <><path d="m12 2 8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5Z"/><path d="m8 12 3 3 5-6"/></>;
  else if (/错误|调试|缺陷/.test(name)) drawing = <><rect x="8" y="7" width="8" height="13" rx="4"/><path d="M10 7V5a2 2 0 0 1 4 0v2M4 10h4m8 0h4M3 15h5m8 0h5M5 21l4-3m6 0 4 3M12 11v5"/></>;
  else if (/实验|试验/.test(name)) drawing = <><path d="M9 3h6m-5 0v6l-6 10a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L14 9V3M7 15h10"/><path d="M10 18h.01M14 19h.01"/></>;
  else if (/检索|搜索|查找/.test(name)) drawing = <><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M7 10h6m-3-3v6"/></>;
  else if (/评估|测试|验证|检查/.test(name)) drawing = <><rect x="5" y="4" width="15" height="18" rx="2.5"/><path d="M9 4V2h7v2M8 10l1.5 1.5L12 9m2 2h3M8 16l1.5 1.5L12 15m2 2h3"/></>;
  else if (/MLOps|流程|自动化|持续|协作/i.test(name)) drawing = <><rect x="2" y="3" width="7" height="6" rx="1.5"/><rect x="15" y="15" width="7" height="6" rx="1.5"/><rect x="2" y="15" width="7" height="6" rx="1.5"/><path d="M5.5 9v6M9 6h9.5v9M9 18h6"/></>;
  else if (/Python|Java|编程|代码|脚本|接口|API|算法/i.test(name)) drawing = <><rect x="2" y="3" width="20" height="18" rx="3"/><path d="m8 9-3 3 3 3m8-6 3 3-3 3m-3-8-2 10"/></>;
  else if (/统计|指标/.test(name)) drawing = <><path d="M3 3v18h18M7 17v-5m5 5V7m5 10v-8"/><path d="m6 8 5-4 6 1 4-3"/></>;
  else if (/图表|可视化|表达/.test(name)) drawing = <><path d="M3 3v18h18m-15-7 5-5 4 3 6-7"/><circle cx="11" cy="9" r="1.4"/></>;
  else if (/模型|学习|智能/.test(name)) drawing = <><circle cx="12" cy="4" r="2.4"/><circle cx="4" cy="11" r="2.4"/><circle cx="20" cy="11" r="2.4"/><circle cx="8" cy="20" r="2.4"/><circle cx="17" cy="20" r="2.4"/><path d="m10 6-4 3m8-3 4 3M5 13l2 5m12-5-1 5M10.5 20h4m-9-9h12"/></>;
  else drawing = <><circle cx="12" cy="12" r="9"/><path d="m16 8-3 6-5 2 2-6Zm-4-5v2m0 14v2M1 12h2m18 0h2"/></>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawing}</svg>;
}

export default function CapabilityPiece({skill, index, rows, padding, uid, has, selected, onSelect, onNavigate}) {
  const row = Math.floor(index / puzzleCell.columns), column = index % puzzleCell.columns;
  const path = puzzlePiecePath(row, column, rows), clip = uid + '-piece-' + index;
  return <g className="capability-piece" transform={`translate(${padding + column * puzzleCell.width} ${padding + row * puzzleCell.height})`}
    data-capability-id={skill.id} data-piece-index={index} data-mastered={has}
    role="button" tabIndex={selected ? 0 : -1} aria-pressed={selected}
    aria-label={skill.name + ' · ' + (has ? '已掌握' : '未掌握')} aria-controls={uid + '-detail'}
    onClick={() => onSelect(skill.id)} onFocus={() => onSelect(skill.id)}
    onPointerDown={event => {if (event.button === 0) event.currentTarget.focus({preventScroll: true});}}
    onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); onSelect(skill.id);}
      else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {event.preventDefault(); onNavigate(index, event.key);}
    }}>
    <defs><clipPath id={clip}><path d={path}/></clipPath></defs>
    <g className="capability-piece-visual">
    <path className="capability-piece-shape" d={path}/>
    <g className="capability-piece-decoration" clipPath={`url(#${clip})`} aria-hidden="true">
      {index % 3 === 0 ? <circle className="capability-decor-fill" cx="170" cy="4" r="30"/>
        : index % 3 === 1 ? <g className="capability-decor-lines"><path d="M143 7a22 22 0 0 0 25 25M151 6a14 14 0 0 0 18 18"/></g>
          : <rect className="capability-decor-fill" x="146" y="6" width="27" height="27" rx="8" transform="rotate(16 160 20)"/>}
      <g className="capability-decor-dots">{[0,1,2].map(x => [0,1,2].map(y => <circle key={x + '-' + y} cx={17 + x * 6} cy={98 + y * 6} r="1.1"/>))}</g>
    </g>
    <path className="capability-piece-wash" d={path}/>
    <path className="capability-piece-selected" d={path} clipPath={`url(#${clip})`}/>
    <path className="capability-keyboard-focus" d={path}/>
    <foreignObject x="14" y="11" width={puzzleCell.width - 28} height={puzzleCell.height - 22} aria-hidden="true">
      <div xmlns="http://www.w3.org/1999/xhtml" className="capability-piece-copy">
        <span className="capability-skill-icon"><CapabilitySkillIcon name={skill.name}/></span>
        <strong>{skill.name}</strong>
        <span className="capability-piece-status"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true">{has ? <path d="m3.5 8 3 3 6-6"/> : <circle cx="8" cy="8" r="4.5"/>}</svg><span>{has ? '已掌握' : '未掌握'}</span></span>
      </div>
    </foreignObject>
    </g>
  </g>;
}
