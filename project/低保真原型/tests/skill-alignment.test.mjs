import test from 'node:test';
import assert from 'node:assert/strict';
import {getSkillTree,gradeSkillCheck} from '../server/skill-trees/index.mjs';
import {alignedChecks} from '../server/skill-trees/aligned-checks.mjs';
import {transferChecks} from '../server/skill-trees/transfer-checks.mjs';
import {alertRows,evaluateAlert,alertTaskCheck,defaultAlertRule} from '../src/service-alert-model.js';
import {skillRecord,skillProgress} from '../src/skill-tree-model.js';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {createBusinessStore} from '../server/business-store.mjs';
import {createBusinessCommands} from '../server/business-commands.mjs';
import {applicationTasks} from '../server/skill-trees/application-tasks.mjs';
import {writeSkillWork,readSkillWork,readLearningWork,updatePracticeTask,skillPreparation} from '../src/skill-learning-model.js';
import {fresh} from '../src/model.js';
import {reportInsights} from '../src/report-insights-model.js';
import {buildCareerReport} from '../src/career-report-model.js';
import {buildCareerEvidence} from '../src/career-evidence-model.js';
export const alignedExamples={...Object.fromEntries(Object.entries(transferChecks).map(([id,c])=>[id,c.expected])),'sql-joins':{rows:'3',total:'150',line:'30',missing:'NULL'},'decision-tables':{r0:'0',r1:'0',r2:'0',r3:'9',edge:'0'},'incident-handoff':{evidence:'L92',execution:'unknown',scope:'unknown',update:'03:30Z'},'four-signals':{rate:'6',threshold:'5',minRequests:'100',forMinutes:'2',first:'6',missing:'unknown'}};
test('elapsed duration, spike, recovery, low traffic and unknown have distinct timeline semantics',()=>{
 const rows=evaluateAlert(alertRows(),defaultAlertRule);assert.deepEqual(rows.map(r=>r.state),['inactive','pending','inactive','pending','pending','firing','firing','inactive','low-traffic','unknown','inactive','inactive']);
 assert.equal(evaluateAlert(alertRows(),{...defaultAlertRule,forMinutes:0})[1].state,'firing');
 assert.equal(evaluateAlert(alertRows(),{...defaultAlertRule,threshold:6})[3].state,'inactive');
 assert.equal(alertTaskCheck('check',alignedExamples['four-signals']).passed,true);
 assert.equal(alertTaskCheck('check',{...alignedExamples['four-signals'],forMinutes:'3',first:'7',threshold:'4'}).passed,true);
 assert.ok(alertTaskCheck('check',{...alignedExamples['four-signals'],forMinutes:'0',first:'2'}).issues.includes('behavior'));
 assert.ok(alertTaskCheck('check',{...alignedExamples['four-signals'],rate:'80',missing:'zero'}).issues.includes('rate'));
});
test('four updated checks grade observable application items independently and still grade archived v1',()=>{
 for(const [id,c] of Object.entries(alignedChecks)){
 const leaf=getSkillTree(c.career).branches.flatMap(b=>b.leaves).find(l=>l.id===id);assert.equal(leaf.version,2);
 const answers={application:JSON.stringify(alignedExamples[id])};
 for(const q of leaf.questions){answers[q.id]=q.options.find(o=>{const trial={q1:leaf.questions[0].options[0].id,q2:leaf.questions[1].options[0].id,...answers,[q.id]:o.id};return gradeSkillCheck(c.career,id,2,trial).questions.find(r=>r.id===q.id).correct;}).id;}
 const passed=gradeSkillCheck(c.career,id,2,answers);assert.equal(passed.passed,true,id);assert.ok(passed.total>3);
 const fail=gradeSkillCheck(c.career,id,2,{...answers,application:'{}'});assert.equal(fail.passed,false);assert.equal(fail.correct,2);assert.ok(fail.questions.filter(x=>!x.correct).every(x=>x.section));
 assert.doesNotThrow(()=>gradeSkillCheck(c.career,id,1,{q1:leaf.questions[0].options[0].id,q2:leaf.questions[1].options[0].id,application:'wrong'}));
 }
});
test('history pass and draft remain visible without modifying archived records or awarding duplicate progress',()=>{
 const leaf=getSkillTree('ops').branches.flatMap(b=>b.leaves).find(l=>l.id==='four-signals');
 const old={read:true,draft:'private archived draft',assessment:{passedAt:'2026-11-19T10:00:00.000Z',correct:3,total:3}};const study={'ops:four-signals:v1':old};const snapshot=JSON.stringify(study);
 assert.equal(skillRecord(study,'ops',leaf).draft,old.draft);assert.equal(skillProgress('ops',[leaf],study).done,1);
 study['ops:four-signals:v2']={draft:'new work',assessment:{passedAt:null,correct:2,total:7}};
 assert.equal(skillRecord(study,'ops',leaf).assessment.passedAt,old.assessment.passedAt);assert.equal(study['ops:four-signals:v1'],old);assert.ok(snapshot.includes('private archived draft'));
});

test('edited rule parameters, checks and independent review survive serialization without accepting blank duration',()=>{
 let w={artifact:'',reflection:'',section:'examples'};
 w=updatePracticeTask(w,'independent',{fields:{threshold:'4',minRequests:'250',forMinutes:'3',rate:'10',first:'7',missing:'unknown'},reflection:'I checked counts,elapsed minutes and unknown data with a named next review.',check:{kind:'alert-simulation',passed:true,issues:[]},reviewed:true},'alert');
 const r=readSkillWork(writeSkillWork(w));assert.equal(r.tasks.independent.fields.minRequests,'250');assert.equal(r.tasks.independent.fields.forMinutes,'3');assert.equal(skillPreparation({read:true,draft:writeSkillWork(r)}).ready,true);
 assert.equal(alertTaskCheck('independent',r.tasks.independent.fields).passed,true);
 assert.ok(alertTaskCheck('independent',{...r.tasks.independent.fields,forMinutes:''}).issues.includes('rule'));
 assert.equal(skillPreparation({read:true,draft:writeSkillWork(updatePracticeTask(r,'independent',{fields:{...r.tasks.independent.fields,forMinutes:'0'}},'alert'))}).ready,false);
});

test('real business commands preserve v1 grades/drafts, enforce preparation and persist fresh representative v2 results',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec('CREATE TABLE users(id TEXT PRIMARY KEY)');const business=createBusinessStore(db);const commands=createBusinessCommands({db,business});
 function answer(career,leaf,version,application){const q={application};for(let i=1;i<=2;i++){q['q'+i]=['choice-1','choice-2','choice-3'].find(id=>gradeSkillCheck(career,leaf.id,version,{q1:'choice-1',q2:'choice-1',...q,['q'+i]:id}).questions.find(v=>v.id==='q'+i).correct);}return q;}
 for(const id of ['sql-joins','decision-tables','incident-handoff','four-signals']){
  const career=alignedChecks[id].career,leaf=getSkillTree(career).branches.flatMap(b=>b.leaves).find(l=>l.id===id),user='qa-'+id;db.prepare('INSERT INTO users VALUES (?)').run(user);
  const read=()=>business.read(user),save=state=>business.save(user,{state,baseVersion:read().revision,mutationId:randomUUID()});
  const execute=(version,answers)=>commands.execute(user,{type:'skill.check',baseVersion:read().revision,mutationId:randomUUID(),payload:{career,skill:id,version,answers}});
  const key=career+':'+id+':v2',legacyKey=career+':'+id+':v1',draft=writeSkillWork({artifact:'Synthetic working artifact:counts,query results,rule choices and evidence references.',reflection:'Synthetic review:verified data and remaining untested scope.',section:'method'});
  const answers=answer(career,leaf,2,JSON.stringify(alignedExamples[id]));assert.throws(()=>execute(2,answers),{code:'SKILL_PREPARATION_REQUIRED'});
  save({...read().state,skillStudy:{[key]:{read:true,draft}}});
  const failed=execute(2,{...answers,application:'{}'});assert.equal(failed.refs.grade.passed,false);assert.equal(read().state.skillStudy[key].assessment.passedAt,null);
  const passed=execute(2,answers);assert.equal(passed.refs.grade.passed,true);assert.ok(read().state.skillStudy[key].assessment.passedAt);assert.equal(read().state.skillStudy[key].draft,draft);
  assert.equal(skillProgress(career,[leaf],read().state.skillStudy).done,1);
  // A separate returning account has an actual server-graded v1 pass.
  const oldUser=user+'-legacy';db.prepare('INSERT INTO users VALUES (?)').run(oldUser);const oldRead=()=>business.read(oldUser);
  business.save(oldUser,{state:{...oldRead().state,skillStudy:{[legacyKey]:{read:true,draft}}},baseVersion:oldRead().revision,mutationId:randomUUID()});
  const oldAnswers=answer(career,leaf,1,applicationTasks[id].accepted[0]);commands.execute(oldUser,{type:'skill.check',baseVersion:oldRead().revision,mutationId:randomUUID(),payload:{career,skill:id,version:1,answers:oldAnswers}});
  const original=structuredClone(oldRead().state.skillStudy[legacyKey]);
  const retry=commands.execute(oldUser,{type:'skill.check',baseVersion:oldRead().revision,mutationId:randomUUID(),payload:{career,skill:id,version:2,answers:{...answers,application:'{}'}}});
  assert.equal(retry.refs.grade.passed,false);assert.deepEqual(oldRead().state.skillStudy[legacyKey],original);assert.equal(skillRecord(oldRead().state.skillStudy,career,leaf).assessment.total,3);assert.equal(skillProgress(career,[leaf],oldRead().state.skillStudy).done,1);
 }
});

test('report skill links recognize either supported score version and ignore unsupported versions',()=>{
 for(const version of [1,2,99]){
  const state={...fresh(),goal:'data',skillStudy:{['data:sql-joins:v'+version]:{assessment:{passedAt:'2026-11-20T00:00:00.000Z'}}}};
  const report=buildCareerReport(state,{uploads:[]}),evidence=buildCareerEvidence(state,report.projects);
  const item=reportInsights(state,report,evidence).target.leaves.find(l=>l.id==='sql-joins');
  assert.equal(item.passed,version!==99);assert.ok(item.to.includes('skill=sql-joins'));
 }
});

test('a new assessment version clears old answers while preserving task artifacts and the complete historic draft',()=>{
 const raw='Historic private notes '+('x'.repeat(10000)),upgraded=readLearningWork(raw,2,'sql');
 assert.equal(upgraded.legacy.artifact,raw);assert.equal(readSkillWork(writeSkillWork(upgraded)).legacy.artifact,raw);
 const old=writeSkillWork({artifact:'Old method and original result are retained in the new workspace.',reflection:'Old reflection explicitly retained.',section:'method',answers:{q1:'choice-1',application:'4'}});
 const next=readLearningWork(old,2,'decision');assert.deepEqual(next.answers,{});assert.equal(next.checkVersion,2);assert.equal(next.legacy.artifact,readSkillWork(old).artifact);
 const answered={...next,answers:{q1:'choice-2',application:'{}'}};assert.deepEqual(readLearningWork(writeSkillWork(answered),2,'decision').answers,answered.answers);
});
