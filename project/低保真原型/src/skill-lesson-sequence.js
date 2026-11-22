// Legacy section IDs remain valid for saved positions and assessment review links.
export function lessonSections(skillKey,hasLab=false){
 if(skillKey==='ops:four-signals')return ['concept','examples','mistakes'];
 if(skillKey==='testing:decision-tables')return ['concept','method','mistakes','sources'];
 if(skillKey==='security:incident-handoff')return ['concept','examples','mistakes','sources'];
 if(skillKey==='data:sql-joins')return ['concept','method','examples','mistakes','sources'];
 return hasLab?['concept','method','examples','mistakes']:['concept','method','mistakes'];
}
export function resolveLessonSection(skillKey,section,hasLab=false){
 const ids=lessonSections(skillKey,hasLab);if(ids.includes(section))return section;
 if(skillKey==='ops:four-signals')return section==='method'?'concept':'mistakes';
 if(skillKey==='testing:decision-tables')return 'method';
 if(skillKey==='security:incident-handoff')return 'concept';
 return section==='examples'?'method':'mistakes';
}
export function normalizeLessonState(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 return Object.fromEntries(Object.entries(value).filter(([k,v])=>/^[a-z][A-Za-z0-9]{0,39}$/.test(k)&&(typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)||typeof v==='string')).slice(0,40).map(([k,v])=>[k,typeof v==='string'?v.slice(0,2500):v]));
}
