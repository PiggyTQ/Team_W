import React,{useEffect,useRef,useState} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import './outcome-showcase.css';
import {CheeseMascot} from './HomeSceneDesign';
import OutcomeArtwork from './OutcomeArtwork';

gsap.registerPlugin(ScrollTrigger);
const chapters=[
 {label:'方向与依据',title:['看清工作，','找到自己的切入点。'],text:'比较方向，把已有经历放到具体要求旁。缺少的材料与尚未明确的部分，也一起留下。',inputs:['数据分析','AI 应用','SQL 课程项目'],question:'我更想解决哪一类问题？',result:'职业探索记录',rows:[['先探索','数据分析：整理与解释数据'],['已有材料','SQL 查询与课程项目自述'],['待验证','数据质量处理与独立分析范围']],note:'方向比较 + 经历记录 + 差距清单',step:0},
 {label:'有限实践',title:['从一个疑问，','到这周能做的事。'],text:'把缺口变成一次小范围尝试。先划清投入与交付边界，再决定是否继续。',inputs:['待验证的问题','每周可用 3 小时','问题清单与处理理由'],question:'用一次小实践，验证数据质量处理。',result:'本周实践安排',rows:[['预计投入','实践 2 小时，预留 1 小时'],['留下产物','问题清单、处理理由与局限'],['检查边界','本人贡献与尚未验证的部分']],note:'合成预算 · 预计投入不代表掌握程度',step:3},
 {label:'报告表达',title:['让每次探索，','都有可以回看的记录。'],text:'把选择、行动与变化连接起来。形成有依据的报告，为下一次调整和求职表达提供材料。',inputs:['选择与理由','实践产物与本人贡献','复盘与未知'],question:'我的选择，如何由行动与材料支持？',result:'阶段职业规划报告',rows:[['选择','先探索数据分析，保留 AI 应用备选'],['行动','一次小范围实践与本人贡献记录'],['下一步','补充表达与验证，继续调整计划']],note:'报告预览 · 不编造经历或能力结论',step:4}
];

function Scene({chapter,index,open}){
 return <div className="os-scene" data-os-scene={index}>
  <div className="os-blueprint" aria-hidden="true">
   <div className="os-diagram-label">0{index+1} / {chapter.label}</div>
   <OutcomeArtwork index={index}/><CheeseMascot pose={index===0?0:index===1?2:3} className="os-mascot"/>
   <div className="os-diagram-note">{chapter.note}</div>
  </div>
  <div className="os-finished">
   <header><span>小林的探索 / 合成示例</span><span>0{index+1} — 03</span></header>
   <div className="os-document"><span className="os-document-label">留下的记录</span><h3>{chapter.result}</h3><div className="os-document-rows">{chapter.rows.map(([label,value])=><div key={label}><span>{label}</span><p>{value}</p></div>)}</div></div>
   <footer><span>{chapter.note}</span><button onClick={()=>open('example',{step:chapter.step})}>打开完整示例 ↗</button></footer>
  </div>
 </div>;
}

export default function OutcomeShowcase({open}){
 const host=useRef(null),frame=useRef(null),trigger=useRef(null),active=useRef(0);
 const [chapter,setChapter]=useState(0),[pinned,setPinned]=useState(false);
 useEffect(()=>{
  const media=gsap.matchMedia();
  media.add('(min-width: 1024px) and (min-height: 680px) and (prefers-reduced-motion: no-preference)',()=>{
   // Pin measurement must use the desktop stage, before React commits the mode.
   host.current.dataset.osMode='scroll';
   setPinned(true);
   const scenes=[...host.current.querySelectorAll('[data-os-scene]')];
   const update=self=>{
    const value=Math.min(2.99999,self.progress*3),index=Math.floor(value),local=value-index;
    frame.current.style.setProperty('--chapter-progress',local);
    scenes.forEach((scene,i)=>{
     scene.style.setProperty('--draw',Math.max(0,1-local/0.42));
     scene.style.setProperty('--assemble',Math.min(1,Math.max(0,(local-0.12)/0.36)));
     // Reserve a separate illustration column before revealing the whole page.
     scene.style.setProperty('--handoff',Math.min(1,Math.max(0,(local-0.38)/0.2)));
     scene.style.setProperty('--reveal',Math.min(1,Math.max(0,(local-0.6)/0.28)));
     scene.inert=i!==index||local<0.88;
    });
    if(active.current!==index){active.current=index;setChapter(index);}
   };
   const st=ScrollTrigger.create({id:'home-outcomes',trigger:host.current,start:'top top',end:()=>'+='+window.innerHeight*2.7,pin:frame.current,pinSpacing:true,invalidateOnRefresh:true,onUpdate:update,onRefresh:update});
   trigger.current=st;update(st);
   return()=>{trigger.current=null;st.kill();scenes.forEach(scene=>{scene.inert=false;scene.removeAttribute('style');});setPinned(false);};
  });
  return()=>media.revert();
 },[]);
 const seek=(index,progress=0.06)=>{
  index=Math.max(0,Math.min(2,index));const st=trigger.current;
  if(st){window.scrollTo({top:st.start+(st.end-st.start)*(index+progress)/3,behavior:'instant'});ScrollTrigger.update();}
  else host.current.querySelector(`[data-os-scene="${index}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
 };
 const current=chapters[chapter];
 return <section id="outcomes" className="outcome-showcase" ref={host} data-os-mode={pinned?'scroll':'list'} aria-labelledby="outcomes-title">
  <div className="showcase-frame" ref={frame} data-chapter={chapter}>
   <header className="showcase-heading"><h2 id="outcomes-title">从一个方向，到一份有依据的成果。</h2><span>合成案例 · 非本人结果</span></header>
   <div className="os-layout">
    <aside className="os-copy"><div className="os-count"><span>0{chapter+1}</span><span>/03</span></div>
     <div className="os-copy-body" key={chapter}><span className="os-eyebrow">职业探索 / {current.label}</span><h3>{current.title.map(line=><span key={line}>{line}</span>)}</h3><p>{current.text}</p><button className="os-reveal" onClick={()=>seek(chapter,0.95)}>查看这一幕的记录 <span>→</span></button></div>
     <nav className="os-phases" aria-label="演示过程">{['线索','组织','记录'].map((label,i)=><button key={label} onClick={()=>seek(chapter,[0.12,0.43,0.95][i])}><i style={{'--phase':i}}/><small>0{i+1}</small>{label}</button>)}</nav>
    </aside>
    <div className="os-stage" tabIndex={0} role="region" aria-label="三幕成果演示，左右方向键切换主题" onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();seek(chapter+(e.key==='ArrowRight'?1:-1));}}}>
     {chapters.map((c,i)=><Scene key={c.label} chapter={c} index={i} open={open}/>) }
    </div>
   </div>
   <footer className="os-footer"><nav aria-label="成果主题">{chapters.map((c,i)=><button key={c.label} aria-current={chapter===i?'step':undefined} onClick={()=>seek(i)}><small>0{i+1}</small>{c.label}</button>)}</nav><a href="#starting-points">继续了解功能 ↓</a></footer>
  </div>
 </section>;
}
