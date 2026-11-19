import {getSkillTree, gradeSkillCheck} from '../server/skill-trees/index.mjs';

export function localSkillTree(career) {
  return getSkillTree(career);
}

export function checkLocalSkill(payload) {
  return gradeSkillCheck(payload.career, payload.skill, payload.version, payload.answers);
}

