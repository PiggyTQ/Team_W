import React, {useEffect, useRef, useState} from 'react';
import {careers} from './model';
import {useCatalog} from './CatalogData';
import {useLanguage, displayPublicText} from './i18n/render';
import ProductIcon from './ProductIcon';
import SkillGrowthTree from './SkillGrowthTree';
import SkillStudyPanel from './SkillStudyPanel';
import copy from './i18n/skill-tree-ui.json' with {type:'json'};
import {chooseSkillLeaf, skillProgress, skillStudyKey, skillTreeRoute} from './skill-tree-model';
import {projectRoute} from './practice-project-model';
import './skill-tree.css';

const loadLocal = import.meta.env.VITE_AUTH_MODE === 'server' ? null : () => import('./local-skill-tree');
export default function SkillTreePage({state, url, move, link, live, workspace, update, onCheck, onGuide, precheck}) {
  const language = useLanguage();
  const t = copy[language];
  const params = new URL(url, location.origin).searchParams;
  const career = [params.get('career'), state.goal, state.assessmentCareer, 'data']
    .find(id => careers.some(item => item.id === id));
  const request = useCatalog(live ? '/api/catalog/skill-trees/' + career : null);
  const [local, setLocal] = useState({career:null, tree:null, error:false});
  const [retry, setRetry] = useState(0);
  const label = value => value[language === 'en' ? 1 : 0];

  useEffect(() => {
    if (!loadLocal || live) return;
    let active = true;
    loadLocal().then(module => {
      if (active) setLocal({career, tree:module.localSkillTree(career), error:false});
    }).catch(() => {
      if (active) setLocal({career, tree:null, error:true});
    });
    return () => { active = false; };
  }, [career, live, retry]);

  const result = live ? request.data?.tree : local.tree;
  const tree = result?.id === career ? result : null;
  const failed = live ? !!request.error : local.career === career && local.error;
  const study = state.skillStudy;
  const current = careers.find(item => item.id === career);
  const careerName = displayPublicText(current.name);

  return <section className="skill-map" data-i18n="off" aria-labelledby="skill-map-title">
    <header className="skill-map-head">
      <div className="skill-map-heading">
        <h1 id="skill-map-title">{t.title}</h1>
        <label className="skill-map-switch">
          <span id="skill-map-career-label">{t.career}</span>
          <select aria-labelledby="skill-map-career-label" value={career}
            onChange={event => move(skillTreeRoute(event.target.value,{from:params.get('from')}), false, {preserveScroll:true})}>
            {careers.map(item => <option key={item.id} value={item.id}>{displayPublicText(item.name)}</option>)}
          </select>
        </label>
      </div>
      <div className="skill-map-actions">
        <button type="button" className="skill-control" onClick={onGuide}><ProductIcon name="route" size={17}/>{t.guide}</button>
        {params.get('from')==='report'&&link('/reports?career='+career+'#projects',language==='en'?'Return to career report':'返回职业报告')}
        {link('/careers?career=' + career, t.careerLink)}
        {link('/careers?tab=比较', t.compare)}
      </div>
    </header>
    {tree ? <SkillTreeBody key={tree.id + ':' + tree.version} {...{
      tree, study, state, params, careerName, label, t, language, live, workspace, update, move, link, onCheck, precheck
    }} onReload={live ? request.retry : () => setRetry(value => value + 1)}/> :
      failed ? <div className="skill-load-state" role="alert">
        <p>{t.notReady}</p>
        <button type="button" className="skill-control" onClick={live ? request.retry : () => setRetry(value => value + 1)}>{t.retry}</button>
      </div> : <p className="skill-load-state" role="status">{t.loading}</p>}
  </section>;
}

function SkillTreeBody({tree, study, state, params, careerName, label, t, language, live, workspace, update,
    move, link, onCheck, onReload, precheck}) {
  const {branch, leaf, step} = chooseSkillLeaf(tree, params, study);
  const leaves = tree.branches.flatMap(item => item.leaves);
  const overall = skillProgress(tree.id, leaves, study);
  const current = skillProgress(tree.id, branch.leaves, study);
  const progress = new Map(tree.branches.map(item => [item.id, skillProgress(tree.id, item.leaves, study)]));
  const [recentGrowth, setRecentGrowth] = useState(null);
  const treeView = useRef(null);
  const path = useRef(null);
  const scrollToPath = useRef(false);
  const branchHeading = useRef(null);
  const key = skillStudyKey(tree.id, leaf);
  const leafIndex = branch.leaves.findIndex(item => item.id === leaf.id);
  const next = [...branch.leaves.slice(leafIndex + 1), ...branch.leaves.slice(0, leafIndex)].find(item =>
    !study?.[skillStudyKey(tree.id, item)]?.assessment?.passedAt);

  const locationFor = (picked, active = step, item = branch) => skillTreeRoute(tree.id, {
    branch: item.id, skill: picked?.id, step: active, from:params.get('from')
  });
  const select = (item, picked, active = 'learn', jump = false) => {
    const route = locationFor(picked, active, item);
    if (jump && route === window.location.pathname + window.location.search) {
      path.current?.scrollIntoView({block:'start'});
      branchHeading.current?.focus({preventScroll:true});
      return;
    }
    scrollToPath.current = jump;
    move(route, false, {preserveScroll:true});
  };
  const plan = () => {
    const source = locationFor(leaf, 'practice');
    precheck(state.taskDraft?.source === source && state.taskDraft.template === 'external' ? state.taskDraft : {
      title:leaf.title[0], career:tree.id, purpose:leaf.exercise[0], product:copy.zh.planOutput,
      association:state.goal === tree.id ? '主计划' : '独立探索', source
    });
  };
  const check = payload => {
    // Keep a direct link to this check when passing it changes the next suggested leaf.
    if (!params.has('skill')) move(locationFor(leaf, 'check'), true, {preserveScroll:true});
    return onCheck(payload);
  };
  const showGrowth = (newlyPassed) => {
    if (newlyPassed) setRecentGrowth(leaf.id);
    treeView.current?.scrollIntoView({block:'start'});
    treeView.current?.querySelector('.skill-leaf-node[aria-current="true"]')?.focus({preventScroll:true});
  };
  useEffect(() => {
    if (!scrollToPath.current) return;
    scrollToPath.current = false;
    path.current?.scrollIntoView({block:'start'});
    branchHeading.current?.focus({preventScroll:true});
  }, [branch.id, leaf.id, step, params.get('skill'), params.get('branch')]);

  return <>
    <SkillGrowthTree {...{tree,branch,leaf,careerName,study,progress,overall,label,t}}
      onSelect={select} viewRef={treeView} recentGrowth={recentGrowth}>
      <div className="skill-tree-key">
        <p id="skill-tree-help">{t.mapLegend}</p>
        <details className="skill-map-basis">
          <summary>{t.sources}</summary>
          <p>{t.sourceNote}</p>
          <SkillSources sources={tree.frameworks}/>
        </details>
      </div>
    </SkillGrowthTree>

    <section className="skill-path" id="skill-branch-path" ref={path} aria-labelledby="skill-path-title" data-skill-path={branch.id}>
      <header className="skill-path-head">
        <div>
          <h2 id="skill-path-title" tabIndex={-1} ref={branchHeading}>{label(branch.title)}</h2>
          <p>{label(branch.purpose)}</p>
        </div>
        <div className="skill-path-progress" aria-live="polite" style={{'--skill-fraction':current.done / current.total}}>
          <strong>{current.percent}%</strong>
          <span>{current.done}/{current.total} {t.passed}</span>
          <div className="skill-path-meter" aria-hidden="true"/>
        </div>
      </header>
      <ol className="skill-path-steps" aria-label={t.routeNav} style={{'--skill-steps':branch.leaves.length}}>
        {branch.leaves.map((item, index) => {
          const record = study?.[skillStudyKey(tree.id, item)];
          const passed = !!record?.assessment?.passedAt;
          return <li key={item.id} data-passed={passed}>
            <button type="button" aria-current={item.id === leaf.id ? 'step' : undefined}
              onClick={() => select(branch, item)} data-path-leaf={item.id}>
              <span className="skill-path-number" aria-hidden="true">{passed ? <ProductIcon name="check" size={16}/> : index + 1}</span>
              <span className="skill-path-text"><strong>{label(item.title)}</strong>
                <small>{passed ? t.passed : record?.draft?.trim() ? t.drafted : record?.read ? t.read : t.untested}</small>
              </span>
            </button>
          </li>;
        })}
      </ol>
      <SkillStudyPanel key={key} {...{
        tree, leaf, step, label, t, language, live, workspace, update, onReload, showGrowth
      }} record={study?.[key]} studyKey={key} onStep={active => select(branch, leaf, active)}
        onNext={next ? () => select(branch, next, 'learn', true) : null} onCheck={check} onPlan={plan}>
        <SkillSources sources={leaf.sources}/>
        {branch.project && <div className="skill-related">
          <h4>{t.work}</h4>
          {link(projectRoute(branch.project), <>{t.startWork}<ProductIcon name="arrow" size={15}/></>)}
        </div>}
      </SkillStudyPanel>
    </section>
    <LegacyDrafts state={state} career={tree.id} precheck={precheck} language={language}/>
  </>;
}

function SkillSources({sources}) {
  return <ul className="skill-source-list">
    {sources.map(source => <li key={source.url}>
      <span>{source.publisher}{source.version && ' · ' + source.version}</span>
      <a href={source.url} target="_blank" rel="noreferrer">
        {source.title}<ProductIcon name="external" size={14}/>
      </a>
    </li>)}
  </ul>;
}

function LegacyDrafts({state, career, precheck, language}) {
  const seen = new Set();
  const drafts = [state.taskDraft, ...Object.values(state.atlasDrafts || {})].filter(draft => {
    const key = draft?.atlas?.key;
    if (!key || draft.atlas.career !== career || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!drafts.length) return null;
  return <details className="skill-legacy-drafts">
    <summary>{language === 'en' ? 'Earlier map drafts' : '旧地图实践草稿'}</summary>
    <ul>{drafts.map(draft => <li key={draft.atlas.key}>
      <span translate="no">{draft.title}</span>
      <button type="button" className="skill-control" onClick={() => precheck(draft)}>
        {language === 'en' ? 'Resume planning' : '继续核对预算'}
      </button>
    </li>)}</ul>
  </details>;
}

