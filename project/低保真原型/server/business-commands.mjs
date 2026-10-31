import {createHash,randomUUID} from 'node:crypto';
import {businessError} from './business-error.mjs';
import {makeTask,checkStart,addClaim} from '../src/model.js';
import {submitTaskAttempt} from '../src/task-attempt-model.js';
import {dependencyBlock} from '../src/completion-model.js';
import {stoppedTask,applyTaskEdit,validateTaskEdit} from '../src/task-edit-model.js';
import {freezeReport,createSkillCandidates} from '../src/alignment-model.js';
import {atlasPracticeKey} from '../src/career-atlas-model.js';
import {planningReportPreview} from './planning-report.mjs';

const COMMANDS=new Set(['assessment.create','report.compile','report.compose','task.create','task.edit','task.start','task.submit','task.selfcheck','task.complete','evidence.candidates','experience.record','claim.confirm','claim.withdraw']);
const origin='server-command-v1';
const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;
const hash=value=>createHash('sha256').update(JSON.stringify(sorted(value))).digest('hex');
const requireValue=(condition,code='INVALID_REQUEST',status=400)=>{if(!condition)throw businessError(code,status);};
const text=(value,max=120000)=>{requireValue(typeof value==='string'&&value.trim().length>0&&value.length<=max);return value.trim();};
const fields=(value,allowed)=>{requireValue(value&&typeof value==='object'&&!Array.isArray(value));requireValue(Object.keys(value).every(key=>allowed.includes(key)));};
const stamp=(id,now)=>({origin,receiptId:id,createdAt:new Date(now).toISOString()});
const withTask=(state,task)=>({...state,tasks:state.tasks.map(row=>row.id===task.id?task:row)});

/** Commands only receive saved account state. No model or client can supply a result. */
export function createBusinessCommands({db,business,knowledge,now=Date.now}){
  db.exec(`CREATE TABLE IF NOT EXISTS business_command_receipts(
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mutation_id TEXT NOT NULL,request_hash TEXT NOT NULL,type TEXT NOT NULL,
    result_json TEXT NOT NULL CHECK(json_valid(result_json)),created_at INTEGER NOT NULL,
    PRIMARY KEY(user_id,mutation_id));
    CREATE INDEX IF NOT EXISTS business_receipt_owner_time ON business_command_receipts(user_id,created_at);`);
  function get(userId,id){
    const row=db.prepare('SELECT result_json FROM business_command_receipts WHERE user_id=? AND mutation_id=?').get(userId,id);
    if(!row)throw businessError('NOT_FOUND',404);
    return JSON.parse(row.result_json);
  }
  function execute(userId,input){
    fields(input,['type','baseVersion','mutationId','payload']);
    const {type,baseVersion,mutationId,payload={}}=input;
    requireValue(COMMANDS.has(type)&&Number.isInteger(baseVersion)&&baseVersion>=0&&typeof mutationId==='string'&&/^[-a-zA-Z0-9]{16,100}$/.test(mutationId));
    const requestHash=hash(input);
    db.exec('BEGIN IMMEDIATE');
    try{
      const duplicate=db.prepare('SELECT * FROM business_command_receipts WHERE user_id=? AND mutation_id=?').get(userId,mutationId);
      if(duplicate){
        requireValue(duplicate.request_hash===requestHash,'IDEMPOTENCY_MISMATCH',409);
        db.exec('COMMIT');return {...JSON.parse(duplicate.result_json),duplicate:true};
      }
      const saved=business.read(userId),s=saved.state;
      requireValue(saved.revision===baseVersion,'VERSION_CONFLICT',409);
      let next=s,refs={};
      const authority=stamp(mutationId,now());
      if(type==='assessment.create'){
        fields(payload,[]);requireValue(!!knowledge,'CATALOG_UNAVAILABLE',503);
        const analysis={...knowledge.assess(s),authority,inputDigest:hash({career:s.assessmentCareer||s.goal||'data',claims:s.claims.filter(c=>c.status==='已确认'),reviews:s.reviews,profileVersion:s.profileVersion})};
        next={...s,analysis,analysisStale:false,analysisHistory:[...(s.analysisHistory||[]),...(s.analysis?[s.analysis]:[])].filter((row,index,all)=>all.findIndex(x=>x.id===row.id)===index)};
        refs={analysisId:analysis.id};
      }else if(type==='report.compose'){
        fields(payload,['title','kind','help','sections','previewVersion','previewDigest','confirmation']);
        requireValue(payload.confirmation==='COMPOSE_REPORT','CONFIRMATION_REQUIRED');
        requireValue(!!knowledge,'CATALOG_UNAVAILABLE',503);
        requireValue(['report','consult'].includes(payload.kind)&&Array.isArray(payload.sections)&&payload.sections.length>0&&payload.sections.length<=20);
        requireValue(payload.help===undefined||typeof payload.help==='string'&&payload.help.length<=4000);
        requireValue(payload.previewVersion===baseVersion,'VERSION_CONFLICT',409);
        const preview=planningReportPreview(s,knowledge,payload);
        requireValue(payload.kind==='consult'||payload.previewDigest===preview.digest,'VERSION_CONFLICT',409);
        const lines=preview.body.split('\n'),titles=lines.map(line=>line.split('：')[0]);
        requireValue(payload.sections.every(section=>typeof section==='string'&&titles.includes(section)));
        const report={...freezeReport(s,text(payload.title,200),lines.filter((_,index)=>payload.sections.includes(titles[index])).join('\n')),kind:payload.kind,help:payload.help||'',authority,catalogVersion:preview.catalogVersion,compilationNotice:preview.notice};
        next={...s,reports:[...s.reports,report]};refs={reportId:report.id};
      }else if(type==='report.compile'){
        fields(payload,['language','title','confirmation']);requireValue(payload.confirmation==='COMPILE_REPORT','CONFIRMATION_REQUIRED');
        requireValue(!!knowledge,'CATALOG_UNAVAILABLE',503);
        requireValue(payload.language===undefined||['zh','en'].includes(payload.language));
        const compiled=knowledge.report(s,payload.language||'zh');
        const report={...freezeReport(s,text(payload.title||'职业准备记录',200),compiled.text),authority,catalogVersion:compiled.catalogVersion,compilationNotice:compiled.notice};
        next={...s,reports:[...s.reports,report]};refs={reportId:report.id};
      }else if(type==='task.create'){
        fields(payload,['draft','confirmation']);requireValue(payload.confirmation==='CREATE_TASK','CONFIRMATION_REQUIRED');
        const d=payload.draft;
        fields(d,['title','template','career','purpose','hours','association','kind','source','product','courseVersion','atlas','learningStage','priority','placementReason','jobId','another']);
        text(d.title,200);text(d.purpose,4000);requireValue(typeof d.hours==='number'&&Number.isFinite(d.hours)&&d.hours>0&&d.hours<=168,'INVALID_TASK_HOURS');
        requireValue(!checkStart(s,d),'TASK_PRECHECK_FAILED',409);
        const template=d.template||'external',course=business.courseLibrary.map().get(template);
        requireValue(template==='external'||course?.status==='published','COURSE_NOT_READY',409);
        if(d.courseVersion!==undefined)requireValue(Number.isInteger(d.courseVersion)&&course?.versions.some(row=>row.version===d.courseVersion),'COURSE_VERSION_UNAVAILABLE',409);
        requireValue(d.another===true||!s.tasks.some(t=>t.template===template&&t.purpose===d.purpose&&!['取消','跳过'].includes(t.status)),'DUPLICATE_TASK',409);
        if(d.jobId)requireValue(s.jobs.some(job=>job.id===d.jobId),'NOT_FOUND',404);
        const task={...makeTask(s,{...d,template,...(course?{courseVersion:d.courseVersion||course.content_version}:{})}),id:randomUUID(),owner:userId,authority};
        next={...s,tasks:[...s.tasks,task],taskDraft:null,planVersion:s.planVersion+1,jobs:s.jobs.map(job=>job.id===d.jobId?{...job,taskId:task.id,status:'准备'}:job),...(task.atlas?{atlasDrafts:Object.fromEntries(Object.entries(s.atlasDrafts||{}).filter(([key])=>key!==atlasPracticeKey(task.atlas)))}:{})};
        refs={taskId:task.id};
      }else if(type==='task.edit'){
        fields(payload,['taskId','taskVersion','planVersion','draft','confirmation']);
        requireValue(payload.confirmation==='EDIT_TASK','CONFIRMATION_REQUIRED');
        const task=s.tasks.find(row=>row.id===payload.taskId);requireValue(!!task,'NOT_FOUND',404);
        requireValue(task.version===payload.taskVersion&&s.planVersion===payload.planVersion,'VERSION_CONFLICT',409);
        fields(payload.draft,['title','purpose','hours','due','deliveryNote','status']);
        requireValue(!validateTaskEdit(s,task,payload.draft),'TASK_PRECHECK_FAILED',409);
        next=applyTaskEdit(s,task.id,payload.draft,payload);
        if(!task.completed&&payload.draft.status==='完成')next=withTask(next,{...next.tasks.find(row=>row.id===task.id),completionReceipt:authority});
        refs={taskId:task.id};
      }else if(type.startsWith('task.')){
        fields(payload,['taskId','taskVersion','attemptId','confirmation']);
        const task=s.tasks.find(row=>row.id===payload.taskId);requireValue(!!task,'NOT_FOUND',404);
        requireValue(task.version===payload.taskVersion,'VERSION_CONFLICT',409);
        requireValue(!stoppedTask(task),'TASK_PAUSED',409);
        requireValue(task.mode!=='recorded','INVALID_TASK_STATE',409);
        if(type!=='task.selfcheck')requireValue(!dependencyBlock(s,task),'INVALID_DEPENDENCY',409);
        if(type==='task.start'){
          next=task.completed?s:withTask(s,{...task,status:'进行中',version:task.version+1});
        }else if(type==='task.submit'){
          requireValue(!task.completed&&task.status!=='完成','INVALID_TASK_STATE',409);
          text(task.draft);requireValue(payload.confirmation==='SUBMIT_ATTEMPT','CONFIRMATION_REQUIRED');
          next=submitTaskAttempt(s,task.id);
          const submitted=next.tasks.find(row=>row.id===task.id),attempt=submitted.attempts.at(-1);
          attempt.id=randomUUID();attempt.date=authority.createdAt;attempt.authority=authority;
          refs.attemptId=attempt.id;
        }else if(type==='task.selfcheck'){
          requireValue(payload.confirmation==='SELF_CHECK_ONLY','CONFIRMATION_REQUIRED');
          const attempt=task.attempts.find(row=>row.id===payload.attemptId);requireValue(!!attempt,'NOT_FOUND',404);
          requireValue(!task.completed,'INVALID_TASK_STATE',409);
          next=withTask(s,{...task,version:task.version+1,check:task.attempts.at(-1)?.id===attempt.id?'自检记录':task.check,attempts:task.attempts.map(row=>row.id===attempt.id?{...row,result:'自检记录',feedback:'本人自检记录：仅记录用户声明的核对动作，不构成独立核验。',selfcheckReceipt:authority}:row)});
          refs.attemptId=attempt.id;
        }else{
          requireValue(payload.confirmation==='COMPLETE_LIMITED_SCOPE','CONFIRMATION_REQUIRED');
          const last=task.attempts.at(-1);
          requireValue(!!last&&last.result==='自检记录'&&task.selfcheck===true&&!!task.contribution?.trim(),'COURSE_COMPLETION_INCOMPLETE',409);
          next=withTask(s,{...task,status:'完成',completed:true,version:task.version+1,completionReceipt:authority});
        }
        refs.taskId=task.id;
      }else if(type==='evidence.candidates'){
        fields(payload,['taskId','taskVersion','attemptId','entries','contribution','confirmation']);
        requireValue(payload.confirmation==='GENERATE_CANDIDATES','CONFIRMATION_REQUIRED');
        const task=s.tasks.find(row=>row.id===payload.taskId);requireValue(!!task,'NOT_FOUND',404);
        requireValue(task.version===payload.taskVersion,'VERSION_CONFLICT',409);
        const attempt=task.attempts.find(row=>row.id===payload.attemptId);requireValue(!!attempt,'NOT_FOUND',404);
        requireValue(task.completed===true&&attempt.result==='自检记录','COURSE_COMPLETION_INCOMPLETE',409);
        requireValue(Array.isArray(payload.entries)&&payload.entries.length>0&&payload.entries.length<=20);
        for(const entry of payload.entries){fields(entry,['skill','scope','location']);text(entry.skill,120);for(const key of ['scope','location'])requireValue(typeof entry[key]==='string'&&entry[key].length<=4000);}
        requireValue(typeof payload.contribution==='string'&&payload.contribution.length<=4000);
        const candidates=createSkillCandidates(s,task,attempt,payload.entries,payload.contribution);
        next={...s,claims:[...s.claims,...candidates],analysisStale:!!s.analysis,originTask:task.id,tasks:s.tasks.map(row=>row.id===task.id?{...row,claimStatus:'候选待本人确认'}:row)};
        refs={taskId:task.id,claimIds:candidates.map(row=>row.id)};
      }else if(type==='experience.record'){
        fields(payload,['title','text','purpose','contribution','observationType','occurredOn','investigationMethod','investigationSource','confirmation']);
        requireValue(payload.confirmation==='RECORD_SELF_REPORT','CONFIRMATION_REQUIRED');
        const title=text(payload.title,200),body=text(payload.text),task={...makeTask(s,{title,purpose:payload.purpose||'补录已发生行动',hours:0,template:'external',kind:'本人记录的外部行动'}),id:randomUUID(),owner:userId,mode:'recorded',recordedOnly:true,status:'完成',completed:true,note:body,contribution:payload.contribution||'',authority};
        for(const key of ['observationType','occurredOn','investigationMethod','investigationSource'])if(payload[key]!==undefined){requireValue(typeof payload[key]==='string'&&payload[key].length<=4000);task[key]=payload[key];}
        next=addClaim({...s,tasks:[...s.tasks,task]}, {title,text:body,contribution:payload.contribution||'',skill:'未知',taskId:task.id,origin:'外部补录自述'});
        refs={taskId:task.id,claimId:next.claims.at(-1).id};
      }else{
        fields(payload,['claimId','claimVersion','text','contribution','resolution','confirmation']);
        const claim=s.claims.find(row=>row.id===payload.claimId);requireValue(!!claim,'NOT_FOUND',404);
        requireValue(payload.claimVersion===claim.version,'VERSION_CONFLICT',409);
        requireValue(payload.confirmation===(type==='claim.confirm'?'CONFIRM_SELF_REPORT':'WITHDRAW_CLAIM'),'CONFIRMATION_REQUIRED');
        const withdraw=type==='claim.withdraw';
        requireValue(withdraw||['confirm','link_duplicate'].includes(payload.resolution));
        const updated=withdraw?{...claim,status:'已撤回',withdrawnThrough:claim.version,version:claim.version+1}:{...claim,text:text(payload.text),contribution:payload.contribution||'',status:payload.resolution==='link_duplicate'?'已关联重复':'已确认',version:claim.version+1};
        next={...s,profileVersion:s.profileVersion+1,analysisStale:!!s.analysis,proposal:null,claims:s.claims.map(row=>row.id===claim.id?updated:row),tasks:s.tasks.map(task=>task.id===claim.taskId?{...task,claimStatus:withdraw?'相关材料已撤回；未实际核验':'相关候选已本人处理；未实际核验'}:task)};
        refs={claimId:claim.id};
      }
      const savedResult=business.save(userId,{state:next,baseVersion,mutationId:`cmd-${hash(mutationId)}`},{auditCode:`COMMAND_${type.toUpperCase().replaceAll('.','_')}`,trustedCommand:true});
      const receipt={id:mutationId,type,revision:savedResult.revision,createdAt:authority.createdAt,refs};
      db.prepare('INSERT INTO business_command_receipts VALUES(?,?,?,?,?,?)').run(userId,mutationId,requestHash,type,JSON.stringify(receipt),now());
      db.exec('COMMIT');return receipt;
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  const purge=userId=>db.prepare('DELETE FROM business_command_receipts WHERE user_id=?').run(userId);
  const list=userId=>({items:db.prepare('SELECT result_json FROM business_command_receipts WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100').all(userId).map(row=>JSON.parse(row.result_json)),retentionDays:30});
  const maintenance=()=>db.prepare('DELETE FROM business_command_receipts WHERE created_at<?').run(now()-30*86400000);
  return {execute,get,list,purge,maintenance,types:[...COMMANDS]};
}

/** Draft synchronization must not rewrite server-issued results or receipts. */
export function guardCommandRecords(previous,next){
  const isServer=row=>row?.authority?.origin===origin;
  const identical=(a,b)=>hash(a)===hash(b);
  const analyses=new Map([previous.analysis,...previous.analysisHistory||[]].filter(isServer).map(row=>[row.id,row]));
  for(const row of [next.analysis,...next.analysisHistory||[]].filter(Boolean)){
    if(isServer(row)||analyses.has(row.id))requireValue(analyses.has(row.id)&&identical(analyses.get(row.id),row),'SERVER_RECORD_PROTECTED',409);
  }
  const previousReports=new Map(previous.reports.filter(isServer).map(row=>[row.id,row]));
  for(const row of next.reports){
    if(isServer(row)||previousReports.has(row.id))requireValue(previousReports.has(row.id)&&identical(previousReports.get(row.id),row),'SERVER_RECORD_PROTECTED',409);
  }
  const previousTasks=new Map(previous.tasks.map(row=>[row.id,row]));
  for(const task of next.tasks){
    const old=previousTasks.get(task.id);
    if(isServer(task)||isServer(old)){
      requireValue(!!old&&identical(old.authority,task.authority),'SERVER_RECORD_PROTECTED',409);
      requireValue(old.completed===task.completed&&identical(old.attempts,task.attempts)&&old.check===task.check&&identical(old.completionReceipt??null,task.completionReceipt??null),'COMMAND_REQUIRED',409);
    }
    const oldAttempts=new Map((old?.attempts||[]).filter(isServer).map(row=>[row.id,row]));
    for(const attempt of task.attempts)if(isServer(attempt)||oldAttempts.has(attempt.id))requireValue(oldAttempts.has(attempt.id)&&identical(oldAttempts.get(attempt.id),attempt),'SERVER_RECORD_PROTECTED',409);
  }
}
