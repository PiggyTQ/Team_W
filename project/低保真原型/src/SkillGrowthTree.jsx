import React, {useId} from 'react';
import ProductIcon from './ProductIcon';
import {skillStudyKey} from './skill-tree-model';
import treeArt from './assets/skill-tree/ash-tree.webp';
import pearl from './assets/skill-tree/water-pearl.webp';
import bud from './assets/skill-tree/ash-bud.webp';
import fan from './assets/skill-tree/ash-foliage-fan.webp';
import left from './assets/skill-tree/ash-foliage-left.webp';
import right from './assets/skill-tree/ash-foliage-right.webp';
import canopyLeft from './assets/skill-tree/ash-canopy-left.webp';
import canopyRight from './assets/skill-tree/ash-canopy-right.webp';
import canopyHigh from './assets/skill-tree/ash-canopy-high.webp';
import canopyWide from './assets/skill-tree/ash-canopy-wide.webp';
import './skill-growth-tree.css';

const frame = {x:-100,y:-104,width:1835,height:1074};
const viewBox = [frame.x,frame.y,frame.width,frame.height].join(' ');
const treeSize = {width:1635,height:962};
const sprays = {
  left:{src:left,stem:82},
  fan:{src:fan,stem:50},
  right:{src:right,stem:14},
  canopyLeft:{src:canopyLeft,stem:90},
  canopyRight:{src:canopyRight,stem:13},
  canopyHigh:{src:canopyHigh,stem:52},
  canopyWide:{src:canopyWide,stem:46}
};

// Coordinates follow the wood grain and forks of the dormant tree artwork.
const boughs = [
  {
    label:'M376 640 C451 620 491 582 549 588 S641 604 695 647',
    hit:[536,606,-4,294],
    grain:'M772 733 C714 659 660 609 562 592 C461 569 428 652 337 624 C265 603 227 564 167 552 C120 529 107 505 89 470',
    forks:[
      {point:[397,485],spray:'fan',size:130,tilt:-24},
      {point:[224,407],spray:'fan',size:180,tilt:-7},
      {point:[78,547],spray:'left',size:164,tilt:-12},
      {point:[325,688],spray:'left',size:132,tilt:-38}
    ],
    canopy:[
      {point:[130,407],spray:'canopyLeft',size:224,tilt:-15},
      {point:[307,450],spray:'canopyWide',size:276,tilt:-10}
    ]
  },
  {
    label:'M405 374 C444 423 496 438 552 434 S643 447 692 496',
    hit:[552,431,10,283],
    grain:'M753 656 C716 550 704 461 603 445 C521 432 469 453 415 387 C366 325 370 284 302 278 C257 255 260 232 275 201',
    forks:[
      {point:[588,231],spray:'right',size:190,tilt:0},
      {point:[436,113],spray:'fan',size:174,tilt:-7},
      {point:[172,233],spray:'left',size:179,tilt:-5},
      {point:[275,160],spray:'fan',size:135,tilt:6}
    ],
    canopy:[
      {point:[351,158],spray:'canopyLeft',size:275,tilt:0},
      {point:[517,201],spray:'canopyHigh',size:206,tilt:13},
      {point:[212,321],spray:'canopyLeft',size:170,tilt:-31}
    ]
  },
  {
    label:'M831 502 C901 474 919 396 966 378 S1064 340 1133 280',
    hit:[984,376,-33,295],
    grain:'M771 666 C774 543 834 489 892 461 C950 421 954 380 1028 350 C1096 323 1101 280 1172 240 C1237 196 1320 215 1396 144',
    forks:[
      {point:[886,213],spray:'fan',size:171,tilt:-12},
      {point:[1033,64],spray:'left',size:139,tilt:-4},
      {point:[1450,140],spray:'right',size:184,tilt:5},
      {point:[1354,294],spray:'right',size:140,tilt:3}
    ],
    canopy:[
      {point:[1241,79],spray:'canopyHigh',size:174,tilt:4},
      {point:[1371,117],spray:'canopyRight',size:281,tilt:9},
      {point:[1265,325],spray:'canopyWide',size:258,tilt:-6}
    ]
  },
  {
    label:'M900 636 C958 592 1002 588 1052 594 S1144 624 1207 638',
    hit:[1053,601,4,292],
    grain:'M784 774 C823 704 872 654 928 627 C1012 570 1079 597 1142 618 C1230 650 1295 605 1343 568 C1418 527 1461 511 1512 486',
    forks:[
      {point:[1224,526],spray:'left',size:157,tilt:4},
      {point:[1340,429],spray:'fan',size:171,tilt:-4},
      {point:[1515,456],spray:'right',size:169,tilt:7},
      {point:[1556,638],spray:'right',size:149,tilt:22}
    ],
    canopy:[
      {point:[1426,408],spray:'canopyRight',size:250,tilt:8},
      {point:[1425,520],spray:'canopyWide',size:290,tilt:2}
    ]
  }
];

function position([x,y]) {
  return {
    left:((x - frame.x) / frame.width * 100) + '%',
    top:((y - frame.y) / frame.height * 100) + '%'
  };
}

function GrowthRings({done,total,highlight}) {
  return <g className="skill-growth-rings" transform="translate(789 849)">
    {Array.from({length:total},(_,index) => {
      const radius = (index + 1) / total;
      const x = 4 + radius * 43;
      const y = 2 + radius * 19;
      return <path key={index} d={`M${-x} 0 C${-x * .98} ${-y * .58} ${-x * .46} ${-y * 1.04} 0 ${-y}
        C${x * .49} ${-y * .96} ${x} ${-y * .56} ${x} 0
        C${x} ${y * .57} ${x * .49} ${y} 0 ${y}
        C${-x * .56} ${y} ${-x * 1.02} ${y * .56} ${-x} 0Z`}
        data-growth-ring={index + 1} data-grown={index < done}
        data-highlighted={highlight && index === done - 1}/>;
    })}
  </g>;
}

function BarkProgress({branches,overall,paintId,recentGrowth}) {
  return <svg className="skill-growth-veins" viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <filter id={paintId + '-grain'} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values=".97 .045 0 0 .012  .045 .94 0 0 .004  .025 .04 .865 0 .005  0 0 0 1 0"/>
      </filter>
      <filter id={paintId + '-soften'} filterUnits="userSpaceOnUse" x={frame.x} y={frame.y} width={frame.width} height={frame.height}>
        <feGaussianBlur stdDeviation="27"/>
      </filter>
      <mask id={paintId + '-bark'} maskUnits="userSpaceOnUse" x={frame.x} y={frame.y} width={frame.width} height={frame.height}>
        <g filter={`url(#${paintId}-soften)`} fill="none" stroke="white" strokeLinecap="round" strokeDasharray="100 100">
          <path d="M785 897 C737 820 811 707 764 609" pathLength="100" strokeWidth="190"
            strokeDashoffset={100 - overall.percent} visibility={overall.done ? 'visible' : 'hidden'}/>
          {branches.map(({item,art,stats}) => <g key={item.id} data-branch-connector={item.id} data-progress={stats.percent}>
            <path d={art.grain} pathLength="100" strokeWidth="134" strokeDashoffset={100 - stats.percent}
              visibility={stats.done ? 'visible' : 'hidden'}/>
          </g>)}
        </g>
      </mask>
    </defs>
    {overall.done > 0 && <image href={treeArt} {...treeSize} filter={`url(#${paintId}-grain)`}
      mask={`url(#${paintId}-bark)`} preserveAspectRatio="none"/>}
    <GrowthRings {...overall} highlight={!!recentGrowth}/>
  </svg>;
}

function Foliage({pose,skill,animate,expand}) {
  const spray = sprays[pose.spray];
  return <div className="skill-growth-shoot" style={{...position(pose.point),
    width:(pose.size / frame.width * 100) + '%',
    '--stem-x':spray.stem + '%','--sprig-tilt':pose.tilt + 'deg'}}>
    {animate && <>
      <img className="skill-watering-pearl" src={pearl} alt="" data-watered={animate} draggable={false}/>
      <img className="skill-new-bud" src={bud} alt="" data-opening={animate} draggable={false}/>
    </>}
    <img className="skill-sprout" src={spray.src} alt="" data-growth-leaf={skill}
      data-unfurl={animate} data-expand={expand} draggable={false}/>
  </div>;
}

function BranchControl({item,art,stats,branch,paintId,label,t,onSelect}) {
  const [x,y,turn,length] = art.hit;
  const point = position([x,y]);
  const title = label(item.title);
  const pathId = paintId + '-' + item.id;
  const letteringSize = title.length > 31 ? 'extended' : 'regular';
  return <li className="skill-growth-branch" style={{
    '--branch-x':point.left,'--branch-y':point.top,
    '--branch-angle':turn + 'deg','--branch-span':(length / frame.width * 100) + '%'
  }}>
    <button type="button" className="skill-branch-node" aria-pressed={item.id === branch.id}
      data-skill-branch={item.id} data-complete={stats.done === stats.total} aria-controls="skill-branch-path"
      aria-label={title + ' · ' + stats.done + '/' + stats.total + ' ' + t.passed} onClick={() => onSelect(item,null)}>
      <span>{title}</span><span className="skill-branch-count">{stats.done}/{stats.total}</span>
    </button>
    <svg className="skill-branch-lettering" viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
      <defs><path id={pathId} d={art.label}/></defs>
      <text textAnchor="middle" dominantBaseline="central" data-long={title.length >= 20} data-size={letteringSize}>
        <textPath href={'#' + pathId} startOffset="50%">{title}</textPath>
      </text>
    </svg>
  </li>;
}

export default function SkillGrowthTree({tree,branch,leaf,careerName,study,progress,overall,
    label,t,onSelect,viewRef,recentGrowth,children}) {
  const paintId = useId();
  const branches = tree.branches.map((item,index) => ({item,art:boughs[index],stats:progress.get(item.id)}));
  const points = branches.flatMap(({item,art}) => item.leaves.map((terminal,index) => {
    const record = study?.[skillStudyKey(tree.id, terminal)];
    return {item,terminal,pose:art.forks[index],done:!!record?.assessment?.passedAt};
  }));
  const growingBranch = points.find(({terminal}) => terminal.id === recentGrowth)?.item.id;

  return <section className="skill-tree-board" aria-label={t.treeLabel} aria-describedby="skill-tree-help" ref={viewRef}>
    <div className="skill-growth-map">
      <div className="skill-growth-stage">
        <img className="skill-ash-tree" src={treeArt} alt="" {...treeSize} draggable={false} fetchPriority="high"
          style={{...position([0,0]),width:(treeSize.width / frame.width * 100) + '%',height:(treeSize.height / frame.height * 100) + '%'}}/>
        <BarkProgress {...{branches,overall,paintId,recentGrowth}}/>
        <div className="skill-growth-canopy" aria-hidden="true">
          {branches.filter(({stats}) => stats.done === stats.total).flatMap(({item,art}) =>
            art.canopy.map((pose,index) => <Foliage key={item.id + '-' + index} pose={pose} expand={growingBranch === item.id}/>))}
          {points.filter(point => point.done).map(({terminal,pose}) =>
            <Foliage key={terminal.id} pose={pose} skill={terminal.id} animate={recentGrowth === terminal.id}/>)}
        </div>
        <ul className="skill-growth-buds" aria-label={t.skills}>
          {points.map(({item,terminal,pose,done}) => {
            const selected = terminal.id === leaf.id;
            const title = label(terminal.title);
            return <li key={terminal.id} className="skill-growth-bud" data-active-branch={item.id === branch.id}
              data-current={selected} data-passed={done} data-label-side={pose.point[0] > treeSize.width / 2 ? 'left' : 'right'}
              style={position(pose.point)}>
              <button type="button" className="skill-leaf-node" data-skill-leaf={terminal.id}
                aria-label={label(item.title) + ' · ' + title + ' · ' + (done ? t.passed : t.untested)}
                aria-current={selected ? 'true' : undefined} onClick={() => onSelect(item,terminal,'learn',true)}>
                {done ? <span className="skill-sprout-check" aria-hidden="true"><ProductIcon name="check" size={11} accent={false}/></span>
                  : <img className="skill-water-pearl" src={pearl} alt="" draggable={false}/>}
              </button>
              <span className="skill-bud-label" aria-hidden="true">{title}</span>
            </li>;
          })}
        </ul>
      </div>
      <div className="skill-root">
        <h2>{careerName}</h2>
        <span>{t.passed} <strong>{overall.done}/{overall.total}</strong></span>
      </div>
      <ul className="skill-growth-branches" aria-label={t.route}>
        {branches.map(({item,art,stats}) => <BranchControl key={item.id} {...{item,art,stats,branch,paintId,label,t,onSelect}}/>)}
      </ul>
    </div>
    {children}
  </section>;
}
