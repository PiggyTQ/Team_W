import {normalizeReportPlanRecords} from './career-report-model.js';

const array=value=>Array.isArray(value)?value:[];
const clone=value=>JSON.parse(JSON.stringify(value));
const pick=(record,fields)=>Object.fromEntries(fields.filter(field=>record[field]!==undefined).map(field=>[field,clone(record[field])]));
const byId=records=>records.sort((left,right)=>String(left.id)<String(right.id)?-1:String(left.id)>String(right.id)?1:0);
const educationFields=['id','version','withdrawnThrough','status','school','major','degree','courses','gpa','ranking','start','end','ongoing'];
const uploadFields=['id','createdAt','title','description','contribution','career','completed'];
const taskFields=['id','version','title','template','career','skill','skills','status','completed','mode','purpose','standard','hours','due','check','note','draft','contribution'];
const attemptFields=['id','version','text','contribution','result','feedback','aid','date','courseVersion'];
const claimFields=['id','version','status','title','text','contribution','skill','skills','supportScope','artifactLocation','aid','type'];
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
 ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const short=(value,max)=>typeof value==='string'?value.slice(0,max):clone(value);
const shortened=(record,fields,max)=>Object.fromEntries(fields.filter(field=>record[field]!==undefined).map(field=>[field,short(record[field],max)]));

// Synchronous cross-runtime change detector, not an authentication or security
// digest. The server separately binds the complete preview with SHA-256.
// Hash every UTF-16 code unit, including the portion beyond display excerpts.
function changeSignature(value){
 const serialized=JSON.stringify(canonical(value));let left=2166136261,right=2246822519;
 for(let index=0;index<serialized.length;index++){
  const unit=serialized.charCodeAt(index);left=Math.imul(left^unit,16777619);right=Math.imul(right^unit,3266489917);
 }
 return 'change-v1:'+serialized.length+':'+(left>>>0).toString(16).padStart(8,'0')+(right>>>0).toString(16).padStart(8,'0');
}

// Keep only current source facts. In particular, reconfirmed education must not
// bring its withdrawn history or an uploaded file's body into a report snapshot.
export function captureCareerReportSources(s,{uploads=s.reportSources?.uploads,planRecords=s.reportSources?.planRecords}={}){
 const education=byId(array(s.education).filter(record=>record.status==='已确认').map(record=>pick(record,educationFields)));
 const projects=byId(array(uploads).map(record=>({...pick(record,uploadFields),file:pick(record.file||{},['name','type','size'])})));
 const goals=normalizeReportPlanRecords(planRecords);
 if(goals)byId(goals.goals);
 const tasks=byId(array(s.tasks).map(task=>({...pick(task,taskFields),
  ...(task.atlas?{atlas:pick(task.atlas,['skill','career'])}:{}),
  attempts:array(task.attempts).map(attempt=>pick(attempt,attemptFields))})));
 const claims=byId(array(s.claims).filter(record=>record.status==='已确认').map(record=>pick(record,claimFields)));
 const preferences=s.preferences||{};
 return {
  version:2,
  signatures:{preferences:changeSignature(preferences),education:changeSignature(education),uploads:changeSignature(projects),planRecords:changeSignature(goals),tasks:changeSignature(tasks),claims:changeSignature(claims)},
  preferences:{...shortened(preferences,['intent','stage','interest','location','constraint','interestType','interestGroup'],160),...(preferences.capabilityMastery?{capabilityMastery:clone(preferences.capabilityMastery)}:{})},
  education:education.slice(0,20).map(record=>shortened(record,educationFields,80)),
  educationRefs:education.map(record=>({id:record.id,version:record.version??null,withdrawnThrough:record.withdrawnThrough||0})),
  uploads:projects.map(record=>({...pick(record,['id','createdAt','career','completed']),...shortened(record,['title'],48),...shortened(record,['description','contribution'],32)})),
  uploadRefs:projects.map(record=>({id:record.id,createdAt:record.createdAt??null})),
  planRecords:goals?{version:1,goals:goals.goals.map(record=>({...pick(record,['id','period','periodStart','due','progress','priority']),title:short(record.title,64)}))}:null,
  tasks:tasks.slice(0,40).map(record=>pick(record,['id','version','status','completed'])),
  counts:{education:education.length,uploads:projects.length,tasks:tasks.length,claims:claims.length}
 };
}

const validSnapshot=value=>[1,2].includes(value?.version)&&Array.isArray(value.educationRefs)&&Array.isArray(value.uploadRefs)
 &&Array.isArray(value.education)&&Array.isArray(value.uploads)&&Array.isArray(value.tasks)&&!!value.preferences
 &&(value.version===1||['preferences','education','uploads','planRecords','tasks','claims'].every(key=>typeof value.signatures?.[key]==='string'&&/^change-v1:\d+:[a-f0-9]{16}$/.test(value.signatures[key])));

// Additional retained references protect manually retained historical sections,
// but do not make a freshly saved merge stale against its current source facts.
export function careerReportSourcesKey(snapshot){
 if(!validSnapshot(snapshot))return null;
 const {educationRefs,uploadRefs,...facts}=snapshot;
 return JSON.stringify(canonical(facts));
}

export function careerReportSourcesChanged(s,snapshot,options){
 if(!validSnapshot(snapshot))return true;
 try{return careerReportSourcesKey(snapshot)!==careerReportSourcesKey(captureCareerReportSources(s,options));}
 catch{return true;}
}

export function careerReportSourcesUnavailable(s,report){
 if(report?.format!=='career-report-v1')return false;
 const snapshot=report.compositeSources,current=s.reportSources;
 // Never interpret a failed or pending independent read as an empty collection.
 // A saved report can contain the deleted source's full text, not just its ID.
 if(!validSnapshot(snapshot)||current?.status!=='ready'||current.planError||!Array.isArray(current.uploads))return true;
 try{normalizeReportPlanRecords(current.planRecords);}catch{return true;}
 if(snapshot.educationRefs.some(ref=>{
  const record=array(s.education).find(item=>item.id===ref.id&&item.status==='已确认');
  return !record||(record.withdrawnThrough>0&&(!ref.version||ref.version<=record.withdrawnThrough));
 }))return true;
 return snapshot.uploadRefs.some(ref=>!current.uploads.some(item=>item.id===ref.id&&(ref.createdAt===null||item.createdAt===ref.createdAt)));
}
