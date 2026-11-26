import {careers, confirmed} from './model.js';
import {careerDetailContent} from './career-detail-content.js';
import {capabilityMastery, capabilitySkills} from './capability-puzzle-model.js';
import {materialCareerLinks} from './career-material-links.js';
import {getInterestGroup, getInterestType} from './interest-assessment-model.js';
import {hasProfileValue} from './profile-insights-model.js';

// Each work-style entry points to an activity in the existing role workflow.
// The first entry is the strongest alignment for this example role.
const roleGuidance = {
  data: {position: '数据分析师', tasks: [['NT', 2], ['NF', 3], ['SP', 1]]},
  ai: {position: '人工智能应用工程师', tasks: [['NT', 2], ['SP', 1], ['NF', 0]]},
  security: {position: '安全运营工程师', tasks: [['SJ', 3], ['NT', 1], ['SP', 2]]},
  ops: {position: '系统运维工程师', tasks: [['SP', 2], ['SJ', 0], ['NT', 3]]},
  frontend: {position: '前端开发工程师', tasks: [['SP', 1], ['NF', 0], ['NT', 2]]},
  backend: {position: '后端开发工程师', tasks: [['NT', 1], ['NF', 0], ['SP', 2], ['SJ', 3]]},
  engineering: {position: '数据工程师', tasks: [['SJ', 2], ['NT', 1], ['SP', 3]]},
  testing: {position: '软件测试工程师', tasks: [['SJ', 3], ['NT', 0], ['SP', 2], ['NF', 1]]},
  software: {position: '软件开发工程师', tasks: [['NT', 0], ['SP', 1], ['SJ', 3]]},
  delivery: {position: 'IT 实施工程师', tasks: [['NF', 2], ['SP', 1], ['SJ', 3]]},
};

const skillAliases = {
  JavaScript: ['JS'],
  TypeScript: ['TS'],
  表格处理: ['Excel', '电子表格', '整理表格'],
  数据质量: ['数据清洗', '清洗数据', '数据去重'],
  图表表达: ['数据可视化', 'Power BI', 'Tableau'],
  'ETL / ELT': ['ETL', 'ELT', '数据管道'],
  组件与状态: ['React', 'Vue', '组件开发'],
  可访问性: ['无障碍', '键盘导航'],
  接口设计: ['REST API', '接口开发'],
  权限与校验: ['权限校验', '参数校验'],
  测试用例: ['测试设计', '编写用例'],
  缺陷复现: ['复现缺陷', '复现问题'],
  监控告警: ['服务监控', '告警规则'],
  日志分析: ['分析日志', '日志排查'],
  模型评估: ['模型评测', '模型测评'],
  需求记录: ['需求调研', '梳理需求'],
  验收与培训: ['用户验收', 'UAT'],
};

const skillKey = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const asArray = value => Array.isArray(value) ? value : [];
const roleSkills = Object.fromEntries(careers.map(career => [career.id,
  [...new Set([...capabilitySkills(career.id).map(skill => skill.name), career.skill])],
]));
const catalogSkills = [...new Set(Object.values(roleSkills).flat())];
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function mentionPattern(value) {
  const term = skillKey(value);
  const start = /^[a-z0-9_]/.test(term) ? '(?<![a-z0-9_])' : '';
  const end = /[a-z0-9_]$/.test(term) ? '(?![a-z0-9_])' : '';
  return new RegExp(start + escapePattern(term) + end);
}

const skillTerms = new Map(catalogSkills.map(name => {
  const terms = [name, ...asArray(skillAliases[name])];
  return [name, {labels: terms.map(skillKey), patterns: terms.map(mentionPattern)}];
}));
const roleMentions = Object.fromEntries(careers.map(career => [career.id,
  [career.name, roleGuidance[career.id].position].map(mentionPattern),
]));
const skillFrequency = new Map(catalogSkills.map(name => [name,
  Object.values(roleSkills).filter(skills => skills.includes(name)).length,
]));
const uncertainMention = /没有|没用过|没做过|没接触过|尚未|从未|未曾|未使用|未参与|未完成|未掌握|不熟悉|不掌握|不会|计划学习|打算学习|想学习|\b(?:no|not|never|haven't|didn't|plan to learn)\b/;

function claimLabels(claim) {
  const legacyLabels = typeof claim.skill === 'string' ? claim.skill.split(/[、,，;；\n]+/) : [];
  return new Set([...asArray(claim.skills), ...legacyLabels].filter(hasProfileValue).map(skillKey));
}

function claimEvidence(claim) {
  // The user has confirmed this record. A mention is still only an experience clue.
  const passages = [claim.contribution, claim.title, claim.text].filter(hasProfileValue)
    .flatMap(value => value.normalize('NFKC').split(/[。！？；;!?，,\n]|\.(?=\s)/)).map(skillKey)
    .filter(value => value && !uncertainMention.test(value));
  return {claim, passages, labels: claimLabels(claim), links: materialCareerLinks(claim)};
}

function backgroundForRole(career, skills, evidence) {
  const tagged = new Set();
  const mentioned = new Set();
  const related = [];
  let explicitCount = 0;
  for (const {claim, passages, labels, links} of evidence) {
    const linked = links.some(link => link.career === career.id);
    const roleMentioned = roleMentions[career.id].some(pattern => passages.some(value => pattern.test(value)));
    let relatedBySkill = false;
    for (const skill of skills) {
      const terms = skillTerms.get(skill);
      if (terms.labels.some(label => labels.has(label))) {
        tagged.add(skill);
        relatedBySkill = true;
      } else if (terms.patterns.some(pattern => passages.some(value => pattern.test(value)))) {
        mentioned.add(skill);
        relatedBySkill = true;
      }
    }
    if (linked) explicitCount++;
    if (linked || roleMentioned || relatedBySkill) related.push({
      title: hasProfileValue(claim.title) ? claim.title : '',
      rank: linked ? 2 : Number(relatedBySkill),
    });
  }
  return {
    backgroundCount: related.length,
    backgroundTitles: [...new Set(related.sort((a, b) => b.rank - a.rank).map(row => row.title).filter(Boolean))],
    backgroundSkills: [...tagged],
    mentionedSkills: [...mentioned].filter(skill => !tagged.has(skill)),
    explicitCount,
  };
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
    if (skillTerms.get(skill).labels.some(label => labels.has(label))) supported.add(skill);
    }
  }
  return supported;
}

function skillStrength(career, skills) {
  return skills.reduce((count, skill) => count + (skill === career.skill || skillFrequency.get(skill) === 1 ? 2 : 1), 0);
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
    roleSkills[selectedCareer.id]) : new Set();
  const ability = {recordedCount, snapshot: snapshotState, ready: recordedCount > 0 || supported.size > 0};
  const basis = {backgroundCount: facts.length, interest, ability};
  if (!facts.length || !interest || !ability.ready) return {...basis, status: 'incomplete', careers: []};

  const evidence = facts.map(claimEvidence);
  const candidates = careers.map(career => {
    const skills = roleSkills[career.id];
    const background = backgroundForRole(career, skills, evidence);
    const assessedSkills = career.id === selectedCareer.id ? [...supported] : [];
    const masteredSkills = skills.filter(skill => mastery[skill] === true);
    const learningSkills = skills.filter(skill => mastery[skill] === false);
    const {position, tasks} = roleGuidance[career.id];
    const taskIndex = tasks.findIndex(([preference]) => preference === group.id);
    const preferenceFit = {matched: taskIndex >= 0, task: taskIndex >= 0 ? careerDetailContent[career.id].workflow[tasks[taskIndex][1]].title : null};

    // Bound each input so repeated records and broadly shared skills cannot drown out other signals.
    const backgroundFit = Math.min(4, 3 * Number(background.explicitCount > 0)
      + skillStrength(career, background.backgroundSkills) + background.mentionedSkills.length
      + Number(background.backgroundCount > 0 && !background.backgroundSkills.length && !background.mentionedSkills.length));
    const newSnapshotSkills = assessedSkills.filter(skill => !masteredSkills.includes(skill)
      && !background.backgroundSkills.includes(skill) && !background.mentionedSkills.includes(skill));
    const abilityFit = Math.min(4, skillStrength(career, masteredSkills) + Math.min(2, newSnapshotSkills.length));
    const interestFit = taskIndex === 0 ? 6 : taskIndex > 0 ? 3 : 0;
    const score = 3 * backgroundFit + 3 * abilityFit + interestFit - Math.min(2, learningSkills.length);
    return {
      career: {id: career.id, name: career.name, position, to: '/careers?career=' + career.id, ...background,
        assessedSkills, masteredSkills, learningSkills, preferenceFit},
      score, interestFit,
      supported: background.backgroundCount > 0 || assessedSkills.length > 0 || masteredSkills.length > 0,
    };
  });

  const supportedCandidates = candidates.filter(career => career.supported);
  const exploratory = !supportedCandidates.length;
  const ranked = exploratory
    ? candidates.filter(({career}) => career.learningSkills.length > 0)
      .sort((a, b) => b.interestFit - a.interestFit || b.score - a.score)
    : supportedCandidates.sort((a, b) => b.score - a.score);
  return {...basis, status: ranked.length ? 'ready' : 'insufficient', exploratory: exploratory && ranked.length > 0,
    careers: ranked.slice(0, 3).map(({career}) => career)};
}
