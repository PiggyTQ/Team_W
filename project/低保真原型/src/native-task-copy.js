import nativeCopy from './i18n/native-task-copy.json' with {type:'json'};
import skillTreeCopy from './i18n/skill-tree-ui.json' with {type:'json'};
import {getLanguage} from './i18n/render.js';

function skillCopy(task, field) {
  if (typeof task.source !== 'string' || !task.source.startsWith('/career-map?')) return null;
  const route = new URLSearchParams(task.source.slice('/career-map?'.length));
  const career = route.get('career'), skill = route.get('skill');
  if (route.get('step') !== 'practice' || career !== task.career) return null;
  const skills = nativeCopy.skills[career];
  if (!skills || !Object.hasOwn(skills,skill)) return null;
  const copy = skills[skill];
  return field === 'standard'
    ? {zh:skillTreeCopy.zh.planOutput,en:skillTreeCopy.en.planOutput}
    : copy[field];
}

function copyPair(task, field) {
  const value = task?.[field];
  if (typeof value !== 'string' || !value) return null;
  const key = field === 'product' ? 'standard' : field;
  if (!['title','purpose','standard'].includes(key)) return null;
  const versions = nativeCopy.projects[task.template];
  const version = task.courseVersion ?? 1;
  const options = versions
    ? [versions[version]?.[key], versions[1]?.[key]]
    : task.template === 'external' ? [skillCopy(task,key)] : [];
  // The persisted field may contain an edit. Resolve only the original published copy.
  return options.find(pair => pair && (value === pair.zh || value === pair.en)) ?? null;
}

export function taskCopy(task, field, language = getLanguage()) {
  return copyPair(task,field)?.[language] ?? task?.[field];
}

export function matchesTaskTitle(task, query) {
  const keyword = query.trim().toLocaleLowerCase();
  const pair = copyPair(task,'title');
  const titles = pair ? [pair.zh,pair.en] : [task.title];
  return titles.some(title => title?.toLocaleLowerCase().includes(keyword));
}
