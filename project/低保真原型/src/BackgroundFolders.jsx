import React, {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {demoExperiences} from './background-demo-experiences';
import './background-folders.css';

const entryFiles = [
  {id: 'manual', title: '手填已有经历', stamp: '记录', tone: 'butter'},
  {id: 'import', title: '导入文件（模拟解析）', stamp: '整理', tone: 'honey'},
];

const folderTones = ['butter', 'honey', 'vanilla', 'saffron', 'lemon', 'straw', 'gold', 'maize'];

function folderTone(id) {
  // Stable pseudo-random yellows keep each book's color through rerenders and reordering.
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  return folderTones[((hash + (hash >>> 16)) >>> 0) % folderTones.length];
}

function FolderSymbol({kind}) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'manual' ? <><path d="m15 4 5 5-10 10-6 1 1-6Z"/><path d="m13 6 5 5"/></>
      : kind === 'import' ? <><path d="M7 3H4v18h16V9l-6-6h-3"/><path d="M14 3v6h6M11 3v11m-3-3 3 3 3-3"/></>
        : <><path d="M5 3h9l5 5v13H5Z"/><path d="M14 3v5h5M8 12h8M8 16h6"/></>}
  </svg>;
}

function FolderWallDecoration() {
  return <div className="folder-wall-decoration" aria-hidden="true">
    <svg viewBox="0 0 720 378" preserveAspectRatio="xMaxYMid meet" fill="none" focusable="false">
      <circle cx="644" cy="179" r="87" fill="#edf3f8"/>
      <path d="M684 225h36v104h-91a104 104 0 0 0 55-104Z" fill="#f8f1dc"/>
      <path d="M-34 312a78 78 0 0 1 107 66M-23 312a65 65 0 0 1 87 66" stroke="#e9eff1" strokeWidth="2"/>
      <g fill="#b7cbd9" opacity=".75">{Array.from({length: 9}, (_, index) => <circle key={index} cx={675 + index % 3 * 11} cy={35 + Math.floor(index / 3) * 11} r="1.8"/>)}</g>
      <g stroke="#9db6c9" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="m578 105 66-19-30 51-10-26-26-6Zm26 6 40-25" fill="#f9fcfe"/>
        <path d="M570 144c-34 31-26 46-2 59s30 38 5 56" strokeDasharray="4 8"/>
        <g transform="rotate(12 651 263)">
          <rect x="624" y="222" width="58" height="77" rx="7" fill="#fffefa"/>
          <path d="M637 245h29m-29 12h29m-29 12h18M647 226v10a5 5 0 0 0 10 0v-17a8 8 0 0 0-16 0v14"/>
        </g>
        <path d="M689 198h12m-6-6v12M533 55h9m-4.5-4.5v9"/>
      </g>
      <path d="m675 139 4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" fill="#e7ce88"/>
      <circle cx="554" cy="293" r="4" fill="#e8d59c"/>
      <circle cx="610" cy="53" r="5" stroke="#c7d7e2" strokeWidth="1.7"/>
    </svg>
  </div>;
}

function FolderPrint({variant = 0}) {
  return <svg className="folder-print" viewBox="0 0 76 236" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path className="folder-print-soft" d="M52 1h23v23ZM1 226h74v9H1Z"/>
    <g className="folder-print-ink" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 8h22M8 12h11M10 230h11m4 0h4m4 0h4"/>
      <circle cx="38" cy="200.5" r="22"/>
      {variant === 0 ? <path d="m68 35 6 6m-6 4 6 6m-6 4 6 6M4 113l3 3-3 3m0 6 3 3-3 3"/>
        : variant === 1 ? <><circle cx="5" cy="43" r="1.5"/><circle cx="5" cy="51" r="1.5"/><circle cx="5" cy="59" r="1.5"/><path d="M70 102v23m-3-19h6m-6 7h6m-6 7h6"/></>
          : variant === 2 ? <path d="M4 37c7 0 7 12 0 12m0 3c7 0 7 12 0 12M69 107l4 4-4 4 4 4-4 4"/>
            : <><path d="m5 35 2 5 5 2-5 2-2 5-2-5-2-2 2-2ZM70 102v23M67 108h6m-6 11h6"/><circle cx="62" cy="9" r="3"/></>}
    </g>
  </svg>;
}

function FolderLabelMark({variant = 0}) {
  const paths = [
    'm8 2 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z',
    'M3 12C1 5 5 2 13 3c0 7-3 11-9 9m0 0 6-6',
    'm5 6 5-3a3 3 0 0 1 3 5l-6 4a2 2 0 0 1-2-3l5-3',
    'M8 2v12M2 8h12M4 4l8 8m0-8-8 8',
  ];
  return <svg className="folder-label-mark" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[variant]}/></svg>;
}

function DemoExperience({experience}) {
  return <article className="folder-demo-content">
    <div className="folder-demo-meta"><span>演示经历</span><span>{experience.type}</span><span>{experience.period}</span></div>
    <p className="folder-demo-notice">演示内容，不计入个人评估。</p>
    <dl>{[['background', '经历背景'], ['action', '具体行动'], ['contribution', '本人贡献'], ['outcome', '结果与收获']].map(([key, title]) =>
      <div key={key}><dt>{title}</dt><dd>{experience[key]}</dd></div>)}</dl>
  </article>;
}

export default function BackgroundFolders({claims, renderExperience, renderManual, renderImport, go, link, routeKey, live = false}) {
  const uid = useId(), root = useRef(null), buttons = useRef({}), documents = useRef({}), animation = useRef(null);
  const stage = useRef(null), createButton = useRef(null), entryChooser = useRef(null);
  const operation = useRef(0), sourceRect = useRef(null), returnTo = useRef(null), closingFrom = useRef(null);
  const queued = useRef(null), afterClose = useRef(null), shouldRestore = useRef(true), pendingFocus = useRef(null);
  const state = useRef({id: null, phase: 'closed'}), actions = useRef({}), latest = useRef({go, link});
  const [view, setView] = useState(state.current), [visited, setVisited] = useState([]);
  const [choosing, setChoosing] = useState(false);
  const [showDemo, setShowDemo] = useState(claims.length === 0), previousClaimCount = useRef(claims.length);
  const reduced = useRef(false), previousRoute = useRef(routeKey);
  const personalFolders = claims.map((claim, index) => ({id: 'claim:' + claim.id, claim, title: claim.title || '未命名经历',
    number: String(index + 1).padStart(2, '0'), stamp: claim.status, tone: folderTone('claim:' + claim.id)}));
  const demoFolders = demoExperiences.map((demo, index) => ({id: 'demo:' + demo.id, demo, title: demo.title,
    number: String(index + 1).padStart(2, '0'), stamp: '演示', tone: folderTone('demo:' + demo.id)}));
  const folders = showDemo ? demoFolders : personalFolders;
  const files = [...entryFiles, ...personalFolders.concat(demoFolders).filter(file => file.id === view.id)];
  latest.current = {go, link};
  const change = value => {state.current = value; setView(value);};
  const label = file => file.id === 'import' && live ? '导入 PDF / 粘贴材料' : file.title;

  function closeFolder(action, restore = true) {
    const current = state.current;
    if (current.phase === 'closed') {action?.(); return;}
    if (action) afterClose.current = action;
    if (!restore || action) shouldRestore.current = false;
    else if (current.phase !== 'closing') shouldRestore.current = true;
    if (current.phase === 'closing') return;
    const panel = documents.current[current.id];
    const style = panel && getComputedStyle(panel);
    closingFrom.current = {transform: style?.transform || 'none', opacity: style?.opacity || '1'};
    operation.current++;
    animation.current?.cancel();
    change({...current, phase: 'closing'});
  }

  function openFolder(id, trigger = buttons.current[id]) {
    if (entryFiles.some(file => file.id === id)) trigger = createButton.current;
    entryChooser.current?.close();
    setChoosing(false);
    const current = state.current;
    if (current.id === id && current.phase === 'open') {documents.current[id]?.querySelector('.folder-document-title')?.focus({preventScroll: true}); return;}
    if (current.id === id && current.phase === 'opening') return;
    if (current.phase !== 'closed') {queued.current = {id, trigger}; closeFolder(undefined, false); return;}
    returnTo.current = trigger;
    sourceRect.current = trigger?.querySelector('.folder-peek')?.getBoundingClientRect() || trigger?.getBoundingClientRect();
    setVisited(previous => previous.includes(id) ? previous : [...previous, id]);
    change({id, phase: 'opening'});
  }

  function navigate(to) {
    if (state.current.phase !== 'open') return;
    const href = latest.current.link(to, '').props.href;
    closeFolder(() => {
      latest.current.go(href);
      const destination = new URL(href, location.origin);
      if (destination.pathname === '/assessment' && destination.hash) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const target = document.getElementById(decodeURIComponent(destination.hash.slice(1)));
          target?.scrollIntoView({block: 'start'}); target?.focus({preventScroll: true});
        }));
      }
    }, false);
  }
  function paperLink(to, text, className) {
    const anchor = link(to, text, className);
    return React.cloneElement(anchor, {onClick: event => {
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {event.preventDefault(); navigate(to);}
      else anchor.props.onClick?.(event);
    }});
  }
  actions.current = {open: openFolder, close: closeFolder, navigate};

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => {reduced.current = media.matches; if (media.matches) {try {animation.current?.finish();} catch { /* Already cancelled. */ }}};
    changed(); media.addEventListener('change', changed);
    return () => {media.removeEventListener('change', changed); operation.current++; animation.current?.cancel();};
  }, []);
  useLayoutEffect(() => {
    if (view.phase !== 'closed' || !pendingFocus.current) return;
    const target = pendingFocus.current;
    pendingFocus.current = null;
    // Restore only after React removes inert from the folder row.
    if (target.isConnected) target.focus({preventScroll: true});
  }, [view.phase]);
  useLayoutEffect(() => {
    const dialog = entryChooser.current;
    if (!choosing) {if (dialog.open) dialog.close(); return;}
    if (!dialog.open) dialog.showModal();
    const position = () => {
      const rect = stage.current.getBoundingClientRect(), width = Math.min(360, innerWidth - 32);
      dialog.style.width = width + 'px';
      const height = dialog.getBoundingClientRect().height;
      dialog.style.left = Math.max(16, Math.min(innerWidth - width - 16, rect.left + (rect.width - width) / 2)) + 'px';
      dialog.style.top = Math.max(16, Math.min(innerHeight - height - 16, rect.top + (rect.height - height) / 2)) + 'px';
    };
    position();
    buttons.current.manual?.focus({preventScroll: true});
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true);};
  }, [choosing]);
  useEffect(() => {
    if (previousRoute.current !== routeKey) {
      previousRoute.current = routeKey;
      setChoosing(false);
      queued.current = null; afterClose.current = null; pendingFocus.current = null;
      actions.current.close(undefined, false);
    }
  }, [routeKey]);
  useEffect(() => {
    if (claims.length > previousClaimCount.current) setShowDemo(false);
    else if (!claims.length) setShowDemo(true);
    previousClaimCount.current = claims.length;
  }, [claims.length]);
  useEffect(() => {
    const current = state.current;
    if (current.id?.startsWith('claim:') && !claims.some(claim => 'claim:' + claim.id === current.id)) {
      operation.current++; animation.current?.cancel(); queued.current = null; afterClose.current = null;
      pendingFocus.current = createButton.current;
      change({id: null, phase: 'closed'});
    }
  }, [claims]);
  useEffect(() => {
    const escape = event => {
      if (event.key !== 'Escape' || event.defaultPrevented || !root.current?.contains(document.activeElement)
        || document.querySelector('dialog:modal,[popover]:popover-open')) return;
      if (state.current.phase === 'closed') return;
      event.preventDefault(); event.stopPropagation(); actions.current.close();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, []);

  useLayoutEffect(() => {
    if (!view.id || !['opening', 'closing'].includes(view.phase)) return;
    const panel = documents.current[view.id], token = ++operation.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect(), source = sourceRect.current || rect;
    const width = Math.max(rect.width, 1), height = Math.max(rect.height, 1);
    const x = source.left - rect.left, y = source.top - rect.top;
    const scaleX = Math.max(.045, Math.min(.42, source.width / width)), scaleY = Math.min(.18, 65 / height);
    const folded = `translate(${x}px, ${y - 12}px) scale(${scaleX}, ${scaleY})`;
    const lifted = `translate(${x}px, ${y - 38}px) scale(${scaleX}, ${scaleY})`;
    const opening = view.phase === 'opening';
    const frames = opening ? [
      {transform: folded, opacity: 0, offset: 0},
      {transform: lifted, opacity: 1, offset: .22},
      {transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 1},
    ] : [
      closingFrom.current || {transform: 'none', opacity: 1},
      {transform: lifted, opacity: .95, offset: .8},
      {transform: folded, opacity: 0},
    ];
    const finish = () => {
      if (operation.current !== token) return;
      if (opening) {
        panel.style.transform = 'none'; panel.style.opacity = '1';
        change({id: view.id, phase: 'open'});
        panel.querySelector('.folder-document-title')?.focus({preventScroll: true});
      } else {
        const next = queued.current, action = afterClose.current;
        queued.current = null; afterClose.current = null;
        if (!action && !next && shouldRestore.current) pendingFocus.current = returnTo.current?.isConnected ? returnTo.current : buttons.current[view.id];
        change({id: null, phase: 'closed'});
        if (action) action();
        else if (next) requestAnimationFrame(() => {if(root.current?.isConnected && previousRoute.current === routeKey && state.current.phase === 'closed')actions.current.open(next.id, next.trigger);});
      }
    };
    if (!panel.animate) {finish(); return;}
    const transition = panel.animate(frames, {duration: reduced.current ? 1 : opening ? 620 : 400, easing: 'cubic-bezier(.2,.72,.22,1)', fill: 'both'});
    animation.current = transition;
    transition.finished.then(finish).catch(() => {});
    return () => transition.cancel();
  }, [view.id, view.phase]);

  return <section className="background-folders" ref={root} aria-label="经历档案袋">
    <FolderWallDecoration/>
    <div className="folder-desk-heading" inert={view.phase === 'open' || view.phase === 'closing'}>
      <div className="folder-heading-label"><h3>个人经历档案</h3>{claims.length > 0 && <button className="folder-collection-toggle" type="button" aria-pressed={showDemo}
        onClick={event => {const trigger = event.currentTarget; closeFolder(() => {setShowDemo(value => !value); pendingFocus.current = trigger;});}}>{showDemo ? '返回我的经历' : '查看演示经历'}</button>}</div>
    </div>
    <div className="folder-stage" ref={stage} data-phase={view.phase} data-folder={view.id || undefined} data-choosing={choosing}>
      <div className="folder-shelf" inert={view.phase === 'open' || view.phase === 'closing'}>
      <div className="folder-row" inert={view.phase === 'open' || view.phase === 'closing'}>
        {folders.map((file, index) => <button type="button" key={file.id} className="folder-trigger" data-folder={file.id} data-demo={!!file.demo} data-tone={file.tone} data-active={view.id === file.id} style={{'--folder-index': Math.min(index, 5)}}
          ref={element => {buttons.current[file.id] = element;}} title={file.title} aria-labelledby={uid + '-spine-' + file.id} aria-describedby={uid + '-status-' + file.id}
          aria-expanded={view.id === file.id && view.phase !== 'closing'} aria-controls={view.id === file.id ? uid + '-' + file.id : undefined}
          onClick={event => openFolder(file.id, event.currentTarget)}>
          <span className="folder-assembly"><span className="folder-peek" aria-hidden="true"/><span className="binder-spine" aria-hidden="true"/>
            <FolderPrint variant={folderTones.indexOf(file.tone) % 4}/>
            <span className="folder-label"><span className="folder-number" aria-hidden="true"><FolderLabelMark variant={folderTones.indexOf(file.tone) % 4}/>{file.number}</span><strong id={uid + '-spine-' + file.id} translate={file.demo ? undefined : 'no'} data-i18n={file.demo ? undefined : 'off'}>{file.title}</strong></span>
            <span className="folder-stamp" id={uid + '-status-' + file.id}>{file.stamp}</span><span className="binder-ring" aria-hidden="true"/>
          </span>
        </button>)}
        <button type="button" className="folder-create-trigger" ref={createButton} data-tone="gray" style={{'--folder-index': Math.min(folders.length, 6)}}
          aria-label="添加相关经历" aria-haspopup="dialog" aria-expanded={choosing} aria-controls={uid + '-entry-chooser'}
          onClick={() => {if (state.current.phase === 'closed') setChoosing(true);}}>
          <span className="folder-assembly" aria-hidden="true"><span className="folder-peek"/><span className="binder-spine"/>
            <FolderPrint variant={2}/>
            <span className="folder-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span>
            <span className="binder-ring"/>
          </span>
        </button>
      </div>
      </div>
      <dialog className="folder-entry-chooser" id={uid + '-entry-chooser'} ref={entryChooser} aria-labelledby={uid + '-entry-chooser-title'}
        onCancel={event => {event.preventDefault(); setChoosing(false);}}
        onClose={event => {if (!event.currentTarget.open) setChoosing(false);}}
        onKeyDown={event => {
          if (event.key !== 'Tab') return;
          const controls = event.currentTarget.querySelectorAll('button:not(:disabled)'), first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
          else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
        }}
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setChoosing(false);
        }}>
        <div className="folder-chooser-heading"><h4 id={uid + '-entry-chooser-title'}>添加相关经历</h4>
          <button type="button" className="folder-chooser-close" aria-label="关闭" onClick={() => setChoosing(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
        </div>
        <div className="folder-entry-actions">
          {entryFiles.map(file => <button type="button" key={file.id} className={'folder-entry-button' + (file.id === 'manual' ? ' folder-add' : '')}
            data-action={file.id} ref={element => {buttons.current[file.id] = element;}}
            aria-expanded={view.id === file.id && view.phase !== 'closing'} aria-controls={uid + '-' + file.id}
            onClick={() => openFolder(file.id)}><FolderSymbol kind={file.id}/>{file.id === 'manual' ? '手填已有经历' : '导入文件'}</button>)}
        </div>
      </dialog>
      {files.map(file => <section key={file.id} id={uid + '-' + file.id} ref={element => {documents.current[file.id] = element;}}
        className="folder-document" data-folder={file.id} data-tone={file.tone} data-phase={view.id === file.id ? view.phase : 'closed'} hidden={view.id !== file.id} aria-labelledby={uid + '-' + file.id + '-title'}>
        <div className="folder-document-tab" aria-hidden="true">{file.number ? file.number + ' · ' : ''}{file.stamp}</div>
        <header className="folder-document-heading"><div><span className="folder-paper-kicker">{file.claim || file.demo ? '经历详情' : '个人经历档案'}</span><h3 className="folder-document-title" id={uid + '-' + file.id + '-title'} tabIndex={-1} translate={file.claim ? 'no' : undefined} data-i18n={file.claim ? 'off' : undefined}>{label(file)}</h3></div><button type="button" className="folder-return" onClick={() => closeFolder()}>{file.claim || file.demo ? '← 收回档案袋' : '← 返回档案'}</button></header>
        <div className="folder-document-body" inert={view.phase !== 'open'} onSubmitCapture={event => {if (state.current.phase !== 'open') {event.preventDefault(); event.stopPropagation();}}}>
          {visited.includes(file.id) && (file.demo ? <DemoExperience experience={file.demo}/> : file.claim ? renderExperience(file.claim, {inFolder: true})
            : file.id === 'manual' ? renderManual({navigate, onImport: () => openFolder('import'), link: paperLink})
              : renderImport({active: view.id === file.id && !['closed', 'closing'].includes(view.phase), navigate, close: () => closeFolder(), onManual: () => openFolder('manual'), link: paperLink}))}
        </div>
        {!file.claim && !file.demo && <div className="folder-document-footer">按原文记录，保存后逐项核对。</div>}
      </section>)}
    </div>
    <div className="folder-desk-footer" inert={view.phase === 'open' || view.phase === 'closing'}>{link('/learning', '没有经历？先了解实践', 'folder-practice-link')}</div>
  </section>;
}
