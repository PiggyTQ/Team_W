export const PRACTICE_COURSES = ['quality', 'ai-eval', 'log', 'restore'];
export const PRACTICE_STEPS = ['scope', 'evidence', 'decision', 'delivery'];
export const PRACTICE_ROLES = ['member', 'lead'];
export const PRACTICE_SCOPES = ['core', 'extended'];
export const PRACTICE_NOTE_LIMIT = 1200;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const validKeys = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const token = value => typeof value === 'string' && /^[a-z0-9-]{1,40}$/i.test(value);
const boundedText = value => typeof value === 'string' && value.length <= PRACTICE_NOTE_LIMIT;
const invalid = () => { throw Object.assign(new Error('INVALID_PROJECT_PRACTICE'), {code: 'INVALID_PROJECT_PRACTICE', status: 400}); };

export const guidedCourse = (id, version) => PRACTICE_COURSES.includes(id) && Number.isInteger(version) && version >= 2;
export const guidedTask = task => task?.mode === 'S2' && guidedCourse(task.template, task.courseVersion);

export function projectRoute(id, {view, task, step, chapter} = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({view, task, step, chapter})) {
    if (value !== undefined && value !== null) query.set(key, value);
  }
  return '/learning/projects/' + encodeURIComponent(id) + (query.size ? '?' + query : '');
}

export function courseReadingPosition(record, version) {
  return record?.version === version ? record : record?.versions?.[version];
}

export function recordProjectReading(record, position) {
  const versions = {...record?.versions};
  if (record?.version && !Object.hasOwn(versions, record.version)) {
    const {versions: previous, ...entry} = record;
    versions[record.version] = entry;
  }
  versions[position.version] = position;
  return {...position, versions};
}

export function newProjectPractice(role = 'member', scope = 'core') {
  return {role, scope, responses: {}};
}

export const emptyProjectResponse = () => ({choice: '', evidence: [], note: '', contribution: '', limits: '', extension: ''});

// Drafts may be incomplete, but keep the account record bounded and keyed by
// the published step IDs. Submission also checks the choices and evidence IDs.
export function normalizeProjectPractice(value, project) {
  if (!validKeys(value, ['role', 'scope', 'responses']) ||
      !PRACTICE_ROLES.includes(value.role) || !PRACTICE_SCOPES.includes(value.scope) ||
      !validKeys(value.responses, PRACTICE_STEPS)) invalid();
  const responses = {};
  for (const stepId of PRACTICE_STEPS) {
    if (!Object.hasOwn(value.responses, stepId)) continue;
    const entry = value.responses[stepId];
    if (!validKeys(entry, Object.keys(emptyProjectResponse()))) invalid();
    const row = {...emptyProjectResponse(), ...entry};
    if (row.choice !== '' && !token(row.choice) ||
        !Array.isArray(row.evidence) || row.evidence.length > 8 ||
        !row.evidence.every(token) || new Set(row.evidence).size !== row.evidence.length ||
        ![row.note, row.contribution, row.limits, row.extension].every(boundedText)) invalid();
    if (stepId !== 'delivery' && (row.contribution || row.limits || row.extension)) invalid();
    if (project) {
      const step = project.steps.find(item => item.id === stepId);
      if (row.choice && !step.choices.some(item => item.id === row.choice)) invalid();
      if (row.evidence.some(id => !project.dataset.rows.some(item => item.id === id))) invalid();
    }
    responses[stepId] = {
      choice: row.choice, evidence: [...row.evidence].sort(), note: row.note,
      contribution: row.contribution, limits: row.limits, extension: row.extension
    };
  }
  return {role: value.role, scope: value.scope, responses};
}

export function projectStepIssue(step, practice) {
  const answer = practice?.responses[step.id];
  if (!answer?.choice) return 'choice';
  if ((answer.evidence?.length || 0) < step.minEvidence) return 'evidence';
  if (!answer.note?.trim()) return 'note';
  if (step.id === 'delivery') {
    if (!answer.contribution?.trim()) return 'contribution';
    if (!answer.limits?.trim()) return 'limits';
    if (practice.scope === 'extended' && !answer.extension?.trim()) return 'extension';
  }
  return '';
}

export function projectPracticeReady(project, practice) {
  try {
    const normalized = normalizeProjectPractice(practice, project);
    return project.steps.every(step => !projectStepIssue(step, normalized));
  } catch {
    return false;
  }
}

export function sameProjectPractice(left, right) {
  if (!left || !right) return false;
  return JSON.stringify(normalizeProjectPractice(left)) === JSON.stringify(normalizeProjectPractice(right));
}

export function createProjectDeliverable(project, practice, language = 'zh') {
  const data = normalizeProjectPractice(practice, project);
  if (project.steps.some(step => projectStepIssue(step, data))) {
    throw Object.assign(new Error('PROJECT_STEPS_INCOMPLETE'), {code: 'PROJECT_STEPS_INCOMPLETE', status: 409});
  }
  const en = language === 'en';
  const copy = pair => pair[en ? 'en' : 'zh'];
  const answer = data.responses.delivery;
  const labels = en
    ? {role: 'Role', scope: 'Scope', evidence: 'Evidence rows', contribution: 'My contribution', limits: 'Limitations', extension: 'Extended scope', sources: 'Sources', context: 'Guided practice', core: 'Core', extended: 'Extended'}
    : {role: '参与角色', scope: '实践范围', evidence: '引用证据行', contribution: '本人贡献', limits: '结论限制', extension: '扩展范围', sources: '资料来源', context: '教学实践', core: '核心', extended: '扩展'};
  const sections = project.steps.map(step => {
    const response = data.responses[step.id];
    const decision = step.choices.find(choice => choice.id === response.choice);
    return [
      '## ' + copy(step.title), copy(decision.label), response.note.trim(),
      response.evidence.length ? labels.evidence + ' · ' + response.evidence.join(', ') : ''
    ].filter(Boolean).join('\n');
  });
  const document = [
    '# ' + copy(project.title), labels.context + ' · v' + project.version,
    labels.role + ' · ' + copy(project.roles[data.role].title),
    labels.scope + ' · ' + labels[data.scope],
    ...sections,
    '## ' + labels.contribution + '\n' + answer.contribution.trim(),
    '## ' + labels.limits + '\n' + answer.limits.trim(),
    answer.extension.trim() ? '## ' + labels.extension + '\n' + answer.extension.trim() : '',
    '## ' + labels.sources + '\n' + project.sources.map(source => '- ' + source.publisher + ' · ' + source.title + ' · ' + source.url).join('\n')
  ].filter(Boolean).join('\n\n');
  return {document, contribution: answer.contribution.trim(), snapshot: data};
}
