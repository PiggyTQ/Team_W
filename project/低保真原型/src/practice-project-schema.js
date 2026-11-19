import {PRACTICE_ROLES, PRACTICE_STEPS} from './practice-project-model.js';

const bilingual = value => value && typeof value.zh === 'string' && value.zh.trim() &&
  typeof value.en === 'string' && value.en.trim();
const identifier = value => typeof value === 'string' && /^[a-z0-9-]{1,40}$/i.test(value);
const bilingualFields = (value, keys) => value && keys.every(key => bilingual(value[key]));
const unique = values => new Set(values).size === values.length;
const publishedSource = value => {
  if (!identifier(value?.id) || !bilingualFields(value, ['use']) ||
      !['case', 'method', 'data', 'video'].includes(value.kind) ||
      typeof value.title !== 'string' || !value.title.trim() ||
      typeof value.publisher !== 'string' || !value.publisher.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.checkedOn || '')) return false;
  try {
    const url = new URL(value.url);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

export function validatePracticeProject(project, {id, version, career} = {}) {
  const invalid = () => { throw Object.assign(new Error('INVALID_PROJECT_MATERIAL'), {code: 'INVALID_PROJECT_MATERIAL', status: 400}); };
  if (!project || project.id !== id || project.version !== version || project.career !== career ||
      !bilingualFields(project, ['title', 'brief', 'audience', 'outcome', 'boundary', 'interview', 'handoff', 'reference']) ||
      !Array.isArray(project.reading) || project.reading.length !== PRACTICE_STEPS.length ||
      !project.reading.every(row => bilingualFields(row, ['title', 'body']))) invalid();

  if (!Array.isArray(project.sources) || project.sources.length < 3 ||
      !project.sources.every(publishedSource) || !unique(project.sources.map(row => row.id)) ||
      !project.sources.some(row => row.kind === 'case')) invalid();
  for (const role of PRACTICE_ROLES) {
    if (!bilingualFields(project.roles?.[role], ['title', 'responsibility'])) invalid();
  }

  const dataset = project.dataset;
  if (!bilingualFields(dataset, ['title', 'intro']) || !Array.isArray(dataset?.columns) ||
      dataset.columns.length < 2 || dataset.columns.length > 10 ||
      !dataset.columns.every(column => identifier(column.id) && bilingual(column.label)) ||
      !unique(dataset.columns.map(column => column.id)) ||
      !Array.isArray(dataset.rows) || !dataset.rows.length || dataset.rows.length > 150 ||
      !dataset.rows.every(row => identifier(row.id) && Array.isArray(row.cells) &&
        row.cells.length === dataset.columns.length &&
        row.cells.every(cell => bilingual(cell) || typeof cell === 'string' && cell.length < 500)) ||
      !unique(dataset.rows.map(row => row.id))) invalid();

  if (!Array.isArray(project.steps) || project.steps.length !== PRACTICE_STEPS.length) invalid();
  for (const [index, step] of project.steps.entries()) {
    if (step.id !== PRACTICE_STEPS[index] ||
        !bilingualFields(step, ['title', 'assignment', 'impact', 'question', 'member', 'lead', 'hint', 'check', 'handoff']) ||
        !Number.isInteger(step.minEvidence) || step.minEvidence < 0 || step.minEvidence > 8 ||
        !Array.isArray(step.sourceIds) || !step.sourceIds.length ||
        step.sourceIds.some(id => !project.sources.some(row => row.id === id)) ||
        !Array.isArray(step.choices) || step.choices.length < 2 ||
        !step.choices.every(choice => identifier(choice.id) && bilingualFields(choice, ['label', 'feedback'])) ||
        !unique(step.choices.map(choice => choice.id))) invalid();
  }
  return project;
}
