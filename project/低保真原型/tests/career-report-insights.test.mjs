import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import {fresh} from '../src/model.js';
import {buildCareerReport} from '../src/career-report-model.js';
import {buildCareerEvidence} from '../src/career-evidence-model.js';
import {reportInsights} from '../src/report-insights-model.js';
import {skillTreeRoute} from '../src/skill-tree-model.js';

const prepare=(state)=>{
 const report=buildCareerReport(state,{uploads:[]});
 return {report,evidence:buildCareerEvidence(state,report.projects)};
};
test('report uses only safe current public tree topics and all paths reach a real topic',()=>{
 execFileSync(process.execPath,['scripts/build-report-skill-paths.mjs','--check']);
 const state=fresh(),{report,evidence}=prepare(state);
 const insights=reportInsights(state,report,evidence);
 assert.equal(insights.intended,null);
 assert.ok(insights.profiles.every(role=>role.coverage.known===0&&role.branches.length===4&&role.leaves.every(leaf=>leaf.to.includes('&from=report'))));
 assert.equal(new Set(insights.next.map(leaf=>leaf.branch.id)).size,insights.next.length);
 assert.equal(skillTreeRoute('data',{skill:'missing',from:'report'}),'/career-map?career=data&skill=missing&from=report');
});

test('intention stays first even when another role has stronger evidence',()=>{
 const state={...fresh(),goal:'ops',claims:[{id:'claim',status:'已确认',text:'Confirmed SQL project',skill:'SQL'}]};
 const {report,evidence}=prepare(state),insights=reportInsights(state,report,evidence);
 assert.equal(insights.intended.id,'ops');
 assert.equal(insights.target.id,'ops');
 assert.equal(insights.intended.coverage.known,0);
 assert.ok(insights.adjacent.some(role=>role.coverage.known>0));
});

test('a saved job card alone does not select the user career intention',()=>{
 const state={...fresh(),jobs:[{career:'ai',title:'Research card'}]};
 const {report,evidence}=prepare(state);
 assert.equal(reportInsights(state,report,evidence).intended,null);
});

test('tree completion updates the skill profile, coverage, and next learning suggestions',()=>{
 const state={...fresh(),goal:'data'};
 const before=prepare(state),profile=reportInsights(state,before.report,before.evidence);
 assert.equal(profile.target.leaves.find(leaf=>leaf.id==='missing').status,'gap');
 state.skillStudy={'data:missing:v1':{assessment:{passedAt:'2026-11-19T10:00:00Z'}}};
 const after=prepare(state),next=reportInsights(state,after.report,after.evidence);
 assert.equal(next.target.leaves.find(leaf=>leaf.id==='missing').status,'passed');
 assert.equal(next.target.coverage.known,1);
 assert.ok(next.next.every(leaf=>leaf.id!=='missing'));
 state.skillStudy={'data:missing:v99':{assessment:{passedAt:'2026-11-19T10:00:00Z'}}};
 const stale=prepare(state);
 assert.equal(reportInsights(state,stale.report,stale.evidence).target.coverage.known,0);
});

test('confirmed labels, self reports and pending claims retain their evidence boundaries',()=>{
 const state={...fresh(),goal:'data',preferences:{...fresh().preferences,capabilityMastery:{SQL:true}},
  claims:[{id:'pending',status:'待确认',text:'Unconfirmed',skill:'SQL'},
    {id:'confirmed',status:'已确认',text:'Cleaned a dataset',skill:'数据清洗'}]};
 const {report,evidence}=prepare(state),profile=reportInsights(state,report,evidence);
 assert.equal(profile.target.leaves.find(leaf=>leaf.id==='missing').status,'documented');
 assert.equal(profile.target.leaves.find(leaf=>leaf.id==='sql-joins').status,'gap');
 assert.ok(profile.target.passed===0);
});
