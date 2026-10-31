// Tests only a new synthetic account. Stage copies only the seven public course tables.
import fs from 'node:fs';
import {randomUUID,randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const phase=process.argv[2],work=new URL('./',import.meta.url),origin='https://47.250.133.180';assert.ok(['stage','production'].includes(phase));
const report={phase,syntheticDataOnly:true,realProviderCalls:0,productionUserRowsInspected:false,checks:[],passed:false},password=`Smoke-${randomBytes(20).toString('base64url')}!9`,email=`business-smoke-${randomUUID()}@example.invalid`;
let server,base,account,csrf='';const jar=new Map();
const check=name=>report.checks.push(name);
async function request(path,data,method=data?'POST':'GET',headers={}){
  const response=await fetch(base+path,{method,headers:{Origin:origin,'X-Forwarded-Proto':'https',Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...(account?{'X-Account-Id':account.id}:{}),...(data?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});
  for(const cookie of response.headers.getSetCookie()){const [k,v]=cookie.split(';')[0].split('=');jar.set(k,v);}const body=await response.json();if(body.csrfToken)csrf=body.csrfToken;return {status:response.status,body};
}
async function saved(){return (await request('/api/workspace')).body;}
async function put(patch){const s=await saved(),result=await request('/api/workspace',{actorId:account.id,state:{...s.state,...patch},baseVersion:s.revision,mutationId:randomUUID()},'PUT');assert.equal(result.status,200,JSON.stringify(result.body));}
async function command(type,payload={}){const s=await saved(),input={type,payload,baseVersion:s.revision,mutationId:randomUUID()},result=await request('/api/commands',input);assert.equal(result.status,200,JSON.stringify(result.body));return {receipt:result.body,input};}
try{
 if(phase==='stage'){
  process.env.AI_ENABLED='0';const {createAuthServer}=await import('./stage/server/auth-server.mjs');const dbPath=fileURLToPath(new URL('smoke/auth.sqlite',work));
  assert.ok(!fs.existsSync(dbPath),'Stage smoke database must be fresh');
  server=await createAuthServer({database:dbPath,knowledgeDatabase:'/srv/career-growth/source/server/data/knowledge.sqlite',origin,production:false,trustProxy:false});
  const source=new DatabaseSync('/var/lib/career-growth/auth.sqlite',{readOnly:true}),target=new DatabaseSync(dbPath);
  const tables=['courses','course_chapters','course_media','course_versions','course_chapter_versions','course_video_versions','course_assets'];
  try{source.exec('BEGIN');target.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE');
   for(const table of [...tables].reverse())target.exec(`DELETE FROM ${table}`);
   for(const table of tables){const rows=source.prepare(`SELECT * FROM ${table}`).all();if(rows.length){const insert=target.prepare(`INSERT INTO ${table} VALUES(${Object.keys(rows[0]).map(()=>'?').join(',')})`);for(const row of rows)insert.run(...Object.values(row));}}
   target.exec('COMMIT');source.exec('ROLLBACK');
  }finally{source.close();target.close();}
  await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 }else base=origin;
 await request('/api/auth/session');const {AUTH_POLICY}=await import('./stage/src/auth-contract.js');
 const registered=await request('/api/auth/register',{email,password,agree:true,termsVersion:AUTH_POLICY.termsVersion});assert.equal(registered.status,201,JSON.stringify(registered.body));account=registered.body.user;check('synthetic account registration and authenticated storage');
 const caps=(await request('/api/system/capabilities')).body;assert.equal(caps.ai,false);assert.equal(caps.businessCommands.length,13);assert.equal(caps.publishedCourses,4);check('AI off, 13 commands advertised and four courses preserved');
 const firstContext=(await request('/api/agent/personal-context')).body;
 assert.equal(firstContext.automaticModelCalls,false);assert.ok(firstContext.adviceKey);
 const firstCard=firstContext.suggestions[0];assert.equal((await request('/api/agent/suggestions/feedback',{adviceKey:firstContext.adviceKey,suggestionId:firstCard.id,status:'dismissed'})).status,200);
 await put({aiDraft:'PRIVATE_UNSENT_DRAFT'});assert.equal((await request('/api/agent/personal-context')).body.contextRevision,firstContext.contextRevision);check('ordinary drafts do not refresh context or call a model');
 await put({budget:4,goal:'data',claims:[{id:'smoke-claim',title:'合成材料',text:'合成 SQL 练习，未独立核验',skill:'SQL',status:'待确认',version:1}]});
 await command('claim.confirm',{claimId:'smoke-claim',claimVersion:1,text:'本人确认合成 SQL 练习',contribution:'测试本人整理',resolution:'confirm',confirmation:'CONFIRM_SELF_REPORT'});check('material confirmation with durable receipt');
 const updatedContext=(await request('/api/agent/suggestions')).body;
 assert.notEqual(updatedContext.adviceKey,firstContext.adviceKey);assert.ok(updatedContext.suggestions.some(s=>s.id==='plan-small-step'));
 assert.equal((await request('/api/agent/suggestions/feedback',{adviceKey:firstContext.adviceKey,suggestionId:firstCard.id,status:'read'})).status,409);
 assert.equal((await request('/api/agent/personal-context',undefined,'GET',{'X-Account-Id':'different-synthetic-owner'})).status,409);
 assert.equal(JSON.stringify(updatedContext).includes('PRIVATE_UNSENT_DRAFT'),false);check('events update personal advice and reject stale feedback and foreign account access');
 await command('assessment.create');assert.ok((await saved()).state.analysis.authority);check('server assessment persisted with provenance');
 const creation=await command('task.create',{draft:{title:'合成课程实践',purpose:'验证提交和完成闭环',template:'quality',hours:1},confirmation:'CREATE_TASK'}),taskId=creation.receipt.refs.taskId;
 let task=(await saved()).state.tasks[0];assert.equal(task.courseVersion,1);await command('task.start',{taskId,taskVersion:task.version});task=(await saved()).state.tasks[0];
 await put({tasks:[{...task,draft:'合成产物：问题、理由和局限',contribution:'测试本人整理'}]});task=(await saved()).state.tasks[0];
 const submission=await command('task.submit',{taskId,taskVersion:task.version,confirmation:'SUBMIT_ATTEMPT'});assert.equal((await request('/api/commands',submission.input)).body.duplicate,true);assert.equal((await saved()).state.tasks[0].attempts.length,1);check('course task, artifact submission and duplicate replay');
 task=(await saved()).state.tasks[0];await command('task.selfcheck',{taskId,taskVersion:task.version,attemptId:submission.receipt.refs.attemptId,confirmation:'SELF_CHECK_ONLY'});
 task=(await saved()).state.tasks[0];await put({tasks:[{...task,selfcheck:true}]});task=(await saved()).state.tasks[0];await command('task.complete',{taskId,taskVersion:task.version,confirmation:'COMPLETE_LIMITED_SCOPE'});assert.ok((await saved()).state.tasks[0].completionReceipt);check('self-check and limited completion remain distinct');
 task=(await saved()).state.tasks[0];await command('evidence.candidates',{taskId,taskVersion:task.version,attemptId:submission.receipt.refs.attemptId,entries:[{skill:'SQL',scope:'仅合成任务',location:'当前成果'}],contribution:'测试本人整理',confirmation:'GENERATE_CANDIDATES'});assert.equal((await saved()).state.claims.at(-1).status,'待确认');check('artifact candidates remain unconfirmed');
 const s=await saved(),preview=(await request('/api/services/report-preview',{baseVersion:s.revision})).body;
 await command('report.compose',{title:'合成章节报告',kind:'report',sections:preview.body.split('\n').map(line=>line.split('：')[0]),previewVersion:s.revision,previewDigest:preview.digest,confirmation:'COMPOSE_REPORT'});
 await command('report.compile',{confirmation:'COMPILE_REPORT'});assert.equal((await saved()).state.reports.length,2);check('preview-based report and compiled snapshot both persisted');
 await command('experience.record',{title:'既往合成行动',text:'记录过一次有限探索，结论未知',confirmation:'RECORD_SELF_REPORT'});assert.equal((await saved()).state.tasks.at(-1).hours,0);check('zero-hour historical action saves without fabricating budget');
 await command('claim.withdraw',{claimId:'smoke-claim',claimVersion:2,confirmation:'WITHDRAW_CLAIM'});assert.equal((await saved()).state.analysisStale,true);check('withdrawal persists and invalidates analysis');
 assert.equal((await request('/api/commands/'+submission.receipt.id,undefined,'GET',{'X-Account-Id':'different-synthetic-owner'})).body.code,'ACCOUNT_CHANGED');check('receipt access remains account-bound');
 const exported=(await request('/api/workspace/export')).body;assert.ok(exported.personalContext.events.length>0);
 assert.equal(JSON.stringify(exported.personalContext).includes('PRIVATE_UNSENT_DRAFT'),false);check('event metadata exports without draft or source bodies');
 const before=await saved(),off=await request('/api/agent/respond',{mode:'career_consultation',message:'Synthetic smoke check. Do not call a model.',baseVersion:before.revision,scope:{confirmedClaims:false,currentPlan:false},context:{workspace:'U11',career:'data'}});assert.equal(off.body.code,'AI_NOT_CONFIGURED');check('model request rejected with no provider call');
 assert.equal((await request('/api/auth/clear-workspace',{currentPassword:password,baseVersion:before.revision,confirmation:'CLEAR_WORKSPACE'})).status,200);assert.equal((await request('/api/commands')).body.items.length,0);check('workspace clear also purges command receipts');
 assert.equal((await request('/api/agent/context-events')).body.items.length,0);check('workspace clear purges context events and suggestion feedback');
 report.passed=true;
}catch(error){report.failure={message:error.message,code:error.code||null,stack:error.stack?.slice(0,1000)};process.exitCode=1;}
finally{
 if(account)try{const result=await request('/api/auth/delete-account',{email,currentPassword:password,confirmation:'DELETE_ACCOUNT'});assert.equal(result.status,200);report.syntheticAccountDeleted=true;}catch(error){report.passed=false;report.cleanupFailure=error.message;process.exitCode=1;}
 if(server)await new Promise(r=>server.close(r));
 const target=new URL(phase==='stage'?'smoke/stage-smoke.json':'production-smoke.json',work);fs.writeFileSync(target,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
