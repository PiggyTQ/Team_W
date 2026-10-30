import WritingHint from './WritingHint';
import React from 'react';
import { externalPracticeRoute } from './flow-navigation';
import InvestigationFields from './InvestigationFields';
import AtlasPracticeContext from './AtlasPracticeContext';

export default function ExternalPractice({ task, record, s, link, setTask, open, tell }) {
  if (!task) return <section className="panel"><h1>未找到这项实践行动</h1><p>请从计划中选择有效任务，原有记录不会被替换。</p>{link('/plan?tab=执行', '返回计划执行', 'button')}</section>;
  if (s.stage !== 'S1' && task.mode !== 'S1') return <section className="panel"><h1>继续平台实践任务</h1><p>这项任务有专门的实践页面。进入后可以提交成果、查看反馈并记录完成情况。</p>{link(`/work/${encodeURIComponent(task.id)}`, '进入任务工作区', 'button primary')}</section>;
  const stopped = ['取消', '跳过', '延期'].includes(task.status);
  return <div className="external-practice">
    <header className="screen-heading"><div><h1>{record ? '记录实践结果' : '记录站外学习与实践'}</h1><p>{task.title} · 本人手工记录，不连接外部平台或真实检查服务。</p></div><span className="status-chip">{task.status}</span></header>
    <div className="notice">在站外完成学习、项目或职业体验后，回到这里记录过程和成果。记录由你填写，平台尚未核验。</div>
    <AtlasPracticeContext task={task} link={link}/>
    <section className="panel"><header className="section-head"><h2>这次实践要回答什么？</h2>{link('/plan?tab=执行', '查看计划中的同一任务')}</header><dl className="facts"><dt>行动目的</dt><dd>{task.purpose || '待补充'}</dd><dt>成果标准</dt><dd>{task.standard}{task.deliveryNote&&<p>本人补充：{task.deliveryNote}</p>}</dd><dt>预计投入</dt><dd>{task.hours} 小时 · {task.association}</dd><dt>检查与声明</dt><dd>{task.check} · {task.claimStatus}；实际核验未知</dd></dl>
      <p>先做一个真实的小范围尝试，再记录发生了什么、本人贡献和局限；没有发生的结果留空。</p>
      {!record && !stopped && <div className="actions">{link(`${externalPracticeRoute(task)}&step=record`, '去记录本次行动结果', 'button primary')}<button onClick={() => open('task', { taskId: task.id })}>管理状态 / 记录受阻</button></div>}
    </section>
    {stopped ? <section className="panel"><h2>这项行动已暂停</h2><p>{task.status}不会记作完成。已有记录继续保留，可回计划调整或明确恢复。</p><p className="preserve">{task.note || '暂无行动结果。'}</p><button onClick={()=>open('taskEdit',{taskId:task.id,restore:true})}>编辑并恢复任务</button>{link('/plan?tab=执行', '回计划处理', 'button')}</section> : record && <section className="panel"><h2>本人实践记录</h2><p className="muted">输入自动保留在本机。保存记录、标记完成、形成待确认经历是不同操作。</p><form onSubmit={e => { e.preventDefault(); if (!task.note.trim()) { tell('请先记录实际行动与结果；尚未开展可先返回计划，或记录受阻。'); return; } tell('实践记录已保留；任务状态和经历确认状态未改变。'); }}>
      <InvestigationFields data={task} change={patch=>setTask(task.id,patch)}/>
      <label className="field"><span>实际行动与结果（自动保留）</span><textarea aria-label="实际行动与结果（自动保留）" aria-describedby="external-result-writing-hint" value={task.note} onChange={e => setTask(task.id, { note: e.target.value })} placeholder="实际做了什么？得到什么结果？未完成部分请如实说明。" /></label><WritingHint id="external-result-writing-hint">可以按三句话记录：当时想弄清什么；实际做了哪一步；留下了什么、还有什么没弄清。</WritingHint>
      <label className="field"><span>本人实际贡献（自动保留）</span><textarea aria-label="本人实际贡献（自动保留）" aria-describedby="external-contribution-writing-hint" value={task.contribution} onChange={e => setTask(task.id, { contribution: e.target.value })} /></label><WritingHint id="external-contribution-writing-hint">区分自己负责、团队完成和参考辅助的部分；不能确定时先记录事实。</WritingHint>
      <label className="field"><span>收到的实际反馈（没有可留空）</span><textarea aria-label="收到的实际反馈（没有可留空）" value={task.externalFeedback || ''} onChange={e => setTask(task.id, { externalFeedback: e.target.value })} /></label>
      <label className="field"><span>困难与局限（私人草稿，自动保留）</span><textarea aria-label="困难与局限（私人草稿，自动保留）" value={task.reflection} onChange={e => setTask(task.id, { reflection: e.target.value })} /></label>
      <div className="actions"><button type="submit" className="primary">保存实践记录</button><button type="button" onClick={() => open('task', { taskId: task.id })}>更新任务状态或整理经历</button></div>
    </form></section>}
  </div>;
}

