import {careers, confirmed} from './model.js';
import {careerDetailContent} from './career-detail-content.js';
import {capabilityMastery, capabilitySkills} from './capability-puzzle-model.js';
import {materialCareerLinks} from './career-material-links.js';
import {getInterestGroup, getInterestType} from './interest-assessment-model.js';
import {hasProfileValue} from './profile-insights-model.js';

// These are examples of work activities to explore with each saved preference.
// Their order follows the published role workflow and carries no aptitude score.
const workStyles = {
  data: ['NF', 'NT', 'SP', 'NF'],
  ai: ['NF', 'SP', 'NT', 'NT'],
  security: ['SJ', 'NT', 'SP', 'SJ'],
  ops: ['SJ', 'SP', 'SP', 'NT'],
  frontend: ['NF', 'SP', 'NT', 'NF'],
  backend: ['NF', 'NT', 'SP', 'SJ'],
  engineering: ['SJ', 'NT', 'SJ', 'SP'],
  testing: ['NT', 'SJ', 'SP', 'NF'],
  software: ['NT', 'SP', 'NT', 'SJ'],
  delivery: ['NF', 'SP', 'NF', 'SJ'],
};

const skillKey = value => value.trim().replace(/\s+/g, ' ').toLowerCase();
const asArray = value => Array.isArray(value) ? value : [];

function claimLabels(claim) {
  const legacyLabels = typeof claim.skill === 'string' ? claim.skill.split(/[、,，;；\n]+/) : [];
  return new Set([...asArray(claim.skills), ...legacyLabels].filter(hasProfileValue).map(skillKey));
}

function currentRefs(refs, claims) {
  return asArray(refs).filter(ref => Number.isInteger(ref?.version) && claims.get(ref.id)?.version === ref.version);
}

function snapshotStatus(state, claims, selectedCareer) {
  if (!state.analysis) return 'none';
  if (!claims.length || state.adminSource?.status === '已撤回') return 'unavailable';
  if (state.analysis.occupation !== selectedCareer.id) return 'other';
  if (state.analysisStale || state.analysis.profileVersion !== state.profileVersion) return 'stale';
  return 'current';
}

function snapshotSkills(analysis, claims, skills) {
  const supported = new Set();
  const refs = currentRefs(analysis.claims, claims);
  if (Array.isArray(analysis.skillRows)) {
    const snapshotClaims = new Map(refs.map(ref => [ref.id, claims.get(ref.id)]));
    for (const row of analysis.skillRows) {
      if (hasProfileValue(row?.name) && currentRefs(row.claimRefs, snapshotClaims).length) supported.add(row.name.trim());
    }
    return supported;
  }
  for (const ref of refs) {
    const labels = claimLabels(claims.get(ref.id));
    for (const skill of skills) {
      if (labels.has(skillKey(skill))) supported.add(skill);
    }
  }
  return supported;
}

function compareCandidates(left, right) {
  const additionalAssessments = candidate => candidate.assessedSkills.filter(skill => !candidate.backgroundSkills.includes(skill)).length;
  return right.explicitCount - left.explicitCount
    || right.backgroundSkills.length - left.backgroundSkills.length
    || right.masteredSkills.length - left.masteredSkills.length
    || additionalAssessments(right) - additionalAssessments(left)
    || Number(right.preferenceFit.matched) - Number(left.preferenceFit.matched);
}

export function assessmentRecommendations(state, {snapshot} = {}) {
  const preferences = state.preferences || {};
  const facts = confirmed({claims: asArray(state.claims)}).filter(claim => hasProfileValue(claim.text));
  const type = getInterestType(preferences.interestType);
  const group = type?.group || getInterestGroup(preferences.interestGroup);
  const interest = group ? {type: type?.id || null, group} : null;
  const mastery = capabilityMastery(preferences);
  const recordedCount = Object.keys(mastery).length;
  const selectedCareer = careers.find(career => career.id === (state.assessmentCareer || state.goal)) || careers[0];
  const currentSnapshot = snapshotStatus(state, facts, selectedCareer);
  const snapshotState = currentSnapshot === 'current' ? snapshot ?? currentSnapshot : currentSnapshot;
  const supported = snapshotState === 'current' ? snapshotSkills(state.analysis, new Map(facts.map(claim => [claim.id, claim])),
    capabilitySkills(selectedCareer.id).map(skill => skill.name)) : new Set();
  const ability = {recordedCount, snapshot: snapshotState, ready: recordedCount > 0 || supported.size > 0};
  const basis = {backgroundCount: facts.length, interest, ability};
  if (!facts.length || !interest || !ability.ready) return {...basis, status: 'incomplete', careers: []};

  const evidence = facts.map(claim => ({id: claim.id, labels: claimLabels(claim), links: materialCareerLinks(claim)}));
  const candidates = careers.map(career => {
    const skills = capabilitySkills(career.id).map(skill => skill.name);
    const relatedClaims = new Set();
    const backgroundLabels = new Set();
    let explicitCount = 0;
    for (const item of evidence) {
      if (item.links.some(link => link.career === career.id)) {
        relatedClaims.add(item.id);
        explicitCount++;
      }
      for (const skill of skills) {
        if (!item.labels.has(skillKey(skill))) continue;
        relatedClaims.add(item.id);
        backgroundLabels.add(skill);
      }
    }
    const assessedSkills = career.id === selectedCareer.id ? [...supported] : [];
    const masteredSkills = skills.filter(skill => mastery[skill] === true);
    const learningSkills = skills.filter(skill => mastery[skill] === false);
    const taskIndex = workStyles[career.id]?.indexOf(group.id) ?? -1;
    const workflow = careerDetailContent[career.id].workflow;
    const preferenceFit = {matched: taskIndex !== -1, task: workflow[Math.max(taskIndex, 0)].title};
    return {id: career.id, name: career.name, to: '/careers?career=' + career.id,
      backgroundCount: relatedClaims.size, backgroundSkills: [...backgroundLabels], explicitCount, assessedSkills,
      masteredSkills, learningSkills, preferenceFit};
  }).filter(career => career.backgroundCount || career.assessedSkills.length || career.masteredSkills.length);

  return {...basis, status: candidates.length ? 'ready' : 'insufficient', careers: candidates.sort(compareCandidates).slice(0, 3)};
}
