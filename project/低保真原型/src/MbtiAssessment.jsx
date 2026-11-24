import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {displayText, useLanguage} from './i18n/render';
import englishQuestions from './i18n/mbti-questions-en.json' with {type: 'json'};
import {getInterestType, interestTraits} from './interest-assessment-model';
import {mbtiQuestions, mbtiSections, scoreMbtiAssessment} from './mbti-assessment-model';
import './mbti-assessment.css';

const pageSize = 6;
const quizPages = mbtiSections.flatMap(section => {
  const questions = mbtiQuestions.slice(section.start - 1, section.end);
  return Array.from({length: Math.ceil(questions.length / pageSize)}, (_, index) => ({
    section,
    questions: questions.slice(index * pageSize, (index + 1) * pageSize),
  }));
});

const letterLabels = {
  E: '外向', I: '内向', S: '实感', N: '直觉', T: '思考', F: '情感', J: '判断', P: '知觉',
};

const partLabel = id => displayText('第 {part} 部分').replace('{part}', id);

function restoreDraft(key) {
  const blank = {answers: {}, pageIndex: 0, finished: false};
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (!saved?.answers) return blank;
    const answers = Object.fromEntries(mbtiQuestions.flatMap(({id}) => {
      const choice = saved.answers[id];
      return choice === 'A' || choice === 'B' ? [[id, choice]] : [];
    }));
    const pageIndex = Number.isInteger(saved.pageIndex) && quizPages[saved.pageIndex] ? saved.pageIndex : 0;
    return {answers, pageIndex, finished: saved.finished === true && !!scoreMbtiAssessment(answers).type};
  } catch {
    return blank;
  }
}

function QuizProgress({section, answers, answered}) {
  return <aside className="mbti-progress-card" aria-labelledby="mbti-progress-title">
    <h2 id="mbti-progress-title">答题进度</h2>
    <p className="mbti-progress-count"><strong>{answered}</strong><span> / {mbtiQuestions.length}</span></p>
    <progress aria-labelledby="mbti-progress-title" value={answered} max={mbtiQuestions.length}/>
    <ol className="mbti-part-list">
      {mbtiSections.map(part => {
        const done = mbtiQuestions.slice(part.start - 1, part.end).filter(({id}) => !!answers[id]).length;
        return <li key={part.id} aria-current={part.id === section.id ? 'step' : undefined}>
          <span>{partLabel(part.id)}</span><span>{done} / {part.end - part.start + 1}</span>
        </li>;
      })}
    </ol>
    <p className="mbti-progress-note">请选择更符合你平时表现的选项。每题单选，答案没有对错。</p>
  </aside>;
}

function QuizQuestion({question, english, value, onChange, invalid}) {
  const {id, prompt, options} = question;
  const words = english ? englishQuestions[id - 1] : [id, prompt, options.A.text, options.B.text];
  return <fieldset className="mbti-question" data-question={id} aria-describedby={invalid ? 'mbti-quiz-error' : undefined}>
    <legend><span className="mbti-question-number">{String(id).padStart(2, '0')}</span>{words[1] && <span>{words[1]}</span>}</legend>
    <div className="mbti-options">
      {['A', 'B'].map((choice, index) => <label className="mbti-option" key={choice}>
        <input type="radio" name={'mbti-q-' + id} value={choice} checked={value === choice} onChange={() => onChange(id, choice)} aria-invalid={invalid || undefined}/>
        <span className="mbti-option-letter" aria-hidden="true">{choice}</span><span className="mbti-option-copy">{words[index + 2]}</span>
      </label>)}
    </div>
  </fieldset>;
}

function AssessmentResult({result, heading, onApply, onRestart}) {
  const {type, dimensions} = result;
  const {group} = getInterestType(type);
  const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState(false);

  async function applyResult() {
    setSaving(true);
    setSaveError(false);
    try {
      await onApply(type);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return <div className="mbti-result">
    <section className="mbti-result-overview" aria-labelledby="mbti-result-title">
      <div className="mbti-result-code" aria-hidden="true">{type}</div>
      <div>
        <h2 id="mbti-result-title" ref={heading} tabIndex={-1}>你的 MBTI 测评结果<span className="sr-only"> {type}</span></h2>
        <p className="mbti-result-group">{group.name}</p>
        <p>{group.description}</p>
        <ul className="mbti-result-traits">{interestTraits[type].map(trait => <li key={trait}>{trait}</li>)}</ul>
      </div>
    </section>
    <section className="mbti-result-scores" aria-labelledby="mbti-scores-title">
      <h3 id="mbti-scores-title">四个维度的得分</h3>
      <ul className="mbti-score-list">
        {dimensions.map(({first, second, firstScore, secondScore, winner, tied}) => <li key={first} className="mbti-score">
          <div className="mbti-score-labels">
            <span data-winner={winner === first}><b>{first}</b> {letterLabels[first]} <strong>{firstScore}</strong></span>
            <span data-winner={winner === second}><strong>{secondScore}</strong> {letterLabels[second]} <b>{second}</b></span>
          </div>
          <div className="mbti-score-track" aria-hidden="true"><span style={{width: `${firstScore * 100 / (firstScore + secondScore)}%`}} data-winner={winner === first}/><span data-winner={winner === second}/></div>
          {tied && <p className="mbti-score-tie">{displayText('平分时按问卷规则取 {letter}。').replace('{letter}', winner)}</p>}
        </li>)}
      </ul>
      <p className="mbti-result-note">得分反映本次作答中的偏好，可作为自我了解的参考。</p>
    </section>
    <div className="mbti-result-actions">
      {saveError && <p className="mbti-error" role="alert">保存未完成，请重试。测评结果已保留。</p>}
      <button type="button" className="mbti-secondary" onClick={onRestart} disabled={saving}>重新测试</button>
      <button type="button" className="mbti-primary" onClick={applyResult} disabled={saving}>{saving ? '正在保存兴趣偏好…' : '选为我的兴趣偏好'}</button>
    </div>
  </div>;
}

export default function MbtiAssessment({link, onApply, draftOwner, returnTo = '/assessment?tab=成果档案#assessment-profile'}) {
  const language = useLanguage();
  const draftKey = 'avemly-mbti-answers-v1:' + draftOwner;
  const [draft, setDraft] = useState(() => restoreDraft(draftKey));
  const [invalid, setInvalid] = useState(null);
  const heading = useRef(null), quiz = useRef(null), focusHeading = useRef(false);
  const {answers, pageIndex, finished} = draft;
  const {section, questions} = quizPages[pageIndex];
  const result = scoreMbtiAssessment(answers);
  const finalPage = pageIndex === quizPages.length - 1;

  useEffect(() => {
    try {
      if (Object.keys(draft.answers).length) sessionStorage.setItem(draftKey, JSON.stringify(draft));
      else sessionStorage.removeItem(draftKey);
    } catch { /* Answers remain available in this page when storage is unavailable. */ }
  }, [draft, draftKey]);

  useLayoutEffect(() => {
    if (!focusHeading.current) return;
    focusHeading.current = false;
    heading.current?.scrollIntoView({block: 'start'});
    heading.current?.focus({preventScroll: true});
  }, [pageIndex, finished]);

  useLayoutEffect(() => {
    if (invalid === null) return;
    const option = quiz.current?.querySelector(`input[name="mbti-q-${invalid}"]`);
    option?.closest('fieldset')?.scrollIntoView({block: 'center'});
    option?.focus({preventScroll: true});
  }, [invalid, pageIndex]);

  function movePage(index) {
    focusHeading.current = true;
    setInvalid(null);
    setDraft(previous => ({...previous, pageIndex: index}));
  }

  function answerQuestion(id, choice) {
    if (invalid === id) setInvalid(null);
    setDraft(previous => ({...previous, answers: {...previous.answers, [id]: choice}}));
  }

  function continueQuiz(event) {
    event.preventDefault();
    const unanswered = questions.find(({id}) => !answers[id]);
    if (unanswered) {
      setInvalid(unanswered.id);
      if (invalid === unanswered.id) quiz.current?.querySelector(`input[name="mbti-q-${unanswered.id}"]`)?.focus();
      return;
    }
    if (!finalPage) {
      movePage(pageIndex + 1);
      return;
    }
    if (!result.type) {
      const missingId = result.missing[0];
      setDraft(previous => ({...previous, pageIndex: quizPages.findIndex(page => page.questions.some(question => question.id === missingId))}));
      setInvalid(missingId);
      return;
    }
    focusHeading.current = true;
    setDraft(previous => ({...previous, finished: true}));
  }

  function restart() {
    focusHeading.current = true;
    setDraft({pageIndex: 0, answers: {}, finished: false});
  }

  return <article className="mbti-assessment" aria-labelledby="mbti-page-title">
    {link(returnTo, '← 返回爱好与兴趣偏好', 'mbti-back')}
    <header className="mbti-page-heading">
      <h1 id="mbti-page-title">MBTI 兴趣偏好测评</h1>
      {!finished && <p>共 93 道单选题，约 18 分钟。答完即可查看自己的 MBTI 类型。</p>}
    </header>
    {finished ? <AssessmentResult result={result} heading={heading} onApply={onApply} onRestart={restart}/> : <div className="mbti-quiz-layout">
      <QuizProgress section={section} answers={answers} answered={result.answered}/>
      <form ref={quiz} className="mbti-quiz" onSubmit={continueQuiz} noValidate>
        <header className="mbti-quiz-heading">
          <h2 ref={heading} tabIndex={-1}>{partLabel(section.id)}</h2>
          <p>{displayText(section.prompt)}</p>
        </header>
        {questions.map(question => <QuizQuestion key={question.id} question={question} english={language === 'en'} value={answers[question.id]} onChange={answerQuestion} invalid={invalid === question.id}/>)}
        <div className="mbti-quiz-footer">
          {invalid !== null && <p id="mbti-quiz-error" className="mbti-error" role="alert">请先回答本页未完成的题目。</p>}
          <div className="mbti-quiz-controls">
            <button type="button" className="mbti-secondary" onClick={() => movePage(pageIndex - 1)} disabled={pageIndex === 0}>上一页</button>
            <span><span className="sr-only">题目分页</span>{pageIndex + 1} / {quizPages.length}</span>
            <button type="submit" className="mbti-primary">{finalPage ? '查看测评结果' : '下一页'}</button>
          </div>
        </div>
      </form>
    </div>}
  </article>;
}
