import React from 'react';

// Authored vector diagrams: synthetic work samples, never personal analytics.
function WindowTop({x,y,width,label}){
 return <g><path d={`M${x} ${y+42}h${width}`} className="oa-rule"/><circle cx={x+20} cy={y+21} r="3"/><circle cx={x+33} cy={y+21} r="3"/><circle cx={x+46} cy={y+21} r="3"/><text x={x+68} y={y+27} className="oa-small">{label}</text></g>;
}

function DirectionArt(){return <>
 <g className="oa-base"><path d="M70 462H730M115 80V485M690 80V485" className="oa-guide"/>
  <rect x="74" y="104" width="338" height="256" rx="8" className="oa-paper"/><WindowTop x={74} y={104} width={338} label="数据分析"/>
  <path d="M106 318V183M106 318H372" className="oa-rule"/><rect x="127" y="254" width="36" height="64" className="oa-soft"/><rect x="181" y="220" width="36" height="98" className="oa-soft"/><rect x="235" y="239" width="36" height="79" className="oa-soft"/><rect x="289" y="186" width="36" height="132" className="oa-mid"/>
  <rect x="450" y="147" width="276" height="235" rx="8" className="oa-paper"/><WindowTop x={450} y={147} width={276} label="AI 应用"/>
  <rect x="476" y="214" width="168" height="40" rx="7" className="oa-soft"/><path d="M491 231h100M491 241h66" className="oa-rule"/>
  <rect x="520" y="270" width="178" height="69" rx="7" className="oa-white"/><path d="M535 288h116M535 302h136M535 316h83" className="oa-rule"/>
 </g>
 <path pathLength="1" d="M113 282L176 244L233 262L299 208L359 185M235 360V420H446V382" className="oa-trace"/>
 <g className="oa-build"><rect x="239" y="405" width="319" height="102" rx="5" className="oa-paper"/><path d="M269 429h19v34h-19zM274 436h9M274 444h9M274 452h6" className="oa-rule"/><text x="304" y="442" className="oa-label">SQL 课程项目</text><text x="304" y="470" className="oa-small">已有材料 · 本人贡献</text><path d="M305 489h220" className="oa-rule"/></g>
 <g className="oa-lens"><circle cx="379" cy="306" r="74" className="oa-lens-glass"/><circle cx="379" cy="306" r="63" className="oa-rule"/><path d="M431 359l58 60" className="oa-handle"/><path d="M332 315l29-25 24 12 36-38" className="oa-ink-line"/><circle cx="385" cy="302" r="5"/></g>
 <text x="76" y="69" className="oa-small">工作内容示意</text><text x="594" y="459" className="oa-small">比较 → 留下疑问</text>
 </>;}

function PracticeArt(){return <>
 <g className="oa-base"><path d="M62 462H742M102 82V490" className="oa-guide"/>
  <circle cx="236" cy="246" r="137" className="oa-paper"/><circle cx="236" cy="246" r="105" className="oa-ring-base"/>
  <path d="M236 141A105 105 0 1 1 145.1 298.5" className="oa-ring-time"/>
  <text x="236" y="240" textAnchor="middle" className="oa-time">3<tspan className="oa-hour"> h</tspan></text><text x="236" y="274" textAnchor="middle" className="oa-small">每周可用 · 合成预算</text>
  <path d="M236 99V141M327 298L363 319M145 298L109 319" className="oa-divider"/>
  <rect x="428" y="110" width="291" height="298" rx="6" className="oa-paper"/><WindowTop x={428} y={110} width={291} label="数据质量小项目"/>
  <path d="M453 181h16v16h-16zM453 229h16v16h-16zM453 277h16v16h-16z" className="oa-rule"/>
  <text x="488" y="195" className="oa-label">问题清单</text><text x="488" y="243" className="oa-label">处理理由</text><text x="488" y="291" className="oa-label">局限说明</text>
  <path d="M453 325h239M453 351h143M453 370h192" className="oa-rule"/>
 </g>
 <path pathLength="1" d="M372 246H412V246H453M457 188l5 5 11-13M457 236l5 5 11-13M457 284l5 5 11-13" className="oa-trace"/>
 <g className="oa-build"><rect x="135" y="420" width="510" height="73" rx="5" className="oa-paper"/><rect x="154" y="441" width="298" height="11" rx="2" className="oa-ink"/><rect x="461" y="441" width="161" height="11" rx="2" className="oa-soft"/><text x="154" y="478" className="oa-small">计划 2h</text><text x="518" y="478" className="oa-small">余量 1h</text></g>
 <text x="80" y="68" className="oa-small">给一次尝试，划清边界</text>
 </>;}

function ReportArt(){return <>
 <g className="oa-base"><path d="M61 466H737M700 67V500" className="oa-guide"/>
  <rect x="75" y="109" width="174" height="106" rx="5" className="oa-paper"/><text x="96" y="142" className="oa-label">选择依据</text><path d="M96 165h127M96 182h93" className="oa-rule"/>
  <rect x="62" y="238" width="187" height="106" rx="5" className="oa-paper"/><text x="83" y="272" className="oa-label">实践产物</text><path d="M83 294h141M83 311h104" className="oa-rule"/>
  <rect x="89" y="369" width="160" height="92" rx="5" className="oa-paper"/><text x="110" y="400" className="oa-label">复盘疑问</text><path d="M110 423h111M110 439h75" className="oa-rule"/>
  <path d="M249 161H285V285H326M249 291H326M249 414H285V298H326" className="oa-rule"/>
  <rect x="355" y="84" width="332" height="422" rx="4" className="oa-sheet-back"/>
  <rect x="338" y="72" width="332" height="422" rx="4" className="oa-paper"/>
  <path d="M368 124h270M368 411h270" className="oa-rule"/><text x="368" y="108" className="oa-small">探索记录 / 合成示例</text>
  <text x="368" y="171" className="oa-report-title">我的数据分析</text><text x="368" y="209" className="oa-report-title">探索报告</text>
  <rect x="368" y="242" width="111" height="139" className="oa-soft"/><path d="M388 359V306M411 359V285M434 359V323M457 359V268" className="oa-chart"/>
  <path d="M503 254h116M503 276h135M503 298h95M503 337h135M503 359h112" className="oa-rule"/>
  <text x="368" y="446" className="oa-small">依据 · 行动 · 下一步</text>
 </g>
 <path pathLength="1" d="M249 161H285V285H326M249 291H326M249 414H285V298H326M379 359L410 322L436 341L465 288" className="oa-trace"/>
 <g className="oa-build"><rect x="531" y="382" width="205" height="99" rx="5" className="oa-paper"/><text x="550" y="416" className="oa-label">保留未知</text><path d="M550 438h164M550 456h117" className="oa-rule"/></g>
 </>;}

export default function OutcomeArtwork({index}){
 return <svg className="os-art" viewBox="0 0 800 560" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g>{index===0?<DirectionArt/>:index===1?<PracticeArt/>:<ReportArt/>}</g></svg>;
}
