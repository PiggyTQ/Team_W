import http from 'node:http';
import {randomBytes,randomUUID,createHash,scrypt as rawScrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {normalizeEmail,validateCredentials,authMessage,AUTH_POLICY} from '../src/auth-contract.js';
import {createBusinessStore} from './business-store.mjs';
import {createKnowledgeStore} from './knowledge-store.mjs';
import {createPublicTranslations} from './public-translations.mjs';
import {agentFromEnvironment} from './agent/service.mjs';
import {createAgentWorkflow} from './agent/workflow.mjs';
import {loadGuidance,reviewedLibrary} from './agent/library.mjs';
import {createAgentOperations} from './agent/operations.mjs';
import {createBusinessCommands} from './business-commands.mjs';
import {planningReportPreview} from './planning-report.mjs';
import {createRuntimeOperations} from './runtime-operations.mjs';
import {createConcurrencyGate} from './concurrency-gate.mjs';
import {createAccountMail,mailTransportFromEnvironment} from './account-mail.mjs';
import {createPlatformAdmin} from './platform-admin.mjs';

const scrypt=promisify(rawScrypt),hash=value=>createHash('sha256').update(value).digest('hex');
const KDF={N:131072,r:8,p:1,maxmem:192*1024*1024};
const DAY=86400000,SESSION_AGE=7*DAY,IDLE_AGE=30*60000;
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right);};
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split('=')).filter(([k,v])=>k&&v));
async function passwordHash(password,salt=randomBytes(16).toString('hex')) {
  const key=await scrypt(password,salt,64,KDF);
  return `scrypt$${KDF.N}$8$1$${salt}$${key.toString('hex')}`;
}
async function passwordMatches(password,stored) {
  const parts=stored.split('$');
  if(parts.length!==6||parts[0]!=='scrypt'||Number(parts[1])!==KDF.N)return false;
  return equal(await passwordHash(password,parts[4]),stored);
}
function failure(code,status=400,fields) {return Object.assign(new Error(code),{code,status,fields});}
async function readJSON(req,maxBytes=8192) {
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw failure('INVALID_REQUEST',415);
  let bytes=0;const chunks=[];
  for await(const chunk of req){bytes+=chunk.length;if(bytes>maxBytes)throw failure('WORKSPACE_TOO_LARGE',413);chunks.push(chunk);}
  try {const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!data||Array.isArray(data)||typeof data!=='object')throw 0;return data;}
  catch{throw failure('INVALID_REQUEST',400);}
}

export async function createAuthServer({database=process.env.AUTH_DATABASE||'./server/data/auth.sqlite',knowledgeDatabase,origin=process.env.PUBLIC_ORIGIN||'http://127.0.0.1:3001',production=process.env.NODE_ENV==='production',trustProxy=process.env.TRUST_PROXY==='1',now=Date.now,agentFactory=agentFromEnvironment,opsToken=process.env.OPS_READ_TOKEN||'',mailTransport=mailTransportFromEnvironment(),mailKey=process.env.MAIL_OUTBOX_KEY||'',mailDeliveryIntervalMs=10000}={}) {
  const publicURL=new URL(origin);
  if(publicURL.origin!==origin||production&&publicURL.protocol!=='https:')throw new Error('PUBLIC_ORIGIN must be an HTTPS origin in production');
  mkdirSync(dirname(resolve(database)),{recursive:true,mode:0o700});
  const db=new DatabaseSync(database);
  chmodSync(database,0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA secure_delete=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL,terms_version TEXT NOT NULL,consented_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL,last_seen INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset_at INTEGER NOT NULL);`);
  const business=createBusinessStore(db,{now});
  const mail=createAccountMail({db,origin,send:mailTransport,key:mailKey,now});
  const administration=createPlatformAdmin({db,now}),guidanceFile=process.env.AI_REVIEWED_KNOWLEDGE_FILE||undefined;
  administration.seedBaseline(loadGuidance(guidanceFile));
  business.guidancePack=()=>administration.currentPack(()=>loadGuidance(guidanceFile));
  const agent=agentFactory(business);
  const workflow=createAgentWorkflow({db,business,now,knowledge:reviewedLibrary(business.guidancePack),loadPack:business.guidancePack});
  const agentOperations=createAgentOperations(db,{now});
  const knowledge=createKnowledgeStore(knowledgeDatabase);
  const commands=createBusinessCommands({db,business,knowledge,now});
  const publicCopy=createPublicTranslations();
  const dummy=await passwordHash(randomBytes(32).toString('hex'));
  const cookiePrefix=production?'__Host-':'',sessionName=`${cookiePrefix}cg_session`,csrfName=`${cookiePrefix}cg_csrf`;
  const operations=createRuntimeOperations({token:opsToken}),hashing=createConcurrencyGate();
  const cookie=(name,value,age=SESSION_AGE/1000)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${production?'; Secure':''}`;
  const setCookies=(res,values)=>res.setHeader('Set-Cookie',[...(res.getHeader('Set-Cookie')||[]),...values]);
  const csrf=(req,res,rotate=false)=>{
    let value=cookies(req)[csrfName];
    if(rotate||!value||!/^\w{64}$/.test(value)){value=randomBytes(32).toString('hex');setCookies(res,[cookie(csrfName,value)]);}
    return value;
  };
  function session(req,touch=false) {
    const token=cookies(req)[sessionName];
    if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
    const row=db.prepare('SELECT users.id,users.email,sessions.expires_at,sessions.last_seen FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=?').get(hash(token));
    if(!row)return null;
    if(row.expires_at<=now()||row.last_seen+IDLE_AGE<=now()){db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));return null;}
    if(touch)db.prepare('UPDATE sessions SET last_seen=? WHERE token_hash=?').run(now(),hash(token));
    return {id:row.id,email:row.email,emailVerified:mail.verified(row.id)};
  }
  function revoke(req) {const token=cookies(req)[sessionName];if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));}
  function issue(req,res,user) {
    revoke(req);
    const token=randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(token),user.id,now()+SESSION_AGE,now());
    setCookies(res,[cookie(sessionName,token)]);
    return {user:{id:user.id,email:user.email,emailVerified:mail.verified(user.id)},csrfToken:csrf(req,res,true)};
  }
  function limit(key,max,window) {
    const keyHash=hash(key),row=db.prepare('SELECT count,reset_at FROM rate_limits WHERE key=?').get(keyHash);
    if(row&&row.reset_at>now()&&row.count>=max)throw Object.assign(failure('RATE_LIMITED',429),{retryAfter:Math.max(1,Math.ceil((row.reset_at-now())/1000))});
    db.prepare('INSERT INTO rate_limits VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,reset_at=excluded.reset_at').run(keyHash,row&&row.reset_at>now()?row.count+1:1,row&&row.reset_at>now()?row.reset_at:now()+window);
  }
  const server=http.createServer(async(req,res)=>{
    operations.begin(req,res);
    const requestId=randomUUID();
    res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Request-Id',requestId);
    const send=(status,body)=>{res.statusCode=status;res.end(body===undefined?undefined:JSON.stringify(body));};
    try {
      const path=new URL(req.url,'http://localhost').pathname;
      if(req.method==='GET'&&['/api/health','/api/ready'].includes(path)){send(200,business.ready());return;}
      if(!path.startsWith('/api/'))throw failure('NOT_FOUND',404);
      if(production&&!(trustProxy&&req.headers['x-forwarded-proto']==='https'))throw failure('INSECURE_TRANSPORT',403);
      if(req.headers.origin&&req.headers.origin!==origin)throw failure('CSRF_REJECTED',403);
      if(req.headers['sec-fetch-site']==='cross-site')throw failure('CSRF_REJECTED',403);
      if(req.method==='GET'&&path==='/api/ops/metrics'){
        if(!operations.authorized(req.headers.authorization))throw failure('NOT_FOUND',404);
        send(200,{...operations.snapshot(),authHashing:hashing.snapshot(),mail:mail.status()});return;
      }
      if(req.headers['x-account-id']&&!['/api/auth/session','/api/auth/login','/api/auth/register','/api/auth/recover'].includes(path)){
        const bound=session(req);if(bound&&bound.id!==req.headers['x-account-id'])throw failure('ACCOUNT_CHANGED',409);
      }
      if(!path.startsWith('/api/auth/')) {
        const user=session(req);if(!user)throw failure('SESSION_EXPIRED',401);
        if(req.method==='POST'&&path.startsWith('/api/agent/')){const started=now(),operation=path.split('/').at(-1);res.once('finish',()=>{try{agentOperations.record(user.id,operation,res.statusCode,now()-started);}catch{console.warn('Agent aggregate metric unavailable');}});}
        if(req.method==='GET') {
          if(path==='/api/agent/workflow'){send(200,{...workflow.health(),...workflow.history(user.id)});return;}
          if(path==='/api/agent/memory'){send(200,workflow.readMemory(user.id));return;}
          if(path==='/api/agent/knowledge-status'){send(200,workflow.health());return;}
          if(path==='/api/agent/personal-context'||path==='/api/agent/suggestions'){
            const saved=business.read(user.id);send(200,business.personalContext.read(user.id,saved.state,saved.revision,workflow.health().knowledgeDigest));return;
          }
          if(path==='/api/agent/context-events'){send(200,business.personalContext.events(user.id));return;}
          if(path==='/api/agent/operations'){send(200,agentOperations.read(user.id));return;}
          if(path==='/api/admin/status'){send(200,administration.list(user.id));return;}
          if(path==='/api/admin/operations'){if(!administration.roles(user.id).includes('operator'))throw failure('ADMIN_FORBIDDEN',403);send(200,{...operations.snapshot(),authHashing:hashing.snapshot(),mail:mail.status()});return;}
          if(path==='/api/workspace'){send(200,business.read(user.id));return;}
          if(path==='/api/commands'){send(200,commands.list(user.id));return;}
          const receiptMatch=path.match(/^\/api\/commands\/([-a-zA-Z0-9]{16,100})$/);
          if(receiptMatch){send(200,commands.get(user.id,receiptMatch[1]));return;}
          if(path==='/api/catalog/courses'){send(200,publicCopy.envelope(business.catalog()));return;}
          const courseMatch=path.match(/^\/api\/catalog\/courses\/([a-z-]+)$/);
          if(courseMatch){const params=new URL(req.url,'http://localhost').searchParams;send(200,publicCopy.envelope({course:business.courseLibrary.course(courseMatch[1],params.has('version')?params.get('version'):undefined)}));return;}
          const assetMatch=path.match(/^\/api\/catalog\/courses\/([a-z-]+)\/assets\/(\d+)\/([a-f0-9]{24})$/);
          if(assetMatch){const asset=business.courseLibrary.asset(assetMatch[1],assetMatch[2],assetMatch[3]);res.setHeader('Content-Type',asset.mime);res.setHeader('Content-Disposition',`attachment; filename="course-material${asset.filename.match(/\.[a-z0-9]+$/)?.[0]||'.txt'}"; filename*=UTF-8''${encodeURIComponent(asset.filename)}`);res.setHeader('Content-Length',asset.bytes);res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('X-Content-SHA256',asset.sha256);res.end(Buffer.from(asset.body));return;}
          if(path==='/api/system/capabilities'){const courses=business.courseLibrary.availability(),agentState=agent.capabilities(user.id);send(200,{schemaVersion:4,workspacePersistence:true,businessCommands:commands.types,commandReceiptRetentionDays:30,adminRoles:administration.roles(user.id),emailRecovery:mail.enabled,emailVerification:mail.enabled,ai:agentState.enabled,agent:agentState,coursesPending:courses.published!==courses.count,publishedCourses:courses.published,courseDownloads:courses.published>0,accountDeletion:true,knowledgeCatalog:!!knowledge,demoData:!!knowledge,evidenceComparison:!!knowledge,reportCompilation:!!knowledge});return;}
          if(path.startsWith('/api/catalog/')&&knowledge){const result=knowledge.get(path,new URL(req.url,'http://localhost').searchParams);if(result!==undefined){send(200,publicCopy.envelope(result));return;}}
          if(path==='/api/workspace/export'){business.audit(user.id,'WORKSPACE_EXPORTED');res.setHeader('Content-Disposition','attachment; filename="career-growth-data.json"');send(200,{exportedAt:new Date(now()).toISOString(),...business.read(user.id),agentWorkflow:workflow.history(user.id),agentMemory:workflow.readMemory(user.id),agentOperations:agentOperations.read(user.id),personalContext:business.personalContext.exportData(user.id)});return;}
          const match=path.match(/^\/api\/records\/([a-zA-Z]+)(?:\/([^/]+))?$/);
          if(match){send(200,business.records(user.id,match[1],match[2]?decodeURIComponent(match[2]):undefined));return;}
          throw failure('NOT_FOUND',404);
        }
        if(req.headers.origin!==origin||!equal(req.headers['x-csrf-token'],cookies(req)[csrfName]))throw failure('CSRF_REJECTED',403);
        limit(`workspace:${user.id}`,180,60000);
        if(req.method==='POST'&&path==='/api/agent/suggestions/feedback'){
          const input=await readJSON(req),saved=business.read(user.id);
          send(200,business.personalContext.feedback(user.id,saved.state,saved.revision,workflow.health().knowledgeDigest,input));return;
        }
        if(req.method==='POST'&&path==='/api/admin/commands'){limit(`admin:${user.id}`,20,60000);send(200,administration.execute(user.id,await readJSON(req,768*1024)));return;}
        if(req.method==='POST'&&path==='/api/commands'){
          limit(`business-commands:${user.id}`,60,60000);
          const receipt=commands.execute(user.id,await readJSON(req,768*1024));
          if(receipt.type==='assessment.create'){
            const state=business.read(user.id).state,analysis=[state.analysis,...state.analysisHistory||[]].find(row=>row?.id===receipt.refs.analysisId);
            send(200,{...receipt,publicTranslations:publicCopy.envelope({skillRows:analysis?.skillRows,dimensions:analysis?.dimensions,notice:analysis?.notice}).publicTranslations});
          }else send(200,receipt);
          return;
        }
        if(req.method==='POST'&&['/api/agent/analyse','/api/agent/propose','/api/agent/apply','/api/agent/feedback','/api/agent/memory'].includes(path)){
          limit(`agent-workflow:${user.id}`,30,60000);
          const action=path.split('/').at(-1),data=await readJSON(req,8192);
          send(200,workflow[action](user.id,data));return;
        }
        if(req.method==='POST'&&path==='/api/agent/respond'){
          limit(`agent-minute:${user.id}`,10,60000);
          limit(`agent-day:${user.id}`,60,86400000);
          const data=await readJSON(req,16384),controller=new AbortController();
          const cancel=()=>{if(!res.writableEnded)controller.abort();};
          res.on('close',cancel);
          try{send(200,await agent.respond(user.id,data,{signal:controller.signal,stillAuthorized:()=>session(req)?.id===user.id}));}
          finally{res.removeListener('close',cancel);}
          return;
        }
        if(req.method==='POST'&&['/api/services/assessment','/api/services/report','/api/services/report-preview'].includes(path)){
          if(!knowledge)throw failure('CATALOG_UNAVAILABLE',503);
          const data=await readJSON(req),saved=business.read(user.id);
          if(data.baseVersion!==saved.revision)throw Object.assign(failure('VERSION_CONFLICT',409),{currentVersion:saved.revision});
          if(path.endsWith('/report-preview')){send(200,{...planningReportPreview(saved.state,knowledge),baseVersion:saved.revision});return;}
          if(path.endsWith('/assessment')){const analysis=knowledge.assess(saved.state);send(200,{analysis,baseVersion:saved.revision,publicTranslations:publicCopy.envelope({skillRows:analysis.skillRows,dimensions:analysis.dimensions,notice:analysis.notice}).publicTranslations});return;}
          send(200,knowledge.report(saved.state,data.language));return;
        }
        if(req.method==='PUT'&&path==='/api/workspace'){const data=await readJSON(req,768*1024);if(data.actorId!==user.id)throw failure('ACCOUNT_CHANGED',409);send(200,business.save(user.id,data));return;}
        throw failure('NOT_FOUND',404);
      }
      if(req.method==='GET'&&['/api/auth/session','/api/auth/me'].includes(path)) {
        const user=session(req);
        if(path.endsWith('/me')&&!user)throw failure('SESSION_EXPIRED',401);
        send(200,{user,csrfToken:csrf(req,res),recoveryAvailable:mail.enabled});return;
      }
      if(req.method==='GET'&&path==='/api/auth/sessions') {
        const user=session(req);if(!user)throw failure('SESSION_EXPIRED',401);
        const current=hash(cookies(req)[sessionName]||'');
        send(200,{sessions:db.prepare('SELECT token_hash,expires_at,last_seen FROM sessions WHERE user_id=? AND expires_at>? AND last_seen>? ORDER BY last_seen DESC').all(user.id,now(),now()-IDLE_AGE).map(row=>({id:hash(row.token_hash).slice(0,16),current:row.token_hash===current,createdAt:row.expires_at-SESSION_AGE,lastSeen:row.last_seen,expiresAt:row.expires_at}))});return;
      }
      if(req.method!=='POST')throw failure('NOT_FOUND',404);
      if(req.headers.origin!==origin||!equal(req.headers['x-csrf-token'],cookies(req)[csrfName]))throw failure('CSRF_REJECTED',403);
      const ip=trustProxy?req.headers['x-real-ip']||req.socket.remoteAddress:req.socket.remoteAddress;
      if(path==='/api/auth/refresh'){const user=session(req,true);if(!user)throw failure('SESSION_EXPIRED',401);send(200,{user});return;}
      if(path==='/api/auth/logout'){revoke(req);setCookies(res,[cookie(sessionName,'',0)]);send(200,{csrfToken:csrf(req,res,true)});return;}
      if(path==='/api/auth/request-verification'){
        const user=session(req);if(!user)throw failure('SESSION_EXPIRED',401);limit(`verify:${user.id}`,3,3600000);
        send(202,mail.request(user.email,'verify',user.id));return;
      }
      if(path==='/api/auth/reset-password'||path==='/api/auth/verify-email'){
        limit(`mail-token:${ip}`,30,15*60000);const data=await readJSON(req);
        if(path.endsWith('/verify-email')){send(200,mail.consume(data.token,'verify'));return;}
        const token=mail.peek(data.token,'reset');
        const fields=validateCredentials('register',{email:token.email,password:data.newPassword,agree:true,termsVersion:AUTH_POLICY.termsVersion});
        if(fields.password)throw failure(fields.password,400,fields);
        const releaseHash=await hashing.acquire();try{const password=await passwordHash(data.newPassword);send(200,mail.consume(data.token,'reset',{passwordHash:password}));}finally{releaseHash();}return;
      }
      if(['/api/auth/change-password','/api/auth/revoke-others','/api/auth/clear-workspace','/api/auth/delete-account'].includes(path)) {
        const user=session(req);if(!user)throw failure('SESSION_EXPIRED',401);
        const data=await readJSON(req);limit(`reauth:${user.id}`,8,15*60000);
        if(typeof data.currentPassword!=='string'||[...data.currentPassword].length>128)throw failure('INVALID_CREDENTIALS',401);
        const releaseHash=await hashing.acquire();
        try {
          const stored=db.prepare('SELECT password_hash FROM users WHERE id=?').get(user.id);
          if(!stored||!await passwordMatches(data.currentPassword,stored.password_hash))throw failure('INVALID_CREDENTIALS',401);
          if(path.endsWith('/change-password')) {
            const fields=validateCredentials('register',{email:user.email,password:data.newPassword,agree:true,termsVersion:AUTH_POLICY.termsVersion});
            if(fields.password)throw failure(fields.password,400);
            const next=await passwordHash(data.newPassword);
            db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(next,user.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);business.audit(user.id,'PASSWORD_CHANGED','account');const result=issue(req,res,user);db.exec('COMMIT');send(200,result);}catch(error){db.exec('ROLLBACK');throw error;}
          }else if(path.endsWith('/revoke-others')) {
            const count=db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>?').run(user.id,hash(cookies(req)[sessionName]||'')).changes;business.audit(user.id,'OTHER_SESSIONS_REVOKED','account');send(200,{revoked:count});
          }else if(path.endsWith('/clear-workspace')) {
            if(data.confirmation!=='CLEAR_WORKSPACE')throw failure('CONFIRMATION_REQUIRED',400);
            db.exec('BEGIN IMMEDIATE');let cleared;
            try{cleared=business.clear(user.id,data.baseVersion);workflow.purge(user.id);agentOperations.purge(user.id);commands.purge(user.id);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
            try{db.exec('PRAGMA wal_checkpoint(TRUNCATE)');}catch{console.warn('Database checkpoint deferred after committed workspace clear');}
            send(200,cleared);
          }else {
            if(data.confirmation!=='DELETE_ACCOUNT'||normalizeEmail(data.email)!==user.email)throw failure('CONFIRMATION_REQUIRED',400);
            db.exec('BEGIN IMMEDIATE');try{db.prepare('DELETE FROM users WHERE id=?').run(user.id);business.audit(null,'ACCOUNT_DELETED','account');db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
            try{db.exec('PRAGMA wal_checkpoint(TRUNCATE)');}catch{console.warn('Database checkpoint deferred after committed account deletion');}
            setCookies(res,[cookie(sessionName,'',0)]);send(200,{deleted:true,csrfToken:csrf(req,res,true),backupRetentionDays:14});
          }
        }finally{releaseHash();}
        return;
      }
      if(!['/api/auth/login','/api/auth/register','/api/auth/recover'].includes(path))throw failure('NOT_FOUND',404);
      limit(`ip:${ip}`,60,15*60000);
      const data=await readJSON(req),mode=path.split('/').at(-1),email=normalizeEmail(data.email),fields=validateCredentials(mode,data);
      if(Object.keys(fields).length)throw failure(Object.values(fields)[0],400,fields);
      limit(`email:${email}`,10,15*60000);
      if(mode==='recover'){send(202,mail.request(email,'reset'));return;}
            if(mode==='register')limit(`register:${ip}`,25,60*60000);
      const releaseHash=await hashing.acquire();
      try {
        if(mode==='register') {
          const password=await passwordHash(data.password),user={id:randomUUID(),email};
          try {db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(user.id,email,password,now(),AUTH_POLICY.termsVersion,now());}
          catch(error){if(error.code==='ERR_SQLITE_ERROR'&&String(error.message).includes('UNIQUE'))throw failure('ACCOUNT_UNAVAILABLE',409);throw error;}
          send(201,issue(req,res,user));
        } else {
          const user=db.prepare('SELECT id,email,password_hash FROM users WHERE email=?').get(email);
          const matches=await passwordMatches(data.password,user?.password_hash||dummy);
          if(!user||!matches)throw failure('INVALID_CREDENTIALS',401);
          send(200,issue(req,res,user));
        }
      }finally{releaseHash();}
    }catch(error){
      const status=error.status||503,code=error.code&&error.status?error.code:'SERVICE_UNAVAILABLE';
      if(error.retryAfter)res.setHeader('Retry-After',String(error.retryAfter));
      if(!error.status)console.error(JSON.stringify({requestId,code:'INTERNAL_ERROR'}));
      send(status,{code,message:authMessage(code),...(error.fields?{fields:error.fields}:{}),...(Number.isInteger(error.currentVersion)?{currentVersion:error.currentVersion}:{}),requestId});
    }
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=50;
  const cleanup=setInterval(()=>{try{db.prepare('DELETE FROM sessions WHERE expires_at<=? OR last_seen<=?').run(now(),now()-IDLE_AGE);db.prepare('DELETE FROM rate_limits WHERE reset_at<=?').run(now());business.maintenance();workflow.maintenance();commands.maintenance();mail.cleanup();administration.cleanup();}catch{operations.maintenanceFailed();console.error(JSON.stringify({code:'MAINTENANCE_FAILED'}));}},60000);cleanup.unref();
  const mailTimer=setInterval(()=>mail.deliver().catch(()=>operations.maintenanceFailed()),mailDeliveryIntervalMs);mailTimer.unref();
  server.on('close',()=>{clearInterval(mailTimer);mail.stop();clearInterval(cleanup);hashing.close();operations.close();agent.close?.();knowledge?.close();db.close();});
  return server;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const server=await createAuthServer();
  server.listen(Number(process.env.PORT||3001),'127.0.0.1',()=>console.log('Account service listening on loopback'));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
