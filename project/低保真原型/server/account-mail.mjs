import {randomBytes,randomUUID,createHash,createCipheriv,createDecipheriv} from 'node:crypto';
const digest=s=>createHash('sha256').update(s).digest('hex');
const fail=()=>Object.assign(new Error('INVALID_OR_EXPIRED_TOKEN'),{code:'INVALID_OR_EXPIRED_TOKEN',status:400});
export function mailTransportFromEnvironment(env=process.env){
  if(env.MAIL_ENABLED!=='1')return null;
  const url=new URL(env.MAIL_WEBHOOK_URL||'');
  if(url.protocol!=='https:'||url.username||url.password||url.hash||!env.MAIL_WEBHOOK_TOKEN||!env.MAIL_FROM||!/^.{1,254}@[^\s@]+$/.test(env.MAIL_FROM))throw Error('MAIL_CONFIGURATION_INVALID');
  return async message=>{
    const response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.MAIL_WEBHOOK_TOKEN,'Idempotency-Key':message.deliveryId},body:JSON.stringify({...message,from:env.MAIL_FROM})});
    await response.body?.cancel();if(!response.ok)throw Error('MAIL_DELIVERY_FAILED');
  };
}
export function createAccountMail({db,origin,send=null,key='',now=Date.now}){
  const enabled=typeof send==='function';if(enabled&&!/^[a-fA-F0-9]{64}$/.test(key))throw Error('MAIL_OUTBOX_KEY_REQUIRED');
  const secret=enabled?Buffer.from(key,'hex'):null;
  db.exec(`CREATE TABLE IF NOT EXISTS account_email_verifications(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,verified_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS account_mail_tokens(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,purpose TEXT NOT NULL CHECK(purpose IN ('reset','verify')),credential_hash TEXT NOT NULL,expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS account_mail_expiry ON account_mail_tokens(expires_at);
    CREATE TABLE IF NOT EXISTS account_mail_outbox(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,ciphertext TEXT NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS account_mail_schema(version INTEGER PRIMARY KEY,applied_at INTEGER NOT NULL);`);
  db.prepare('INSERT OR IGNORE INTO account_mail_schema VALUES(1,?)').run(now());
  const credential=(u,purpose)=>digest(purpose==='reset'?u.password_hash:u.email);
  function encrypt(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret,iv),body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64');}
  function decrypt(value){const bytes=Buffer.from(value,'base64'),cipher=createDecipheriv('aes-256-gcm',secret,bytes.subarray(0,12));cipher.setAuthTag(bytes.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8'));}
  function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}}
  function request(email,purpose,owner){
    if(!enabled)throw Object.assign(new Error(purpose==='reset'?'RECOVERY_UNAVAILABLE':'EMAIL_UNAVAILABLE'),{code:purpose==='reset'?'RECOVERY_UNAVAILABLE':'EMAIL_UNAVAILABLE',status:503});
    const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);if(!u||owner&&owner!==u.id)return {accepted:true};
    if(db.prepare('SELECT count(*) n FROM account_mail_outbox').get().n>=500)throw Object.assign(new Error('SERVICE_UNAVAILABLE'),{code:'SERVICE_UNAVAILABLE',status:503});
    return transaction(()=>{
      const token=randomBytes(32).toString('hex'),id=randomUUID(),expires=now()+15*60000;
      db.prepare('DELETE FROM account_mail_tokens WHERE user_id=? AND purpose=?').run(u.id,purpose);
      db.prepare('INSERT INTO account_mail_tokens VALUES(?,?,?,?,?)').run(digest(token),u.id,purpose,credential(u,purpose),expires);
      db.prepare('INSERT INTO account_mail_outbox VALUES(?,?,?,?,0,?)').run(id,u.id,encrypt({to:u.email,purpose,url:origin+'/auth#'+purpose+'='+token,deliveryId:id}),expires,now());
      return {accepted:true};
    });
  }
  function peek(token,purpose){
    if(!enabled||!['reset','verify'].includes(purpose)||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw fail();
    const row=db.prepare('SELECT t.*,u.email,u.password_hash FROM account_mail_tokens t JOIN users u ON u.id=t.user_id WHERE token_hash=? AND purpose=? AND expires_at>?').get(digest(token),purpose,now());
    if(!row||row.credential_hash!==credential(row,purpose))throw fail();return row;
  }
  function consume(token,purpose,{passwordHash}={}){return transaction(()=>{
    const row=peek(token,purpose);
    if(purpose==='reset'){
      if(typeof passwordHash!=='string'||!passwordHash.startsWith('scrypt$'))throw fail();
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash,row.user_id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);
      db.prepare('DELETE FROM account_mail_tokens WHERE user_id=?').run(row.user_id);db.prepare('DELETE FROM account_mail_outbox WHERE user_id=?').run(row.user_id);
    }else{
      db.prepare('INSERT INTO account_email_verifications VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET verified_at=excluded.verified_at').run(row.user_id,now());
      db.prepare('DELETE FROM account_mail_tokens WHERE user_id=? AND purpose=?').run(row.user_id,'verify');
    }
    return {completed:true};
  });}
  let running=false,stopped=false;
  async function deliver(){if(!enabled||running||stopped)return;running=true;try{
    cleanup();const rows=db.prepare('SELECT * FROM account_mail_outbox WHERE next_attempt<=? AND attempts<3 ORDER BY next_attempt LIMIT 2').all(now());
    for(const row of rows){
      try{const message=decrypt(row.ciphertext),token=new URL(message.url).hash.split('=')[1];
        try{peek(token,message.purpose);}catch(error){if(error.code==='INVALID_OR_EXPIRED_TOKEN'){db.prepare('DELETE FROM account_mail_outbox WHERE id=?').run(row.id);continue;}throw error;}
        await send(message);if(stopped)return;db.prepare('DELETE FROM account_mail_outbox WHERE id=?').run(row.id);
      }catch{if(stopped)return;db.prepare('UPDATE account_mail_outbox SET attempts=attempts+1,next_attempt=? WHERE id=?').run(now()+60000*(row.attempts+1),row.id);}
    }
  }finally{running=false;}}
  function cleanup(){db.prepare('DELETE FROM account_mail_tokens WHERE expires_at<=?').run(now());db.prepare('DELETE FROM account_mail_outbox WHERE expires_at<=?').run(now());}
  return {enabled,request,peek,consume,deliver,cleanup,stop:()=>{stopped=true;},verified:userId=>!!db.prepare('SELECT 1 FROM account_email_verifications WHERE user_id=?').get(userId),status:()=>({configured:enabled,queued:db.prepare('SELECT count(*) n FROM account_mail_outbox WHERE attempts<3').get().n,failed:db.prepare('SELECT count(*) n FROM account_mail_outbox WHERE attempts>=3').get().n})};
}
