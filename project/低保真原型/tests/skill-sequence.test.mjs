import test from 'node:test';
import assert from 'node:assert/strict';
import {readSkillWork,writeSkillWork,updatePracticeTask,skillPreparation} from '../src/skill-learning-model.js';
import {resolveLessonSection} from '../src/skill-lesson-sequence.js';
import {alertRows,evaluateAlert,alertTaskCheck} from '../src/service-alert-model.js';

test('saved positions and failed-question review links map to retained subject matter',()=>{
 for(const [key,old,next,lab] of [['ops:four-signals','method','concept'],['ops:four-signals','sources','mistakes'],['testing:decision-tables','examples','method'],['security:incident-handoff','method','concept'],['data:descriptive','examples','method'],['backend:query-plan','sources','mistakes',true]])assert.equal(resolveLessonSection(key,old,lab),next);
 assert.equal(resolveLessonSection('data:sql-joins','method'),'method');
});
test('learning choices and run snapshot survive task updates without becoming practice evidence or grades',()=>{
 const rule={threshold:'5',minRequests:'100',forMinutes:'2'},lessonState={alertMinute:'9',alertRate:'10',alertRateChecked:true,alertPrediction:'6',...rule,alertRun:JSON.stringify({rule,prediction:'6'}),sqlKey:'V',decisionR1:'0',authorityh2:'no'};
 let work=readSkillWork(writeSkillWork({artifact:'prior work',reflection:'prior note',section:'examples',answers:{q1:'choice-2'},lessonState}));
 assert.deepEqual(work.lessonState,lessonState);assert.equal(skillPreparation({read:true},work).ready,false);
 work=updatePracticeTask(work,'debug',{fields:{...rule,rate:'12',first:'6',missing:'unknown'},hints:['method']},'alert');
 const saved=readSkillWork(writeSkillWork(work));assert.deepEqual(saved.lessonState,lessonState);assert.equal(saved.legacy.artifact,'prior work');assert.deepEqual(saved.answers,{q1:'choice-2'});assert.deepEqual(saved.tasks.debug.hints,['method']);
 assert.equal(skillPreparation({read:true},saved).ready,false);
});
test('diagnosis begins with real unwanted firing; repairing it keeps existing behavior constraints',()=>{
 const bad={threshold:'5',minRequests:'1',forMinutes:'0',rate:'12',first:'2',missing:'unknown'};
 const rows=evaluateAlert(alertRows('debug'),bad);assert.equal(rows[1].state,'firing');assert.equal(rows[8].state,'firing');assert.ok(alertTaskCheck('debug',bad).issues.includes('behavior'));
 const fixed={...bad,minRequests:'100',forMinutes:'2',first:'6'};assert.equal(alertTaskCheck('debug',fixed).passed,true);
});
