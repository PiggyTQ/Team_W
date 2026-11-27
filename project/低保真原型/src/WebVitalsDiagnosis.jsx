import React, {useId} from 'react';
import ProductIcon from './ProductIcon';
import './web-vitals-diagnosis.css';

import copy from './i18n/web-vitals-diagnosis.json';

const sample = [
  {metric: 'LCP', before: '2.4 s', after: '2.3 s'},
  {metric: 'INP', before: '142 ms', after: '145 ms'},
  {metric: 'CLS', before: '0.19', after: '0.03'}
];

export default function WebVitalsDiagnosis({language, lessonState = {}, onLessonState}) {
  const titleId = useId();
  const t = copy[language === 'en' ? 'en' : 'zh'];
  const {webVitalsMetric: metric, webVitalsConclusion: conclusion} = lessonState;
  const found = metric === 'CLS';
  const explanation = Object.hasOwn(t.metricFeedback, metric) ? t.metricFeedback[metric] : '';
  const reviewed = Object.hasOwn(t.conclusions, conclusion) ? t.conclusions[conclusion].feedback : '';

  return (
    <section className="web-vitals-diagnosis" aria-labelledby={titleId}>
      <header className="web-vitals-diagnosis-head">
        <span><ProductIcon name="testing" size={19}/>{t.activity}</span>
        <h3 id={titleId}>{t.title}</h3>
      </header>
      <p>{t.scenario}</p>
      <fieldset className="web-vitals-choices">
        <legend>{t.metricPrompt}</legend>
        <div className="web-vitals-metrics">
          {sample.map(row => (
            <label key={row.metric}>
              <input
                type="radio"
                name={titleId + '-metric'}
                value={row.metric}
                checked={metric === row.metric}
                onChange={() => onLessonState({webVitalsMetric: row.metric})}
              />
              {row.metric}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="web-vitals-feedback" role="status" data-correct={found}>{explanation}</div>
      {found && (
        <div className="web-vitals-retest">
          <h4>{t.reviewTitle}</h4>
          <p>{t.change}</p>
          <table>
            <caption>{t.sample}</caption>
            <thead>
              <tr><th scope="col">{t.metric}</th><th scope="col">{t.before}</th><th scope="col">{t.after}</th></tr>
            </thead>
            <tbody>
              {sample.map(row => (
                <tr key={row.metric} data-target={row.metric === 'CLS'}>
                  <th scope="row">{row.metric}</th>
                  <td>{row.before}</td>
                  <td>{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <fieldset className="web-vitals-choices">
            <legend>{t.conclusionPrompt}</legend>
            <div className="web-vitals-conclusions">
              {Object.entries(t.conclusions).map(([id, option]) => (
                <label key={id}>
                  <input
                    type="radio"
                    name={titleId + '-conclusion'}
                    value={id}
                    checked={conclusion === id}
                    onChange={() => onLessonState({webVitalsConclusion: id})}
                  />
                  {option.choice}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="web-vitals-feedback" role="status" data-correct={conclusion === 'validation'}>{reviewed}</div>
        </div>
      )}
    </section>
  );
}
