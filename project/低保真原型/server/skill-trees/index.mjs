import {alignedChecks,gradeAligned} from './aligned-checks.mjs';
import {transferChecks} from './transfer-checks.mjs';
import {careers} from '../../src/model.js';
import data from './data.mjs';
import ai from './ai.mjs';
import security from './security.mjs';
import ops from './ops.mjs';
import frontend from './frontend.mjs';
import backend from './backend.mjs';
import engineering from './engineering.mjs';
import testing from './testing.mjs';
import software from './software.mjs';
import delivery from './delivery.mjs';
import {applicationTasks,gradeApplication} from './application-tasks.mjs';

const trees = new Map([data, ai, security, ops, frontend, backend, engineering, testing, software, delivery]
  .map(tree => [tree.id, tree]));
const bilingual = value => Array.isArray(value) && value.length === 2 &&
  value.every(text => typeof text === 'string' && text.trim().length > 0);
const distinct = values => new Set(values).size === values.length;
const slug = /^[a-z][a-z0-9-]{0,49}$/;
const published = '2026-11-13';

function requireContent(condition, field) {
  if (!condition) throw new Error('Invalid skill tree content: ' + field);
}

function verifySources(list) {
  requireContent(list.length > 0 && distinct(list.map(source => source.url)), 'sources');
  for (const source of list) {
    const url = new URL(source.url);
    requireContent(url.protocol === 'https:' && !url.username && !url.password &&
      source.publisher && source.title, source.url);
  }
}

function verifyTrees() {
  requireContent(trees.size === careers.length && careers.every(career => trees.has(career.id)), 'careers');
  for (const tree of trees.values()) {
    verifySources(tree.frameworks);
    if (tree.assessment) verifySources([tree.assessment]);
    requireContent(tree.branches.length === 4 && distinct(tree.branches.map(branch => branch.id)), tree.id);
    requireContent(distinct(tree.branches.flatMap(branch => branch.leaves.map(leaf => leaf.id))), tree.id);
    for (const branch of tree.branches) {
      requireContent(slug.test(branch.id) && bilingual(branch.title) && bilingual(branch.purpose) &&
        branch.leaves.length >= 3 && branch.leaves.length <= 4, tree.id + '/' + branch.id);
      for (const leaf of branch.leaves) {
        const label = tree.id + '/' + leaf.id;
        requireContent(slug.test(leaf.id) && Number.isInteger(leaf.version) && leaf.version >= 1 &&
          [leaf.title, leaf.lesson, leaf.exercise].every(bilingual) && leaf.checks.length === 2, label);
        verifySources(leaf.sources);
        for (const question of leaf.checks) {
          requireContent([question.prompt, question.explanation, ...question.options].every(bilingual) &&
            question.options.length === 3 &&
            [0, 1].every(language => distinct(question.options.map(option => option[language]))), label);
        }
      }
    }
  }
}

verifyTrees();

// Applications are versioned independently of archived v1 authored checks.
Object.assign(alignedChecks,transferChecks);
for(const [career,tree] of trees)for(const branch of tree.branches)for(const leaf of branch.leaves){
 const c=alignedChecks[leaf.id];if(!c)continue;
 c.career=career;c.checks??=leaf.checks;c.topics??=leaf.checks.map(q=>q.prompt);
 requireContent(bilingual(c.application.prompt)&&bilingual(c.application.material)&&c.application.fields.length>=2,'application/'+leaf.id);
 requireContent(c.application.fields.every(f=>bilingual(f.label)&&/^[a-z][A-Za-z0-9-]{0,24}$/.test(f.id)),'application fields/'+leaf.id);
}

function shuffledChoices(career, leaf, question, index) {
  // Stable for the published version, so answers survive a page refresh or
  // reconnect. Option IDs name the displayed choices, not their source index.
  const key = [career, leaf.id, leaf.version, index].join('/');
  const seed = [...key].reduce((hash, char) => (Math.imul(31, hash) + char.charCodeAt(0)) >>> 0, 0);
  const [a, b, c] = question.options.map((text, original) => ({text, original}));
  const permutations = [[a,b,c],[b,c,a],[c,a,b],[a,c,b],[b,a,c],[c,b,a]];
  return permutations[seed % permutations.length].map((option, choice) => ({
    ...option, id: 'choice-' + (choice + 1)
  }));
}

const publicTrees = new Map([...trees].map(([id, tree]) => [id, {
  ...tree,
  published,
  branches: tree.branches.map(branch => ({
    ...branch,
    leaves: branch.leaves.map(({checks, ...leaf}) => ({
      ...leaf,...(alignedChecks[leaf.id]?{version:2,previousVersions:[1],assessmentPublished:'2026-11-21'}:{}),
      application:alignedChecks[leaf.id]?.application||{prompt:applicationTasks[leaf.id].prompt},
      questions: (alignedChecks[leaf.id]?.checks||checks).map((question, index) => ({
        id: 'q' + (index + 1), prompt: question.prompt,
        options: shuffledChoices(id, leaf, question, index).map(({text, id}) => ({id, text}))
      }))
    }))
  }))
}]));

export function getSkillTree(career) {
  return publicTrees.get(career);
}

export function gradeSkillCheck(career, leafId, version, answers) {
  const leaf = trees.get(career)?.branches.flatMap(branch => branch.leaves).find(leaf => leaf.id === leafId);
  if (!leaf) throw skillError('NOT_FOUND', 404);
  if (version !== leaf.version && !(version===2&&alignedChecks[leafId])) throw skillError('SKILL_CHECK_VERSION', 409);
  if (!answers || Array.isArray(answers) || typeof answers !== 'object' ||
      Object.keys(answers).length !== leaf.checks.length+1 ||
      Object.keys(answers).some(key=>!['q1','q2','application'].includes(key)) ||
      typeof answers.application!=='string'||!answers.application.trim()||answers.application.length>400) throw skillError('SKILL_CHECK_INVALID', 400);
  const aligned=version===2?alignedChecks[leafId]:null;
  const questions = (aligned?.checks||leaf.checks).map((question, index) => {
    const id = 'q' + (index + 1);
    const option = shuffledChoices(career, leaf, question, index).find(choice => choice.id === answers[id]);
    if (!option || !Object.hasOwn(answers, id)) throw skillError('SKILL_CHECK_INVALID', 400);
    return {id, correct: option.original === 0, explanation: question.explanation,...(aligned?{label:aligned.topics[index],section:'examples'}:{})};
  });
  if(aligned)questions.push(...gradeAligned(leafId,answers.application));
  else questions.push({id:'application',correct:gradeApplication(leaf.id,answers.application),explanation:applicationTasks[leaf.id].feedback});
  const correct = questions.filter(question => question.correct).length;
  return {correct, total: questions.length, passed: correct === questions.length, questions};
}

function skillError(code, status) {
  return Object.assign(new Error(code), {code, status});
}

