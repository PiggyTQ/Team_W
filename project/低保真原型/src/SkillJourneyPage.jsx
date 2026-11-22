import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {careers} from './model';
import {useCatalog} from './CatalogData';
import {useLanguage,displayPublicText} from './i18n/render';
import ProductIcon from './ProductIcon';
import BotanicalGrowthTree from './BotanicalGrowthTree';
import {useTreeGrowth} from './useTreeGrowth';
import SkillLearningPanel from './SkillLearningPanel';
import {skillLearningScene,readSkillWork} from './skill-learning-model';
import copy from './i18n/skill-tree-ui.json' with {type:'json'};
import journeyCopy from './i18n/skill-journey-ui.json' with {type:'json'};
import {skillProgress,skillStudyKey,skillRecord} from './skill-tree-model';
import {normalizeJourney,journeyCareer,journeyMode,journeyRoute,journeySelection,suggestedSkill} from './skill-journey-model';
import {projectRoute} from './practice-project-model';
import './skill-tree.css';
import './skill-journey.css';
import './skill-tree-scene.css';
import './skill-learning.css';

const loadLocal=import.meta.env.VITE_AUTH_MODE==='server'?null:()=>import('./local-skill-tree');
const icons=['data','ai','security','ops','frontend','backend','engineering','check','software','briefcase'];
function readMemory(key){try{return normalizeJourney(JSON.parse(localStorage.getItem(key)));}catch{return normalizeJourney(null);}}

export default function SkillJourneyPage({state,url,move,link,live,workspace,update,onCheck,onGuide,precheck,owner='local'}){
  const language=useLanguage(),j=journeyCopy[language],t={...copy[language],passedHint:j.savedGrowth,viewGrowth:j.overviewResult,materials:j.materials};
  const storageKey='career-tree-journey-v1:'+owner;
  const [memory,setMemory]=useState(()=>readMemory(storageKey));
  const params=new URL(url,location.origin).searchParams;
  const career=journeyCareer(params,state,memory),saved=memory.views[career];
  const started=career&&Object.entries(state.skillStudy||{}).some(([key,row])=>key.startsWith(career+':')&&(row.read||row.draft?.trim()||row.assessment));
  const mode=journeyMode(params,saved||(started?{mode:'study'}:null));
  const request=useCatalog(live&&career?'/api/catalog/skill-trees/'+career:null);
  const [local,setLocal]=useState({career:null,tree:null,error:false}),[retry,setRetry]=useState(0);
  const label=value=>value[language==='en'?1:0];
  const remember=(id,view)=>setMemory(previous=>{
    const next={...previous,career:id,goalSeen:state.goal||null,views:{...previous.views,[id]:{...previous.views[id],...view}}};
    if(JSON.stringify(next)===JSON.stringify(previous))return previous;
    try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{}
    return next;
  });
  useEffect(()=>{
    if(!loadLocal||live||!career)return;
    let active=true;
    loadLocal().then(module=>{if(active)setLocal({career,tree:module.localSkillTree(career),error:false});})
      .catch(()=>{if(active)setLocal({career,tree:null,error:true});});
    return()=>{active=false;};
  },[career,live,retry]);
  const pick=id=>{
    const view=memory.views[id];
    remember(id,{mode:view?.mode||'overview'});
    move(journeyRoute(id,{...view,mode:view?.mode||'overview',from:params.get('from')}));
  };
  const result=live?request.data?.tree:local.tree,tree=result?.id===career?result:null;
  const failed=live?!!request.error:local.career===career&&local.error;
  const name=displayPublicText(careers.find(item=>item.id===career)?.name||'');
  return <section className="skill-map skill-journey skill-scene skill-depth skill-follow" data-i18n="off" aria-labelledby="skill-map-title" data-journey-mode={career?mode:'choose'}>
    <header className="skill-map-head journey-page-head">
      <div className="skill-map-heading"><h1 id="skill-map-title">{t.title}</h1>{career&&<span className="journey-direction">{name}</span>}</div>
      <div className="skill-map-actions">
        {career&&<button type="button" className="skill-control" onClick={()=>move('/career-map?view=choose')}>{j.changeCareer}</button>}
        <button type="button" className="skill-control" onClick={onGuide}><ProductIcon name="route" size={17}/>{t.guide}</button>
        {career&&params.get('from')==='report'&&link('/reports?career='+career+'#projects',language==='en'?'Return to career report':'返回职业报告')}
      </div>
    </header>
    {!career?<CareerChoice {...{j,memory,pick}} current={memory.career||state.goal}/>:tree?<JourneyBody key={tree.id+':'+tree.version}
      {...{tree,mode,saved,state,params,label,t,j,language,live,workspace,update,move,link,onCheck,precheck,remember}}
      careerName={name} onReload={live?request.retry:()=>setRetry(value=>value+1)}/>:failed?<div className="skill-load-state" role="alert">
        <p>{t.notReady}</p><button type="button" className="skill-control" onClick={live?request.retry:()=>setRetry(x=>x+1)}>{t.retry}</button>
      </div>:<p className="skill-load-state" role="status" data-page-reveal-pending="">{t.loading}</p>}
  </section>;
}

function CareerChoice({j,memory,pick,current}){
  return <div className="journey-choice" data-career-choice>
    <div className="journey-choice-intro"><span className="journey-eyebrow">{j.eyebrow}</span><h2>{j.chooseTitle}</h2><p>{j.chooseHint}</p>
      {current&&<button type="button" className="skill-control" onClick={()=>pick(current)}>{j.backCareer} · {displayPublicText(careers.find(item=>item.id===current)?.name)}</button>}
    </div>
    <div className="journey-career-grid">{careers.map((item,index)=><button type="button" key={item.id} className="journey-career-card"
      data-choose-career={item.id} onClick={()=>pick(item.id)}>
      <span className="journey-career-icon"><ProductIcon name={icons[index]} size={25}/></span><strong>{displayPublicText(item.name)}</strong>
      <span className="journey-career-task">{displayPublicText(item.task)}</span>
      <span className="journey-career-skills"><small>{j.growSkills}</small>{displayPublicText(item.branch)} · {displayPublicText(item.skill)}</span>
      <span className="journey-career-start">{memory.views[item.id]?.skill?j.resumeCareer:j.explore}</span>
    </button>)}</div>
  </div>;
}

function JourneyBody({tree,mode,saved,state,params,label,t,j,language,live,workspace,update,move,link,onCheck,onReload,precheck,remember,careerName}){
  const study=state.skillStudy,{branch,leaf,step}=journeySelection(tree,params,study,saved,mode);
  const scene=skillLearningScene(mode,step);
  const leaves=tree.branches.flatMap(item=>item.leaves),overall=skillProgress(tree.id,leaves,study);
  const progress=new Map(tree.branches.map(item=>[item.id,skillProgress(tree.id,item.leaves,study)]));
  const current=progress.get(branch.id),key=skillStudyKey(tree.id,leaf),record=skillRecord(study,tree.id,leaf);
  const suggestion=suggestedSkill(tree,study,saved);
  const treeView=useRef(null),heading=useRef(null),transitionRect=useRef(null),focusPending=useRef(false);
  const {recentGrowth,pendingGrowth,enqueueGrowth}=useTreeGrowth({tree,study,viewRef:treeView});
  const navigate=(item,picked,active='learn',nextMode='study')=>{
    const chosen=picked||suggestedSkill({...tree,branches:[item]},study).leaf;
    if(nextMode!==mode)transitionRect.current=treeView.current?.getBoundingClientRect();
    focusPending.current=nextMode==='study';
    remember(tree.id,{mode:nextMode,branch:item.id,skill:chosen.id,step:active});
    move(journeyRoute(tree.id,{branch:item.id,skill:chosen.id,step:active,mode:nextMode,from:params.get('from')}),false,{preserveScroll:nextMode==='study'});
  };
  const overview=()=>navigate(branch,leaf,step,'overview');
  useEffect(()=>{
    if(mode==='study')remember(tree.id,{mode,branch:branch.id,skill:leaf.id,step});
    else remember(tree.id,{mode});
  },[mode,branch.id,leaf.id,step]);
  useLayoutEffect(()=>{
    const before=transitionRect.current,element=treeView.current;
    transitionRect.current=null;
    if(before&&element&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      const after=element.getBoundingClientRect();
      element.animate([{transformOrigin:'top left',transform:`translate(${before.x-after.x}px,${before.y-after.y}px) scale(${before.width/after.width},${before.height/after.height})`},
        {transformOrigin:'top left',transform:'none'}],{duration:380,easing:'cubic-bezier(.2,.65,.3,1)'});
    }
    if(focusPending.current){heading.current?.scrollIntoView({block:'nearest'});heading.current?.focus({preventScroll:true});focusPending.current=false;}
  },[mode,branch.id,leaf.id,step]);
  const check=async payload=>{
    const alreadyPassed=!!record?.assessment?.passedAt;
    const grade=await onCheck(payload);
    if(grade.passed&&!alreadyPassed)enqueueGrowth(leaf.id);
    return grade;
  };
  const nextIndex=branch.leaves.indexOf(leaf);
  const next=[...branch.leaves.slice(nextIndex+1),...branch.leaves.slice(0,nextIndex),...leaves.filter(item=>!branch.leaves.includes(item))].find(item=>!skillRecord(study,tree.id,item)?.assessment?.passedAt);
  const status=record?.assessment?.passedAt?j.passed:step==='check'?j.checking:step==='practice'?j.practicing:readSkillWork(record?.draft).artifact.trim()?j.drafted:record?.read?j.read:j.reading;
  const plan=()=>{
    const source=journeyRoute(tree.id,{branch:branch.id,skill:leaf.id,step:'practice',mode:'study'});
    precheck(state.taskDraft?.source===source&&state.taskDraft.template==='external'?state.taskDraft:{title:leaf.title[0],career:tree.id,purpose:leaf.exercise[0],
      product:copy.zh.planOutput,association:state.goal===tree.id?'主计划':'独立探索',source});
  };
  const skillHeader=(<header className="skill-path-head scene-study-head" data-current-skill={leaf.id}>
          <div className="scene-skill-identity"><p className="scene-skill-context">{careerName}<span aria-hidden="true"> / </span>{label(branch.title)}</p>
            <h2 id="skill-path-title" tabIndex={-1} ref={heading}>{label(leaf.title)}</h2>
            {record?.assessment?.passedAt?<span className="skill-pass-tag"><ProductIcon name="check" size={14}/>{j.passed}</span>:
              (record?.read||record?.draft?.trim())&&<span className="scene-process-note">{status}</span>}
          </div>
          <div className="scene-branch-meta"><span>{current.done}/{current.total} {t.passed}</span>{scene==='lesson'&&<button type="button" className="scene-overview" onClick={overview}>{j.sceneOverview}</button>}</div>
        </header>);
  return <>
    {mode==='overview'&&<div className="journey-overview-intro">
      <div><span className="journey-eyebrow">{careerName}</span><h2>{j.overviewTitle}</h2><p>{overall.done===overall.total?j.allDone:j.overviewHint}</p></div>
      <div className="journey-next"><span>{suggestion.resume?j.resumeTitle:j.nextTitle}</span><strong>{label(suggestion.leaf.title)}</strong>
        <small>{label(suggestion.branch.title)}</small><button type="button" className="skill-control skill-primary" data-journey-start
          onClick={()=>navigate(suggestion.branch,suggestion.leaf,suggestion.step)}>{suggestion.resume?j.resume:j.start}</button></div>
    </div>}
    {mode==='study'&&scene==='assessment'&&skillHeader}
    <div className="journey-layout" data-mode={mode} data-flow={scene}>
      {scene!=='lesson'&&<aside className="journey-tree-dock" aria-label={t.treeLabel}>
        <BotanicalGrowthTree {...{tree,branch,leaf,careerName,study,progress,overall,label,t,recentGrowth,pendingGrowth}}
          focus={mode==='study'?'branch':'whole'} learning={mode==='study'} studyStep={step} onSelect={navigate} viewRef={treeView}>
          {mode==='study'?<div className="scene-tree-tools" aria-label={t.treeLabel}>
            <span className="scene-view-label"><ProductIcon name="learning" size={16}/>{j.learningView}</span>
            <button type="button" className="scene-overview" onClick={overview}><ProductIcon name="map" size={16}/>{j.sceneOverview}</button>
          </div>:<div className="journey-overview-branches" aria-label={j.chooseBranch}>
            {tree.branches.map(item=><button type="button" key={item.id} data-overview-branch={item.id} onClick={()=>navigate(item)}>
              <strong>{label(item.title)}</strong><span>{progress.get(item.id).done}/{item.leaves.length} {t.passed}</span>
            </button>)}
          </div>}
        </BotanicalGrowthTree>
        {mode==='overview'&&<details className="journey-growth-details"><summary>{j.aboutGrowth}</summary><p>{j.growthNote}</p><p>{t.sourceNote}</p><SkillSources sources={tree.frameworks}/></details>}
      </aside>}
      {mode==='study'&&<section className="skill-path journey-study-panel" id="skill-branch-path" aria-labelledby="skill-path-title" data-skill-path={branch.id}>
        {scene!=='assessment'&&skillHeader}
        <details className="scene-skill-index"><summary>{j.branchSkills}<ProductIcon name="chevronDown" size={14}/></summary>
        <p>{label(branch.purpose)}</p>
        <ol className="skill-path-steps" aria-label={t.routeNav} style={{'--skill-steps':branch.leaves.length}}>{branch.leaves.map((item,index)=>{
          const rec=skillRecord(study,tree.id,item),passed=!!rec?.assessment?.passedAt;
          return <li key={item.id} data-passed={passed}><button type="button" aria-current={item.id===leaf.id?'step':undefined} onClick={()=>navigate(branch,item)} data-path-leaf={item.id}>
            <span className="skill-path-number" aria-hidden="true">{passed?<ProductIcon name="check" size={16}/>:index+1}</span>
            <span className="skill-path-text"><strong>{label(item.title)}</strong><small>{passed?t.passed:rec?.draft?.trim()?t.drafted:rec?.read?t.read:t.untested}</small></span>
          </button></li>;
        })}</ol>
        </details>
        <SkillLearningPanel key={key} {...{tree,leaf,step,label,t,language,live,workspace,update,onReload,j}} record={record} studyKey={key}
          hideHeading headingId="skill-path-title"
          onStep={active=>navigate(branch,leaf,active)} onNext={next?()=>navigate(tree.branches.find(item=>item.leaves.includes(next)),next):null} onCheck={check} onPlan={plan}
          onConfirmedGrowth={()=>enqueueGrowth(leaf.id)} branchComplete={current.done===current.total}>
          <SkillSources sources={leaf.sources}/>{branch.project&&<div className="skill-related"><h4>{t.work}</h4>{link(projectRoute(branch.project),t.startWork)}</div>}
        </SkillLearningPanel>
      </section>}
    </div>
    <LegacyDrafts state={state} career={tree.id} precheck={precheck} language={language}/>
  </>;
}

function SkillSources({sources}){
  return <ul className="skill-source-list">{sources.map(source=><li key={source.url}><span>{source.publisher}{source.version&&' · '+source.version}</span>
    <a href={source.url} target="_blank" rel="noreferrer">{source.title}<ProductIcon name="external" size={14}/></a></li>)}</ul>;
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

