import {KEY, fresh} from './model.js';

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const own=(value,key)=>Object.hasOwn(value,key);
const invalid=()=>{throw new TypeError('Invalid prototype state');};
const string=value=>{if(typeof value!=='string')invalid();return value;};
const number=value=>{if(typeof value!=='number'||!Number.isFinite(value))invalid();return value;};
const numeric=value=>{if(value!==null&&value!==''&&(typeof value!=='number'&&typeof value!=='string'||!Number.isFinite(Number(value))))invalid();return value;};
const bool=value=>{if(typeof value!=='boolean')invalid();return value;};
const list=(value,item)=>{if(!Array.isArray(value))invalid();return value.map(item);};
const strings=value=>list(value,string);
const records=(value,normalize,identified=true)=>{
  const ids=new Set();
  return list(value,item=>{
    if(!object(item))invalid();
    if(identified){if(typeof item.id!=='string'||!item.id.trim()||ids.has(item.id))invalid();ids.add(item.id);}
    return normalize(item);
  });
};

// Missing fields can belong to an earlier schema-1 build. Present fields of the
// wrong type are never silently discarded, coerced, or replaced with demo facts.
function fields(value,defaults={},types={}){
  if(!object(value))invalid();
  const result={...defaults,...Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined))};
  for(const [key,fallback] of Object.entries(defaults)){
    const validator=types[key]||(typeof fallback==='string'?string:typeof fallback==='boolean'?bool:typeof fallback==='number'?number:null);
    if(own(value,key)&&value[key]!==undefined&&validator)validator(value[key]);
  }
  for(const [key,validator] of Object.entries(types))if(own(value,key)&&value[key]!==undefined)result[key]=validator(value[key]);
  return result;
}
const textTypes=keys=>Object.fromEntries(keys.split(' ').filter(Boolean).map(key=>[key,string]));
const history=value=>records(value,item=>checkedRecord(item),false);
const refs=value=>records(value,item=>fields(item,{}, {version:value=>value===null?value:number(value)}));

function checkedRecord(value,defaults={},types={}){
  const result=fields(value,defaults,{
    ...textTypes('id title text body contribution aid type status origin skill purpose note draft check claimStatus standard reflection due learningStage priority placementReason reason question result feedback next date updatedAt createdAt company location form source school major degree courses gpa ranking start end name email phone city portfolio mode action object reply fileName target fingerprint help supportScope artifactLocation'),
    version:number,history,claimIds:strings,candidateIds:strings,educationIds:strings,dependsOn:strings,
    claimRefs:refs,claimSnapshots:value=>records(value,claim),reviewRefs:refs,
    ...types
  });
  return result;
}
function claim(value){return checkedRecord(value,{title:'',text:'',contribution:'',skill:'未知',aid:'未说明',status:'待确认',version:1});}
function attempt(value){return checkedRecord(value,{text:'',contribution:'',aid:'未说明',result:'待检查',feedback:'',version:1});}
function task(value){return checkedRecord(value,{title:'',purpose:'',note:'',draft:'',contribution:'',aid:'未说明',standard:'',check:'未检查',claimStatus:'未形成候选',completed:false,selfcheck:false,version:1,attempts:[],dependsOn:[]},{hours:numeric,completed:bool,selfcheck:bool,attempts:value=>records(value,attempt),dependsOn:strings,atlas:nullable(atlas)});}
function conversation(value){return checkedRecord(value,{title:'',mode:'职业咨询',messages:[]},{messages:value=>records(value,item=>checkedRecord(item,{}, {scope:strings}),false)});}
function report(value){return checkedRecord(value,{title:'',body:'',claimIds:[]},{sections:strings,sectionRecords:value=>records(value,item=>checkedRecord(item)),privateReflections:value=>records(value,item=>checkedRecord(item)),educationFacts:value=>records(value,item=>checkedRecord(item)),facts:value=>records(value,claim),placements:value=>mapping(value,string),tailoring,wording:string,profileSnapshot:nullable(item=>checkedRecord(item)),jobSnapshot:nullable(item=>checkedRecord(item))});}
function resume(value){return {...report(value),facts:own(value,'facts')?records(value.facts,claim):[]};}
function atlas(value){return checkedRecord(value,{}, {steps:strings});}
function nullable(normalize){return value=>value===null?null:normalize(value);}
function mapping(value,normalize){if(!object(value))invalid();return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,normalize(item)]));}
function analysis(value){return checkedRecord(value,{}, {claims:refs,claimSnapshots:value=>records(value,claim),reviewRefs:refs});}
function tailoring(value){return fields(value,{}, {jobText:string,rows:value=>mapping(value,row=>fields(row,{}, {claimIds:strings,claimRefs:value=>mapping(value,number),wording:string,confirmed:bool}))});}

/** Return a compatible state or throw, leaving the source object untouched. */
export function normalizePrototypeState(value){
  if(!object(value)||value.schema!==1)invalid();
  const base=fresh();
  const arrayModels={
    education:item=>checkedRecord(item),claims:claim,tasks:task,reviews:item=>checkedRecord(item),reports:report,resumes:resume,
    jobs:item=>checkedRecord(item),events:item=>checkedRecord(item),presets:item=>checkedRecord(item),feedback:item=>checkedRecord(item),
    audit:item=>checkedRecord(item),conversations:conversation,resumeImports:item=>checkedRecord(item),aiNotes:item=>checkedRecord(item),analysisHistory:analysis
  };
  const types={
    budget:numeric,goal:nullable(string),backup:nullable(string),compare:strings,favorites:strings,aiScope:strings,
    preferences:item=>fields(item,base.preferences),claimDraft:item=>fields(item,base.claimDraft,{guidedParts:parts=>fields(parts,{context:'',action:'',outcome:''}),rawText:string}),decision:item=>fields(item,base.decision),
    adminSource:item=>fields(item,base.adminSource),adminContent:item=>fields(item,base.adminContent),
    reading:item=>mapping(item,row=>fields(row,{}, {chapter:numeric})),analysis:nullable(analysis),
    taskDraft:nullable(item=>checkedRecord(item,{}, {hours:numeric,atlas:nullable(atlas)})),
    scenario:nullable(item=>fields(item)),proposal:nullable(item=>fields(item)),searchFilters:nullable(item=>fields(item)),deletion:nullable(item=>checkedRecord(item)),
    learningStages:nullable(item=>records(item,row=>checkedRecord(row))),
    currentResumeByTarget:item=>mapping(item,string),reviewDrafts:item=>mapping(item,row=>checkedRecord(row)),
    atlasDrafts:item=>mapping(item,row=>checkedRecord(row,{}, {hours:numeric,atlas:nullable(atlas)})),
    resumeProfile:nullable(item=>checkedRecord(item)),aiClaimRefs:refs,
    resumeStudioDraft:item=>checkedRecord(item,{}, {claimIds:strings,educationIds:strings,placements:value=>mapping(value,string),tailoring}),
    resumeTarget:string
  };
  for(const [key,normalize] of Object.entries(arrayModels))types[key]=items=>records(items,normalize);
  const result=fields(value,base,types);
  // Migrate only absent nested draft/settings fields; preserve personal content.
  for(const key of ['preferences','claimDraft','decision','adminSource','adminContent'])result[key]=types[key](result[key]);
  if(!result.conversations.some(item=>item.id===result.conversationId)){
    if(!result.conversations.length)result.conversations=base.conversations;
    result.conversationId=result.conversations[0].id;
  }
  return result;
}

/** Reading never writes, clears, or repairs the original browser record. */
export function loadPrototypeState(storage){
  let raw=null;
  try{
    raw=storage.getItem(KEY);
    if(raw===null)return {state:fresh(),status:'ready',raw:null};
    if(typeof raw!=='string')return {state:fresh(),status:'invalid',raw:null};
  }catch{return {state:fresh(),status:'read-error',raw:null};}
  try{return {state:normalizePrototypeState(JSON.parse(raw)),status:'ready',raw};}
  catch{return {state:fresh(),status:'invalid',raw};}
}

/** Call only after a ready read, or after explicit replacement confirmation. */
export function savePrototypeState(storage,state){
  try{
    // Validate the serialized representation too; JSON can turn NaN into null.
    normalizePrototypeState(state);
    const raw=JSON.stringify(state);
    normalizePrototypeState(JSON.parse(raw));
    storage.setItem(KEY,raw);
    return {status:'saved'};
  }catch{return {status:'write-error'};}
}
