import React,{useId,useLayoutEffect,useEffect,useRef,useState} from 'react';
import ProductIcon from './ProductIcon';
import {sharedTreeCamera} from './skill-tree-camera';
import {readSkillWork} from './skill-learning-model';
import {skillStudyKey,skillRecord} from './skill-tree-model';
import {growthFrame as frame,growthArtSize as size,botanicalBoughs as boughs,growthPosition as position,waterRoute} from './skill-growth-geometry';
import treeArt from './assets/skill-tree/botanical-ground-tree.webp';
import bud from './assets/skill-tree/botanical-closed-bud.webp';
import leafPair from './assets/skill-tree/botanical-leaf-pair.webp';
import fan from './assets/skill-tree/ash-foliage-fan.webp';
import left from './assets/skill-tree/ash-foliage-left.webp';
import right from './assets/skill-tree/ash-foliage-right.webp';
import './botanical-growth-tree.css';
const viewBox=[frame.x,frame.y,frame.width,frame.height].join(' ');
const sprays={left:{src:left,stem:82},fan:{src:fan,stem:50},right:{src:right,stem:14}};

function BarkProgress({branches,points,overall,paintId,recentGrowth}) {
  return <svg className="skill-growth-veins" viewBox={viewBox} aria-hidden="true">
    <defs>
      <filter id={paintId+'-green'} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".72 .03 0 0 .008 .05 .87 .03 0 .015 .02 .03 .60 0 .005 0 0 0 1 0"/></filter>
      <filter id={paintId+'-soften'}><feGaussianBlur stdDeviation="5"/></filter>
      <mask id={paintId+'-bark'} maskUnits="userSpaceOnUse" x={frame.x} y={frame.y} width={frame.width} height={frame.height}>
        <g fill="none" stroke="white" strokeLinecap="round" filter={`url(#${paintId}-soften)`}>
          {points.filter(point=>point.grown).map(({terminal,pose})=><path key={terminal.id} d={pose.twig} strokeWidth="22" className="skill-twig-green" data-wake={recentGrowth?.skill===terminal.id}/>)}
          {branches.map(({item,art,stats,complete})=><g key={item.id} data-branch-connector={item.id} data-progress={stats.percent}>
            {complete&&<path d={art.main} pathLength="100" strokeWidth="54" className="skill-bough-green" data-wake={recentGrowth?.full&&recentGrowth.branch===item.id}/>}
          </g>)}
        </g>
      </mask>
    </defs>
    <image href={treeArt} {...size} filter={`url(#${paintId}-green)`} mask={`url(#${paintId}-bark)`}/>
    <g className="skill-growth-rings" transform="translate(863 785) rotate(-8)">
      {Array.from({length:overall.total},(_,i)=><ellipse key={i} rx={7+(i+1)/overall.total*48} ry={4+(i+1)/overall.total*25}
        data-growth-ring={i+1} data-grown={i<overall.done} data-highlighted={!!recentGrowth&&i===overall.done-1}/>)}
    </g>
  </svg>;
}

function WaterPulse({event,paintId}) {
  if(!event)return null;
  const d=waterRoute(event.bough,event.index);
  return <svg key={event.serial} className="skill-water-feedback" viewBox={viewBox} aria-hidden="true"
    data-growth-event={event.skill} data-growth-kind={event.full?'branch':'single'} data-growth-phase={event.phase}>
    <defs><filter id={paintId+'-water-glow'} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>
    <g className="skill-water-ripple" transform="translate(555 866)"><ellipse rx="30" ry="8"/><ellipse rx="30" ry="8"/></g>
    <path {...{d}} pathLength="100" className="skill-water-line skill-water-halo" filter={`url(#${paintId}-water-glow)`}/>
    <path {...{d}} pathLength="100" className="skill-water-line skill-water-tail"/>
    <path {...{d}} pathLength="100" className="skill-water-line skill-water-head"/>
  </svg>;
}

function GroundShoots({percent}) {
  return <svg className="skill-ground-shoots" viewBox={viewBox} aria-hidden="true">{Array.from({length:26},(_,i)=><g key={i}
    transform={`translate(${390+(i*127%897)} ${849+(i*23%47)})`} data-ground-grown={percent>=(i+1)/26*100}>
    <path d="M0 0 Q-2 -9 -10 -15 M0 0 Q2 -13 7 -20 M0 0 Q7 -8 15 -10"/>
    <path className="skill-ground-moss" d="M-8 1 Q-4 -4 1 -2 Q5 -5 11 0"/>
  </g>)}</svg>;
}

function Foliage({pose,skill,animate,cluster,index=0,leafSize=115}) {
  const spray=cluster?sprays[pose.kind]:null,width=cluster?pose.size:leafSize;
  return <div className={'skill-growth-shoot '+(cluster?'skill-branch-cluster':'skill-leaf-pair')}
    style={{...position(pose.point),width:(width/frame.width*100)+'%','--stem-x':(cluster?spray.stem:48)+'%',
      '--stem-y':cluster?'98%':'83%','--sprig-tilt':pose.tilt+'deg','--cluster-delay':(980+index*65)+'ms'}}>
    <img className="skill-sprout" src={cluster?spray.src:leafPair} alt="" data-growth-leaf={skill}
      data-unfurl={animate&&!cluster} data-expand={animate&&cluster} draggable={false}/>
  </div>;
}

function BranchControl({item,art,stats,branch,paintId,label,t,onSelect,disabled=false}) {
  const [x,y,turn,length]=art.hit,p=position([x,y]),title=label(item.title),id=paintId+'-'+item.id;
  return <li className="skill-growth-branch" style={{'--branch-x':p.left,'--branch-y':p.top,'--branch-angle':turn+'deg','--branch-span':(length/frame.width*100)+'%'}}>
    <button type="button" className="skill-branch-node" aria-pressed={item.id===branch.id} data-skill-branch={item.id}
      data-complete={stats.done===stats.total} aria-controls="skill-branch-path" aria-label={title+' · '+stats.done+'/'+stats.total+' '+t.passed}
      tabIndex={disabled?-1:0} onClick={()=>onSelect(item,null)}><span>{title}</span><span className="skill-branch-count">{stats.done}/{stats.total}</span></button>
    <svg className="skill-branch-lettering" viewBox={viewBox} aria-hidden="true"><defs><path id={id} d={art.label}/></defs>
      <text textAnchor="middle" dominantBaseline="central" data-long={title.length>=20} data-size={title.length>31?'extended':'regular'}>
        <textPath href={'#'+id} startOffset="50%">{title}</textPath>
      </text>
    </svg>
  </li>;
}

export default function BotanicalGrowthTree({tree,branch,leaf,careerName,study,progress,overall,label,t,onSelect,viewRef,recentGrowth,pendingGrowth=[],children,focus='whole',learning=false,studyStep='learn'}) {
  const viewport=useRef(null),[box,setBox]=useState({width:1,height:1}),[wide,setWide]=useState(false);
  useLayoutEffect(()=>{
    if(!viewport.current)return;
    const initial=viewport.current.getBoundingClientRect();setBox({width:initial.width,height:initial.height});
    const observer=new ResizeObserver(([entry])=>setBox({width:entry.contentRect.width,height:entry.contentRect.height}));
    observer.observe(viewport.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>setWide(false),[branch.id,leaf.id]);
  useEffect(()=>{
    if(!recentGrowth?.full)return;
    const timer=setTimeout(()=>setWide(true),900);return()=>clearTimeout(timer);
  },[recentGrowth?.serial]);
  const branchIndex=tree.branches.findIndex(item=>item.id===branch.id);
  const activeFocus=recentGrowth?'branch':focus;
  const completed=progress.get(branch.id).done===branch.leaves.length&&!pendingGrowth.some(item=>item.branch===branch.id)&&!recentGrowth;
  const camera=sharedTreeCamera(box,{learning,focus:activeFocus,branch:branchIndex,wide:wide||completed});
  const cameraStyle={'--camera-scale':camera.scale,'--camera-x':camera.x+'px','--camera-y':camera.y+'px','--scene-bleed':camera.bleed+'px'};
  const paintId=useId(),held=new Set(pendingGrowth.map(item=>item.skill));
  const branches=tree.branches.map((item,i)=>({item,art:boughs[i],stats:progress.get(item.id),
    complete:progress.get(item.id).done===item.leaves.length&&!item.leaves.some(node=>held.has(node.id))}));
  const points=branches.flatMap(({item,art},bough)=>item.leaves.map((terminal,index)=>{
    const done=!!skillRecord(study,tree.id,terminal)?.assessment?.passedAt;
    return {item,terminal,pose:art.forks[index],done,grown:done&&!held.has(terminal.id),bough,index};
  }));
  return <section className="skill-tree-board" data-botanical-tree="true" data-tree-career={tree.id} data-tree-focus={activeFocus} data-learning-tree={learning} aria-label={t.treeLabel} ref={viewRef}>
    <div className="skill-tree-viewport" ref={viewport}><div className="skill-tree-camera" style={cameraStyle}>
    <div className="skill-growth-map"><div className="skill-growth-stage">
      <img className="skill-ash-tree" src={treeArt} alt="" {...size} draggable={false} fetchPriority="high"
        style={{...position([0,0]),width:(size.width/frame.width*100)+'%',height:(size.height/frame.height*100)+'%'}}/>
      <GroundShoots percent={overall.percent}/><BarkProgress {...{branches,points,overall,paintId,recentGrowth}}/>
      <WaterPulse event={recentGrowth} paintId={paintId}/>
      <div className="skill-growth-canopy" aria-hidden="true">
        {branches.filter(({complete})=>complete).flatMap(({item,art})=>art.clusters.map((pose,index)=><Foliage key={item.id+'-'+index}
          {...{pose,index}} cluster animate={recentGrowth?.full&&recentGrowth.branch===item.id}/>))}
        {points.filter(p=>p.grown).map(({terminal,pose})=><Foliage key={terminal.id} {...{pose}} skill={terminal.id} leafSize={learning?130:115} animate={recentGrowth?.skill===terminal.id}/>)}
      </div>
      <ul className="skill-growth-buds" aria-label={t.skills}>{points.map(({item,terminal,pose,done,grown})=>{
        const selected=terminal.id===leaf.id,title=label(terminal.title);
        const record=skillRecord(study,tree.id,terminal);
        return <li key={terminal.id} className="skill-growth-bud" data-active-branch={item.id===branch.id} data-current={selected}
          data-learning-state={done?'passed':selected?studyStep:readSkillWork(record?.draft).artifact.trim()?'practice':record?.read?'read':'idle'}
          data-passed={done} data-label-side={pose.point[0]>size.width/2?'left':'right'} style={position(pose.point)}>
          <button type="button" className="skill-leaf-node" data-skill-leaf={terminal.id}
            aria-label={label(item.title)+' · '+title+' · '+(done?t.passed:readSkillWork(record?.draft).artifact.trim()?t.drafted:record?.read?t.read:t.untested)} aria-current={selected?'true':undefined}
            tabIndex={0}
            onClick={()=>onSelect(item,terminal,'learn')}>
            {grown&&<span className="skill-sprout-check" data-appearing={recentGrowth?.skill===terminal.id} aria-hidden="true"><ProductIcon name="check" size={11} accent={false}/></span>}
            {(!grown||recentGrowth?.skill===terminal.id)&&<img className="skill-closed-bud" src={bud} alt="" draggable={false}
              data-opening={recentGrowth?.skill===terminal.id} style={{'--bud-angle':pose.tilt+'deg'}}/>}
          </button><span className="skill-bud-label" aria-hidden="true">{title}</span>
        </li>;
      })}</ul>
      <div className="skill-root-title" style={position([845,699])}><h2>{careerName}</h2></div>
    </div>
    <ul className="skill-growth-branches" aria-label={t.route}>{branches.map(({item,art,stats})=><BranchControl key={item.id} {...{item,art,stats,branch,paintId,label,t,onSelect}} disabled={learning}/>)}</ul>
    </div></div></div>
    <div className="skill-root"><span>{t.passed} <strong>{overall.done}/{overall.total}</strong></span></div>{children}
  </section>;
}
