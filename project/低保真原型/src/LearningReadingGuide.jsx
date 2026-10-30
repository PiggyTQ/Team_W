import React,{useEffect,useState} from 'react';
export default function LearningReadingGuide({unit,open,expanded=false,description,pending=false}){
 const [isOpen,setIsOpen]=useState(expanded);
 useEffect(()=>{if(expanded)setIsOpen(true);},[expanded]);
 return <details className="learning-reading-disclosure" open={isOpen} onToggle={e=>setIsOpen(e.currentTarget.open)}>
  <summary>先修要求与章节目录</summary>
  <aside className="learning-reading-guide" aria-label={unit.title+'开始前先看'}>
   <div className="learning-reading-requirements"><h4>开始前先看</h4>{description&&<p>{description}</p>}<p>{pending?'资料待补充，先修要求尚未确认。':unit.prereq.replace(/\bAND\b/g,'且').replace(/\bOR\b/g,'或')}</p><small>{pending?"资料正在收集中，先修要求与课程内容尚待审核。":"教学内容 · 不代表企业实习或已验证能力"}</small></div>
   <div className="learning-reading-chapters"><h5>内容路径</h5><ol>{unit.chapters.map((chapter,index)=><li key={chapter}><button type="button" aria-label={'阅读'+unit.title+'：'+chapter} onClick={()=>open('reading',{template:unit.id,chapter:index})}><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span><span>{chapter}</span></button></li>)}</ol><small>{pending?"点选只查看待补充目录，不形成阅读或完成记录。":"点选章节直接阅读，不创建实践任务。"}</small></div>
  </aside>
 </details>;
}
