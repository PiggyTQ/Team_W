import test from 'node:test';
import assert from 'node:assert/strict';
import {careers, makeAnalysis, scenarioState} from '../src/model.js';
import {capabilityMastery, capabilitySkills, setCapabilityMastery} from '../src/capability-puzzle-model.js';
import {normalizePrototypeState} from '../src/storage-recovery-model.js';

test('each career uses its existing skill catalog and unknown careers fall back safely', () => {
  for (const career of careers) {
    const skills = capabilitySkills(career.id);
    assert.equal(skills.length, 9);
    assert.equal(new Set(skills.map(skill => skill.id)).size, skills.length);
    assert.ok(skills.every(skill => skill.name && skill.level && skill.description));
  }
  assert.deepEqual(capabilitySkills('missing'), capabilitySkills('data'));
  assert.deepEqual(capabilitySkills('__proto__'), capabilitySkills('data'));
});

test('confirmed materials never create mastery claims', () => {
  const state = scenarioState('PT03'), original = structuredClone(state);
  assert.ok(state.claims.some(claim => claim.skill === 'SQL' && claim.status === '已确认'));
  assert.deepEqual(capabilityMastery(state.preferences), {});
  assert.deepEqual(state, original);
});

test('explicit self-assessment preserves preferences and can be reversed', () => {
  const before = {...scenarioState('PT03').preferences, interestType: 'INTJ'};
  const yes = setCapabilityMastery(before, 'SQL', true), no = setCapabilityMastery(yes, 'SQL', false);
  assert.equal(capabilityMastery(yes).SQL, true);
  assert.equal(capabilityMastery(no).SQL, false);
  assert.equal(no.interestType, 'INTJ');
  assert.equal(no.constraint, before.constraint);
  assert.equal(before.capabilityMastery, undefined);
});

test('a shared skill retains the same record across career catalogs', () => {
  assert.ok(capabilitySkills('data').some(skill => skill.id === 'SQL'));
  assert.ok(capabilitySkills('engineering').some(skill => skill.id === 'SQL'));
  const preferences = setCapabilityMastery({}, 'SQL', true);
  assert.equal(capabilityMastery(preferences)[capabilitySkills('engineering').find(skill => skill.name === 'SQL').id], true);
});

test('malformed or unknown flags cannot mark a skill as mastered', () => {
  for (const value of [null, [], 'true']) assert.deepEqual(capabilityMastery({capabilityMastery: value}), {});
  assert.deepEqual(capabilityMastery({capabilityMastery: {SQL: 'true', Python: true, invented: true}}), {Python: true});
  const preferences = {interest: 'existing'};
  assert.equal(setCapabilityMastery(preferences, 'invented', true), preferences);
  assert.equal(setCapabilityMastery(preferences, 'SQL', 'true'), preferences);
});

test('self-assessment survives workspace serialization without changing materials or snapshots', () => {
  const initial = scenarioState('PT03'); initial.analysis = makeAnalysis(initial);
  const state = normalizePrototypeState(initial);
  const next = {...state, preferences: setCapabilityMastery(state.preferences, 'SQL', true)};
  const restored = normalizePrototypeState(JSON.parse(JSON.stringify(next)));
  assert.equal(restored.preferences.capabilityMastery.SQL, true);
  assert.deepEqual(restored.claims, state.claims);
  assert.deepEqual(restored.analysis, state.analysis);
  assert.equal(restored.goal, state.goal);
});
