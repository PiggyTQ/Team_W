import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createAuthServer} from '../server/auth-server.mjs';
import {importCoursePack} from '../server/course-library.mjs';
import {AUTH_POLICY} from '../src/auth-contract.js';
const knowledgeDatabase=existsSync('server/data/knowledge.sqlite')?'server/data/knowledge.sqlite':'.deploy-cache/knowledge-v2.sqlite';

test('real HTTP closure: confirmation → assessment → course task → attempt → self-check → completion → saved report → recovery and deletion',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'career-command-api-')),database=join(dir,'auth.sqlite'),origin='http://commands.test';let server,base;
  async function start(){server=await createAuthServer({database,knowledgeDatabase,origin});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;}
  await start();const seed=new DatabaseSync(database);importCoursePack(seed,resolve('../资料收集/展示资料包_20261027'));seed.close();
  t.after(async()=>{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});});
  function client(){const jar=new Map();let csrf='';return async(path,{data,method=data?'POST':'GET',headers={}}={})=>{
    const response=await fetch(base+path,{method,headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...(data?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});
    for(const cookie of response.headers.getSetCookie()){const [k,v]=cookie.split(';')[0].split('=');jar.set(k,v);}const body=await response.json();if(body.csrfToken)csrf=body.csrfToken;return {status:response.status,body};
  };}
  const a=client(),b=client(),password='Synthetic command integration 2026!';let owner;
  for(const [request,email]of [[a,'commands-a@example.invalid'],[b,'commands-b@example.invalid']]){await request('/api/auth/session');const registered=await request('/api/auth/register',{data:{email,password,agree:true,termsVersion:AUTH_POLICY.termsVersion}});assert.equal(registered.status,201);if(request===a)owner=registered.body.user.id;}
  const saved=async()=>(await a('/api/workspace')).body;
  const initialContext=await a('/api/agent/personal-context');assert.equal(initialContext.status,200);assert.equal(initialContext.body.automaticModelCalls,false);
  assert.equal((await b('/api/agent/context-events')).body.items.length,0);
  const item=initialContext.body.suggestions[0];assert.equal((await a('/api/agent/suggestions/feedback',{data:{adviceKey:initialContext.body.adviceKey,suggestionId:item.id,status:'dismissed'}})).status,200);
  const put=async patch=>{const snapshot=await saved();const result=await a('/api/workspace',{method:'PUT',data:{actorId:owner,baseVersion:snapshot.revision,mutationId:randomUUID(),state:{...snapshot.state,...patch}}});assert.equal(result.status,200,JSON.stringify(result.body));return result.body;};
  const command=async(type,payload={})=>{const snapshot=await saved(),input={type,payload,baseVersion:snapshot.revision,mutationId:randomUUID()},result=await a('/api/commands',{data:input});assert.equal(result.status,200,JSON.stringify(result.body));return {input,receipt:result.body};};
  await put({claims:[{id:'selected',title:'合成 SQL 练习',text:'合成测试原文，未独立核验',skill:'SQL',version:1,status:'待确认'}],goal:'data'});
  await command('claim.confirm',{claimId:'selected',claimVersion:1,text:'本人确认的合成 SQL 练习',contribution:'测试本人记录',resolution:'confirm',confirmation:'CONFIRM_SELF_REPORT'});
  const changedContext=(await a('/api/agent/suggestions')).body;assert.notEqual(changedContext.adviceKey,initialContext.body.adviceKey);assert.ok(changedContext.suggestions.some(s=>s.id==='plan-small-step'));
  assert.equal((await a('/api/agent/suggestions/feedback',{data:{adviceKey:initialContext.body.adviceKey,suggestionId:item.id,status:'read'}})).status,409);
  await command('assessment.create');assert.ok((await saved()).state.analysis.skillRows.length>0);
  const created=await command('task.create',{draft:{title:'一次数据质量练习',template:'quality',purpose:'核对合成数据的问题与限制',hours:1},confirmation:'CREATE_TASK'}),taskId=created.receipt.refs.taskId;
  let task=(await saved()).state.tasks[0];assert.equal(task.mode,'S2');assert.equal(task.courseVersion,1);
  await command('task.start',{taskId,taskVersion:task.version});task=(await saved()).state.tasks[0];
  await put({tasks:[{...task,draft:'合成问题清单与处理限制',contribution:'本人整理与比对'}]});
  task=(await saved()).state.tasks[0];const submission=await command('task.submit',{taskId,taskVersion:task.version,confirmation:'SUBMIT_ATTEMPT'});
  assert.equal((await a('/api/commands',{data:submission.input})).body.duplicate,true);
  assert.equal((await b('/api/commands/'+submission.receipt.id)).status,404);
  assert.equal((await b('/api/commands')).body.items.length,0);
  task=(await saved()).state.tasks[0];await command('task.selfcheck',{taskId,taskVersion:task.version,attemptId:submission.receipt.refs.attemptId,confirmation:'SELF_CHECK_ONLY'});
  task=(await saved()).state.tasks[0];await put({tasks:[{...task,selfcheck:true}]});task=(await saved()).state.tasks[0];
  await command('task.complete',{taskId,taskVersion:task.version,confirmation:'COMPLETE_LIMITED_SCOPE'});
  task=(await saved()).state.tasks[0];
  await command('evidence.candidates',{taskId,taskVersion:task.version,attemptId:submission.receipt.refs.attemptId,entries:[{skill:'SQL',scope:'仅限合成练习',location:'本次提交'}],contribution:'本人整理',confirmation:'GENERATE_CANDIDATES'});
  assert.equal((await saved()).state.claims.at(-1).status,'待确认');
  const beforePreview=await saved(),preview=(await a('/api/services/report-preview',{data:{baseVersion:beforePreview.revision}})).body;
  const sections=preview.body.split('\n').map(line=>line.split('：')[0]);
  const compose={title:'合成章节报告',kind:'report',sections,previewVersion:beforePreview.revision,previewDigest:preview.digest,confirmation:'COMPOSE_REPORT'};
  const wrong=await a('/api/commands',{data:{type:'report.compose',payload:{...compose,previewDigest:'wrong'},baseVersion:beforePreview.revision,mutationId:randomUUID()}});assert.equal(wrong.body.code,'VERSION_CONFLICT');
  const composed=await command('report.compose',compose);assert.ok((await saved()).state.reports.some(r=>r.id===composed.receipt.refs.reportId&&r.body===preview.body));
  const compiled=await command('report.compile',{title:'合成后端闭环记录',confirmation:'COMPILE_REPORT'});
  const report=(await saved()).state.reports.find(r=>r.id===compiled.receipt.refs.reportId);assert.match(report.body,/本人确认的合成 SQL 练习/);assert.match(report.body,/尚未独立核验/);
  assert.equal((await a('/api/system/capabilities')).body.ai,false);
  assert.equal((await a('/api/agent/respond',{data:{mode:'career_consultation',message:'Synthetic check; do not call a model.',baseVersion:(await saved()).revision,scope:{confirmedClaims:false,currentPlan:false},context:{workspace:'U11',career:'data'}}})).body.code,'AI_NOT_CONFIGURED');
  await new Promise(r=>server.close(r));await start();assert.equal((await saved()).state.tasks[0].completed,true);assert.equal((await a('/api/commands/'+submission.receipt.id)).body.id,submission.receipt.id);
  const invalid=await a('/api/commands',{data:{type:'task.start',baseVersion:0,mutationId:randomUUID(),payload:{taskId,taskVersion:1}}});assert.equal(invalid.body.code,'VERSION_CONFLICT');
  const snapshot=await saved();assert.equal((await a('/api/auth/clear-workspace',{data:{currentPassword:password,baseVersion:snapshot.revision,confirmation:'CLEAR_WORKSPACE'}})).status,200);
  assert.equal((await a('/api/commands')).body.items.length,0);assert.equal((await saved()).state.tasks.length,0);
  for(const [request,email]of [[a,'commands-a@example.invalid'],[b,'commands-b@example.invalid']])assert.equal((await request('/api/auth/delete-account',{data:{email,currentPassword:password,confirmation:'DELETE_ACCOUNT'}})).status,200);
});
