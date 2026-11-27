import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {CHECKER_VERSION} from './scenarios.mjs';
import {validatePracticeArtifact} from '../../shared/practice-artifact.js';

export const artifactDigest = text => createHash('sha256').update(text).digest('hex');
const checkerDigest=artifactDigest(['./checker.mjs','./scenarios.mjs','./test-subject.mjs','../../shared/practice-artifact.js'].map(file=>readFileSync(new URL(file,import.meta.url),'utf8')).join('\n'));
export function checkGrowthArtifact(project, input, text, {now = Date.now,expected} = {}) {
  const checks = validatePracticeArtifact(project,input,text,artifactDigest,expected);
  return {
    checker: CHECKER_VERSION, checkerDigest, projectId: project.id, version: project.version,
    inputDigest: artifactDigest(JSON.stringify(input)), artifactDigest: artifactDigest(text),
    environment: {runtime: process.version, platform: process.platform},
    executedAt: new Date(now()).toISOString(),
    kind: 'deterministic_artifact_and_result_check',
    executionScope: 'Checks submitted files and result values. Learner code execution remains local and self-reported.',
    passed: checks.every(check=>check.passed), checks,
    contentReview: 'self_review_required', masteryGranted: false
  };
}

