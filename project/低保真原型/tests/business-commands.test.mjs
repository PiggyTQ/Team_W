import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {createBusinessStore} from '../server/business-store.mjs';
import {createBusinessCommands} from '../server/business-commands.mjs';
import {reportReferencesUnavailable} from '../src/alignment-model.js';

function fixture(t){
  const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('alice'),('bob')");
  const business=createBusinessStore(db);
  const knowledge={assess:s=>({id:randomUUID(),profileVersion:s.profileVersion,occupation:'data',rule:'fixture',claims:s.claims.filter(c=>c.status==='已确认').map(c=>({id:c.id,version:c.version}))}),report:s=>({text:'合成编译：'+s.claims.filter(c=>c.status==='已确认').map(c=>c.text).join('；'),catalogVersion:'fixture',notice:'合成测试'})};
  const commands=createBusinessCommands({db,business,knowledge});t.after(()=>db.close());
  const command=(type,payload={},overrides={})=>commands.execute('alice',{type,payload,baseVersion:business.read('alice').revision,mutationId:randomUUID(),...overrides});
  const save=patch=>{const saved=business.read('alice');business.save('alice',{state:{...saved.state,...patch},baseVersion:saved.revision,mutationId:randomUUID()});};
  return {db,business,commands,command,save};
}
test('commands save before acknowledging, replay exactly, isolate receipts and roll back invalid requests',t=>{
  const f=fixture(t),input={type:'task.create',payload:{draft:{title:'一次合成练习',purpose:'验证有限任务',hours:1,template:'external'},confirmation:'CREATE_TASK'},baseVersion:0,mutationId:randomUUID()};
  const receipt=f.commands.execute('alice',input);assert.equal(receipt.revision,1);
  assert.equal(f.business.read('alice').state.tasks[0].id,receipt.refs.taskId);
  assert.deepEqual(f.commands.execute('alice',input),{...receipt,duplicate:true});
  assert.throws(()=>f.commands.execute('alice',{...input,payload:{...input.payload,draft:{...input.payload.draft,hours:2}}}),{code:'IDEMPOTENCY_MISMATCH'});
  assert.throws(()=>f.commands.get('bob',receipt.id),{code:'NOT_FOUND'});
  assert.throws(()=>f.command('task.create',{...input.payload,draft:{...input.payload.draft,hours:3,another:true}}),{code:'TASK_PRECHECK_FAILED'});
  assert.equal(f.business.read('alice').revision,1);assert.equal(f.db.prepare('SELECT count(*) n FROM business_command_receipts').get().n,1);
  assert.throws(()=>f.command('task.create',{...input.payload,draft:{...input.payload.draft,template:'unknown'}}),{code:'COURSE_NOT_READY'});
  assert.throws(()=>f.command('task.start',{taskId:receipt.refs.taskId,taskVersion:99}),{code:'VERSION_CONFLICT'});
});
test('submit, self-check and limited completion keep immutable attempts and cannot be forged by autosave',t=>{
  const f=fixture(t),created=f.command('task.create',{draft:{title:'练习',purpose:'核对一次练习',hours:1},confirmation:'CREATE_TASK'}),taskId=created.refs.taskId;
  const current=()=>f.business.read('alice').state.tasks[0];
  f.save({tasks:[{...current(),draft:'合成产物',contribution:'测试本人整理',selfcheck:true}]});
  const submitted=f.command('task.submit',{taskId,taskVersion:current().version,confirmation:'SUBMIT_ATTEMPT'});
  assert.equal(current().attempts[0].result,'未检查');assert.equal(current().selfcheck,false);
  assert.throws(()=>f.save({tasks:[{...current(),attempts:[{...current().attempts[0],text:'改写旧成果'}]}]}),{code:'COMMAND_REQUIRED'});
  assert.throws(()=>f.save({tasks:[{...current(),completed:true,status:'完成'}]}),{code:'COMMAND_REQUIRED'});
  assert.throws(()=>f.command('task.complete',{taskId,taskVersion:current().version,confirmation:'COMPLETE_LIMITED_SCOPE'}),{code:'COURSE_COMPLETION_INCOMPLETE'});
  f.command('task.selfcheck',{taskId,taskVersion:current().version,attemptId:submitted.refs.attemptId,confirmation:'SELF_CHECK_ONLY'});
  f.save({tasks:[{...current(),selfcheck:true}]});
  f.command('task.complete',{taskId,taskVersion:current().version,confirmation:'COMPLETE_LIMITED_SCOPE'});
  assert.equal(current().completed,true);assert.equal(current().check,'自检记录');assert.ok(current().completionReceipt);
  assert.throws(()=>f.command('task.submit',{taskId,taskVersion:current().version,confirmation:'SUBMIT_ATTEMPT'}),{code:'INVALID_TASK_STATE'});
});
test('zero-hour historical action is explicitly recorded, not a planned task or verified ability',t=>{
  const f=fixture(t),receipt=f.command('experience.record',{title:'既往合成行动',text:'记录过一次访谈，结果未知',contribution:'本人记录',confirmation:'RECORD_SELF_REPORT'});
  const state=f.business.read('alice').state;assert.equal(state.tasks[0].hours,0);assert.equal(state.tasks[0].recordedOnly,true);assert.equal(state.claims[0].status,'待确认');
  f.save({aiDraft:'不相关草稿正常保存'});
  assert.throws(()=>f.command('task.start',{taskId:receipt.refs.taskId,taskVersion:state.tasks[0].version}),{code:'INVALID_TASK_STATE'});
  assert.throws(()=>f.command('task.create',{draft:{title:'不合法活动',purpose:'验证',hours:0},confirmation:'CREATE_TASK'}),{code:'INVALID_TASK_HOURS'});
});
test('claim confirmation, assessment and report compilation persist frozen results; drafts cannot claim server authority',t=>{
  const f=fixture(t);f.save({claims:[{id:'claim-1',title:'合成材料',text:'原始文字',status:'待确认',version:1,skill:'SQL'}]});
  f.command('claim.confirm',{claimId:'claim-1',claimVersion:1,text:'本人确认的合成文字',contribution:'测试贡献',resolution:'confirm',confirmation:'CONFIRM_SELF_REPORT'});
  const analysis=f.command('assessment.create');assert.equal(f.business.read('alice').state.analysis.id,analysis.refs.analysisId);
  const report=f.command('report.compile',{confirmation:'COMPILE_REPORT'});assert.equal(f.business.read('alice').state.reports[0].id,report.refs.reportId);
  f.save({aiDraft:'普通输入'});
  assert.throws(()=>f.save({analysis:{...f.business.read('alice').state.analysis,occupation:'fake'}}),{code:'SERVER_RECORD_PROTECTED'});
  assert.throws(()=>f.save({analysis:{id:'forged',authority:{origin:'server-command-v1'}}}),{code:'SERVER_RECORD_PROTECTED'});
  f.command('assessment.create');assert.equal(f.business.read('alice').state.analysisHistory.length,1);
  f.command('claim.withdraw',{claimId:'claim-1',claimVersion:2,confirmation:'WITHDRAW_CLAIM'});assert.equal(f.business.read('alice').state.analysisStale,true);
  f.command('claim.confirm',{claimId:'claim-1',claimVersion:3,text:'重新确认的新文字',contribution:'不同范围',resolution:'confirm',confirmation:'CONFIRM_SELF_REPORT'});
  const current=f.business.read('alice').state;assert.equal(reportReferencesUnavailable(current,current.reports[0]),true,'re-confirmation must not revive a withdrawn report snapshot');
  f.commands.purge('alice');assert.throws(()=>f.commands.get('alice',report.id),{code:'NOT_FOUND'});
});
test('editing manual tasks checks original plan version and allows completion only with recorded results',t=>{
  const f=fixture(t),receipt=f.command('task.create',{draft:{title:'外部练习',purpose:'核对结果',hours:1},confirmation:'CREATE_TASK'});
  let saved=f.business.read('alice'),task=saved.state.tasks[0],draft={title:task.title,purpose:task.purpose,hours:1,status:'完成'};
  assert.throws(()=>f.command('task.edit',{taskId:receipt.refs.taskId,taskVersion:task.version,planVersion:saved.state.planVersion,draft,confirmation:'EDIT_TASK'}),{code:'TASK_PRECHECK_FAILED'});
  f.save({tasks:[{...task,note:'本人记录的结果，未独立核验'}]});saved=f.business.read('alice');
  f.command('task.edit',{taskId:task.id,taskVersion:task.version,planVersion:saved.state.planVersion,draft,confirmation:'EDIT_TASK'});
  assert.equal(f.business.read('alice').state.tasks[0].completed,true);
});
