import React, {useEffect, useId, useState} from 'react';
import {getInterestGroup, getInterestType, interestGroups, interestTraits} from './interest-assessment-model';
import './interest-assessment.css';

function arcPath(index, radius = 112) {
  const point = angle => [160 + radius * Math.cos(angle * Math.PI / 180), 160 + radius * Math.sin(angle * Math.PI / 180)];
  const start = point(-86 + index * 90), end = point(-4 + index * 90);
  return `M ${start.join(' ')} A ${radius} ${radius} 0 0 1 ${end.join(' ')}`;
}

export default function InterestAssessment({preferences = {}, onChange}) {
  const savedType = getInterestType(preferences.interestType);
  const savedGroup = savedType?.group || getInterestGroup(preferences.interestGroup);
  const [activeId, setActiveId] = useState(savedGroup?.id || 'NT');
  const [selectedType, setSelectedType] = useState(savedType?.id || '');
  const uid = useId(), detailId = uid + '-detail', typesId = uid + '-types';
  const active = getInterestGroup(activeId) || interestGroups[0];
  const currentType = active.types.includes(selectedType) ? selectedType : '';
  const isSaved = Boolean(currentType && currentType === savedType?.id);
  useEffect(() => {
    setActiveId(savedGroup?.id || 'NT');
    setSelectedType(savedType?.id || '');
  }, [savedGroup?.id, savedType?.id]);

  return <section className="interest-assessment" aria-labelledby={uid + '-title'}>
    <header className="interest-heading">
      <div><h2 id={uid + '-title'}>爱好与兴趣偏好</h2><p>了解自己更喜欢怎样思考、协作和行动。</p></div>
      <span className="interest-status">{currentType && !isSaved ? <>待保存 · {currentType}</> : savedType ? <>我的 MBTI · {savedType.id}</> : savedGroup ? <>已选分组 · {savedGroup.id}</> : '尚未选择'}</span>
    </header>
    <div className="interest-layout">
      <figure className="interest-ring">
        <svg viewBox="0 0 320 320" role="group" aria-labelledby={uid + '-chart-title ' + uid + '-chart-desc'}>
          <title id={uid + '-chart-title'}>四类兴趣偏好</title>
          <desc id={uid + '-chart-desc'}>选择 MBTI 大类，右侧显示对应的四个具体类型。</desc>
          <circle cx="160" cy="160" r="85" className="interest-ring-guide"/>
          {interestGroups.map((group, index) => <g key={group.id} data-interest-type={group.id} className="interest-sector" role="button" tabIndex="0" aria-label={group.id + ' ' + group.name} aria-pressed={active.id === group.id} aria-controls={typesId + ' ' + detailId} onClick={() => setActiveId(group.id)} onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); setActiveId(group.id);}
          }}>
            <path d={arcPath(index)} className="interest-sector-hit"/>
            {active.id === group.id && <path d={arcPath(index, 128)} className="interest-sector-selection"/>}
            <path d={arcPath(index)} className="interest-sector-arc"/>
            <text x={[266, 266, 54, 54][index]} y={[58, 272, 272, 58][index]} textAnchor="middle" className="interest-sector-code" aria-hidden="true">{group.id}</text>
          </g>)}
          <text x="160" y="153" textAnchor="middle" className="interest-ring-code">{active.id}</text>
          <text x="160" y="184" textAnchor="middle" className="interest-ring-name">{active.name}</text>
        </svg>
      </figure>
      <div className="interest-reader">
        <div className="interest-type-heading" aria-live="polite"><span>{active.id} · {active.name}</span><span>选择具体 MBTI 类型</span></div>
        <div className="interest-cards" id={typesId} role="group" aria-label="选择具体 MBTI 类型">
          {active.types.map((type, index) => <button key={type} type="button" className="interest-card" data-interest-type={active.id} data-interest-tone={['blue', 'yellow', 'mist', 'gold'][index]} data-mbti-type={type} aria-label={type} aria-pressed={currentType === type} aria-controls={detailId} onClick={() => setSelectedType(type)}>
            <span className="interest-card-main"><span className="interest-mbti-badge"><strong>{type}</strong></span><span className="interest-card-state">{currentType === type ? (isSaved ? '我的人格' : '已选择') : '点击选择'}<span aria-hidden="true">{currentType === type ? ' ✓' : ' →'}</span></span></span>
            <span className="interest-traits">{interestTraits[type].map(trait => <span className="interest-trait" key={trait}>{trait}</span>)}</span>
          </button>)}
        </div>
      </div>
    </div>
    <section className="interest-detail" id={detailId} aria-labelledby={uid + '-detail-title'}>
      <div aria-live="polite" aria-atomic="true">
        <h3 id={uid + '-detail-title'}><span className="interest-detail-type">{currentType || active.id}</span>{active.title}</h3>
        <p className="interest-description">{active.description}</p>
        <p className="interest-preference">{active.preference}</p>
      </div>
      <div className="interest-detail-bottom">
        <div className="interest-directions"><h4>可能感兴趣的方向</h4><ul className="interest-tags">{active.interests.map(interest => <li key={interest}>{interest}</li>)}</ul></div>
        <div className="interest-actions">
          <button type="button" className="interest-choose" disabled={!currentType || isSaved} onClick={() => onChange({interestGroup: active.id, interestType: currentType})}>{isSaved ? '已选为我的兴趣偏好' : '选为我的兴趣偏好'}<span aria-hidden="true">{isSaved ? ' ✓' : ' →'}</span></button>
          {(savedType || savedGroup) && <button type="button" className="interest-clear" onClick={() => onChange({interestGroup: '', interestType: ''})}>清除选择</button>}
        </div>
      </div>
    </section>
    <footer className="interest-footer"><p role="status">{currentType && !isSaved ? <>待保存：{currentType}</> : savedType ? <>当前选择：{savedType.id}</> : '请先选择具体 MBTI 类型，再保存兴趣偏好。'}</p><span>兴趣会随经历变化，选择不限制职业方向。</span></footer>
  </section>;
}
