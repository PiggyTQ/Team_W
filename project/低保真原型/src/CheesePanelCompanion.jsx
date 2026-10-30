import React from 'react';
import {useLanguage} from './i18n/render';
import './cheese-panels.css';

const captions = {
  zh: {name: '芝识分子', perch: '一起理清下一个问题', read: '陪你回看每个想法', note: '把想法慢慢写下来'},
  en: {name: 'Cheese Scholar', perch: 'One question at a time.', read: 'A little space to look back.', note: 'Take your time with each thought.'},
};

/** Decorative company only. The parent passes focus state, never field content. */
export default function CheesePanelCompanion({scene = 'perch', active = false}) {
  const language = useLanguage();
  const text = captions[language] || captions.zh;
  const mode = ['read', 'note'].includes(scene) ? scene : 'perch';
  const pose = active ? 'note' : mode === 'note' ? 'perch' : mode;
  return <div className="cheese-panel-companion" data-scene={mode} data-active={active} aria-hidden="true">
    <img className="cheese-panel-character" src={`/mascot/q-${pose}.png`} width="112" height="88" alt="" draggable="false" decoding="async"/>
    <div className="cheese-panel-caption"><span className="cheese-panel-name" translate="no">{text.name}</span><span>{text[mode]}</span></div>
    <span className="cheese-panel-shelf"/>
  </div>;
}
