import ProductIcon from './ProductIcon';
import React, {Suspense, lazy, useEffect, useRef, useState} from 'react';
import {useLanguage} from './i18n/render';
import SegmentedControl from './SegmentedControl';
import './home-companion.css';

// Load the existing scene only when this section approaches the viewport.
// Its renderer already pauses its clock offscreen and when the tab is hidden.
const CompanionScene = lazy(() => import('./LoginNookScene'));

const copy = {
  zh: {
    heading: ['芝识分子，', '和你一起探索。'],
    intro: '一个爱翻书、会思考，也懂得适时休息的桌边伙伴。方向还没想好，也可以从一个小问题开始。',
    close: '不催你找到答案，陪你慢慢理清下一步。',
    controls: '选择芝识分子的动作',
    scene: '轻碰芝识分子，看看它的反应',
    hint: '试着选一个动作，也可以轻碰它。',
    keyboard: '左右方向键切换动作',
    fallback: '当前设备显示静态角色图，你仍可以切换阅读每个动作的介绍。',
    loading: '芝识分子正在走来。',
    stowing: '等我先收好书，再来回应你。',
    pendingTitle: '马上就来。',
    pending: '等我站稳，再接着陪你。',
    more: '走近芝识分子',
    back: '返回首页',
    explore: '开始探索 IT 职业',
    actions: [
      {id: 'greet', label: '打招呼', title: '你好，新的探索者。', text: '轻轻挥手，把好奇心带到这里。'},
      {id: 'read', label: '翻会儿书', title: '慢慢看，也是在向前。', text: '接住一本书，坐下来翻翻，给新的想法一点时间。'},
      {id: 'think', label: '一起想想', title: '先从一个问题开始。', text: '还没有答案也没关系，让思路慢慢清晰起来。'},
      {id: 'rest', label: '休息一下', title: '停一停，找回自己的节奏。', text: '适时休息一下，需要时再一起出发。'},
      {id: 'touch', label: '轻碰一下', title: '哎哟，我在这里。', text: '轻碰一下，看看芝识分子的小反应。'},
    ],
  },
  en: {
    heading: ['Meet', 'Cheese Scholar.'],
    intro: 'A desk companion who loves a good book, a little thinking and a well-timed rest. Even without a direction yet, you can start with one small question.',
    close: 'A little company while you work out your next step.',
    controls: 'Choose a Cheese Scholar interaction',
    scene: 'Give Cheese Scholar a gentle tap',
    hint: 'Choose an action, or give your companion a gentle tap.',
    keyboard: 'Use the arrow keys to switch actions',
    fallback: 'Your device is showing a still portrait. You can still explore the description of each action.',
    loading: 'Cheese Scholar is on the way.',
    stowing: 'Let me put my book away, then I’m with you.',
    pendingTitle: 'I’ll be right with you.',
    pending: 'Let me steady myself, then we can carry on.',
    more: 'Get to know Cheese Scholar',
    back: 'Back to home',
    explore: 'Explore IT careers',
    actions: [
      {id: 'greet', label: 'Say hello', title: 'Hello, curious explorer.', text: 'A little wave, and a little room for your curiosity.'},
      {id: 'read', label: 'Read a little', title: 'Taking your time is part of moving forward.', text: 'Catch a book, settle in and give a new idea some time.'},
      {id: 'think', label: 'Think together', title: 'One question at a time.', text: 'You don’t need an answer yet. Let your thoughts take shape.'},
      {id: 'rest', label: 'Take a rest', title: 'Pause. Find your own pace.', text: 'Take a little rest. We can start again when you’re ready.'},
      {id: 'touch', label: 'Gentle tap', title: 'Oh! I’m right here.', text: 'A gentle tap brings out a little reaction.'},
    ],
  },
};

function Arrow({back = false}) {
  return <ProductIcon name={back?"arrowBack":"arrow"} size={20}/>;
}

function Poster() {
  return <span className="companion-poster" aria-hidden="true"><img src="/mascot/cheese-source-poster.png" alt="" width="900" height="900" loading="lazy" decoding="async" draggable="false"/></span>;
}

/** Public introduction, reusing the approved model and its unchanged controller. */
export default function HomeCompanion({standalone = false, onBack, onExplore}) {
  const language = useLanguage(), c = copy[language === 'en' ? 'en' : 'zh'];
  const section = useRef(null), caption = useRef(null), timers = useRef([]), nextFrame = useRef(0), keyboardInput = useRef(false);
  const reactionPhase = useRef('none'), pendingAction = useRef(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [selected, setSelected] = useState('greet');
  const [sceneAction, setSceneAction] = useState('greet'), [pending, setPending] = useState(false);
  const [greeting, setGreeting] = useState(false), [reaction, setReaction] = useState(0), [reactionActive, setReactionActive] = useState(false);
  const [sceneState, setSceneState] = useState('loading');
  const active = c.actions.find(action => action.id === selected) || c.actions[0];
  const activity = sceneAction === 'think' ? 'think' : sceneAction === 'rest' ? 'rest' : 'idle';

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    cancelAnimationFrame(nextFrame.current);
  }

  useEffect(() => {
    const node = section.current;
    if (!node || typeof IntersectionObserver === 'undefined') {setNearViewport(true); return;}
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {setNearViewport(true); observer.disconnect();}
    }, {rootMargin: '300px 0px', threshold: 0});
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => clearTimers(), []);

  // The shared controller finishes book stow and recoil before its next action.
  // Start a queued greeting only after that transition, so its timed wave cannot
  // expire behind a higher-priority reaction. Rapid choices retain the last one.
  const sceneInitialized = useRef(false);
  useEffect(() => {
    if (sceneState !== 'loading' && sceneState !== 'fallback' && !sceneInitialized.current) {
      sceneInitialized.current = true;
      // An early tap can precede the renderer. Deliver it after the first frame
      // so it is an event, rather than disappearing into the initial pose.
      if (reactionPhase.current === 'requested') setReaction(value => value + 1);
    }
    if (['reaction-stow', 'stow-for-reaction', 'recoil'].includes(sceneState)) {
      reactionPhase.current = 'active';
      return;
    }
    if (reactionPhase.current === 'active' || sceneState === 'fallback') {
      reactionPhase.current = 'none';
      const next = pendingAction.current;
      pendingAction.current = null;
      if (next) applyAction(next);
    }
  }, [sceneState]);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const finishPending = () => {
      if (!reduced.matches) return;
      reactionPhase.current = 'none';
      const next = pendingAction.current;
      pendingAction.current = null;
      if (next) applyAction(next);
    };
    reduced.addEventListener('change', finishPending);
    return () => reduced.removeEventListener('change', finishPending);
  }, []);

  // Keep the live status in place; a short, interruptible arrival carries the
  // change without moving the layout or copying interactive DOM.
  useEffect(() => {
    const node = caption.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (!node || reduced.matches || keyboardInput.current) return;
    const animation = node.animate([{opacity: .35, transform: 'translateY(6px)'}, {opacity: 1, transform: 'translateY(0)'}], {
      duration: 280, easing: 'cubic-bezier(.22,1,.36,1)',
    });
    const stop = () => {if (reduced.matches) animation.cancel();};
    reduced.addEventListener('change', stop);
    return () => {animation.cancel(); reduced.removeEventListener('change', stop);};
  }, [selected, language]);

  function applyAction(id) {
    clearTimers();
    setSceneAction(id); setGreeting(false); setReactionActive(false); setPending(false);
    if (id === 'greet') {
      nextFrame.current = requestAnimationFrame(() => {
        setGreeting(true);
        timers.current.push(setTimeout(() => setGreeting(false), 2800));
      });
    } else if (id === 'touch') {
      reactionPhase.current = matchMedia('(prefers-reduced-motion: reduce)').matches || sceneState === 'fallback' ? 'none' : 'requested';
      setReaction(value => value + 1); setReactionActive(true);
      timers.current.push(setTimeout(() => setReactionActive(false), 2400));
    }
  }

  function choose(id, event) {
    keyboardInput.current = Boolean(event && event.detail === 0);
    setSelected(id);
    const reacting = reactionPhase.current !== 'none' || ['reaction-stow', 'stow-for-reaction', 'recoil'].includes(sceneState);
    if (reacting && !matchMedia('(prefers-reduced-motion: reduce)').matches && sceneState !== 'fallback') {
      clearTimers(); setGreeting(false);
      // Extra taps acknowledge the current reaction without replaying it.
      pendingAction.current = id === 'touch' ? null : id;
      setPending(id !== 'touch');
      return;
    }
    pendingAction.current = null;
    applyAction(id);
  }

  const Heading = standalone ? 'h1' : 'h2';
  const follow = (event, callback) => {if (callback) {event.preventDefault(); callback();}};

  return <section id="companion" ref={section} className={`home-companion${standalone ? ' home-companion-standalone' : ''}`} aria-labelledby="companion-title" data-i18n="off" data-language={language === 'en' ? 'en' : 'zh'} data-action={selected} data-scene-state={sceneState} data-action-pending={pending}>
    {standalone && <div className="companion-top"><a href="/" onClick={event => follow(event, onBack)}><Arrow back/>{c.back}</a><span>Cheese Scholar</span></div>}
    <div className="companion-layout">
      <div className="companion-copy">
        <Heading id="companion-title">{c.heading[0]}<br/>{c.heading[1]}</Heading>
        <p className="companion-intro">{c.intro}</p>
        <p className="companion-close">{c.close}</p>
        <a className="companion-text-link" href={standalone ? '/careers' : '/companion'} onClick={event => standalone && follow(event, onExplore)}>{standalone ? c.explore : c.more}<Arrow/></a>
      </div>
      <div className="companion-experience">
        <div className="companion-stage" aria-busy={nearViewport && sceneState === 'loading'}>
          {nearViewport ? <Suspense fallback={<Poster/>}><CompanionScene greeting={greeting} focus={sceneAction === 'read' ? 'email' : ''} activity={activity} reaction={reaction} reactionActive={reactionActive} language={language} onReact={event => choose('touch', event)} onMotionState={setSceneState} label={c.scene}/></Suspense> : <Poster/>}
          <span className="companion-stage-name" aria-hidden="true">{language === 'en' ? 'Cheese Scholar' : '芝识分子'}</span>
          <span className="companion-cheese-note" aria-hidden="true"><span/><span/><span/></span>
        </div>
        <div id="companion-actions" className="companion-interactions">
          <SegmentedControl as="div" className="companion-actions" role="group" aria-label={c.controls} onKeyDown={event => {event.currentTarget.dataset.keyboard = 'true';}} onPointerDown={event => {event.currentTarget.dataset.keyboard = 'false';}}>{c.actions.map(action => <button key={action.id} type="button" aria-pressed={selected === action.id} onClick={event => choose(action.id, event)}>{action.label}</button>)}</SegmentedControl>
          <div ref={caption} className="companion-caption" role="status" aria-live="polite" aria-atomic="true"><p className="companion-action-title">{pending ? c.pendingTitle : active.title}</p><p>{sceneState === 'stow-for-reaction' ? c.stowing : pending ? c.pending : active.text}</p></div>
          <p className="companion-hint">{sceneState === 'fallback' ? c.fallback : c.hint}<span className="companion-keyboard-hint">{sceneState !== 'fallback' && c.keyboard}</span></p>
        </div>
      </div>
    </div>
  </section>;
}
