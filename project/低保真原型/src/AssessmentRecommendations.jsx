import React from 'react';
import {displayPublicText, getFormattingLocale} from './i18n/render.js';
import './assessment-recommendations.css';

function skillList(skills) {
  return new Intl.ListFormat(getFormattingLocale()).format(skills.map(displayPublicText));
}

export default function AssessmentRecommendations({result, section, jump, link}) {
  const {status, backgroundCount, interest, ability, careers} = result;

  return (
    <section className="hub-section hub-recommendations" id={section.id} tabIndex={-1} aria-labelledby="hub-recommendation-title">
      <header>
        <div>
          <h2 id="hub-recommendation-title">综合评估</h2>
          <p>结合已确认的经历、爱好偏好和能力评估，推荐值得进一步探索的职业。</p>
        </div>
      </header>
      <ul className="hub-recommendation-inputs">
        <li>{jump('review', <>
          <span>背景评估</span>
          <strong>{backgroundCount ? <>已确认经历 · {backgroundCount}</> : '待确认经历'}</strong>
        </>, 'hub-recommendation-input')}</li>
        <li>{jump('profile', <>
          <span>爱好评估</span>
          <strong data-i18n="public">{interest ? <>{interest.group.name}{interest.type && ' · ' + interest.type}</> : '待选择偏好'}</strong>
        </>, 'hub-recommendation-input')}</li>
        <li>{jump('analysis', <>
          <span>能力评估</span>
          <strong>{ability.recordedCount ? <>已自评技能 · {ability.recordedCount}</> : ability.ready ? '已有可用的能力对照' : '待记录技能自评'}</strong>
        </>, 'hub-recommendation-input')}</li>
      </ul>
      {status === 'ready' ? <>
        <h3 className="hub-recommendation-subtitle">推荐职业</h3>
        <ul className="hub-recommendation-list">
          {careers.map(career => {
            const titleId = 'assessment-recommendation-' + career.id;
            const actionId = titleId + '-link';
            const snapshotOnlySkills = career.assessedSkills.filter(skill => !career.backgroundSkills.includes(skill));
            const action = link(career.to, <span id={actionId}>查看职业详情 →</span>);
            return <li key={career.id} className="hub-recommendation-card">
              <h4 id={titleId} data-i18n="public">{career.name}</h4>
              <dl>
                {(career.backgroundSkills.length > 0 || career.backgroundCount > 0) && <>
                  <dt>经历涉及</dt><dd>{career.backgroundSkills.length ? skillList(career.backgroundSkills) : <>已确认经历 · {career.backgroundCount}</>}</dd>
                </>}
                {career.preferenceFit.task && <>
                  <dt>{career.preferenceFit.matched ? '符合偏好的工作' : '可以了解的工作'}</dt>
                  <dd data-i18n="public">{career.preferenceFit.task}</dd>
                </>}
                {career.masteredSkills.length > 0 && <>
                  <dt>自评已掌握</dt><dd>{skillList(career.masteredSkills)}</dd>
                </>}
                {snapshotOnlySkills.length > 0 && <>
                  <dt>材料对照涉及</dt><dd>{skillList(snapshotOnlySkills)}</dd>
                </>}
                {career.learningSkills.length > 0 && <>
                  <dt>可以先学习</dt><dd>{skillList(career.learningSkills)}</dd>
                </>}
              </dl>
              {React.cloneElement(action, {'aria-labelledby': actionId + ' ' + titleId})}
            </li>;
          })}
        </ul>
        <p className="hub-recommendation-note">推荐用于缩小探索范围。可到职业详情核对实际任务、技能要求与学习方向。</p>
      </> : <div className="hub-recommendation-empty">
        <h3>{status === 'incomplete' ? '完善评估后查看职业推荐' : '现有评估暂未匹配到职业'}</h3>
        <p>{status === 'incomplete' ? '点选上方的评估项，补齐确认经历、爱好偏好和能力记录。' : '可以补充有明确技能的经历，或在能力拼图中自评更多技能。'}</p>
      </div>}
    </section>
  );
}
