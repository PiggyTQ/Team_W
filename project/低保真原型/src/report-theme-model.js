export const reportThemes=[
 {id:'choice',title:'定位与选择',description:'把个人起点、目标理由与候选取舍放在一起看。',chapters:['个人概览与资料范围','目标与理由','候选与取舍']},
 {id:'evidence',title:'目标与依据',description:'对照职业要求、现有材料与仍待核对的差距。',chapters:['职业要求与范围','四维依据','材料与差距']},
 {id:'action',title:'路线与行动',description:'让探索路线、投入安排和实际产物形成对应。',chapters:['职业桥接与技能路线','计划与预算','行动与成果']},
 {id:'review',title:'复盘与边界',description:'保留调整记录，也讲清这份报告能够支持的范围。',chapters:['复盘与调整','引用与局限']}
];
const compositeThemes=[
 {id:'background',title:'已完成项目与能力背景',description:'项目、确认材料与教育背景。',chapters:['已完成项目与能力背景']},
 {id:'recommendation',title:'推荐岗位与匹配依据',description:'结合现有材料与工作偏好核对岗位。',chapters:['推荐岗位与匹配依据']},
 {id:'requirements',title:'岗位工作特点与所需能力',description:'岗位任务、协作方式和能力要求。',chapters:['岗位工作特点与所需能力']},
 {id:'projects',title:'建议补充的项目',description:'针对材料缺口补充成果，再回目标计划安排。',chapters:['建议补充的项目']},
 {id:'limits',title:'引用与局限',description:'报告采用的资料范围与匹配方式。',chapters:['引用与局限']}
];
export function groupReportRows(rows){
 if(rows.some(row=>compositeThemes.slice(0,4).some(theme=>theme.chapters.includes(row.title)))){const groups=compositeThemes.map(theme=>({...theme,rows:rows.filter(row=>theme.chapters.includes(row.title))})).filter(theme=>theme.rows.length);const extra=rows.filter(row=>!compositeThemes.some(theme=>theme.chapters.includes(row.title)));return extra.length?[...groups,{id:'extra',title:'补充记录',description:'保留人工补充与自定义章节的原文。',chapters:extra.map(row=>row.title),rows:extra}]:groups;}
 const groups=reportThemes.map(g=>({...g,rows:rows.filter(r=>g.chapters.includes(r.title))})).filter(g=>g.rows.length);
 const extra=rows.filter(r=>!reportThemes.some(g=>g.chapters.includes(r.title)));
 return extra.length?[...groups,{id:'extra',title:'补充记录',description:'保留人工补充与自定义章节的原文。',chapters:extra.map(r=>r.title),rows:extra}]:groups;
}
export const reportPanelSlot=title=>({'个人概览与资料范围':'start','目标与理由':'goal','候选与取舍':'choices','职业要求与范围':'requirements','四维依据':'dimensions','材料与差距':'materials','职业桥接与技能路线':'route','计划与预算':'budget','行动与成果':'practice','复盘与调整':'reflection','引用与局限':'limits'}[title]||'extra');
