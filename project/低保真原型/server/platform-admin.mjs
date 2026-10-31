import {createHash,randomUUID} from 'node:crypto';
import {createReviewedKnowledge} from './agent/knowledge.mjs';
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{code,status});};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const roles=['editor','reviewer','publisher','operator'];
export function createPlatformAdmin({db,now=Date.now}){
 db.exec(`CREATE TABLE IF NOT EXISTS platform_roles(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL,PRIMARY KEY(user_id,role));
 CREATE TABLE IF NOT EXISTS managed_knowledge(id TEXT PRIMARY KEY,status TEXT NOT NULL,revision INTEGER NOT NULL,pack_json TEXT NOT NULL,pack_hash TEXT NOT NULL,created_by TEXT REFERENCES users(id) ON DELETE SET NULL,reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,updated_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS managed_knowledge_head(id INTEGER PRIMARY KEY CHECK(id=1),pack_id TEXT,withdrawn INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS platform_receipts(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,request_hash TEXT NOT NULL,result_json TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS platform_audit(id TEXT PRIMARY KEY,actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,action TEXT NOT NULL,object_id TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS platform_course_revisions(course_id TEXT PRIMARY KEY,revision INTEGER NOT NULL);`);
 const userRoles=userId=>db.prepare('SELECT role FROM platform_roles WHERE user_id=?').all(userId).map(r=>r.role);
 const requireRole=(uid,role)=>{if(!userRoles(uid).includes(role))fail('ADMIN_FORBIDDEN',403);};
 function list(uid){if(!userRoles(uid).length)fail('ADMIN_FORBIDDEN',403);return {roles:userRoles(uid),knowledge:db.prepare('SELECT id,status,revision,pack_hash,updated_at FROM managed_knowledge ORDER BY updated_at DESC LIMIT 100').all(),head:db.prepare('SELECT * FROM managed_knowledge_head WHERE id=1').get()||null,courses:db.prepare('SELECT c.id,c.title,c.status,c.content_version,coalesce(r.revision,0) adminRevision FROM courses c LEFT JOIN platform_course_revisions r ON r.course_id=c.id ORDER BY c.position').all(),audit:db.prepare('SELECT id,action,object_id,created_at FROM platform_audit ORDER BY rowid DESC LIMIT 100').all()};}
 function currentPack(fallback){const head=db.prepare('SELECT * FROM managed_knowledge_head WHERE id=1').get();if(!head)return fallback();if(head.withdrawn)return {version:'withdrawn-'+head.pack_id,sources:[],chunks:[],standards:[]};const row=db.prepare("SELECT pack_json FROM managed_knowledge WHERE id=? AND status='published'").get(head.pack_id);if(!row)fail('KNOWLEDGE_UNAVAILABLE',503);return JSON.parse(row.pack_json);}
 function execute(uid,input){
  if(!input||typeof input!=='object'||!/^[-a-zA-Z0-9]{16,100}$/.test(input.mutationId||'')||!input.payload||typeof input.payload!=='object')fail('INVALID_REQUEST');
  const type=input.type,p=input.payload,role=({'knowledge.draft':'editor','knowledge.review':'reviewer','knowledge.publish':'publisher','knowledge.withdraw':'publisher','course.status':'publisher'})[type];if(!role)fail('INVALID_REQUEST');requireRole(uid,role);
  const digest=hash(input);db.exec('BEGIN IMMEDIATE');try{
   const prior=db.prepare('SELECT * FROM platform_receipts WHERE id=?').get(input.mutationId);if(prior){if(prior.user_id!==uid||prior.request_hash!==digest)fail('IDEMPOTENCY_MISMATCH',409);db.exec('COMMIT');return {...JSON.parse(prior.result_json),duplicate:true};}
   let objectId=p.id,result;
   if(type==='knowledge.draft'){
    const pack=p.pack;if(!pack||!Array.isArray(pack.sources)||!Array.isArray(pack.chunks)||!Array.isArray(pack.standards)||JSON.stringify(pack).length>600000)fail('INVALID_KNOWLEDGE_PACK');
    const snapshot=createReviewedKnowledge({loadPack:()=>pack}).snapshot();if(!snapshot.chunks.length||snapshot.chunks.length!==pack.chunks.length)fail('INVALID_KNOWLEDGE_PACK');
    if(pack.standards.length>100||new Set(pack.standards.map(s=>s?.career)).size!==pack.standards.length||pack.standards.some(s=>!s||typeof s.career!=='string'||typeof s.name!=='string'||s.name.length>300||!snapshot.chunks.some(c=>c.sourceId===s.sourceId&&c.sourceVersion===s.sourceVersion)||!Array.isArray(s.skills)||s.skills.length>100||s.skills.some(k=>!k||typeof k.id!=='string'||k.id.length>100||typeof k.name!=='string'||k.name.length>300)))fail('INVALID_KNOWLEDGE_PACK');
    objectId=randomUUID();db.prepare('INSERT INTO managed_knowledge VALUES(?,?,1,?,?,?,NULL,?)').run(objectId,'draft',JSON.stringify(pack),hash(pack),uid,now());result={id:objectId,revision:1,status:'draft'};
   }else if(type.startsWith('knowledge.')){
    const row=db.prepare('SELECT * FROM managed_knowledge WHERE id=?').get(objectId);if(!row)fail('NOT_FOUND',404);if(row.revision!==p.revision)fail('VERSION_CONFLICT',409);
    const next=type==='knowledge.review'?'reviewed':type==='knowledge.publish'?'published':'withdrawn';
    if(p.confirmation!==({'reviewed':'REVIEW_KNOWLEDGE','published':'PUBLISH_KNOWLEDGE','withdrawn':'WITHDRAW_KNOWLEDGE'})[next])fail('CONFIRMATION_REQUIRED');
    if(next==='reviewed'&&row.status!=='draft'||next==='published'&&row.status!=='reviewed'||next==='withdrawn'&&row.status!=='published')fail('INVALID_CONTENT_STATE',409);
    db.prepare('UPDATE managed_knowledge SET status=?,revision=revision+1,reviewed_by=?,updated_at=? WHERE id=?').run(next,next==='reviewed'?uid:row.reviewed_by,now(),objectId);
    if(next==='published')db.prepare('INSERT INTO managed_knowledge_head VALUES(1,?,0) ON CONFLICT(id) DO UPDATE SET pack_id=excluded.pack_id,withdrawn=0').run(objectId);
    if(next==='withdrawn')db.prepare('UPDATE managed_knowledge_head SET withdrawn=1 WHERE pack_id=?').run(objectId);
    result={id:objectId,revision:row.revision+1,status:next};
   }else{
    const row=db.prepare('SELECT c.*,coalesce(r.revision,0) admin_revision FROM courses c LEFT JOIN platform_course_revisions r ON r.course_id=c.id WHERE c.id=?').get(objectId);if(!row)fail('NOT_FOUND',404);
    if(row.admin_revision!==p.revision||row.content_version!==p.contentVersion)fail('VERSION_CONFLICT',409);
    if(!['published','retired'].includes(p.status)||p.confirmation!=='CHANGE_COURSE_STATUS')fail('CONFIRMATION_REQUIRED');
    if(p.status==='published'&&!db.prepare('SELECT 1 FROM course_versions WHERE course_id=? AND version=?').get(objectId,row.content_version))fail('COURSE_VERSION_UNAVAILABLE',409);
    db.prepare('UPDATE courses SET status=? WHERE id=?').run(p.status,objectId);db.prepare('INSERT INTO platform_course_revisions VALUES(?,1) ON CONFLICT(course_id) DO UPDATE SET revision=revision+1').run(objectId);
    result={id:objectId,revision:row.admin_revision+1,status:p.status};
   }
   const receipt={...result,commandId:input.mutationId,type};db.prepare('INSERT INTO platform_receipts VALUES(?,?,?,?,?)').run(input.mutationId,uid,digest,JSON.stringify(receipt),now());db.prepare('INSERT INTO platform_audit VALUES(?,?,?,?,?)').run(randomUUID(),uid,type,objectId,now());db.exec('COMMIT');return receipt;
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
 function seedBaseline(pack){
  if(db.prepare('SELECT 1 FROM managed_knowledge_head WHERE id=1').get())return;
  const digest=hash(pack),id='baseline-'+digest.slice(0,24);db.exec('BEGIN IMMEDIATE');try{
   db.prepare("INSERT OR IGNORE INTO managed_knowledge VALUES(?,'published',1,?,?,NULL,NULL,?)").run(id,JSON.stringify(pack),digest,now());
   db.prepare('INSERT OR IGNORE INTO managed_knowledge_head VALUES(1,?,0)').run(id);db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
 function cleanup(){db.prepare('DELETE FROM platform_receipts WHERE created_at<?').run(now()-30*86400000);db.prepare('DELETE FROM platform_audit WHERE created_at<?').run(now()-90*86400000);}
 return {roles:userRoles,list,currentPack,execute,cleanup,seedBaseline};
}
export {roles as platformRoles};
