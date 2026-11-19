export const SKILL_NOTE_LIMIT = 1800;
const identifier = /^[a-z][a-z0-9-]{0,49}$/;
const recordKey = /^[a-z][a-z0-9-]{0,49}:[a-z][a-z0-9-]{0,49}:v[1-9]\d{0,2}$/;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function skillStudyKey(career, leaf) {
  return career + ':' + leaf.id + ':v' + leaf.version;
}

export function skillProgress(career, leaves, study) {
  const total = leaves.length;
  const done = leaves.filter(leaf => study?.[skillStudyKey(career, leaf)]?.assessment?.passedAt).length;
  return {done, total, percent: total ? Math.round(done / total * 100) : 0};
}

export function updateSkillStudy(study, key, changes) {
  return {...study, [key]: {...study?.[key], ...changes}};
}

// This data includes private draft text. It follows the account's existing
// export/clear lifecycle. Quiz results are separately protected by the server.
export function normalizeSkillStudy(value) {
  if (!isRecord(value) || Object.keys(value).length > 900) throw new TypeError('Invalid skill study');
  const normalized = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!recordKey.test(key) || !isRecord(entry) ||
        Object.keys(entry).some(field => !['read','draft','assessment'].includes(field)) ||
        (entry.read !== undefined && typeof entry.read !== 'boolean') ||
        (entry.draft !== undefined && (typeof entry.draft !== 'string' || entry.draft.length > SKILL_NOTE_LIMIT))) {
      throw new TypeError('Invalid skill study record');
    }
    if (entry.assessment !== undefined && !validAssessment(entry.assessment)) {
      throw new TypeError('Invalid skill assessment');
    }
    normalized[key] = {...entry};
  }
  return normalized;
}

function validAssessment(row) {
  const isTime = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value);
  return isRecord(row) &&
    Object.keys(row).every(key => ['attempts','correct','total','passedAt','checkedAt'].includes(key)) &&
    Number.isInteger(row.attempts) && row.attempts >= 1 &&
    Number.isInteger(row.total) && row.total > 0 && row.total <= 10 &&
    Number.isInteger(row.correct) && row.correct >= 0 && row.correct <= row.total &&
    isTime(row.checkedAt) && (row.passedAt === null || isTime(row.passedAt)) &&
    (row.correct < row.total || row.passedAt !== null);
}

export function recordSkillAssessment(study, key, grade, checkedAt) {
  const previous = study?.[key]?.assessment;
  return updateSkillStudy(study, key, {
    assessment: {
      attempts: (previous?.attempts || 0) + 1,
      correct: grade.correct,
      total: grade.total,
      checkedAt,
      passedAt: previous?.passedAt ?? (grade.passed ? checkedAt : null)
    }
  });
}

const oldBranches = {
  data: {business:'metrics', '业务分析':'metrics', '数据质量':'quality'},
  ai: {evaluation:'evaluation', '应用开发':'application', '评估':'evaluation'},
  security: {operations:'detection', '安全运营':'detection', '应用安全':'application'},
  ops: {reliability:'observability', '系统运维':'systems', '可靠性':'observability'},
  frontend: {interface:'web-core', 'Web 界面':'web-core', '工程化':'engineering'},
  backend: {business:'api', '接口服务':'api', '业务系统':'api'},
  engineering: {pipeline:'batch', platform:'governance', '数据管道':'batch', '数据平台':'governance'},
  testing: {quality:'analysis', '质量保障':'analysis', '自动化':'automation'},
  software: {design:'problem', programming:'coding', '软件设计':'problem', '编程':'coding'},
  delivery: {implementation:'setup', support:'handover', '实施':'setup', '技术支持':'handover'}
};

const oldLeaves = {
  data: {foundation:'metric-definition',sql:'sql-joins',sheet:'pivot-tables',quality:'quality-rules',limits:'decision-brief'},
  ai: {problem:'task-baseline',programming:'python-data',model:'generalization',application:'output-contract',evaluation:'eval-cases',experiment:'reproducibility',delivery:'human-oversight'},
  security: {network:'network-path',scope:'authorized-scope',logs:'event-logs',access:'authorization',validation:'verify-control',investigation:'incident-handoff',checklist:'verify-control'},
  ops: {systems:'service-account',signals:'four-signals',configuration:'infra-state',container:'container-build',incident:'rollback-verify',runbook:'incident-review',review:'incident-review'},
  frontend: {web:'semantic-html',layout:'responsive-css',interaction:'dom-events',components:'state-ownership',accessibility:'keyboard',prototype:'form-errors',delivery:'release-checks'},
  backend: {protocol:'http-semantics',data:'schema-constraints',api:'api-contract',authorization:'object-authorization',verification:'integration-tests',service:'state-rules',handoff:'service-telemetry'},
  engineering: {sources:'lineage',modeling:'dataset-grain',transformation:'transform-sql',orchestration:'dag-intervals',quality:'pipeline-tests',pipeline:'idempotent-batch',catalog:'lineage'},
  testing: {requirements:'acceptance',design:'boundary',functional:'test-levels',automation:'stable-assertions',defects:'defect-reproduction',cases:'test-data',report:'ci-evidence'},
  software: {problem:'problem-model',structures:'structures-cost',implementation:'errors',design:'design-boundaries',verification:'debugging',project:'git-branches',documentation:'release-version'},
  delivery: {requirements:'scope-acceptance',environment:'environments',configuration:'role-matrix',migration:'migration',acceptance:'uat',handoff:'handoff',support:'support-triage'}
};

export function skillTreeRoute(career, {branch, skill, step, from} = {}) {
  const params = new URLSearchParams({career});
  if (branch) params.set('branch', branch);
  if (skill) params.set('skill', skill);
  if (step && step !== 'learn') params.set('step', step);
  if (from === 'report') params.set('from',from);
  return '/career-map?' + params;
}

export function chooseSkillLeaf(tree, params, study) {
  const oldNode = params.get('node')?.replace(/^skill:/, '');
  const leafId = params.get('skill') || oldLeaves[tree.id]?.[oldNode] ||
    (identifier.test(oldNode || '') ? oldNode : '') ||
    (tree.id === 'data' ? oldLeaves.data[params.get('tool')] : '');
  const branchId = params.get('branch') || (oldNode?.startsWith('branch:') ? oldNode.slice(7) : undefined);
  const matching = tree.branches.find(branch => branch.leaves.some(leaf => leaf.id === leafId));
  const branch = matching || tree.branches.find(branch => branch.id === branchId) ||
    tree.branches.find(branch => branch.id === oldBranches[tree.id]?.[branchId]) || tree.branches[0];
  const leaf = branch.leaves.find(leaf => leaf.id === leafId) ||
    branch.leaves.find(leaf => !study?.[skillStudyKey(tree.id, leaf)]?.assessment?.passedAt) || branch.leaves[0];
  const requestedStep = params.get('step');
  const step = ['practice','check'].includes(requestedStep) ? requestedStep : 'learn';
  return {branch, leaf, step};
}

const entrySkills = {
  data:'sql-joins', ai:'task-baseline', security:'event-logs', ops:'service-account',
  frontend:'dom-events', backend:'http-semantics', engineering:'transform-sql', testing:'boundary',
  software:'control-flow', delivery:'scope-acceptance'
};

export function legacySkillLink(career, skill) {
  const id = Object.hasOwn(entrySkills, career) ? career : 'data';
  const matching = {
    data:/表格|spreadsheet|excel/i.test(skill) && 'pivot-tables',
    ai:/python/i.test(skill) && 'python-data',
    backend:/java/i.test(skill) && 'service-structure'
  };
  return skillTreeRoute(id,{skill:matching[id] || entrySkills[id]});
}

