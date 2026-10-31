export const reportThemes=[
 {id:'choice',title:'定位与选择',description:'把个人起点、目标理由与候选取舍放在一起看。',chapters:['个人概览与资料范围','目标与理由','候选与取舍']},
 {id:'evidence',title:'目标与依据',description:'对照职业要求、现有材料与仍待核对的差距。',chapters:['职业要求与范围','四维依据','材料与差距']},
 {id:'action',title:'路线与行动',description:'让探索路线、投入安排和实际产物形成对应。',chapters:['职业桥接与技能路线','计划与预算','行动与成果']},
 {id:'review',title:'复盘与边界',description:'保留调整记录，也讲清这份报告能够支持的范围。',chapters:['复盘与调整','引用与局限']}
];
export function groupReportRows(rows){
 const groups=reportThemes.map(g=>({...g,rows:rows.filter(r=>g.chapters.includes(r.title))})).filter(g=>g.rows.length);
 const extra=rows.filter(r=>!reportThemes.some(g=>g.chapters.includes(r.title)));
 return extra.length?[...groups,{id:'extra',title:'补充记录',description:'保留人工补充与自定义章节的原文。',chapters:extra.map(r=>r.title),rows:extra}]:groups;
}
export const reportPanelSlot=title=>({'个人概览与资料范围':'start','目标与理由':'goal','候选与取舍':'choices','职业要求与范围':'requirements','四维依据':'dimensions','材料与差距':'materials','职业桥接与技能路线':'route','计划与预算':'budget','行动与成果':'practice','复盘与调整':'reflection','引用与局限':'limits'}[title]||'extra');
