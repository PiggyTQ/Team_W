// Aggregate operational evidence, never prompt text, materials, secrets or URLs.
export function createAgentOperations(db,{now=Date.now}={}){
  db.exec(`CREATE TABLE IF NOT EXISTS agent_operation_daily(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,day TEXT NOT NULL,operation TEXT NOT NULL,status INTEGER NOT NULL,count INTEGER NOT NULL,total_ms INTEGER NOT NULL,max_ms INTEGER NOT NULL,PRIMARY KEY(user_id,day,operation,status));`);
  const allowed=new Set(['respond','analyse','propose','apply','feedback','memory']);
  function record(userId,operation,status,durationMs){
    if(!allowed.has(operation)||!Number.isSafeInteger(status)||status<100||status>599)return;
    const elapsed=Math.max(0,Math.min(300000,Math.round(durationMs))),day=new Date(now()).toISOString().slice(0,10);
    // A late close after account deletion must not recreate personal records.
    if(!db.prepare('SELECT 1 FROM users WHERE id=?').get(userId))return;
    db.prepare('INSERT INTO agent_operation_daily VALUES(?,?,?,?,1,?,?) ON CONFLICT(user_id,day,operation,status) DO UPDATE SET count=count+1,total_ms=total_ms+excluded.total_ms,max_ms=MAX(max_ms,excluded.max_ms)').run(userId,day,operation,status,elapsed,elapsed);
    db.prepare('DELETE FROM agent_operation_daily WHERE day<?').run(new Date(now()-30*86400000).toISOString().slice(0,10));
  }
  function read(userId){return {retentionDays:30,promptLogging:false,rows:db.prepare('SELECT day,operation,status,count,total_ms,max_ms FROM agent_operation_daily WHERE user_id=? ORDER BY day DESC,operation LIMIT 180').all(userId)};}
  function purge(userId){db.prepare('DELETE FROM agent_operation_daily WHERE user_id=?').run(userId);}
  return {record,read,purge};
}
