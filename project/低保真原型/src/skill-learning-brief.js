import briefs from './i18n/branch-learning-briefs.json' with {type:'json'};

export function skillLearningBrief(skillKey) {
  if (!Object.hasOwn(briefs, skillKey)) return undefined;
  const [outcome, deliverable] = briefs[skillKey];
  return {outcome, deliverable};
}
