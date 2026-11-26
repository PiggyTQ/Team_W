import React from 'react';
import {displayPublicText, getFormattingLocale} from './i18n/render.js';
import './assessment-recommendations.css';

function skillList(skills) {
  return new Intl.ListFormat(getFormattingLocale()).format(skills.map(displayPublicText));
}

function RecommendationCard({career, interest, link}) {
  const titleId = 'assessment-recommendation-' + career.id;
  const actionId = titleId + '-link';
  const backgroundSkills = [...career.backgroundSkills, ...career.mentionedSkills];
  const snapshotSkills = career.assessedSkills.filter(skill => !career.masteredSkills.includes(skill));
  const hasAbility = career.masteredSkills.length || snapshotSkills.length || career.learningSkills.length;
  const action = link(career.to, <span id={actionId}>查看职业详情 →</span>);

  return <li className="hub-recommendation-card">
    <h4 id={titleId} data-i18n="public">{career.position}</h4>
    <dl>
      <div>
        <dt>背景评估</dt>
        <dd>
          {career.backgroundCount > 0 ? <>
            {career.backgroundTitles.length > 0 ? <span translate="no">{career.backgroundTitles[0]}</span>
              : <span>已确认经历 · {career.backgroundCount}</span>}
            {backgroundSkills.length > 0 && <span>经历涉及：{skillList(backgroundSkills)}</span>}
          </> : '当前已确认经历暂无直接关联'}
        </dd>
      </div>
      <div>
        <dt>爱好与兴趣</dt>
        <dd data-i18n="public">{career.preferenceFit.matched
          ? <>{interest.group.name} · {career.preferenceFit.task}</>
          : '当前偏好与该职位暂无直接对应'}</dd>
      </div>
      <div>
        <dt>能力评估</dt>
        <dd>
          {career.masteredSkills.length > 0 && <span>自评已掌握：{skillList(career.masteredSkills)}</span>}
          {snapshotSkills.length > 0 && <span>材料对照涉及：{skillList(snapshotSkills)}</span>}
          {career.learningSkills.length > 0 && <span>可以先学习：{skillList(career.learningSkills)}</span>}
          {!hasAbility && '暂无该职位相关的能力记录'}
        </dd>
      </div>
    </dl>
    {React.cloneElement(action, {'aria-labelledby': actionId + ' ' + titleId})}
  </li>;
}

export default function AssessmentRecommendations({result, section, jump, link}) {
  const {status, backgroundCount, interest, ability, careers, exploratory} = result;
  const inputCard = (key, complete, title, detail) => (
    <li>{jump(key, <>
      <span className="hub-recommendation-bulb" aria-hidden="true" />
      <span className="hub-recommendation-input-copy">
        <span>{title}</span>
        {detail}
      </span>
      <span className="hub-recommendation-input-arrow" aria-hidden="true">→</span>
    </>, complete ? 'hub-recommendation-input hub-recommendation-input--complete' : 'hub-recommendation-input')}</li>
  );

  return (
    <section className="hub-section hub-recommendations" id={section.id} tabIndex={-1} aria-labelledby="hub-recommendation-title">
      <header>
        <h2 id="hub-recommendation-title">综合评估</h2>
      </header>
      <ul className="hub-recommendation-inputs">
        {inputCard('review', backgroundCount > 0, '背景评估',
          <strong>{backgroundCount ? <>已确认经历 · {backgroundCount}</> : '待确认经历'}</strong>)}
        {inputCard('profile', Boolean(interest), '爱好评估',
          <strong data-i18n="public">{interest ? <>{interest.group.name}{interest.type && ' · ' + interest.type}</> : '待选择偏好'}</strong>)}
        {inputCard('analysis', ability.ready, '能力评估',
          <strong>{ability.recordedCount ? <>已自评技能 · {ability.recordedCount}</> : ability.ready ? '已有可用的能力对照' : '待记录技能自评'}</strong>)}
      </ul>
      {status === 'ready' ? <>
        <h3 className="hub-recommendation-subtitle">{exploratory ? '可先探索的职位' : '职位推荐'}</h3>
        <ol className="hub-recommendation-list" role="list">
          {careers.map(career => <RecommendationCard key={career.id} career={career} interest={interest} link={link} />)}
        </ol>
      </> : <div className="hub-recommendation-empty">
        <h3>{status === 'incomplete' ? '补齐三项评估后查看推荐' : '现有评估暂未匹配到职业'}</h3>
        {status === 'insufficient' && <p>补充有明确技能的经历，或自评更多技能。</p>}
      </div>}
    </section>
  );
}
