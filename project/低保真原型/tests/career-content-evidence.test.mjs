import test from 'node:test';
import assert from 'node:assert/strict';
import {careerContent,careerContentIds,comparisonDimensions,comparisonScan,CAREER_CONTENT_VERSION} from '../src/career-exploration-model.js';
import {careerComparison} from '../src/career-comparison.js';
import {CAREER_TRIAL_VERSION,trialSourceVersion} from '../src/career-trial-model.js';
import {discussionHash,resolveDiscussion} from '../server/agent/discussion-context.mjs';
import {fresh} from '../src/model.js';

const archived='career-exploration-20261122-audit';

test('occupation layers cover distinct work and preserve the authored examples and trial requirements',()=>{
 const themes={
  data:/持续报表.*用户分析/s, ai:/应用集成.*模型与算法.*平台/s,
  engineering:/批处理.*数仓.*流处理.*血缘/s, security:/安全运营.*书面范围.*治理/s,
  ops:/系统与网络.*云平台.*专项运行/s, delivery:/业务应用实施.*集成与迁移.*采纳与支持/s,
  frontend:/内容与展示.*业务交互.*设计系统/s, backend:/业务服务.*系统集成.*平台服务/s,
  software:/产品功能.*工具与系统.*遗留演进/s, testing:/功能与探索.*自动化与回归.*专项质量/s,
 };
 for(const id of careerContentIds){
  const current=careerContent(id), prior=careerComparison(id,archived);
  assert.match(current.occupation.tracks.map(row=>row.title+' '+row.text).join(' '),themes[id]);
  assert.equal(current.version,CAREER_CONTENT_VERSION);
  assert.equal(prior.occupation,undefined);
  assert.equal(current.focus,prior.focus);
  assert.deepEqual(current.case.preview,prior.case.preview);
  assert.deepEqual(current.deliverables.map(d=>d.example),prior.deliverables.map(d=>d.example));
  const practice=r=>({input:r.practice.input, review:r.practice.review, materials:r.practice.materials, files:r.practice.files, route:r.practice.route, example:r.practice.fork.example});
  assert.deepEqual(practice(current),practice(prior));
  for(const [key] of comparisonDimensions){
   assert.equal(comparisonScan(current,key),comparisonScan(careerComparison(id),key));
   assert.equal(comparisonScan(careerContent(id,'en'),key),comparisonScan(careerComparison(id),key,'en'));
   if(key!=='practice')assert.notEqual(comparisonScan(current,key),comparisonScan(prior,key),id+' '+key);
  }
 }
 assert.equal(trialSourceVersion(CAREER_TRIAL_VERSION),archived);
});

test('the specific changes distinguish R1/R2, evidence limits, atomic publication and severity',()=>{
 const testing=careerContent('testing'), prior=careerComparison('testing',archived);
 assert.match(JSON.stringify(prior.case),/99\.99/);assert.deepEqual(testing.case,prior.case);
 assert.match(comparisonScan(testing,'practice'),/7999\/8000\/8001/);
 assert.match(comparisonScan(careerContent('testing','en'),'practice'),/7999\/8000\/8001 cents/);
 assert.match(testing.occupation.environment,/严重程度.*修复顺序.*发布决策/);
 assert.match(testing.occupation.boundary,/发布负责人按权限/);
 const ai=careerContent('ai');
 assert.match(ai.workflow[2].description,/须补查检索结果、提示与调用记录/);
 assert.match(ai.occupation.slice,/根因|轨迹|检索/);
 const pipeline=careerContent('engineering');
 assert.match(pipeline.case.decisions[0],/先检查目标存储支持的事务或发布机制/);
 assert.match(pipeline.practice.steps[1],/四个ID及channel逐项相同/);
 const data=careerContent('data');
 assert.match(data.practice.steps[0],/先按registration_id.*再排除.*最后按月份和渠道汇总/);
 assert.equal(data.practice.fork.sourceId,'postgres-window-19');
 assert.doesNotMatch(data.environment,/比画图更费心/);
 assert.match(data.deliverables[1].checks[1],/本例条形图的数值轴从0开始/);
});

test('old authorized material is stale and the two largest public profiles fit together with a full question',()=>{
 const id='engineering', other='security';
 const stale={kind:'career',id,part:'profile',stamp:discussionHash(careerComparison(id,archived))};
 const state=fresh();
 const context={intent:'direction',career:id,compareCareer:other,refs:[stale,{kind:'career',id:other,part:'profile'}]};
 assert.throws(()=>resolveDiscussion(state,context),{code:'AI_CONTEXT_CHANGED'});
 const {selected}=resolveDiscussion(state,{...context,refs:[{kind:'career',id,part:'profile'},context.refs[1]]});
 const rows=selected.map(row=>({id:'discussion:'+row.ref.stamp,sourceType:'approved_knowledge',sourceTitle:row.label,text:JSON.stringify(row.content)}));
 assert.ok(Buffer.byteLength(JSON.stringify(rows),'utf8')<45000);
 assert.ok(JSON.stringify({message:'比'.repeat(4000),evidence:rows}).length<36000);
});
