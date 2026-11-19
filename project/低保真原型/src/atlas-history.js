// Saved tasks and drafts from the previous map keep their recorded purpose,
// tool and delivery steps. This module only supports reopening those records.
const firstNodes = {
  ai:'problem', security:'network', ops:'systems', frontend:'web', backend:'protocol',
  engineering:'sources', testing:'requirements', software:'problem', delivery:'requirements'
};

export function atlasPracticeKey(atlas) {
  if (!atlas?.key) return null;
  if (Object.hasOwn(firstNodes,atlas.career) && atlas.key === 'career:' + atlas.career) {
    return 'work:' + atlas.career + ':' + firstNodes[atlas.career];
  }
  if (atlas.caseId === 'data-quality-v1' || /^work:data:/.test(atlas.key) || atlas.key === 'branch:data:quality') {
    const tool = atlas.tool === 'sheet' || /:sheet$/.test(atlas.key) ? 'sheet' : 'sql';
    return 'practice:data-quality:' + tool;
  }
  return atlas.key;
}

export function atlasSavedDraft(state, action) {
  const key = atlasPracticeKey(action?.atlas);
  if (!key) return null;
  return [state.taskDraft, state.atlasDrafts?.[key]]
    .find(draft => atlasPracticeKey(draft?.atlas) === key && draft.atlas.version === action.atlas.version) || null;
}

export function storeTaskDraft(state, draft) {
  const drafts = {...state.atlasDrafts};
  for (const item of [state.taskDraft, draft]) {
    const key = atlasPracticeKey(item?.atlas);
    if (key) drafts[key] = item;
  }
  return {...state,taskDraft:draft,atlasDrafts:drafts};
}

export function atlasTasks(tasks, draft) {
  const key = atlasPracticeKey(draft?.atlas);
  if (!key) return [];
  return tasks.filter(task => !['取消','跳过','延期'].includes(task.status) &&
    (atlasPracticeKey(task.atlas) === key ||
      (!task.atlas && task.template === draft.template &&
        (legacyTaskKey(task) === key || task.source === draft.source && task.purpose === draft.purpose))))
    .sort((a,b) => Number(a.completed) - Number(b.completed));
}

export function atlasReturn(task) {
  if (typeof task?.source !== 'string') return null;
  try {
    const route = new URL(task.source, 'http://local');
    return route.origin === 'http://local' && route.pathname === '/career-map'
      ? route.pathname + route.search : null;
  } catch {
    return null;
  }
}

function legacyTaskKey(task) {
  const source = atlasReturn(task);
  if (!source || task.template !== 'quality') return null;
  const params = new URL(source, 'http://local').searchParams;
  if ((params.get('career') || task.career || 'data') !== 'data') return null;
  if (params.get('tab') === '职业关系' && !['branch:quality','branch:数据质量'].includes(params.get('node'))) return null;
  const tool = params.get('tool') === 'sheet' || !params.has('tool') && params.get('node') === 'skill:sheet' ? 'sheet' : 'sql';
  return 'practice:data-quality:' + tool;
}

export function atlasTaskSkill(task) {
  if (task.atlas) return task.atlas.skill;
  const source = atlasReturn(task);
  if (!source) return null;
  const params = new URL(source, 'http://local').searchParams;
  if (params.get('node') === 'skill:sheet' || params.get('tool') === 'sheet') return '表格工具';
  if (params.get('node') === 'skill:sql' || params.get('tool') === 'sql') return 'SQL';
  return '未知';
}

