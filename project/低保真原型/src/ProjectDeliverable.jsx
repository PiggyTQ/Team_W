import React, {useState} from 'react';
import ProductIcon from './ProductIcon';
import {authMessage} from './auth-contract';
import {dependencyBlock} from './completion-model';
import {stoppedTask} from './task-edit-model';
import {createProjectDeliverable, projectPracticeReady, sameProjectPractice} from './practice-project-model';

export default function ProjectDeliverable({task, project, state, language, t, copy, route, heading,
    link, onCommand, onCandidate, download}) {
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const attempt = task?.attempts.at(-1);
  const editable = task && !task.completed && !stoppedTask(task) && !dependencyBlock(state, task);
  const current = sameProjectPractice(attempt?.practiceSnapshot, task?.projectPractice);
  const ready = projectPracticeReady(project, task?.projectPractice);
  const draft = ready ? createProjectDeliverable(project, task.projectPractice, language) : null;
  const receipt = attempt?.result === '自检记录' && task?.selfcheck === true;
  const scope = task?.projectPractice?.scope;
  const role = task?.projectPractice?.role;
  const ticked = checked === attempt?.id && !!attempt;

  async function command(type, data, success) {
    if (!editable || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await onCommand(type, task, data, project);
      setNotice(success);
    } catch (failure) {
      setError(authMessage(failure.code, language));
    } finally {
      setBusy(false);
    }
  }

  const filename = project.id + '-practice-v' + (attempt?.version || 1) + '.md';
  return <div className="project-grid project-result">
    <div className="project-paper">
      <div className="project-result-heading">
        <ProductIcon name="file" size={27}/>
        <div>
          <h2 ref={heading} tabIndex={-1}>{task?.completed ? t.complete : t.deliverable}</h2>
          <p>{copy(project.handoff)}</p>
        </div>
      </div>
      {!task && <div className="project-entry-note">
        <p>{t.outputFirst}</p>{link(route('overview'), t.schedule, 'button primary')}
      </div>}
      {task && <>
        {!task.completed && !ready && <div className="project-entry-note">
          <p>{t.issueAll}</p>{link(route('practice'), t.practice, 'button')}
        </div>}
        {!task.completed && stoppedTask(task) && <p className="project-entry-note">{t.locked}</p>}
        {task.completed && <p className="project-success" role="status">{t.completionNote}</p>}
        {(role || scope) && <p className="project-muted">
          {role && copy(project.roles[role].title)} {scope && ' · ' + t[scope]}
        </p>}
        {draft && !task.completed && !current && <section className="project-result-block">
          <h3>{t.preview}</h3>
          <pre className="project-document" translate="no">{draft.document}</pre>
          {editable && <div className="project-buttons">
            <button type="button" className="primary" disabled={busy} onClick={() => command('task.submit',
              {confirmation:'SUBMIT_ATTEMPT', language}, t.submitted)}>{busy ? t.submitting : attempt ? t.resubmit : t.submit}</button>
            {link(route('practice', {step:'delivery'}), t.practice, 'button')}
          </div>}
        </section>}
        {attempt && <section className="project-result-block">
          <h3>{t.snapshot} · {t.revision} {attempt.version}</h3>
          <pre className="project-document" translate="no">{attempt.text}</pre>
          {!task.completed && !current && <p className="project-muted">{t.changed}</p>}
          {editable && current && !receipt && <section className="project-selfcheck">
            <h4>{t.recheck}</h4>
            <ul>{project.steps.map(step => <li key={step.id}>{copy(step.check)}</li>)}</ul>
            <label className="project-check">
              <input type="checkbox" checked={ticked} onChange={event => setChecked(event.target.checked ? attempt.id : null)}/>
              <span>{t.selfCheckLabel}</span>
            </label>
            <button type="button" disabled={!ticked || busy} onClick={() => command('task.selfcheck',
              {attemptId:attempt.id, confirmation:'SELF_CHECK_ONLY'}, t.reviewNote)}>{t.selfCheck}</button>
          </section>}
          <div className="project-buttons">
            {editable && current && receipt && <button type="button" className="primary" disabled={busy} onClick={() =>
              command('task.complete', {confirmation:'COMPLETE_LIMITED_SCOPE'}, t.completionNote)}>{t.completion}</button>}
            <button type="button" onClick={() => download(filename, attempt.text)}>{t.download}</button>
            {task.completed && <>
              <button type="button" onClick={() => onCandidate(task, attempt)}>{t.candidate}</button>
              {link('/learning?tab=我的资源&source=practice', t.myResources, 'button')}
            </>}
          </div>
        </section>}
        {notice && <p role="status">{notice}</p>}
        {error && <p className="project-error" role="alert">{error}</p>}
      </>}
    </div>
    <aside className="project-rail">
      <section className="project-rail-section">
        <h2>{t.interview}</h2><p>{copy(project.interview)}</p>
        <h3>{t.handOffAudience}</h3><p>{copy(project.audience)}</p>
      </section>
      <details className="project-disclosure project-boundary">
        <summary>{t.reference}</summary>
        <p>{copy(project.reference)}</p><p>{copy(project.boundary)}</p>
      </details>
    </aside>
  </div>;
}
