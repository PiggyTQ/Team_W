import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createBusinessStore} from '../server/business-store.mjs';
import {createBusinessCommands} from '../server/business-commands.mjs';
import {importCoursePack} from '../server/course-library.mjs';
import {createAgentService} from '../server/agent/service.mjs';
import {AI_CONSENT_VERSION,scopeKey} from '../src/agent-contract.js';
import {recordProjectReading} from '../src/practice-project-model.js';

const legacy = fileURLToPath(new URL('../../资料收集/展示资料包_20261027/', import.meta.url));
const v2 = fileURLToPath(new URL('../course-packs/practice-20261113/', import.meta.url));

function fixture(t) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES ('student'), ('other');");
  const business = createBusinessStore(db);
  const commands = createBusinessCommands({db,business});
  function save(state) {
    return business.save('student', {baseVersion:business.read('student').revision, mutationId:randomUUID(), state});
  }
  function command(type,payload) {
    return commands.execute('student',{type,payload,baseVersion:business.read('student').revision,mutationId:randomUUID()});
  }
  function create(template='quality', role='member', scope='core') {
    const result=command('task.create',{draft:{title:'Synthetic practice',template,career:'frontend',purpose:'Review a teaching case',
      hours:2,practiceRole:role,practiceScope:scope},confirmation:'CREATE_TASK'});
    return business.read('student').state.tasks.find(task=>task.id===result.refs.taskId);
  }
  return {db,business,command,save,create};
}

function filled(project, role='member', scope='core') {
  return {role,scope,responses:Object.fromEntries(project.steps.map(step=>[step.id,{
    choice:step.choices[0].id,evidence:project.dataset.rows.slice(0,step.minEvidence).map(row=>row.id),
    note:'This is a synthetic test reasoning record.',
    ...(step.id==='delivery'?{contribution:'I verified test rows.',limits:'The cases are synthetic.',...(scope==='extended'?{extension:'I compared a second scope.'}:{})}:{})
  }]))};
}

test('publishes all four new projects without replacing older material or a learner’s versioned reading positions', t=>{
  const {db,business,save,create}=fixture(t);
  assert.equal(importCoursePack(db,legacy).imported,4);
  const old=create();
  const before=business.read('student');
  const original=business.courseLibrary.course('quality',1);
  db.exec("UPDATE course_versions SET metadata_json=json_remove(metadata_json,'$.title') WHERE version=1");
  assert.equal(importCoursePack(db,v2).imported,4);
  assert.equal(importCoursePack(db,v2).unchanged,4);
  assert.equal(importCoursePack(db,legacy).unchanged,4);
  assert.deepEqual(business.read('student'),before);
  assert.equal(old.courseVersion,1);
  assert.equal(business.courseLibrary.course('quality',1).title,original.title);
  assert.deepEqual(business.courseLibrary.course('quality',1).chapters,original.chapters);
  assert.deepEqual(business.courseLibrary.course('quality',1).assets,original.assets);

  for(const item of business.catalog().courses){
    assert.equal(item.content_version,2);
    assert.equal(item.project.steps.length,4);
    assert.equal(item.chapters.length,4);
    assert.ok(item.project.sources.every(source=>source.url.startsWith('https://')));
    assert.ok(item.assets.some(asset=>asset.filename==='worksheet.csv'));
  }
  assert.ok(business.catalog({summary:true}).courses.every(course=>course.projectSummary&&!course.chapters));
  const state=business.read('student').state;
  state.reading.quality=recordProjectReading(recordProjectReading(undefined,{chapter:2,version:1}),{chapter:0,version:2});
  save(state);
  assert.equal(business.read('student').state.reading.quality.versions[1].chapter,2);
  assert.equal(business.read('student').state.reading.quality.versions[2].chapter,0);
  assert.deepEqual(business.read('other').state.reading,{});
});

test('guided submission requires valid step evidence and a self-review of the exact submitted work', t=>{
  const {db,business,save,command,create}=fixture(t);
  importCoursePack(db,v2);
  const created=create('quality','lead','extended');
  assert.equal(created.career,'data');
  assert.deepEqual(created.projectPractice,{role:'lead',scope:'extended',responses:{}});
  const act=(type,more={})=>{
    const current=business.read('student').state.tasks[0];
    return command(type,{taskId:current.id,taskVersion:current.version,...more});
  };
  const submit=()=>act('task.submit',{confirmation:'SUBMIT_ATTEMPT'});
  assert.throws(submit,{code:'PROJECT_STEPS_INCOMPLETE'});
  const project=business.courseLibrary.course('quality',2).project;
  let state=business.read('student').state;
  state.tasks[0].projectPractice=filled(project,'lead','extended');
  state.tasks[0].projectPractice.responses.evidence.evidence[0]='FAKE';
  save(state);
  assert.throws(submit,{code:'INVALID_PROJECT_PRACTICE'});
  state=business.read('student').state;
  state.tasks[0].projectPractice=filled(project,'lead','extended');
  save(state);
  const first=submit().refs.attemptId;
  state=business.read('student').state;
  state.tasks[0].projectPractice.responses.delivery.note='Changed handoff.';
  save(state);
  assert.throws(()=>act('task.selfcheck',{attemptId:first,confirmation:'SELF_CHECK_ONLY'}),{code:'PROJECT_STEPS_CHANGED'});
  const second=submit().refs.attemptId;
  act('task.selfcheck',{attemptId:second,confirmation:'SELF_CHECK_ONLY'});
  act('task.complete',{confirmation:'COMPLETE_LIMITED_SCOPE'});
  const done=business.read('student').state.tasks[0];
  assert.equal(done.completed,true);
  assert.equal(done.attempts.length,2);
  assert.match(done.attempts[1].text,/Changed handoff/);
  assert.equal(done.attempts[0].practiceSnapshot.responses.delivery.note,'This is a synthetic test reasoning record.');
  state=business.read('student').state;
  state.tasks[0].projectPractice.responses.delivery.note='Changed after completion.';
  assert.throws(()=>save(state),{code:'SERVER_RECORD_PROTECTED'});
  assert.equal(business.read('other').state.tasks.length,0);
});

test('practice assistant sends public step materials only after account consent', async t=>{
  const {db,business,save,create}=fixture(t);
  importCoursePack(db,v2);
  const task=create();
  const sent=[];
  const agent=createAgentService({business,enabled:true,provider:{respond:async request=>{
    const payload=JSON.parse(request.messages[1].content);
    sent.push(payload);
    return {output:{statements:[{kind:'suggestion',text:'Check the identifiers first.',evidenceIds:[payload.evidence[0].id]}],limitations:[]}};
  }}});
  const input=()=>({
    mode:'career_consultation',message:'How do I verify repeated keys?',baseVersion:business.read('student').revision,
    scope:{confirmedClaims:false,currentPlan:false},context:{workspace:'U08',career:'data'},
    practice:{taskId:task.id,step:'evidence',language:'en'}
  });
  await assert.rejects(agent.respond('student',input()),{code:'AI_CONSENT_REQUIRED'});
  const state=business.read('student').state;
  state.tasks[0].projectPractice.responses.scope={choice:'describe',evidence:[],note:'PRIVATE-STEP-MARKER'};
  state.aiExternalConsent={version:AI_CONSENT_VERSION,provider:'DeepSeek',accepted:true,
    scopeKey:scopeKey(state),grantId:randomUUID()};
  save(state);
  await assert.rejects(agent.respond('student',{...input(),practice:{...input().practice,taskId:'foreign-task'}}),{code:'NOT_FOUND'});
  await assert.rejects(agent.respond('student',{...input(),scope:{confirmedClaims:false,currentPlan:true}}),{code:'AI_INVALID_REQUEST'});
  const answer=await agent.respond('student',input());
  assert.equal(sent.length,1);
  assert.equal(sent[0].practiceStep,'evidence');
  assert.equal(sent[0].responseLanguage,'en');
  assert.ok(sent[0].evidence.every(row=>row.id.startsWith('practice:quality:v2:evidence:')));
  assert.doesNotMatch(JSON.stringify(sent),/PRIVATE-STEP-MARKER|taskId/);
  assert.equal(answer.meta.providerCalled,true);
  assert.equal(answer.citations.length,1);
  assert.equal(business.read('student').state.tasks[0].attempts.length,0);
});
