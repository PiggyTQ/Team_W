import React, {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {capabilityMastery, capabilitySkills, puzzleCell} from './capability-puzzle-model.js';
import CapabilityPiece, {CapabilitySkillIcon} from './CapabilityPiece';
import './capability-puzzle.css';

export default function CapabilityPuzzle({careerId, preferences, onChange}) {
  const skills = capabilitySkills(careerId), mastery = capabilityMastery(preferences);
  const [selectedId, setSelectedId] = useState(skills[0].id), [changed, setChanged] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(true), board = useRef(null);
  const focusAfterPaint = useRef(null);
  const uid = useId(), active = skills.find(skill => skill.id === selectedId) || skills[0];
  const rows = Math.ceil(skills.length / puzzleCell.columns), padding = 10;
  const puzzleWidth = puzzleCell.width * puzzleCell.columns;
  const viewWidth = puzzleWidth + padding * 2, viewHeight = puzzleCell.height * rows + padding * 2;
  const mastered = mastery[active.id] === true;
  useEffect(() => {setSelectedId(capabilitySkills(careerId)[0].id); setChanged(false);}, [careerId]);
  useLayoutEffect(() => {
    const svg = board.current;
    const measure = () => {
      const rect = svg.getBoundingClientRect(), scale = Math.min(rect.width / viewWidth, rect.height / viewHeight) || 1;
      svg.style.setProperty('--puzzle-label-size', Math.max(14, (rect.width < 300 ? 11.2 : 12) / scale) + 'px');
      svg.style.setProperty('--puzzle-state-size', Math.max(10.5, 10 / scale) + 'px');
      svg.style.setProperty('--puzzle-state-icon-size', Math.max(12, 11 / scale) + 'px');
      svg.dataset.compact = String(scale < .82);
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(svg);
    return () => observer.disconnect();
  }, [viewWidth, viewHeight]);
  // SVG paints later siblings on top. Keep matrix coordinates unchanged and restore
  // keyboard focus if moving the selected keyed node changes the focused DOM position.
  const paintedSkills = skills.map((skill, index) => ({skill, index})).sort((a, b) => Number(a.skill.id === active.id) - Number(b.skill.id === active.id));
  useLayoutEffect(() => {
    if (focusAfterPaint.current !== active.id) return;
    focusAfterPaint.current = null;
    const target = [...board.current.querySelectorAll('.capability-piece')].find(element => element.dataset.capabilityId === active.id);
    target?.focus({preventScroll: true});
  }, [active.id]);
  const select = id => {
    if (id !== active.id && board.current?.contains(document.activeElement)) focusAfterPaint.current = id;
    setSelectedId(id); setChanged(false);
  };
  const record = value => {onChange(active.id, value); setChanged(true);};
  const navigate = (index, key) => {
    const offset = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -puzzleCell.columns, ArrowDown: puzzleCell.columns}[key];
    const next = key === 'Home' ? 0 : key === 'End' ? skills.length - 1 : (index + offset + skills.length) % skills.length;
    const target = [...board.current.querySelectorAll('.capability-piece')].find(element => element.dataset.capabilityId === skills[next].id);
    target?.focus({preventScroll: true});
  };

  return <section className="capability-puzzle" aria-labelledby={uid + '-title'}
    onPointerDownCapture={() => setKeyboardMode(false)} onKeyDownCapture={() => setKeyboardMode(true)}>
    <header className="capability-puzzle-heading"><div><h3 id={uid + '-title'}>能力拼图</h3><p>点击一块拼图，查看并记录掌握状态。</p></div>
      <div className="capability-legend" role="group" aria-label="掌握状态图例"><span data-mastered="true"><i aria-hidden="true"/>已掌握</span><span data-mastered="false"><i aria-hidden="true"/>未掌握</span></div>
    </header>
    <div className="capability-puzzle-layout">
      <section className="capability-detail" id={uid + '-detail'} aria-labelledby={uid + '-detail-title'} data-mastered={mastered}>
        <div aria-live="polite" aria-atomic="true"><div className="capability-detail-content" key={active.id}>
          <div className="capability-detail-heading"><div><span className="capability-level">{active.level}</span><h3 id={uid + '-detail-title'}>{active.name}</h3></div><span className="capability-detail-emblem" aria-hidden="true"><CapabilitySkillIcon name={active.name}/></span></div><p>{active.description}</p>
          <div className="capability-current"><span>当前状态</span><strong>{mastered ? '已掌握' : '未掌握'}</strong></div>
        </div></div>
        <div className="capability-record" role="group" aria-label="记录掌握状态">
          <button type="button" data-mastery-choice="true" aria-pressed={mastery[active.id] === true} onClick={() => record(true)}>已掌握</button>
          <button type="button" data-mastery-choice="false" aria-pressed={mastery[active.id] === false} onClick={() => record(false)}>未掌握</button>
        </div>
        <p className="capability-record-status" role="status">{changed ? '自评已更新' : '选择拼图后，可在这里更新自评。'}</p>
      </section>
      <svg ref={board} className="capability-board" data-keyboard-mode={keyboardMode} viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label="职业能力拼图" aria-describedby={uid + '-keyboard-help'}>
        {paintedSkills.map(({skill, index}) => <CapabilityPiece key={skill.id} skill={skill} index={index} rows={rows} padding={padding} uid={uid} has={mastery[skill.id] === true}
          selected={active.id === skill.id} onSelect={select} onNavigate={navigate}/>)}
      </svg>
    </div>
    <p className="capability-keyboard-help" id={uid + '-keyboard-help'}>使用方向键切换拼图，按 Enter 或空格选择。</p>
    <p className="capability-puzzle-note">自评记录可随时调整，未标记的能力以蓝色展示。</p>
  </section>;
}
