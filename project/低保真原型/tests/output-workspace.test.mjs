import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarioState} from '../src/model.js';
import {reportDecisionBrief,savedReportBrief,resumeReadiness} from '../src/output-workspace-model.js';
import {resumeStudioDraft,toggleResumeRelation} from '../src/report-studio-model.js';
import {freezeReport} from '../src/alignment-model.js';
import {planningReportBody} from '../src/continuity-model.js';
import {readableReport,reportChanges} from '../src/report-studio-model.js';
test('报告摘要以当前记录和实际行动为依据，不使用私人复盘正文',()=>{
 const s=scenarioState('PT05');s.reviews=[{id:'r',result:'PRIVATE_REFLECTION'}];const before=JSON.stringify(s),b=reportDecisionBrief(s);assert.equal(b.facts.length,2);assert.equal(b.next.id,s.tasks[0].id);assert.equal(b.target,'数据分析');assert.doesNotMatch(JSON.stringify(b),/PRIVATE_REFLECTION/);assert.equal(JSON.stringify(s),before);
});
test('空报告只有真实缺项，不产生确定职业、能力结论或假任务',()=>{
 const s=scenarioState('PT01'),b=reportDecisionBrief(s);assert.equal(b.target,'方向探索中');assert.equal(b.next,undefined);assert.equal(b.actionTo,'/learning');assert.equal(b.gaps.length,3);assert.match(b.decision,/待本人补充/);
});
test('保存报告摘要只解析该快照，不混入新选择或新任务',()=>{
 const s=scenarioState('PT05');s.decision.reason='OLD_REASON';const r=freezeReport(s,'合成报告',planningReportBody(s));s.decision.reason='NEW_REASON';const brief=savedReportBrief(r);assert.match(brief[0].text,/OLD_REASON/);assert.doesNotMatch(JSON.stringify(brief),/NEW_REASON/);assert.equal(brief.length,3);
});
test('简历检查区分必需内容与可选联系方式，已选教育可单独开始',()=>{
 const s=scenarioState('PT01');let d=resumeStudioDraft(s),r=resumeReadiness(s,d);assert.equal(r.checks[0].ready,false);assert.equal(r.checks.find(c=>c.id==='profile').required,false);s.education=[{id:'edu',status:'已确认',school:'合成学校'}];d=resumeStudioDraft(s);r=resumeReadiness(s,d);assert.equal(r.checks[0].ready,true);assert.equal(r.facts.length,0);assert.equal(r.education.length,1);
});
test('岗位关联数量不是评分，未确认措辞与失效来源均进入检查',()=>{
 const s=scenarioState('PT05');s.resumeTarget='job-a';let d=resumeStudioDraft(s);d=toggleResumeRelation(s,d,0,d.claimIds[0]);d.tailoring.rows[0].wording='本人相关经历';let r=resumeReadiness(s,d);assert.equal(r.linked,1);assert.equal(r.pending,1);assert.equal(r.checks.find(c=>c.id==='wording').ready,false);assert.equal('score' in r,false);
 s.jobs[0].text+='；新增原文';r=resumeReadiness(s,d);assert.equal(r.checks.find(c=>c.id==='source').ready,false);assert.equal(r.expressions.length,0);
 d.target='missing';r=resumeReadiness(s,d);assert.equal(r.checks.find(c=>c.id==='target').ready,false);assert.match(r.checks.find(c=>c.id==='target').text,/不可用/);
});
test('简历成稿按照用户选定的经历顺序呈现',()=>{const s=scenarioState('PT05'),d=resumeStudioDraft(s);d.claimIds.reverse();assert.deepEqual(resumeReadiness(s,d).facts.map(c=>c.id),d.claimIds);});
test('来源撤回后版本对照不读取报告缓存，现有材料不会解除来源限制',()=>{const s=scenarioState('PT05'),prior=freezeReport(s,'报告','材料与差距：SOURCE_PRIVATE_TEXT'),current=freezeReport(s,'报告','材料与差距：更新文本',prior);s.adminSource.status='已撤回';assert.equal(readableReport(s,prior),false);const diff=reportChanges(s,prior,current);assert.equal(diff.blocked,true);assert.deepEqual(diff.rows,[]);assert.doesNotMatch(JSON.stringify(diff),/SOURCE_PRIVATE_TEXT/);});
