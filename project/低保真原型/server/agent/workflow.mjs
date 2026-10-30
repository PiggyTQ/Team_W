import {createHash,randomUUID} from 'node:crypto';
import {canonicalWorkspace,businessError} from '../business-store.mjs';
import {makeTask,usedHours} from '../../src/model.js';
import {analyseCareer} from './analysis.mjs';
import {reviewedLibrary,loadGuidance} from './library.mjs';
import {agentMessageAvailable,agentKnowledgeAvailable} from '../../src/agent-contract.js';
const fail=(code,status=400)=>{throw businessError(code,status);};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const keys=(o,allowed)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>allowed.includes(k));
const token=v=>typeof v==='string'&&/^[-a-zA-Z0-9]{16,100}$/.test(v);
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;

export function createAgentWorkflow({db,business,knowledge=reviewedLibrary(),loadPack=loadGuidance,now=Date.now}={}){
  db.exec(`CREATE TABLE IF NOT EXISTS agent_proposals(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,base_version INTEGER NOT NULL,knowledge_digest TEXT NOT NULL,payload_json TEXT NOT NULL,expires_at INTEGER NOT NULL,receipt_json TEXT,mutation_id TEXT);
    CREATE INDEX IF NOT EXISTS agent_proposals_owner ON agent_proposals(user_id,expires_at);
    CREATE TABLE IF NOT EXISTS agent_feedback(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,proposal_id TEXT REFERENCES agent_proposals(id) ON DELETE CASCADE,category TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS agent_memory(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,revision INTEGER NOT NULL,payload_json TEXT NOT NULL,updated_at INTEGER NOT NULL);`);
  if(!db.prepare('PRAGMA table_info(agent_feedback)').all().some(c=>c.name==='answer_ref_json'))db.exec('ALTER TABLE agent_feedback ADD COLUMN answer_ref_json TEXT');
  function atomic(work){db.exec('BEGIN IMMEDIATE');try{const result=work();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
  function checked(userId,input){
    if(!Number.isSafeInteger(input.baseVersion)||input.baseVersion<0)fail('INVALID_REQUEST');
    const saved=business.read(userId);
    if(saved.revision!==input.baseVersion)throw businessError('VERSION_CONFLICT',409,{currentVersion:saved.revision});
    return saved;
  }
  function analyse(userId,input){
    if(!keys(input,['career','baseVersion','claimRefs']))fail('INVALID_REQUEST');
    return analyseCareer(checked(userId,input),input,knowledge.snapshot(),loadPack());
  }
  function propose(userId,input){
    if(!keys(input,['career','baseVersion','skillId','hours','dependsOn'])||!Number.isFinite(input.hours)||input.hours<=0||input.hours>168
      ||!Array.isArray(input.dependsOn)||input.dependsOn.length>30||new Set(input.dependsOn).size!==input.dependsOn.length||input.dependsOn.some(id=>typeof id!=='string'||id.length>120))fail('INVALID_REQUEST');
    return atomic(()=>{
      const saved=checked(userId,input),snapshot=knowledge.snapshot();
      const analysis=analyseCareer(saved,{...input,claimRefs:[]},snapshot,loadPack()),skill=analysis.rows.find(r=>r.skillId===input.skillId);
      if(!skill)fail('INVALID_REQUEST');
      // The user supplies time. A fixed practice structure supplies scope and deliverable.
      const task=makeTask(saved.state,{title:`${skill.name} · 小范围实践与核对`,career:input.career,template:'external',hours:input.hours,association:saved.state.goal===input.career?'主计划':'独立探索',
        purpose:`围绕 ${skill.name} 选择一个具体问题，记录本人实际操作、结果与未完成部分。`,product:'问题与输入、操作记录、可复查产出、本人贡献、未知与下一步；练习不等于能力核验。',source:'/assistant'});
      task.id=`agent-task-${randomUUID()}`;task.owner=userId;task.dependsOn=[...input.dependsOn];
      const next={...saved.state,tasks:[...saved.state.tasks,task],planVersion:saved.state.planVersion+1,proposal:null};
      canonicalWorkspace(next,userId,business.courseLibrary.map());
      const id=randomUUID(),expiresAt=now()+10*60*1000;
      const preferences=readMemory(userId);
      const preview={id,baseVersion:saved.revision,planVersionBefore:saved.state.planVersion,planVersionAfter:next.planVersion,knowledgeVersion:snapshot.version,knowledgeDigest:snapshot.digest,expiresAt,memoryRevision:preferences.revision,learningPreference:preferences.preferences?.learningPreference||null,
        task,basis:{sourceId:analysis.source.id,sourceVersion:analysis.source.version,skillId:skill.skillId},budget:{weekly:Number(next.budget),before:usedHours(saved.state),after:usedHours(next),remaining:Number(next.budget)-usedHours(next)},
        dependencies:input.dependsOn.map(id=>{const t=saved.state.tasks.find(t=>t.id===id);return {id,title:t.title,status:t.status};}),
        impact:'新增一项待开始实践，并将计划版本加一。既有任务和材料不变；预计投入由你填写。',confirmation:'APPLY_ACTION'};
      db.prepare('INSERT INTO agent_proposals VALUES(?,?,?,?,?,?,NULL,NULL)').run(id,userId,saved.revision,snapshot.digest,JSON.stringify(preview),expiresAt);
      business.audit(userId,'AGENT_ACTION_PREVIEWED','agent');
      return preview;
    });
  }
  function apply(userId,input){
    if(!keys(input,['id','baseVersion','confirmation','mutationId'])||!token(input.mutationId)||typeof input.id!=='string'||input.id.length>100||input.confirmation!=='APPLY_ACTION')fail('CONFIRMATION_REQUIRED');
    return atomic(()=>{
      const proposal=db.prepare('SELECT * FROM agent_proposals WHERE id=? AND user_id=?').get(input.id,userId);
      if(!proposal)fail('NOT_FOUND',404);
      if(proposal.receipt_json){if(proposal.mutation_id!==input.mutationId||proposal.base_version!==input.baseVersion)fail('IDEMPOTENCY_MISMATCH',409);return {...JSON.parse(proposal.receipt_json),duplicate:true};}
      if(db.prepare('SELECT 1 FROM agent_proposals WHERE user_id=? AND mutation_id=?').get(userId,input.mutationId))fail('IDEMPOTENCY_MISMATCH',409);
      if(proposal.expires_at<=now())fail('PROPOSAL_EXPIRED',409);
      const saved=checked(userId,input),preview=JSON.parse(proposal.payload_json);
      if(saved.revision!==proposal.base_version)fail('VERSION_CONFLICT',409);
      if(knowledge.snapshot().digest!==proposal.knowledge_digest)fail('AI_CONTEXT_CHANGED',409);
      if(readMemory(userId).revision!==preview.memoryRevision)fail('AI_CONTEXT_CHANGED',409);
      const next={...saved.state,tasks:[...saved.state.tasks,preview.task],planVersion:preview.planVersionAfter,proposal:null};
      const result=business.save(userId,{state:next,baseVersion:saved.revision,mutationId:input.mutationId},{auditCode:'AGENT_ACTION_APPLIED'});
      const receipt={id:randomUUID(),proposalId:input.id,taskId:preview.task.id,revision:result.revision,planVersion:next.planVersion,appliedAt:now(),payloadDigest:hash(preview)};
      db.prepare('UPDATE agent_proposals SET receipt_json=?,mutation_id=? WHERE id=? AND user_id=?').run(JSON.stringify(receipt),input.mutationId,input.id,userId);
      return receipt;
    });
  }
  function history(userId){return {items:db.prepare('SELECT payload_json,receipt_json,expires_at FROM agent_proposals WHERE user_id=? ORDER BY rowid DESC LIMIT 30').all(userId).map(r=>({preview:JSON.parse(r.payload_json),receipt:r.receipt_json?JSON.parse(r.receipt_json):null,expired:r.expires_at<=now()}))};}
  function feedback(userId,input){
    if(!keys(input,['proposalId','answerRef','category'])||!['irrelevant','unsupported','unclear','useful','cannot_execute'].includes(input.category)||Boolean(input.proposalId)===Boolean(input.answerRef))fail('INVALID_REQUEST');
    let answer=null;
    if(input.proposalId){const p=db.prepare('SELECT 1 FROM agent_proposals WHERE id=? AND user_id=?').get(input.proposalId,userId);if(!p)fail('NOT_FOUND',404);}
    else{
      if(!keys(input.answerRef,['conversationId','messageId'])||!text(input.answerRef.conversationId,120)||!text(input.answerRef.messageId,120))fail('INVALID_REQUEST');
      const state=business.read(userId).state,conversation=state.conversations.find(c=>c.id===input.answerRef.conversationId),message=conversation?.messages.find(m=>m.id===input.answerRef.messageId);
      if(!message||message.role!=='assistant'||message.provider!=='deepseek'||!agentMessageAvailable(state,message)||!agentKnowledgeAvailable(message,knowledge.snapshot().digest))fail('NOT_FOUND',404);
      answer={...input.answerRef,promptVersion:message.agentResponse?.promptVersion||null,knowledgeVersion:message.agentResponse?.knowledgeVersion||null,sourceConsentId:message.sourceConsentId||null,origin:'user_reported_not_training_approval'};
    }
    const id=randomUUID();db.prepare('INSERT INTO agent_feedback(id,user_id,proposal_id,category,created_at,answer_ref_json) VALUES(?,?,?,?,?,?)').run(id,userId,input.proposalId||null,input.category,now(),answer?JSON.stringify(answer):null);return {id,saved:true,automaticTraining:false};
  }
  function readMemory(userId){const row=db.prepare('SELECT * FROM agent_memory WHERE user_id=?').get(userId);return {revision:row?.revision||0,preferences:row?JSON.parse(row.payload_json):null,automaticIngestion:false,externalUse:false};}
  function memory(userId,input){
    if(!keys(input,['baseRevision','preferences','confirmation'])||!Number.isSafeInteger(input.baseRevision)||input.confirmation!=='SAVE_PREFERENCES')fail('CONFIRMATION_REQUIRED');
    const p=input.preferences;
    if(p!==null&&(!keys(p,['learningPreference','reminderPreference'])||Object.values(p).some(v=>!text(v,300))))fail('INVALID_REQUEST');
    return atomic(()=>{const current=readMemory(userId);if(current.revision!==input.baseRevision)fail('VERSION_CONFLICT',409);
      db.prepare('INSERT INTO agent_memory VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,payload_json=excluded.payload_json,updated_at=excluded.updated_at').run(userId,current.revision+1,JSON.stringify(p),now());
      if(business.personalContext){const saved=business.read(userId);business.personalContext.refresh(userId,saved.state,saved.revision);}
      business.audit(userId,p===null?'AGENT_MEMORY_REVOKED':'AGENT_MEMORY_SAVED','agent');return readMemory(userId);});
  }
  function purge(userId){db.prepare('DELETE FROM agent_feedback WHERE user_id=?').run(userId);db.prepare('DELETE FROM agent_proposals WHERE user_id=?').run(userId);db.prepare('DELETE FROM agent_memory WHERE user_id=?').run(userId);}
  function health(){const s=knowledge.snapshot();return {knowledgeVersion:s.version,knowledgeDigest:s.digest,reviewedChunks:s.chunks.length,deterministicWorkflow:true};}
  function maintenance(){db.prepare('DELETE FROM agent_proposals WHERE expires_at<? AND receipt_json IS NULL OR expires_at<?').run(now()-86400000,now()-30*86400000);db.prepare('DELETE FROM agent_feedback WHERE created_at<?').run(now()-30*86400000);}
  return {analyse,propose,apply,history,feedback,readMemory,memory,purge,health,maintenance};
}
