import assert from 'node:assert/strict';
import test from 'node:test';
import {assessmentRecommendations} from '../src/assessment-recommendations.js';
import {fresh, makeAnalysis} from '../src/model.js';

const claim = (skill, extra = {}) => ({id: 'experience', text: 'Synthetic confirmed experience', status: '已确认', version: 1, skill, ...extra});

function fixture({claims = [claim('JavaScript')], interestType = 'ENFP', capabilityMastery = {JavaScript: true}} = {}) {
  const state = fresh();
  return {...state, claims, preferences: {...state.preferences, interestType, capabilityMastery}};
}

test('requires three recorded inputs and never treats old or unconfirmed input as complete', () => {
  for (const state of [fixture({claims: []}), fixture({claims: [claim('JavaScript', {status: '待确认'})]}),
    fixture({interestType: 'Unknown'}), fixture({capabilityMastery: {}})]) {
    const result = assessmentRecommendations(state);
    assert.equal(result.status, 'incomplete');
    assert.deepEqual(result.careers, []);
  }
  const state = fixture({claims: [claim('JavaScript', {text: '未知'})]});
  assert.equal(assessmentRecommendations(state).backgroundCount, 0);
});

test('uses saved group choices and records a learning status without awarding mastery', () => {
  const state = fixture({interestType: null, capabilityMastery: {JavaScript: false}});
  state.preferences.interestGroup = 'SP';
  const result = assessmentRecommendations(state);
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.careers.map(career => career.id), ['frontend']);
  assert.equal(result.interest.group.id, 'SP');
  assert.equal(result.interest.type, null);
  assert.equal(result.ability.recordedCount, 1);
  assert.equal(result.careers[0].to, '/careers?career=frontend');
  assert.deepEqual(result.careers[0].backgroundSkills, ['JavaScript']);
  assert.deepEqual(result.careers[0].masteredSkills, []);
  assert.deepEqual(result.careers[0].learningSkills, ['JavaScript']);
  assert.deepEqual(result.careers[0].preferenceFit, {matched: true, task: '实现组件'});
});

test('changing the saved preference can reorder the same background and self-assessment', () => {
  const claims = [claim(' sql ')];
  const collaborative = assessmentRecommendations(fixture({claims, capabilityMastery: {SQL: true}}));
  const structured = assessmentRecommendations(fixture({claims, interestType: 'ESTJ', capabilityMastery: {SQL: true}}));
  assert.equal(collaborative.careers[0].id, 'data');
  assert.equal(structured.careers[0].id, 'engineering');
  assert.equal(structured.careers[0].preferenceFit.task, '质量与恢复');
  assert.equal(structured.careers.find(career => career.id === 'data').preferenceFit.task, null);
  assert.deepEqual(new Set(structured.careers.map(item => item.id)), new Set(['data', 'backend', 'engineering']));
});

test('uses confirmed untagged experience and keeps textual mentions separate from self-assessed mastery', () => {
  const untagged = claim('未知', {title: '学生会报名页', text: '使用 ＪａｖａＳｃｒｉｐｔ 和 CSS 刷新页面。没有用过 Python。'});
  const pending = claim('SQL', {id: 'draft', status: '待确认', text: 'SQL 数据分析'});
  const result = assessmentRecommendations(fixture({claims: [untagged, pending], interestType: 'ISTP', capabilityMastery: {JavaScript: false}}));
  assert.equal(result.status, 'ready');
  assert.equal(result.exploratory, false);
  assert.deepEqual(result.careers.map(career => career.position), ['前端开发工程师']);
  assert.deepEqual(result.careers[0].backgroundTitles, ['学生会报名页']);
  assert.deepEqual(result.careers[0].backgroundSkills, []);
  assert.deepEqual(result.careers[0].mentionedSkills, ['CSS', 'JavaScript']);
  assert.deepEqual(result.careers[0].masteredSkills, []);
  assert.deepEqual(result.careers[0].learningSkills, ['JavaScript']);
});

test('reads required skill names and aliases without matching substrings or planned work', () => {
  const record = claim('未知', {text: '我用 Java 和 REST API 实现接口。计划学习 JavaScript。'});
  const result = assessmentRecommendations(fixture({claims: [record], interestType: 'INTP', capabilityMastery: {Git: true}}));
  assert.equal(result.careers[0].id, 'backend');
  assert.deepEqual(new Set(result.careers[0].mentionedSkills), new Set(['Java', '接口设计']));
  assert.ok(!result.careers.some(career => career.id === 'frontend'));
});

test('negative self-assessments give a learning direction when positive links are missing', () => {
  const result = assessmentRecommendations(fixture({claims: [claim('未知')], interestType: 'ISTP', capabilityMastery: {JavaScript: false}}));
  assert.equal(result.status, 'ready');
  assert.equal(result.exploratory, true);
  assert.deepEqual(result.careers.map(career => career.id), ['frontend']);
  assert.deepEqual(result.careers[0].masteredSkills, []);
  assert.deepEqual(result.careers[0].learningSkills, ['JavaScript']);
  assert.equal(result.careers[0].backgroundCount, 0);
});

test('ability can change the leading role even when another role has an explicit background link', () => {
  const claims = [claim('日志分析', {careerLinks: [{career: 'security'}]})];
  const old = assessmentRecommendations(fixture({claims, interestType: 'ISTP', capabilityMastery: {Linux: true}}));
  const changed = assessmentRecommendations(fixture({claims, interestType: 'ISTP', capabilityMastery: {HTML: true, CSS: true, JavaScript: true}}));
  assert.equal(old.careers[0].id, 'security');
  assert.equal(changed.careers[0].id, 'frontend');
  assert.deepEqual(changed.careers[0].masteredSkills, ['HTML', 'CSS', 'JavaScript']);
  assert.equal(changed.careers[1].id, 'security');
});

test('honors explicit career links without inferring a skill from the association', () => {
  const state = fixture({claims: [claim('JavaScript', {careerLinks: [{career: 'delivery'}]}),
    claim('Java', {id: 'unconfirmed', status: '待确认'})], capabilityMastery: {JavaScript: true}});
  const result = assessmentRecommendations(state);
  assert.equal(result.backgroundCount, 1);
  assert.deepEqual(result.careers.map(career => career.id), ['delivery', 'frontend']);
  assert.equal(result.careers[0].backgroundCount, 1);
  assert.deepEqual(result.careers[0].backgroundSkills, []);
  assert.deepEqual(result.careers[1].masteredSkills, ['JavaScript']);
});

test('ability can use a current material snapshot and rejects unsupported or revoked references', () => {
  const state = fixture({capabilityMastery: {}});
  state.assessmentCareer = 'frontend';
  state.analysis = makeAnalysis(state);
  const local = assessmentRecommendations(state);
  assert.equal(local.status, 'ready');
  assert.deepEqual(local.careers[0].assessedSkills, ['JavaScript']);
  const rows = [{name: '界面验证', claimRefs: [{id: 'experience', version: 1}]},
    {name: '错误版本', claimRefs: [{id: 'experience', version: 2}]}, {name: '未知关联', claimRefs: []}];
  state.analysis = {...state.analysis, skillRows: rows};
  const server = assessmentRecommendations(state);
  assert.deepEqual(server.careers[0].backgroundSkills, ['JavaScript']);
  assert.deepEqual(server.careers[0].assessedSkills, ['界面验证']);
  assert.deepEqual(server.careers[0].masteredSkills, []);
  for (const changed of [{...state, analysisStale: true}, {...state, assessmentCareer: 'data'},
    {...state, claims: [claim('JavaScript', {version: 2})]}, {...state, adminSource: {status: '已撤回'}}]) {
    const result = assessmentRecommendations(changed);
    assert.equal(result.status, 'incomplete');
    assert.equal(result.ability.ready, false);
    assert.deepEqual(result.careers, []);
  }
});
