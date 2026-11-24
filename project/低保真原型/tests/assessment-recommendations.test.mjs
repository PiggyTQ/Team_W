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

test('work style can order equivalent evidence and cannot create an unsupported candidate', () => {
  const claims = [claim(' sql ')];
  const collaborative = assessmentRecommendations(fixture({claims, capabilityMastery: {SQL: true}}));
  const structured = assessmentRecommendations(fixture({claims, interestType: 'ESTJ', capabilityMastery: {SQL: true}}));
  assert.equal(collaborative.careers[0].id, 'data');
  assert.notEqual(structured.careers[0].id, 'data');
  assert.deepEqual(new Set(structured.careers.map(item => item.id)), new Set(['data', 'backend', 'engineering']));
  const unsupported = assessmentRecommendations(fixture({claims: [claim('未分类技能')], capabilityMastery: {JavaScript: false}}));
  assert.equal(unsupported.status, 'insufficient');
  assert.deepEqual(unsupported.careers, []);
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
