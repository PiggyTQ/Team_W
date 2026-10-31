import React, {useEffect, useRef, useState} from 'react';
import {useLanguage} from './i18n/render';
import CheeseAvatar, {CheesePose} from './CheeseAvatar';
import './sidebar-companion.css';

const STORAGE_KEY = 'career-prototype-sidebar-companion-v1';
const copy = {
  zh: {
    region: '桌边伙伴', name: '芝识分子', idle: '陪你理清下一个想法',
    sleeping: '休息中，点我唤醒', pet: '招呼收到。', awake: '醒啦，一起继续。',
    touch: '和芝识分子打招呼', wake: '唤醒芝识分子', rest: '让芝识分子休息',
    readLabel: '看书', loungeLabel: '趴着', read: '让芝识分子看书', lounge: '让芝识分子趴一会儿', reading: '翻翻书，陪你继续。',
    restLabel: '休息', wakeLabel: '唤醒', hide: '隐藏桌边伙伴', hideLabel: '隐藏',
    restore: '显示桌边伙伴', settingsHint: '展开侧栏可设置',
  },
  en: {
    region: 'Desk companion', name: 'Cheese Scholar', idle: 'One thought at a time.',
    sleeping: 'Resting. Tap to wake.', pet: 'A little hello, received.', awake: 'Awake. Ready when you are.',
    touch: 'Say hello to Cheese Scholar', wake: 'Wake Cheese Scholar', rest: 'Let Cheese Scholar rest',
    readLabel: 'Read', loungeLabel: 'Lounge', read: 'Let Cheese Scholar read', lounge: 'Let Cheese Scholar lounge', reading: 'A little reading, together.',
    restLabel: 'Rest', wakeLabel: 'Wake', hide: 'Hide desk companion', hideLabel: 'Hide',
    restore: 'Show desk companion', settingsHint: 'Expand the sidebar for settings',
  },
};

function readPreference() {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || 'null');
    return {hidden: value?.hidden === true, sleeping: value?.sleeping === true};
  } catch {
    return {hidden: false, sleeping: false};
  }
}

function RestSymbol({sleeping = false}) {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {sleeping
      ? <><circle cx="10" cy="10" r="3" /><path d="M10 2v1m0 14v1M2 10h1m14 0h1M4.3 4.3l.7.7m10 10 .7.7M4.3 15.7l.7-.7m10-10 .7-.7" /></>
      : <path d="M16.4 11.6A6.8 6.8 0 0 1 8.4 3a6.8 6.8 0 1 0 8 8.6Z" />}
  </svg>;
}

/** A local, optional companion. It never reads or writes career or chat records. */
export default function SidebarCompanion({collapsed = false, page = ''}) {
  const language = useLanguage();
  const text = copy[language] || copy.zh;
  const [preference, setPreference] = useState(readPreference);
  const [reaction, setReaction] = useState('');
  const [petting, setPetting] = useState(false);
  const [activity, setActivity] = useState(null);
  const timers = useRef({motion: null, message: null});
  const petButton = useRef(null);
  const restoreButton = useRef(null);
  const pendingFocus = useRef(null);
  const {hidden, sleeping} = preference;
  const scene = sleeping ? 'rest' : activity || (page === 'U08' || page === 'U10' ? 'read' : page === 'U05' || page === 'U06' ? 'track' : page === 'U07' || page === 'U04' ? 'note' : 'perch');
  const status = reaction ? text[reaction] : sleeping ? text.sleeping : scene === 'read' ? text.reading : text.idle;
  useEffect(() => {setActivity(null);}, [page]);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(preference));
    } catch { /* A blocked storage preference still works for this visit. */ }
    if (pendingFocus.current) {
      const target = pendingFocus.current === 'restore' ? restoreButton : petButton;
      target.current?.focus();
      pendingFocus.current = null;
    }
  }, [preference]);

  useEffect(() => () => {
    clearTimeout(timers.current.motion);
    clearTimeout(timers.current.message);
  }, []);

  const clearFeedback = () => {
    clearTimeout(timers.current.motion);
    clearTimeout(timers.current.message);
    setPetting(false);
    setReaction('');
  };

  const greet = (event, waking = sleeping) => {
    clearFeedback();
    if (waking) setPreference(value => ({...value, sleeping: false}));
    setReaction(waking ? 'awake' : 'pet');
    // Keyboard actions are immediate; a pointer gives a brief character response.
    if (event.detail > 0) {
      setPetting(true);
      timers.current.motion = setTimeout(() => setPetting(false), 220);
    }
    timers.current.message = setTimeout(() => setReaction(''), 1800);
  };

  const toggleRest = event => {
    if (sleeping) { greet(event, true); return; }
    clearFeedback();
    setPreference(value => ({...value, sleeping: true}));
  };

  const hide = () => {
    clearFeedback();
    pendingFocus.current = 'restore';
    setPreference(value => ({...value, hidden: true}));
  };

  const restore = () => {
    clearFeedback();
    pendingFocus.current = 'pet';
    setPreference(value => ({...value, hidden: false}));
  };

  const toggleReading = () => {clearFeedback();setPreference(value=>({...value,sleeping:false}));setActivity(scene==='read'?'perch':'read');};

  return <section className="sidebar-companion" data-cheese="true" data-scene={scene} data-collapsed={collapsed} data-hidden={hidden} data-sleeping={sleeping} data-petting={petting} role="group" aria-label={text.region}>
    {hidden ? <button ref={restoreButton} className="sidebar-companion-restore" data-testid="companion-restore" type="button" onClick={restore} aria-label={text.restore} title={text.restore}>
      <CheeseAvatar sleeping size={30}/>{!collapsed && <span>{text.restore}</span>}
    </button> : <>
      <div className="sidebar-companion-presence">
        <button ref={petButton} className="sidebar-companion-pet" data-testid="companion-pet" type="button" onClick={greet} aria-label={sleeping ? text.wake : text.touch} title={`${sleeping ? text.wake : text.touch}${collapsed ? ` · ${text.settingsHint}` : ''}`}>
          {collapsed ? <CheeseAvatar sleeping={sleeping} size={42}/> : <CheesePose pose={scene} width={136} height={94} className="cheese-companion-figure"/>}
        </button>
        {!collapsed && <div className="sidebar-companion-copy"><strong>{text.name}</strong><small role="status" aria-live="polite" aria-atomic="true">{status}</small></div>}
      </div>
      {!collapsed && <div className="sidebar-companion-controls">
        <button type="button" onClick={toggleReading} aria-label={scene==='read'?text.lounge:text.read} aria-pressed={scene==='read'} title={scene==='read'?text.lounge:text.read}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M2.5 4.5c3-1 5-.3 7.5 1.4 2.5-1.7 4.5-2.4 7.5-1.4v12c-3-1-5-.3-7.5 1.4-2.5-1.7-4.5-2.4-7.5-1.4Z"/><path d="M10 6v12"/></svg><span>{scene==='read'?text.loungeLabel:text.readLabel}</span>
        </button>
        <button data-testid="companion-rest" type="button" onClick={toggleRest} aria-label={sleeping ? text.wake : text.rest} aria-pressed={sleeping}>
          <RestSymbol sleeping={sleeping} /><span>{sleeping ? text.wakeLabel : text.restLabel}</span>
        </button>
        <button data-testid="companion-hide" type="button" onClick={hide} aria-label={text.hide}>{text.hideLabel}</button>
      </div>}
    </>}
  </section>;
}
