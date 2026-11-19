import React, {useEffect, useRef, useState} from 'react';
import ProductIcon from './ProductIcon';
import {apiRequest} from './auth-client';
import {hasExternalConsent, scopeKey} from './agent-contract';
import {authMessage} from './auth-contract';
import {projectStepIssue} from './practice-project-model';
import {stoppedTask} from './task-edit-model';
import {dependencyBlock} from './completion-model';

const sourceQuestion = /source|official|data|origin|where|出处|来源|原文|资料|数据/i;
const reviewQuestion = /review|check|criteria|pass|finish|核对|自查|通过|完成|验收/i;
const handoffQuestion = /handoff|interview|deliver|交接|面试|交付|汇报/i;

export default function ProjectCoach({project, step, task, state, liveAgent, workspace, language, link}) {
  const en = language === 'en';
  const copy = value => value[language];
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState(null);
  const [guidance, setGuidance] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  const consent = hasExternalConsent(state);
  const grant = consent ? state.aiExternalConsent.grantId : null;
  const current = useRef(grant);
  current.current = grant;
  const consentKey = scopeKey(state);
  const available = !!task && liveAgent?.enabled && consent && !task.completed &&
    !stoppedTask(task) && !dependencyBlock(state, task);
  const sources = project.sources.filter(source => step.sourceIds.includes(source.id));
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    request.current?.abort();
    setReply(null);
    setPending(false);
  }, [grant, consentKey]);

  async function ask(event) {
    event.preventDefault();
    if (!question.trim() || request.current) return;
    if (!available) {
      const needed = projectStepIssue(step, task?.projectPractice);
      setGuidance(handoffQuestion.test(question) ? 'handoff'
        : sourceQuestion.test(question) || needed === 'evidence' ? 'sources'
        : reviewQuestion.test(question) ? 'check' : 'hint');
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    setReply(null);
    setGuidance(null);
    try {
      await workspace.flush();
      const saved = workspace.current();
      if (controller.signal.aborted || grant !== current.current || !saved.owner) return;
      const result = await apiRequest('/api/agent/respond', {
        signal: controller.signal,
        data: {
          mode: 'career_consultation',
          message: question.trim(),
          baseVersion: saved.revision,
          scope: {confirmedClaims: false, currentPlan: false},
          context: {workspace: 'U08', career: project.career},
          practice: {taskId: task.id, step: step.id, language}
        }
      });
      if (!controller.signal.aborted && grant === current.current) setReply(result);
    } catch (failure) {
      if (!controller.signal.aborted) setError(authMessage(failure.code, language));
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return <section className="project-coach" id="project-practice-assistant" aria-label={en ? 'Practice assistant' : '实践助手'} data-i18n="off">
    <div className="project-coach-heading">
      <ProductIcon name="brain" size={23}/>
      <h3>{en ? 'Practice assistant' : '实践助手'}</h3>
      <button type="button" aria-expanded={open} aria-controls="project-coach-body" onClick={() => setOpen(value => !value)}>
        {open ? (en ? 'Collapse' : '收起') : (en ? 'Ask for help' : '展开问询')}
      </button>
    </div>
    <p className="project-assistant-context">{copy(step.title)}</p>
    <div id="project-coach-body" hidden={!open}>
      <button type="button" className="project-inline-action" onClick={() => setHint(value => !value)} aria-expanded={hint}>
        {hint ? (en ? 'Hide step hint' : '收起本步提示') : (en ? 'Show step hint' : '查看本步提示')}
      </button>
      {hint && <div className="project-coach-hint"><p>{copy(step.hint)}</p><p>{copy(step.check)}</p>
        <ul>{sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>
      </div>}
      <form className="project-question-form" onSubmit={ask}>
        <label htmlFor="project-coach-question">{en ? 'Your question about this step' : '关于这一步的问题'}</label>
        <textarea id="project-coach-question" rows={3} maxLength={1200} value={question} onChange={event => setQuestion(event.target.value)} placeholder={copy(step.question)}/>
        {available ? <>
          <small>{en ? 'Sends your question and the public step materials.' : '发送内容为你的问题与本步公开资料。'}</small>
          <div className="project-buttons">
            <button type="submit" disabled={pending || !question.trim()}>{pending ? (en ? 'Waiting for reply…' : '等待回答…') : (en ? 'Ask the model' : '向模型提问')}</button>
            {pending && <button type="button" onClick={() => {request.current?.abort();setPending(false);}}>{en ? 'Cancel request' : '取消请求'}</button>}
          </div>
        </> : <div className="project-coach-state">
          <p>{liveAgent?.enabled && !consent
            ? (en ? 'Confirm external processing consent before using the model.' : '使用模型前，请确认外发授权。')
            : (en ? 'Step hints are available. The live model is currently unavailable for this practice.' : '可以使用本步提示，当前实践暂无法使用在线模型。')}</p>
          <button type="submit" disabled={!question.trim()}>{en ? 'Find step guidance' : '查找本步指导'}</button>
          {liveAgent?.enabled && !consent && link('/assistant', en ? 'Open AI workspace' : '前往 AI 工作台')}
        </div>}
      </form>
      {error && <p role="alert">{error}</p>}
      {guidance && <div className="project-coach-reply" role="status">
        <strong>{en ? 'Guidance from project materials' : '来自项目资料的指导'}</strong>
        <p>{copy(guidance==='handoff'?step.handoff:guidance==='check'?step.check:step.hint)}</p>
        {guidance==='sources'&&<ul>{sources.map(source => <li key={source.id}>
          <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><p>{copy(source.use)}</p>
        </li>)}</ul>}
      </div>}
      {reply && consent && <div className="project-coach-reply" aria-live="polite">
        <strong>{reply.meta?.responseOrigin === 'retrieval_fallback'
          ? (en ? 'Source excerpt' : '资料摘录') : (en ? 'Model guidance' : '模型建议')}</strong>
        {reply.statements.map((item, i) => <p key={i} translate="no">{item.text}</p>)}
        {reply.limitations.length > 0 && <ul>{reply.limitations.map((text, i) => <li key={i} translate="no">{text}</li>)}</ul>}
        {reply.citations.length > 0 && <ul>{reply.citations.map(item => {
          const source = sources.find(row => row.id === item.sourceId);
          return source ? <li key={item.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li> : null;
        })}</ul>}
      </div>}
    </div>
  </section>;
}
