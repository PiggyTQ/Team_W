import {createHash,randomUUID} from 'node:crypto';
import {fresh,learning,usedHours} from '../src/model.js';
import {normalizePrototypeState} from '../src/storage-recovery-model.js';
import {ensureCourseSchema,createCourseLibrary} from './course-library.mjs';
import {businessError} from './business-error.mjs';
import {guardCommandRecords} from './business-commands.mjs';
import {createPersonalContextStore} from './agent/personal-context.mjs';
export {businessError} from './business-error.mjs';

export const COLLECTIONS=Object.freeze({education:'education_records',claims:'experience_claims',tasks:'plan_tasks',reviews:'practice_reviews',reports:'career_reports',resumes:'resume_versions',jobs:'job_cards',events:'job_events',presets:'saved_searches',feedback:'feedback_tickets',conversations:'assistant_conversations',resumeImports:'resume_imports',aiNotes:'personal_notes',analysisHistory:'assessment_versions'});
const transient=new Set(['logged','role','adminSource','adminContent','audit','scenario']);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function safeJSON(value,depth=0) {
  if(depth>35)throw businessError('INVALID_WORKSPACE');
  if(typeof value==='string'&&value.length>200000)throw businessError('WORKSPACE_TOO_LARGE',413);
  if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){
    if(['__proto__','constructor','prototype','password','password_hash','sessionToken','csrfToken'].includes(key))throw businessError('INVALID_WORKSPACE');
    safeJSON(child,depth+1);
  }
}
export function canonicalWorkspace(input,userId,catalog) {
  safeJSON(input);
  let state;try{state=normalizePrototypeState(input);}catch{throw businessError('INVALID_WORKSPACE');}
  for(const field of transient)delete state[field];
  if(!Number.isFinite(Number(state.budget))||Number(state.budget)<0||Number(state.budget)>168)throw businessError('INVALID_BUDGET');
  for(const key of ['version','profileVersion','planVersion'])if(!Number.isInteger(state[key])||state[key]<1)throw businessError('INVALID_WORKSPACE');
  for(const key of ['compare','favorites','learningFavorites'])if(state[key]&&(!Array.isArray(state[key])||state[key].some(x=>typeof x!=='string')))throw businessError('INVALID_WORKSPACE');
  for(const key of Object.keys(COLLECTIONS)) {
    if((state[key]?.length||0)>1000)throw businessError('WORKSPACE_TOO_LARGE',413);
    state[key]=(state[key]||[]).map(record=>{
      if(record.id.length>120||/[\u0000-\u001f]/.test(record.id))throw businessError('INVALID_WORKSPACE');
      if(record.owner&&record.owner!=='demo-owner'&&record.owner!==userId)throw businessError('OWNER_MISMATCH',403);
      return {...record,owner:userId};
    });
  }
  const tasks=new Map(state.tasks.map(task=>[task.id,task]));
  const done=new Set(),visiting=new Set();
  const visit=id=>{
    if(visiting.has(id))throw businessError('DEPENDENCY_CYCLE');
    if(done.has(id))return;visiting.add(id);
    for(const dependency of tasks.get(id)?.dependsOn||[]){if(!tasks.has(dependency))throw businessError('INVALID_DEPENDENCY');visit(dependency);}
    visiting.delete(id);done.add(id);
  };
  for(const task of state.tasks){
    const recorded=task.recordedOnly===true&&task.mode==='recorded'&&task.template==='external'&&task.completed&&task.status==='完成'&&!!task.note?.trim();
    if(!Number.isFinite(Number(task.hours))||Number(task.hours)<0||Number(task.hours)===0&&!recorded||Number(task.hours)>168)throw businessError('INVALID_TASK_HOURS');
    const course=catalog?.get(task.template);
    if(course?.status==='placeholder')throw businessError('COURSE_NOT_READY',409);
    if(course?.status==='published'){
      task.courseVersion=task.courseVersion??course.content_version;
      const version=course.versions?.find(row=>row.version===task.courseVersion);
      if(!version)throw businessError('COURSE_VERSION_UNAVAILABLE',409);
      task.courseRef={id:task.template,version:version.version,packHash:version.pack_hash};
      for(const [index,attempt]of task.attempts.entries()){
        if(attempt.version!==index+1||!attempt.text?.trim()||attempt.courseVersion!==undefined&&attempt.courseVersion!==task.courseVersion)throw businessError('INVALID_TASK_ATTEMPT');
        attempt.courseVersion=task.courseVersion;
      }
      if(task.mode==='S2'&&(task.completed||task.status==='完成')){
        const last=task.attempts.at(-1);
        if(!task.completed||task.status!=='完成')throw businessError('INVALID_TASK_STATE');
        if(!last||last.result!=='自检记录'||!task.selfcheck||!task.contribution?.trim())throw businessError('COURSE_COMPLETION_INCOMPLETE',409);
        if(task.dependsOn.some(id=>!tasks.get(id)?.completed||tasks.get(id)?.status!=='完成'))throw businessError('INVALID_DEPENDENCY');
      }
    }
    visit(task.id);
    if(task.completed&&task.status!=='完成')throw businessError('INVALID_TASK_STATE');
  }
  if(usedHours(state)>Number(state.budget))throw businessError('BUDGET_EXCEEDED',409);
  for(const [id,position]of Object.entries(state.reading)){
    const course=catalog?.get(id);if(course?.status==='placeholder')throw businessError('COURSE_NOT_READY',409);
    if(course?.status==='published'){
      if(!Number.isInteger(position.chapter)||position.chapter<0||position.chapter>=4)throw businessError('INVALID_READING_POSITION');
      if(!course.versions.some(v=>v.version===position.version))throw businessError('COURSE_VERSION_UNAVAILABLE',409);
      if(position.chapterId&&position.chapterId!==`${id}-chapter-${position.chapter+1}`)throw businessError('INVALID_READING_POSITION');
      if(position.completed===true)throw businessError('INVALID_READING_POSITION');
    }
  }
  return state;
}

export function createBusinessStore(db,{now=Date.now}={}) {
  db.exec('PRAGMA foreign_keys=ON; PRAGMA secure_delete=ON; PRAGMA busy_timeout=5000;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at INTEGER NOT NULL)');
  db.exec('BEGIN IMMEDIATE');
  try {
    if(!db.prepare('SELECT 1 FROM schema_migrations WHERE version=1').get()) {
      db.exec(`CREATE TABLE account_workspaces(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,revision INTEGER NOT NULL CHECK(revision>=0),settings_json TEXT NOT NULL CHECK(json_valid(settings_json)),updated_at INTEGER NOT NULL);
        CREATE TABLE workspace_mutations(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,mutation_id TEXT NOT NULL,payload_hash TEXT NOT NULL,revision INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(user_id,mutation_id));
        CREATE TABLE security_events(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,code TEXT NOT NULL,entity_kind TEXT NOT NULL,created_at INTEGER NOT NULL);
        CREATE INDEX security_owner_time ON security_events(user_id,created_at);
        CREATE TABLE courses(id TEXT PRIMARY KEY,title TEXT NOT NULL,career_id TEXT NOT NULL,position INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('placeholder','draft','published','retired')),content_version INTEGER NOT NULL DEFAULT 1,estimated_minutes INTEGER,source_url TEXT,license TEXT);
        CREATE TABLE course_chapters(id TEXT PRIMARY KEY,course_id TEXT NOT NULL REFERENCES courses(id),ordinal INTEGER NOT NULL,title TEXT NOT NULL,body TEXT,status TEXT NOT NULL CHECK(status IN ('placeholder','draft','published','retired')),UNIQUE(course_id,ordinal));
        CREATE TABLE course_media(id TEXT PRIMARY KEY,course_id TEXT NOT NULL REFERENCES courses(id),chapter_id TEXT REFERENCES course_chapters(id),kind TEXT NOT NULL CHECK(kind='video'),url TEXT,duration_seconds INTEGER,status TEXT NOT NULL CHECK(status IN ('placeholder','draft','published','retired')));`);
      for(const table of Object.values(COLLECTIONS))db.exec(`CREATE TABLE ${table}(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,id TEXT NOT NULL,payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),payload_hash TEXT NOT NULL,object_revision INTEGER NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,id));`);
      for(const [position,unit] of learning.entries()) {
        db.prepare('INSERT INTO courses(id,title,career_id,position,status) VALUES(?,?,?,?,?)').run(unit.id,unit.title,unit.career,position,'placeholder');
        for(const [index,title] of unit.chapters.entries())db.prepare('INSERT INTO course_chapters VALUES(?,?,?,?,?,?)').run(`${unit.id}-chapter-${index+1}`,unit.id,index+1,title,null,'placeholder');
        db.prepare('INSERT INTO course_media VALUES(?,?,?,?,?,?,?)').run(`${unit.id}-video`,unit.id,null,'video',null,null,'placeholder');
      }
      db.prepare('INSERT INTO schema_migrations VALUES(?,?,?)').run(1,'Owner-isolated business records and pending course catalog',now());
    }
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  ensureCourseSchema(db,now);
  const personalContext=createPersonalContextStore(db,{now});
  const courseLibrary=createCourseLibrary(db);
  const catalogMap=courseLibrary.map;
  function audit(userId,code,kind='workspace') {db.prepare('INSERT INTO security_events VALUES(?,?,?,?,?)').run(randomUUID(),userId,code,kind,now());}
  function read(userId) {
    const head=db.prepare('SELECT * FROM account_workspaces WHERE user_id=?').get(userId);
    let state=head?{...fresh(),...JSON.parse(head.settings_json)}:fresh();
    if(head)for(const [key,table] of Object.entries(COLLECTIONS))state[key]=db.prepare(`SELECT payload_json FROM ${table} WHERE user_id=? ORDER BY rowid`).all(userId).map(row=>JSON.parse(row.payload_json));
    state={...state,logged:false,role:'student',adminSource:fresh().adminSource,adminContent:fresh().adminContent,audit:[],scenario:null};
    return {state,revision:head?.revision||0,updatedAt:head?.updated_at||null};
  }
  function save(userId,{state:input,baseVersion,mutationId},{auditCode='WORKSPACE_SAVED',trustedCommand=false}={}) {
    if(!Number.isInteger(baseVersion)||baseVersion<0||typeof mutationId!=='string'||!/^[-a-zA-Z0-9]{16,100}$/.test(mutationId))throw businessError('INVALID_REQUEST');
    const state=canonicalWorkspace(input,userId,catalogMap()),payloadHash=digest(state);
    const ownTransaction=!db.isTransaction;
    if(ownTransaction)db.exec('BEGIN IMMEDIATE');
    try {
      const duplicate=db.prepare('SELECT * FROM workspace_mutations WHERE user_id=? AND mutation_id=?').get(userId,mutationId);
      if(duplicate){if(duplicate.payload_hash!==payloadHash)throw businessError('IDEMPOTENCY_MISMATCH',409);if(ownTransaction)db.exec('COMMIT');return {revision:duplicate.revision,duplicate:true};}
      const current=db.prepare('SELECT revision FROM account_workspaces WHERE user_id=?').get(userId)?.revision||0;
      if(current!==baseVersion)throw businessError('VERSION_CONFLICT',409,{currentVersion:current});
      if(!trustedCommand)guardCommandRecords(read(userId).state,state);
      const revision=current+1,settings={...state};
      for(const [key,table] of Object.entries(COLLECTIONS)){
        delete settings[key];
        const existing=new Map(db.prepare(`SELECT id,payload_hash,object_revision FROM ${table} WHERE user_id=?`).all(userId).map(row=>[row.id,row]));
        for(const record of state[key]) {
          const previous=existing.get(record.id),recordHash=digest(record);existing.delete(record.id);
          if(previous?.payload_hash===recordHash)continue;
          db.prepare(`INSERT INTO ${table} VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET payload_json=excluded.payload_json,payload_hash=excluded.payload_hash,object_revision=excluded.object_revision,updated_at=excluded.updated_at`).run(userId,record.id,JSON.stringify(record),recordHash,(previous?.object_revision||0)+1,now(),now());
        }
        for(const id of existing.keys())db.prepare(`DELETE FROM ${table} WHERE user_id=? AND id=?`).run(userId,id);
      }
      db.prepare('INSERT INTO account_workspaces VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,settings_json=excluded.settings_json,updated_at=excluded.updated_at').run(userId,revision,JSON.stringify(settings),now());
      db.prepare('INSERT INTO workspace_mutations VALUES(?,?,?,?,?)').run(userId,mutationId,payloadHash,revision,now());
      if(auditCode==='WORKSPACE_CLEARED')personalContext.purge(userId);else personalContext.refresh(userId,state,revision);
      audit(userId,auditCode);if(ownTransaction)db.exec('COMMIT');return {revision,updatedAt:now()};
    }catch(error){if(ownTransaction)db.exec('ROLLBACK');throw error;}
  }
  function catalog() {
    return courseLibrary.catalog();
  }
  function records(userId,key,id) {
    if(!Object.hasOwn(COLLECTIONS,key))throw businessError('NOT_FOUND',404);const table=COLLECTIONS[key];
    if(id){const row=db.prepare(`SELECT * FROM ${table} WHERE user_id=? AND id=?`).get(userId,id);if(!row)throw businessError('NOT_FOUND',404);return {id:row.id,revision:row.object_revision,updatedAt:row.updated_at,data:JSON.parse(row.payload_json)};}
    return {items:db.prepare(`SELECT id,object_revision,updated_at FROM ${table} WHERE user_id=? ORDER BY updated_at DESC LIMIT 100`).all(userId).map(row=>({id:row.id,revision:row.object_revision,updatedAt:row.updated_at}))};
  }
  function clear(userId,baseVersion) {const snapshot=read(userId);if(snapshot.revision!==baseVersion)throw businessError('VERSION_CONFLICT',409,{currentVersion:snapshot.revision});const result=save(userId,{state:fresh(),baseVersion,mutationId:randomUUID()},{auditCode:'WORKSPACE_CLEARED'});if(!db.isTransaction)try{db.exec('PRAGMA wal_checkpoint(TRUNCATE)');}catch{console.warn('Database checkpoint deferred after committed workspace clear');}return {...result,state:fresh()};}
  function ready() {db.prepare('SELECT revision FROM account_workspaces LIMIT 1').get();return {status:'ok',schemaVersion:1};}
  function maintenance(){db.prepare('DELETE FROM workspace_mutations WHERE created_at<?').run(now()-86400000);personalContext.maintenance();}
  return {read,save,catalog,courseLibrary,records,clear,audit,ready,maintenance,personalContext};
}
