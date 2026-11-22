import React, {useRef, useState} from 'react';
import ProductIcon from './ProductIcon';
import {authMessage} from './auth-contract';
import {dependencyBlock} from './completion-model';
import {stoppedTask} from './task-edit-model';
import {emptyProjectResponse, projectStepIssue, PRACTICE_NOTE_LIMIT} from './practice-project-model';

export default function ProjectPractice({task, project, step, state, t, language, copy, route, jump,
    heading, onSave, onResponse, currentRole, currentScope, link, children}) {
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const assistant = useRef(null);
  const practice = task?.projectPractice;
  const stepIndex = project.steps.indexOf(step);
  const answer = {...emptyProjectResponse(), ...practice?.responses[step.id]};
  const paused = task && stoppedTask(task);
  const blocked = task && !task.completed && dependencyBlock(state, task);
  const editable = !!task && !task.completed && !paused && !blocked;
  const progress = project.steps.filter(item => !projectStepIssue(item, practice)).length;
  const feedback = step.choices.find(item => item.id === answer.choice);
  const atDelivery = step.id === 'delivery';
  const openAssistant = () => {
    const button=document.getElementById('learning-tutor-slot')?.querySelector('[data-learning-discussion-trigger]');
    if(button?.getAttribute('aria-expanded')==='false')button.click();
    button?.scrollIntoView({block:'center'});
    button?.focus({preventScroll:true});
  };

  async function save(advance) {
    if (!editable || busy) return;
    setNotice('');
    const issue = advance ? projectStepIssue(step, practice) : '';
    if (issue) {
      setError({
        choice:t.issueChoice, evidence:t.issueEvidence, note:t.issueNote,
        contribution:t.issueContribution, limits:t.issueLimits, extension:t.issueExtension
      }[issue]);
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onSave(task);
      if (!advance) setNotice(t.saved);
      else if (atDelivery) jump('outcome');
      else jump('practice', {step: project.steps[stepIndex + 1].id});
    } catch (failure) {
      setError(authMessage(failure.code, language));
    } finally {
      setBusy(false);
    }
  }

  return <div className="project-grid project-practice">
    <div className="project-paper">
      <div className="project-step-heading">
        <span className="project-step-index" aria-hidden="true">{String(stepIndex + 1).padStart(2, '0')}</span>
        <div><h2 ref={heading} tabIndex={-1}>{copy(step.title)}</h2><p>{copy(step.assignment)}</p></div>
      </div>
      <div className="project-step-context">
        <p><strong>{t.practiceImpact}</strong> {copy(step.impact)}</p>
        <p><strong>{t.yourRole}</strong> {copy(step[currentRole])}</p>
      </div>
      <div className="project-step-tools">
        <button type="button" className="project-inline-action" onClick={openAssistant}><ProductIcon name="brain" size={18}/>{t.askStep}</button>
        {link(route('reading', {chapter: stepIndex + 1}), t.readStart)}
      </div>
      {!task && <div className="project-entry-note"><p>{t.previewOnly}</p>{link(route('overview'), t.schedule, 'button primary')}</div>}
      {paused && <div className="project-entry-note"><p>{t.locked}</p>{link('/plan?tab=执行&task=' + encodeURIComponent(task.id), t.plan, 'button')}</div>}
      {blocked && <div className="project-entry-note"><p>{t.blocked}</p>{link('/plan', t.plan, 'button')}</div>}
      {task?.completed && <div className="project-entry-note"><p>{t.complete}</p>{link(route('outcome'), t.outcome, 'button')}</div>}

      <details className="project-disclosure project-evidence" open={step.minEvidence > 0}>
        <summary>{t.evidence}<span>{answer.evidence.length} {t.cited}</span></summary>
        <EvidenceTable key={step.id} dataset={project.dataset} {...{answer,t,copy,editable}}
          onSelect={evidence => onResponse(task.id, step.id, {evidence})}/>
      </details>

      {task && <form className="project-step-form" onSubmit={event => {event.preventDefault();save(true);}}>
        <fieldset disabled={!editable || busy}>
          <legend>{t.reason}</legend>
          <label className="project-field">
            <span>{t.decision}</span>
            <select value={answer.choice} onChange={event => onResponse(task.id, step.id, {choice:event.target.value})}>
              <option value="">{t.issueChoice}</option>
              {step.choices.map(item => <option key={item.id} value={item.id}>{copy(item.label)}</option>)}
            </select>
          </label>
          {feedback && <p className="project-decision-feedback"><strong>{t.stepFeedback}</strong> {copy(feedback.feedback)}</p>}
          <label className="project-field">
            <span>{copy(step.question)}</span>
            <textarea rows={5} maxLength={PRACTICE_NOTE_LIMIT} value={answer.note}
              onChange={event => onResponse(task.id, step.id, {note:event.target.value})}/>
          </label>
          {atDelivery && <>
            <label className="project-field">
              <span>{t.contribution}</span>
              <textarea rows={3} maxLength={PRACTICE_NOTE_LIMIT} value={answer.contribution}
                onChange={event => onResponse(task.id, step.id, {contribution:event.target.value})}/>
            </label>
            <label className="project-field">
              <span>{t.limits}</span>
              <textarea rows={3} maxLength={PRACTICE_NOTE_LIMIT} value={answer.limits}
                onChange={event => onResponse(task.id, step.id, {limits:event.target.value})}/>
            </label>
            {currentScope === 'extended' && <label className="project-field">
              <span>{t.extension}</span><small>{copy(step.handoff)}</small>
              <textarea rows={3} maxLength={PRACTICE_NOTE_LIMIT} value={answer.extension}
                onChange={event => onResponse(task.id, step.id, {extension:event.target.value})}/>
            </label>}
          </>}
        </fieldset>
        {editable && <div className="project-buttons">
          <button type="submit" className="primary" disabled={busy}>{busy ? t.saving : atDelivery ? t.review : t.next}</button>
          <button type="button" disabled={busy} onClick={() => save(false)}>{t.save}</button>
        </div>}
        {error && <p role="alert" className="project-error">{error}</p>}
        {notice && <p role="status">{notice}</p>}
      </form>}
      <p className="project-step-handoff"><strong>{t.handoff}</strong> {copy(step.handoff)}</p>
    </div>

    <aside className="project-rail" ref={assistant}>
      <nav className="project-rail-section" aria-label={t.stepNav}>
        <div className="project-rail-heading">
          <h2>{t.stepNav}</h2>
          <span aria-label={t.stepProgress}>{progress}/{project.steps.length}</span>
        </div>
        <ol className="project-chapters">
          {project.steps.map((item, index) => <li key={item.id}>
            <button type="button" aria-current={item.id === step.id ? 'step' : undefined}
              onClick={() => jump('practice', {step:item.id})}>
              <span>{index + 1}</span>{copy(item.title)}
              {!projectStepIssue(item, practice) && <ProductIcon name="check" size={15}/>}
            </button>
          </li>)}
        </ol>
      </nav>
      {children}
      <details className="project-disclosure project-boundary"><summary>{t.scopeBoundary}</summary><p>{copy(project.boundary)}</p></details>
    </aside>
  </div>;
}

function EvidenceTable({dataset, answer, t, copy, editable, onSelect}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('');
  const cellText = cell => typeof cell === 'string' ? cell : copy(cell);
  const needle = query.trim().toLocaleLowerCase();
  const rows = dataset.rows.filter(row => !needle ||
    [row.id, ...row.cells.map(cellText)].some(value => value.toLocaleLowerCase().includes(needle)));
  if (sort !== '') rows.sort((a, b) =>
    cellText(a.cells[Number(sort)]).localeCompare(cellText(b.cells[Number(sort)]), undefined, {numeric:true}) ||
    a.id.localeCompare(b.id));

  return <div className="project-evidence-body">
    <p>{copy(dataset.intro)}</p>
    <div className="project-filters">
      <label className="project-field"><span>{t.filterLabel}</span>
        <input type="search" placeholder={t.filter} value={query} onChange={event => setQuery(event.target.value)}/>
      </label>
      <label className="project-field"><span>{t.sort}</span>
        <select value={sort} onChange={event => setSort(event.target.value)}>
          <option value="">{t.recordId}</option>
          {dataset.columns.map((column, index) => <option key={column.id} value={index}>{copy(column.label)}</option>)}
        </select>
      </label>
    </div>
    {answer.evidence.length > 0 && <p className="project-evidence-cited">{t.cited} · {answer.evidence.join(', ')}</p>}
    {editable && <p className="project-muted">{t.citationLimit}</p>}
    {rows.length ? <div className="project-table-wrap" tabIndex={0} role="region" aria-label={copy(dataset.title)}>
      <table>
        <caption>{copy(dataset.title)}</caption>
        <thead><tr><th scope="col">{t.recordId}</th>
          {dataset.columns.map(column => <th key={column.id} scope="col">{copy(column.label)}</th>)}
        </tr></thead>
        <tbody>{rows.map(row => {
          const checked = answer.evidence.includes(row.id);
          return <tr key={row.id} data-evidence-row={row.id} data-cited={checked}>
            <th scope="row">
              {editable ? <label className="project-cite">
                <input type="checkbox" aria-label={t.cite + ' ' + row.id} checked={checked}
                  disabled={!checked && answer.evidence.length >= 8}
                  onChange={event => onSelect(event.target.checked
                    ? [...answer.evidence, row.id] : answer.evidence.filter(id => id !== row.id))}/>
                {row.id}
              </label> : row.id}
            </th>
            {row.cells.map((cell, index) => <td key={dataset.columns[index].id}>{cellText(cell) || <em>{t.missing}</em>}</td>)}
          </tr>;
        })}</tbody>
      </table>
    </div> : <p role="status">{t.noRows}</p>}
  </div>;
}
