import {normalizeLessonState} from './skill-lesson-sequence.js';
export const WORK_PREFIX='SKILL_WORK_20261120\n';
export const PRACTICE_MODES=['guided','debug','independent'];
const sections=['concept','method','examples','mistakes','sources'];
const str=(x,max=7500)=>typeof x==='string'?x.slice(0,max):'';
export function readSkillWork(draft=''){
 if(!draft.startsWith(WORK_PREFIX))return {artifact:draft,reflection:'',section:'concept'};
 try{
  const v=JSON.parse(draft.slice(WORK_PREFIX.length));
  const result={artifact:str(v.artifact),reflection:str(v.reflection,1600),section:sections.includes(v.section)?v.section:'concept',answers:v.answers&&typeof v.answers==='object'?Object.fromEntries(Object.entries(v.answers).filter(([k,t])=>['q1','q2','application'].includes(k)&&typeof t==='string'&&t.length<=400)): {}};
  const lessonState=normalizeLessonState(v.lessonState);if(Object.keys(lessonState).length)result.lessonState=lessonState;
  if(Number.isInteger(v.checkVersion)&&v.checkVersion>=1&&v.checkVersion<=999)result.checkVersion=v.checkVersion;
  if(v.tasks&&typeof v.tasks==='object'){
   result.practiceMode=PRACTICE_MODES.includes(v.practiceMode)?v.practiceMode:'independent';
   result.tasks=Object.fromEntries(PRACTICE_MODES.filter(m=>v.tasks[m]).map(m=>[m,normalizeTask(v.tasks[m])]));
   if(v.legacy)result.legacy={artifact:str(v.legacy.artifact,60000),reflection:str(v.legacy.reflection,1600)};
  }
  return result;
 }catch{return {artifact:draft,reflection:'',section:'concept'};}
}
export function readLearningWork(draft,version,kind='text'){
 const w=readSkillWork(draft);if(!(version>1&&w.checkVersion!==version))return w;
 const next=ensurePracticeTasks(w,kind),task=next.tasks.independent;
 if(task&&task.kind!==kind)next.tasks={...next.tasks,independent:normalizeTask({...task,kind,check:undefined,reviewed:false})};
 return {...next,answers:{},checkVersion:version};
}
export function normalizeTask(t={}){
 const fields=t.fields&&typeof t.fields==='object'?Object.fromEntries(Object.entries(t.fields).filter(([k,v])=>/^[a-z][A-Za-z0-9-]{0,24}$/.test(k)&&typeof v==='string').slice(0,16).map(([k,v])=>[k,str(v,1000)])):{};
 return {kind:['sql','decision','handoff','alert','text','code'].includes(t.kind)?t.kind:'text',artifact:str(t.artifact),reflection:str(t.reflection,1600),fields,hints:Array.isArray(t.hints)?[...new Set(t.hints.filter(h=>['start','method','reference'].includes(h)))]:[],reviewed:!!t.reviewed,
  ...(t.check&&typeof t.check==='object'?{check:{kind:str(t.check.kind,30),passed:!!t.check.passed,issues:Array.isArray(t.check.issues)?t.check.issues.filter(x=>typeof x==='string').slice(0,12):[]}}:{}),
  ...(t.output&&Array.isArray(t.output.columns)&&Array.isArray(t.output.rows)?{output:{columns:t.output.columns.slice(0,12).map(x=>str(x,80)),rows:t.output.rows.slice(0,20).map(r=>r.slice(0,12).map(x=>x==null?null:typeof x==='number'?x:str(x,200))),truncated:!!t.output.truncated,engine:str(t.output.engine,40)}}:{})};
}
export function ensurePracticeTasks(work,kind='text'){
 if(work.tasks)return work;
 return {...work,practiceMode:'independent',legacy:{artifact:work.artifact,reflection:work.reflection},tasks:{independent:normalizeTask({kind,artifact:['sql','text','code'].includes(kind)?work.artifact:'',reflection:work.reflection})}};
}
export function updatePracticeTask(work,mode,patch,kind='text'){
 const base=ensurePracticeTasks(work,kind),previous=base.tasks[mode]||normalizeTask({kind});
 const edits=patch.artifact!==undefined||patch.fields!==undefined;
 const task=normalizeTask({...previous,...(edits?{check:undefined,output:undefined,reviewed:false}:{}),...patch,kind});
 const next={...base,practiceMode:mode,tasks:{...base.tasks,[mode]:task}};
 if(mode==='independent'){next.artifact=practiceArtifact(task);next.reflection=task.reflection;}
 return next;
}
export function practiceArtifact(t){
 if(t.kind==='decision')return ['Decision table',...Object.entries(t.fields).map(([k,v])=>k+': '+v)].join('\n');
 if(t.kind==='alert')return Object.entries(t.fields).map(([k,v])=>k+': '+v).join('\n');
 if(t.kind==='handoff')return Object.entries(t.fields).map(([k,v])=>k+': '+v).join('\n');
 return t.artifact;
}
export function writeSkillWork(work){
 if(work.tasks){
  const value={...work,tasks:Object.fromEntries(Object.entries(work.tasks).map(([m,t])=>[m,normalizeTask(t)]))};
  const encoded=WORK_PREFIX+JSON.stringify(value);
  if(encoded.length>60000)throw Object.assign(new Error('WORKSPACE_TOO_LARGE'),{code:'WORKSPACE_TOO_LARGE'});
  return encoded;
 }
 const lessonState=normalizeLessonState(work.lessonState);
 const value={artifact:work.artifact.slice(0,7500),reflection:work.reflection.slice(0,1600),section:work.section,answers:work.answers||{},...(Object.keys(lessonState).length?{lessonState}:{}),...(work.checkVersion?{checkVersion:work.checkVersion}:{})};
 const encoded=WORK_PREFIX+JSON.stringify(value);
 if(encoded.length>60000)throw Object.assign(new Error('WORKSPACE_TOO_LARGE'),{code:'WORKSPACE_TOO_LARGE'});
 return encoded;
}
export function skillPreparation(record,workOverride){
 const w=workOverride||readSkillWork(record?.draft),task=w.tasks?.independent;
 const artifact=w.artifact.trim().length>=40,reflection=w.reflection.trim().length>=20;
 const reviewed=!w.tasks||!!task?.reviewed;
 const checked=!task||!['sql','decision','handoff','alert'].includes(task.kind)||!!task.check?.passed;
 return {read:!!record?.read,artifact,reflection,reviewed,checked,ready:!!record?.read&&artifact&&reflection&&reviewed&&checked};
}
export function skillLearningScene(mode,step){return mode==='overview'?'overview':step==='check'?'assessment':'lesson';}
