import {executionState} from './action-cycle-model.js';
import { confirmed } from './model.js';

const entry = (to, label) => ({ to, label });
const assessment = '/assessment?tab=原文确认';
const gap = '/assessment?tab=四维与差距';
const practiceTask = s => s.tasks.find(t => t.status === '进行中' && !t.completed)
  || s.tasks.find(t => t.status === '待开始' && !t.completed)
  || s.tasks.find(t => t.status === '受阻' && !t.completed);
export const externalPracticeRoute = task => `/plan?tab=执行&practice=${encodeURIComponent(task.id)}`;
export const taskRoute = (s, task) => s.stage === 'S1' || task.mode === 'S1'
  ? externalPracticeRoute(task) : `/work/${encodeURIComponent(task.id)}`;
export function practiceDestination(s) {
  const task = practiceTask(s) || s.tasks.findLast(t => t.completed && t.status === '完成');
  return task ? taskRoute(s, task) : '/learning';
}

export function flowNavigation(s, path, tab = '', search = '') {
  if (!s.logged) return null;
  const active = practiceTask(s);
  const practice = practiceDestination(s);
  const params = new URLSearchParams(search);
  const recorded = confirmed(s).length;
  const pending = s.claims.filter(c => ['待确认', '疑似重复', '矛盾'].includes(c.status)).length;
  const item = (back, next, hint, help = null) => ({ back, next, hint, help });
  if (path === '/app') return item(entry('/', '返回网站首页'), entry('/careers', '下一步：了解职业方向'), '先了解职业方向；已有项目或明确目标，也可以直接整理经历或安排计划。');
  if (path === '/careers' && tab === '我的机会') return item(entry('/careers', '上一步：职业探索'), entry('/reports?tab=岗位简历', '下一步：整理岗位简历'), '收藏与准备不代表已投递；申请进展由本人记录。');
  if (path === '/careers' || path === '/career-map') return item(
    entry(path === '/career-map' ? '/careers' : '/app', path === '/career-map' ? '上一步：职业探索' : '上一步：工作区'),
    entry(s.claims.length ? assessment : '/assessment?tab=资料经历', '下一步：整理我的经历'),
    s.claims.length ? `已有 ${s.claims.length} 项记录，可复用并逐项确认。` : '想好一个感兴趣的方向即可继续；没有简历也能手填经历。');
  if (path === '/assessment') {
    if (tab === '当前简历') return item(entry('/assessment?tab=成果档案', '返回我的画像'), entry('/reports?tab=岗位简历', '前往简历编辑台'), '每个目标分别选择当前简历；上传原稿的内容仍需本人逐项确认。');
    if ((!tab&&!params.has('resumeType'))||tab==='准备总览') return item(entry('/careers','返回职业探索'),entry(pending?assessment+'#assessment-review':!recorded?'/assessment?tab=资料经历':'/plan',pending?'处理待核对材料 →':!recorded?'记录已有经历 →':'安排下一项行动 →'),'材料、画像、准备差距和简历已在本页串联；查看不会代你确认或更新分析。');
    if (tab === '资料经历'||params.has('resumeType')) return item(entry('/careers', '上一步：职业探索'), entry(assessment, '下一步：核对经历原文'), s.claimDraft.title || s.claimDraft.text ? '草稿已保存在本机；点击“保存并核对经历”后，逐项确认原文。' : '填写实际经历，保存后逐项核对原文；缺少的信息可稍后补充。');
    if (tab === '原文确认') return item(entry('/assessment?tab=资料经历', '上一步：资料与经历'), entry(gap, '下一步：查看差距与未知'), pending ? `${pending} 项仍待核对；继续不会代你确认，未确认内容保持未知。` : recorded ? `已本人确认 ${recorded} 项；接下来查看对照依据与未知。` : '尚无确认材料；可以补充经历，也可先了解差距页。', !recorded ? entry('/assessment?tab=资料经历', '补充经历') : null);
    return item(entry(assessment, '上一步：经历确认'), entry('/plan', '下一步：安排目标计划'), s.analysisStale ? '已有分析依据发生变化；请在本页复查，继续不会更新分析。' : s.analysis ? '结合当前依据与未知安排小行动；不必先确定长期目标。' : '尚未生成模拟对照；可在本页查看规则，也可带着未知安排独立探索。');
  }
  if (path === '/plan') {
    if (tab === '执行' && params.has('practice')) {
      const task = s.tasks.find(t => t.id === params.get('practice'));
      if (!task || ['取消', '跳过', '延期'].includes(task.status)) return item(entry('/plan?tab=执行', '上一步：计划执行'), entry('/plan', '下一步：重新选择行动'), '这项行动不存在或已暂停；不会自动恢复或记为完成。');
      const route = externalPracticeRoute(task);
      if (params.get('step') === 'record') return item(entry(route, '上一步：实践目标'), entry(`/plan?tab=复盘&task=${encodeURIComponent(task.id)}`, '下一步：整理行动复盘'), task.note.trim() ? '行动结果草稿已保留；接下来整理反馈、困难和调整，不会自动标记完成。' : '请先记录实际行动与结果；尚未发生的部分保留未知，不编造成果。', entry('/plan?tab=执行', '返回任务列表'));
      return item(entry('/plan?tab=执行', '上一步：计划执行'), entry(`${route}&step=record`, '下一步：记录实践结果'), '这是实践验证环节：在站外行动，在本页记录本人实际做过的事。');
    }
    if (tab === '执行' && params.get('view') !== 'calendar') {
      const current = executionState(s, params.get('taskFilter') || 'all', params.get('task'));
      return item(entry('/plan', '上一步：目标计划'), current.selected
        ? {...entry('#action-selected-detail', '查看选中行动'), action:'selected-action'}
        : entry(s.tasks.length ? '/plan?tab=执行' : '/learning', s.tasks.length ? '查看全部行动' : '下一步：选择学习实践'),
        current.selected ? '查看当前选中行动的交付、已有记录与下一步；开始或恢复仍需核对依赖和预算。'
        : s.tasks.length ? '当前筛选或引用没有可选行动，可返回全部行动重新选择。' : '还没有有效待办；先选一个实践，再按预算确认创建任务。');
    }
    if (tab === '复盘') {
      const task = s.tasks.find(t => t.id === params.get('task'));
      return item(entry(task ? taskRoute(s, task) : practice, '上一步：实践验证'), entry('/reports', '下一步：整理职业报告'), '请先保存复盘记录，再进入职业报告。');
    }
    return item(entry(tab === '执行' ? '/plan' : gap, tab === '执行' ? '上一步：目标计划' : '上一步：差距与未知'), entry(practice, practice !== '/learning' ? '下一步：进入实践验证' : '下一步：选择学习实践'), active ? `带着“${active.title}”进入实践，先记录产物，再整理反馈与复盘。` : practice !== '/learning' ? '可查看已有行动成果，或在计划中安排下一次实践。' : '还没有有效待办；先选一个实践，再按预算确认创建任务。', s.analysisStale ? entry(gap, '复查变化的依据') : null);
  }
  if (path === '/learning') return item(entry('/plan', '上一步：目标计划'), entry(active ? practice : '/plan', active ? '下一步：进入实践任务' : '下一步：安排实践任务'), active ? `已有“${active.title}”，可以返回同一任务继续。` : '先查看学习内容，准备实践时再检查每周可用时间并创建任务。', entry('/reports', '先整理已有探索记录'));
  if (path.startsWith('/work/')) {
    let requestedId=null;
    try { requestedId=decodeURIComponent(path.split('/')[2]); } catch { /* Invalid object links use the existing recovery path. */ }
    const task = requestedId===null?undefined:s.tasks.find(t => t.id === requestedId);
    if (!task || ['取消', '跳过', '延期'].includes(task.status)) return item(entry('/learning', '上一步：学习实践'), entry('/plan?tab=执行', '下一步：返回计划处理'), '请从计划选择有效任务；停止的任务不会自动恢复。');
    if (s.stage === 'S1' || task.mode === 'S1') return item(entry('/plan', '上一步：目标计划'), entry(externalPracticeRoute(task), '下一步：进入外部行动记录'), '外部实践在计划模板的行动记录模式中继续，不使用平台任务工作区。');
    const base = `/work/${encodeURIComponent(task.id)}`;
    const at = (name) => `${base}?tab=${name}`;
    if (tab === '尝试与反馈') return item(entry(base, '上一步：任务目标'), entry(at('贡献与表达'), '下一步：整理贡献与表达'), '产物输入自动保留；继续不会提交尝试或运行模拟检查。');
    if (tab === '贡献与表达') return item(entry(at('尝试与反馈'), '上一步：尝试与反馈'), entry(at('完成回执'), '下一步：查看完成回执'), '本人贡献、辅助方式与检查结果分别记录；继续不会完成任务。');
    if (tab === '完成回执' || task.completed) return item(entry(at('贡献与表达'), '上一步：贡献与表达'), entry(`/plan?tab=复盘&task=${encodeURIComponent(task.id)}`, '下一步：整理行动复盘'), task.completed ? '任务完成不等于能力实核；下一步记录反馈与调整，新增经历仍需本人确认。' : '任务尚未完成；先处理回执，再如实记录实际结果或未完成原因。', entry(assessment, '核对新增经历'));
    return item(entry(tab === '笔记与阅读' ? base : '/plan', tab === '笔记与阅读' ? '上一步：任务目标' : '上一步：目标计划'), entry(at('尝试与反馈'), '下一步：填写尝试产物'), '按任务标准记录产物、本人贡献和限制；笔记与草稿可返回继续。');
  }
  if (path.startsWith('/reports/')) return item(entry('/reports', '上一步：报告列表'), entry('/app', '下一步：回工作区继续'), '阅读与跳转不会提交报告编辑；编辑正文请使用原页面的另存操作。');
  if (path === '/reports' && tab === '岗位简历') return item(entry('/careers?tab=我的机会', '上一步：本人求职进展'), entry('/careers?tab=我的机会', '下一步：回岗位记录进展'), '简历只呈现确认过的经历；导出不代表已向企业投递。', entry(assessment, '补充确认经历'));
  if (path === '/reports') return item(entry(practice, '上一步：返回实践'), entry('/app', '下一步：回工作区继续'), s.reports.length ? '报告记录当前快照；有新行动后可回来检查更新。' : '尚无报告；先在本页检查创建条件，缺项会明确保留。', entry('/plan', '安排下一轮行动'));
  if (path === '/assistant') {
    const back = typeof s.aiReturn === 'string' && /^\/(app|assessment|careers|career-map|plan|learning|work|reports)([/?]|$)/.test(s.aiReturn) ? s.aiReturn : '/app';
    return item(entry(back, '返回：原工作页面'), entry(tab === '自然语言检索' ? '/careers' : '/plan', tab === '自然语言检索' ? '下一步：查看职业目录' : '下一步：回计划确认行动'), '讨论与检索使用模拟结果；提议需在原业务页面预览确认。');
  }
  return null;
}
