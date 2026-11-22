import React, {useEffect,useRef,useState} from 'react';
import ProductIcon from './ProductIcon';
import {authMessage} from './auth-contract';
import {SKILL_NOTE_LIMIT, updateSkillStudy} from './skill-tree-model';

const CHECK_VERSION = 'SKILL_CHECK_VERSION';
const RETRYABLE_SAVE = new Set(['NETWORK_ERROR','SERVICE_UNAVAILABLE','RATE_LIMITED']);
const steps = ['learn','practice','check'];

export default function SkillStudyPanel({tree, leaf, step, label, t, language, live, record, studyKey,
    workspace, update, onStep, onNext, onCheck, onReload, onPlan, showGrowth, children,j,onConfirmedGrowth,branchComplete,hideHeading=false,headingId='skill-study-title'}) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newGrowth, setNewGrowth] = useState(false);
  const resultView=useRef(null);
  useEffect(()=>{if(result)resultView.current?.scrollIntoView({block:'nearest'});},[result]);
  const assessment = record?.assessment;
  const draft = record?.draft || '';

  function change(fields) {
    update(state => ({...state,skillStudy:updateSkillStudy(state.skillStudy,studyKey,fields)}));
  }

  function openStep(active) {
    setError('');
    setNotice('');
    onStep(active);
  }

  async function saveNotes() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (live) await workspace.flush();
      setNotice(t.saved);
    } catch (failure) {
      setError(failure.code || 'NETWORK_ERROR');
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (leaf.questions.some(question => !answers[question.id])) {
      setError('SKILL_CHECK_INVALID');
      return;
    }
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const grade = await onCheck({career:tree.id,skill:leaf.id,version:leaf.version,answers});
      setNewGrowth(grade.passed && !assessment?.passedAt);
      setResult(grade);
    } catch (failure) {
      setError(failure.code || 'NETWORK_ERROR');
    } finally {
      setBusy(false);
    }
  }

  async function recoverCheck() {
    setError('');
    setBusy(true);
    try {
      const receipt = await workspace.retry();
      const refs = receipt?.refs;
      if (receipt?.type === 'skill.check' && refs.career === tree.id &&
          refs.skill === leaf.id && refs.version === leaf.version) {
        setNewGrowth(refs.grade.passed && !assessment?.passedAt);
        if(refs.grade.passed&&!assessment?.passedAt)onConfirmedGrowth?.();
        setResult(refs.grade);
      }
    } catch (failure) {
      setError(failure.code || 'NETWORK_ERROR');
    } finally {
      setBusy(false);
    }
  }

  return <article className="skill-study" aria-labelledby={headingId} data-skill-study={leaf.id} data-study-step={step}>
    {!hideHeading&&<header className="skill-study-head">
      <h3 id="skill-study-title">{label(leaf.title)}</h3>
      {assessment?.passedAt && <span className="skill-pass-tag"><ProductIcon name="check" size={14}/>{t.passed}</span>}
    </header>}
    <nav className="skill-study-steps" aria-label={t.continue}>
      {steps.map((value, index) => <button type="button" key={value} data-skill-stage={value}
        aria-current={step === value ? 'step' : undefined} onClick={() => openStep(value)}>
        <span aria-hidden="true">{index + 1}</span>{value === 'learn' ? t.overview : t[value]}
      </button>)}
    </nav>
    <div className="skill-study-columns">
      <div className="skill-study-content">
        {step === 'learn' && <>
          <h4>{t.purpose}</h4>
          <p>{label(leaf.lesson)}</p>
          <div className="skill-study-actions">
            <button type="button" className="skill-control skill-primary" onClick={() => {
              if (!record?.read) change({read:true});
              openStep('practice');
            }}>{record?.read ? t.practice : t.mark}<ProductIcon name="arrow" size={16}/></button>
          </div>
        </>}
        {step === 'practice' && <>
          <h4>{t.exercise}</h4>
          <p>{label(leaf.exercise)}</p>
          <label className="skill-notes">
            <span>{t.notes}</span>
            <textarea rows={4} maxLength={SKILL_NOTE_LIMIT} value={draft} placeholder={t.notePlaceholder}
              onChange={event => {
                setNotice('');
                change({draft:event.target.value});
              }}/>
          </label>
          <p className="skill-small">{live ? t.practiceNote : t.localDemo}</p>
          <div className="skill-study-actions">
            <button type="button" className="skill-control" onClick={onPlan}>{t.plan}</button>
            <button type="button" className="skill-control" onClick={saveNotes} disabled={busy || !draft.trim()}>
              {busy ? t.saving : t.save}
            </button>
            <button type="button" className="skill-control skill-primary" onClick={() => openStep('check')}>
              {t.toCheck}<ProductIcon name="arrow" size={16}/>
            </button>
          </div>
        </>}
        {step === 'check' && <>
          <h4>{t.assessment}</h4>
          <p className="skill-small">{t.checkRule}</p>
          {assessment && <p className="skill-previous-result">
            {t.lastCheck} · {assessment.correct}/{assessment.total} · {t.attempts} {assessment.attempts}
            {assessment.passedAt && <span>{t.firstPassed} {assessment.passedAt.slice(0,10)}</span>}
          </p>}
          <form className="skill-quiz" onSubmit={submit}>
            {leaf.questions.map((question, index) => {
              const feedback = result?.questions.find(row => row.id === question.id);
              return <fieldset key={question.id} disabled={busy || !!result}>
                <legend>{index + 1}. {label(question.prompt)}</legend>
                {question.options.map(option => <label key={option.id} className="skill-choice">
                  <input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id}
                    onChange={() => {
                      setError(value => value === 'SKILL_CHECK_INVALID' ? '' : value);
                      setAnswers(value => ({...value,[question.id]:option.id}));
                    }}/>
                  <span>{label(option.text)}</span>
                </label>)}
                {feedback && <div className="skill-check-explanation" data-correct={feedback.correct}>
                  <strong>{feedback.correct ? t.correct : t.wrong}</strong><p>{label(feedback.explanation)}</p>
                </div>}
              </fieldset>;
            })}
            {!result && <button className="skill-control skill-primary" type="submit"
              disabled={busy || live && RETRYABLE_SAVE.has(error)}>
              {busy ? t.submitting : t.submit}
            </button>}
          </form>
          {result && <div className="skill-check-result" role="status" data-passed={result.passed} ref={resultView}>
            <p><strong>{result.passed ? t.passed : t.fail}</strong> · {t.result} {result.correct}/{result.total}</p>
            {result.passed && <><h4>{newGrowth?(branchComplete?j?.branchComplete:j?.leafComplete):j?.passed}</h4><p>{newGrowth?(branchComplete?j?.branchGrowth:t.passedHint):j?.alreadyGrown}</p></>}
            <div className="skill-study-actions">
              {result.passed && onNext && <button type="button" className="skill-control skill-primary" onClick={onNext}>
                {t.next}<ProductIcon name="arrow" size={16}/>
              </button>}
              {result.passed && <button type="button" className="skill-control" onClick={()=>openStep('learn')}>{j?.reviewSkill||t.review}</button>}
              {result.passed && showGrowth && <button type="button" className="skill-control" onClick={() => {
                showGrowth();
                setNewGrowth(false);
              }}>
                {t.viewGrowth}
              </button>}
              <button type="button" className="skill-control" onClick={() => {
                setAnswers({});
                setResult(null);
              }}>{t.again}</button>
              {!result.passed && <button type="button" className="skill-control" onClick={() => openStep('learn')}>{t.review}</button>}
            </div>
          </div>}
        </>}
        {notice && <p className="skill-save-message" role="status">{notice}</p>}
        {error && <div className="skill-form-error" role="alert">
          <p>{error === 'AI_BUSY' ? t.workspaceBusy : authMessage(error,language)}</p>
          {error === CHECK_VERSION && <button type="button" className="skill-control" onClick={onReload}>{t.refresh}</button>}
          {live && step === 'check' && RETRYABLE_SAVE.has(error) &&
            <button type="button" className="skill-control" onClick={recoverCheck}>{t.recoverCheck}</button>}
        </div>}
      </div>
      <details className="skill-study-sources">
        <summary>{t.materials}</summary>
        {children}
        {tree.assessment && <div className="skill-related">
          <h4>{t.officialAssessment}</h4>
          <p className="skill-small">{t.officialAssessmentNote}</p>
          <a href={tree.assessment.url} target="_blank" rel="noreferrer">
            {tree.assessment.title}<ProductIcon name="external" size={14}/>
          </a>
        </div>}
      </details>
    </div>
  </article>;
}

