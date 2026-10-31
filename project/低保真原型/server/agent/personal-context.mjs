import {createHash,randomUUID} from 'node:crypto';
import {businessError} from '../business-error.mjs';
import {careers} from '../../src/model.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value===undefined?null:value)).digest('hex');
const ordered=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
const RULE='personal-next-step-v1';
// No document bodies, chat history, private reflections or inferred personality.
export function projectPersonalContext(state,memoryRevision=0){
  const records=key=>ordered((state[key]||[]).map(row=>({id:row.id,version:row.version||1,status:row.status,
    ...(row.status==='已确认'?{contentDigest:hash(row)}:{})})));
  return {goal:careers.some(c=>c.id===state.goal)?state.goal:null,budget:Number(state.budget)||0,stage:state.stage,
    claims:ordered((state.claims||[]).map(row=>({id:row.id,version:row.version||1,status:row.status,taskId:row.taskId||null,
      ...(row.status==='已确认'?{skill:row.skill||'未知',contentDigest:hash({text:row.text,contribution:row.contribution,skill:row.skill,withdrawnThrough:row.withdrawnThrough})}:{})}))),
    education:records('education'),
    tasks:ordered((state.tasks||[]).map(t=>({id:t.id,version:t.version||1,career:t.career||null,status:t.status,completed:!!t.completed,hours:Number(t.hours),dependsOn:[...(t.dependsOn||[])].sort(),
      attempts:(t.attempts||[]).map(a=>({id:a.id,version:a.version,result:a.result})),claimStatus:t.claimStatus}))),
    reviews:ordered((state.reviews||[]).map(r=>({id:r.id,version:r.version||1,taskId:r.taskId}))),memoryRevision};
}
export function nextStepSuggestions(snapshot){
  const result=[],add=(id,reason,action,refs=[])=>result.push({id,kind:'rule_suggestion',reason,action,refs,independentlyVerified:false});
  const confirmed=snapshot.claims.filter(c=>c.status==='已确认'),pending=snapshot.claims.filter(c=>['待确认','疑似重复','矛盾'].includes(c.status));
  if(pending.length)add('confirm-materials','有尚未逐项核对的材料，不能作为已确认事实。',{route:'/assessment?tab=原文确认',label:'核对本人材料'},pending.map(c=>({kind:'claim',id:c.id,version:c.version})));
  if(!snapshot.goal)add('explore-goal','尚未选择主目标，可以先比较工作内容，不需要立即定方向。',{route:'/careers',label:'比较职业方向'});
  if(!confirmed.length)add('collect-evidence','目前没有本人确认材料，不能据此认定缺乏能力。',{route:'/assessment?tab=资料经历',label:'记录已有经历或作品'});
  const active=snapshot.tasks.filter(t=>!['完成','取消','跳过','延期'].includes(t.status)),allocated=active.reduce((n,t)=>n+t.hours,0);
  if(active.length&&allocated>=snapshot.budget)add('budget-full','当前任务已占用可用预算，新增任务前应先预览安排。',{route:'/plan',label:'核对时间预算'},active.map(t=>({kind:'task',id:t.id,version:t.version})));
  for(const t of active){
    const blocked=t.dependsOn.filter(id=>!snapshot.tasks.some(p=>p.id===id&&p.completed&&p.status==='完成'));
    if(blocked.length)add('dependency-'+t.id,'此任务的交付依赖尚未完成，可先处理依赖，不自动改动任务。',{route:'/plan',label:'查看依赖安排'},[t,...snapshot.tasks.filter(p=>blocked.includes(p.id))].map(p=>({kind:'task',id:p.id,version:p.version})));
    if(t.status==='受阻')add('blocked-'+t.id,'这项任务记录为受阻，可先澄清困难、缩小范围或调整安排。',{route:'/plan?tab=复盘&task='+encodeURIComponent(t.id),label:'记录困难与下一步'},[{kind:'task',id:t.id,version:t.version}]);
  }
  for(const t of snapshot.tasks.filter(t=>t.completed&&t.attempts.length)){
    if(!snapshot.claims.some(c=>c.taskId===t.id)&&!t.claimStatus?.includes('确认'))add('review-artifact-'+t.id,'已记录有限范围完成，可核对成果的本人贡献；完成与自检不等于能力认证。',{route:'/work/'+encodeURIComponent(t.id)+'?tab=完成回执',label:'核对成果与材料'},[{kind:'task',id:t.id,version:t.version}]);
    if(!snapshot.reviews.some(r=>r.taskId===t.id))add('reflect-'+t.id,'已有完成记录但尚无该任务复盘，可补充实际结果、局限与下一步。',{route:'/plan?tab=复盘&task='+encodeURIComponent(t.id),label:'保存一次复盘'},[{kind:'task',id:t.id,version:t.version}]);
  }
  if(snapshot.goal&&confirmed.length&&!active.length)add('plan-small-step','已有确认材料和目标，可以先核对未知项，再预览预算内的小范围实践。',{route:'/assistant',label:'核对材料与预览行动'},confirmed.map(c=>({kind:'claim',id:c.id,version:c.version})));
  return result.slice(0,30);
}

export function createPersonalContextStore(db,{now=Date.now}={}){
  db.exec(`CREATE TABLE IF NOT EXISTS personal_context_heads(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,revision INTEGER NOT NULL,basis_hash TEXT NOT NULL,snapshot_json TEXT NOT NULL,updated_at INTEGER NOT NULL,generation TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS personal_context_events(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,context_revision INTEGER NOT NULL,workspace_revision INTEGER NOT NULL,reasons_json TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS personal_context_event_owner ON personal_context_events(user_id,created_at);
    CREATE TABLE IF NOT EXISTS personal_suggestion_feedback(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,advice_key TEXT NOT NULL,suggestion_id TEXT NOT NULL,status TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(user_id,advice_key,suggestion_id));`);
  function memoryVersion(userId){return db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='agent_memory'").get()?db.prepare('SELECT revision FROM agent_memory WHERE user_id=?').get(userId)?.revision||0:0;}
  function refresh(userId,state,workspaceRevision){
    const own=!db.isTransaction;if(own)db.exec('BEGIN IMMEDIATE');
    try{
      const latest=db.prepare('SELECT revision FROM account_workspaces WHERE user_id=?').get(userId)?.revision||0;
      if(latest!==workspaceRevision)throw businessError('VERSION_CONFLICT',409,{currentVersion:latest});
      const snapshot=projectPersonalContext(state,memoryVersion(userId)),basis=hash(snapshot),old=db.prepare('SELECT * FROM personal_context_heads WHERE user_id=?').get(userId);
      if(old?.basis_hash===basis){if(own)db.exec('COMMIT');return {revision:old.revision,generation:old.generation,basisHash:basis,snapshot};}
      const before=old?JSON.parse(old.snapshot_json):null,reasons=before?Object.keys(snapshot).filter(k=>hash(snapshot[k])!==hash(before[k])):['initial_context'];
      const revision=(old?.revision||0)+1;
      const generation=old?.generation||randomUUID();
      db.prepare('INSERT INTO personal_context_heads VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,basis_hash=excluded.basis_hash,snapshot_json=excluded.snapshot_json,updated_at=excluded.updated_at').run(userId,revision,basis,JSON.stringify(snapshot),now(),generation);
      db.prepare('INSERT INTO personal_context_events VALUES(?,?,?,?,?,?)').run(randomUUID(),userId,revision,workspaceRevision,JSON.stringify(reasons),now());
      db.prepare('DELETE FROM personal_context_events WHERE user_id=? AND id IN (SELECT id FROM personal_context_events WHERE user_id=? ORDER BY rowid DESC LIMIT -1 OFFSET 1000)').run(userId,userId);
      // No withdrawn/deleted source snapshots or old advice bodies retained.
      db.prepare('DELETE FROM personal_suggestion_feedback WHERE user_id=?').run(userId);
      if(own)db.exec('COMMIT');return {revision,generation,basisHash:basis,snapshot};
    }catch(e){if(own)db.exec('ROLLBACK');throw e;}
  }
  function read(userId,state,workspaceRevision,knowledgeDigest){
    const context=refresh(userId,state,workspaceRevision),adviceKey=hash({generation:context.generation,revision:context.revision,basis:context.basisHash,rule:RULE,knowledgeDigest});
    const feedback=new Map(db.prepare('SELECT suggestion_id,status FROM personal_suggestion_feedback WHERE user_id=? AND advice_key=?').all(userId,adviceKey).map(r=>[r.suggestion_id,r.status]));
    return {contextRevision:context.revision,workspaceRevision,adviceKey,knowledgeDigest,ruleVersion:RULE,updatedAt:db.prepare('SELECT updated_at FROM personal_context_heads WHERE user_id=?').get(userId).updated_at,
      snapshot:context.snapshot,suggestions:nextStepSuggestions(context.snapshot).map(s=>({...s,status:feedback.get(s.id)||'new'})),providerCalled:false,automaticModelCalls:false,
      limitations:['这是当前账户保存状态触发的规则建议，不是模型推断或能力认证。','不自动读取私人反思、完整简历或历史对话，不修改目标、材料或任务。']};
  }
  function feedback(userId,state,workspaceRevision,knowledgeDigest,input){
    if(!input||Object.keys(input).some(k=>!['adviceKey','suggestionId','status'].includes(k))||!['read','dismissed','not_relevant'].includes(input.status))throw businessError('INVALID_REQUEST');
    const own=!db.isTransaction;if(own)db.exec('BEGIN IMMEDIATE');
    try{const current=read(userId,state,workspaceRevision,knowledgeDigest);if(current.adviceKey!==input.adviceKey)throw businessError('AI_CONTEXT_CHANGED',409);
      if(!current.suggestions.some(s=>s.id===input.suggestionId))throw businessError('NOT_FOUND',404);
      db.prepare('INSERT INTO personal_suggestion_feedback VALUES(?,?,?,?,?) ON CONFLICT(user_id,advice_key,suggestion_id) DO UPDATE SET status=excluded.status,created_at=excluded.created_at').run(userId,input.adviceKey,input.suggestionId,input.status,now());
      if(own)db.exec('COMMIT');return {saved:true,providerCalled:false};
    }catch(e){if(own)db.exec('ROLLBACK');throw e;}
  }
  const purge=userId=>{for(const table of ['personal_suggestion_feedback','personal_context_events','personal_context_heads'])db.prepare(`DELETE FROM ${table} WHERE user_id=?`).run(userId);};
  const events=userId=>({items:db.prepare('SELECT context_revision,workspace_revision,reasons_json,created_at FROM personal_context_events WHERE user_id=? ORDER BY rowid DESC LIMIT 100').all(userId).map(({reasons_json,...r})=>({...r,reasons:JSON.parse(reasons_json)}))});
  const maintenance=()=>{for(const table of ['personal_context_events','personal_suggestion_feedback'])db.prepare(`DELETE FROM ${table} WHERE created_at<?`).run(now()-30*86400000);};
  const exportData=userId=>({events:db.prepare('SELECT context_revision,workspace_revision,reasons_json,created_at FROM personal_context_events WHERE user_id=? ORDER BY rowid').all(userId).map(({reasons_json,...r})=>({...r,reasons:JSON.parse(reasons_json)})),feedback:db.prepare('SELECT advice_key,suggestion_id,status,created_at FROM personal_suggestion_feedback WHERE user_id=?').all(userId),retentionDays:30,maxEvents:1000});
  return {refresh,read,feedback,purge,events,maintenance,exportData};
}
