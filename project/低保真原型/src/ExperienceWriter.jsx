import React,{useState} from 'react';
import SkillPicker from './SkillPicker';
import {displayText} from './i18n/render';
import {experienceTypes,experienceGuide,experienceStorySteps,experienceStory,normalizeExperienceDraft,patchExperienceDraft,switchExperienceMode,experienceText,experienceErrors,experienceCandidate} from './experience-writing-model';

export default function ExperienceWriter({draft,change,save,importFile}){
 const d=normalizeExperienceDraft(draft),guide=experienceGuide(d.type),story=experienceStory(d),step=experienceStorySteps.findIndex(x=>x.key===d.storyStep),[errors,setErrors]=useState([]),[lenses,setLenses]=useState({}),[storyOpen,setStoryOpen]=useState(()=>typeof window==='undefined'||window.matchMedia('(min-width:901px)').matches),text=experienceText(d);
 const patch=values=>{change(patchExperienceDraft(d,values));setErrors([]);},errorFor=id=>errors.find(e=>e.id===id);
 const message=id=>errorFor(id)&&<span className="experience-field-error" id={id+'-error'}>{errorFor(id).message}</span>;
 const fieldProps=id=>({'aria-invalid':!!errorFor(id),'aria-describedby':id+'-hint'+(errorFor(id)?' '+id+'-error':'')});
 const focus=id=>requestAnimationFrame(()=>document.getElementById(id)?.focus());
 const jump=key=>{patch({storyStep:key});focus('experience-'+key);};
 const submit=e=>{e.preventDefault();const next=experienceErrors(d);setErrors(next);if(next.length){if(d.entryMode==='guided'){const key=next[0].id==='experience-action'?'action':next[0].id==='experience-title'?'outcome':d.storyStep;change(patchExperienceDraft(d,{storyStep:key}));}focus(next[0].id);return;}save(experienceCandidate(d));};
  const advance=()=>{if(d.storyStep==='action'&&!d.guidedParts.action.trim()){setErrors([{id:'experience-action',message:'请填写实际内容与行动。'}]);focus('experience-action');return;}jump(experienceStorySteps[step+1].key);};
 return <section className="experience-writer" aria-labelledby="experience-writer-title">
   <header><div><h2 id="experience-writer-title">添加经历</h2><p>填写经历背景、具体行动和结果，保存后逐项核对。</p></div><button type="button" onClick={importFile}>导入文件（模拟解析）</button></header>
  <form id="resume-material-form" onSubmit={submit} noValidate>
    <div className="experience-entry-bar"><div role="group" aria-label="经历填写方式">{[['guided','分步填写'],['raw','粘贴原文']].map(([id,label])=><button type="button" key={id} aria-pressed={d.entryMode===id} onClick={()=>{change(switchExperienceMode(d,id));setErrors([]);}}>{label}</button>)}</div><p>两种方式分别保留草稿，保存当前显示的内容。</p></div>
   <div className="experience-writing-layout">
    <div className="experience-inputs">
      <label className="field experience-scene"><span>经历类型</span><select id="experience-kind" aria-label="经历类型" value={d.type} {...fieldProps('experience-kind')} onChange={e=>patch({type:e.target.value,skill:'未知'})}>{experienceTypes.map(type=><option key={type}>{type}</option>)}</select><small id="experience-kind-hint">根据经历类型显示填写提示，切换类型会保留已填内容。</small>{message('experience-kind')}</label>
     {d.entryMode==='guided'?<>
       <nav className="experience-story-nav" aria-label="经历填写步骤">{story.map((part,i)=><button type="button" key={part.key} aria-current={d.storyStep===part.key?'step':undefined} onClick={()=>jump(part.key)}><span className={'experience-story-node'+(part.text?' has-text':'')} aria-hidden="true">{part.text?<svg viewBox="0 0 16 16"><path d="m3 8 3 3 7-7"/></svg>:i+1}</span><span>{part.label}</span><small>{part.text?'已填写':i===1?'未填写（必填）':'未填写（选填）'}</small></button>)}</nav>
      <div className="experience-questions">{story.map((part,index)=>{const lens=lenses[part.key]??0;return <section className="experience-question" hidden={d.storyStep!==part.key} key={part.key} aria-label={part.field}>
       <label className="field"><span className="experience-question-title">{guide[part.key]}</span><small id={'experience-'+part.key+'-hint'}>{part.field}</small><textarea id={'experience-'+part.key} aria-label={displayText(part.field)} rows={4} required={part.key==='action'} value={d.guidedParts[part.key]} {...fieldProps('experience-'+part.key)} onChange={e=>patch({guidedParts:{[part.key]:e.target.value}})}/>{message('experience-'+part.key)}</label>
        <div className="experience-recall"><p>填写提示</p><div role="group" aria-label="选择填写提示">{part.lenses.map(([label],i)=><button type="button" key={label} aria-pressed={i===lens} onClick={()=>setLenses(x=>({...x,[part.key]:i}))}>{label}</button>)}</div><p className="experience-recall-hint" aria-live="polite">{part.lenses[lens][1]}</p></div>
        <details className="experience-inline-example"><summary>查看填写示例</summary><p>{guide.example[index]}</p><small>虚构示例，仅供参考，不会填入你的记录。</small></details>
      </section>;})}</div>
       <div className="experience-step-actions">{step>0&&<button type="button" onClick={()=>jump(experienceStorySteps[step-1].key)}>上一步</button>}{step<2?<button className="primary" type="button" onClick={advance}>{step===0?'下一步：填写具体行动 →':'下一步：填写结果与进展 →'}</button>:<p>结果与进展为选填；未完成时可记录当前进展。</p>}</div>
     </>:<label className="field experience-raw"><span>原文 / 实际经历（必填）</span><small id="experience-raw-hint">已有项目说明、工作笔记或简历原文，可以直接粘贴；先保留自己的说法。</small><textarea id="experience-raw" name="experience" aria-label={displayText('原文 / 实际经历（必填）')} rows={9} required value={d.rawText} {...fieldProps('experience-raw')} onChange={e=>patch({rawText:e.target.value,rawInitialized:true})}/>{message('experience-raw')}</label>}

    </div>
     <aside className="experience-reference"><details className="experience-live-story" open={storyOpen} onToggle={e=>setStoryOpen(e.currentTarget.open)}><summary>经历预览</summary><p>预览当前输入，选择任一项可返回编辑。</p><h3 translate="no">{d.title||displayText('未填写经历标题')}</h3>{d.entryMode==='guided'?<ol>{story.map(part=><li key={part.key}><button type="button" onClick={()=>jump(part.key)} aria-label={displayText('编辑：')+displayText(part.label)}><span>{part.label}</span><span translate={part.text?'no':undefined} className={'experience-story-text'+(part.text?'':' experience-story-empty')}>{part.text||part.empty}</span></button></li>)}</ol>:<p className="experience-raw-preview" translate={text?'no':undefined}>{text||displayText('尚未填写原文。')}</p>}<small>本机草稿 · 尚未保存为待确认记录</small></details><details className="experience-preview"><summary>预览保存内容</summary>{text?<p translate="no">{text}</p>:<p>尚未填写经历内容。</p>}</details></aside>
      <div className="experience-finishing"><label className="field"><span>经历标题（必填）</span><small id="experience-title-hint">填写项目、活动或工作名称及具体内容，便于查找。</small><input id="experience-title" name="experience-title" aria-label="经历标题（必填）" autoComplete="off" required value={d.title} {...fieldProps('experience-title')} onChange={e=>patch({title:e.target.value})} placeholder={displayText(guide.title)}/>{message('experience-title')}</label>
      <details className="experience-optional"><summary>补充本人贡献与关联技能（选填）</summary><label className="field"><span>我负责的部分（选填）</span><small id="experience-contribution-hint">团队项目只写自己负责的部分；不确定可以先留空，下一步再核对。</small><textarea rows={2} aria-label={displayText('我负责的部分（选填）')} aria-describedby="experience-contribution-hint" value={d.contribution} onChange={e=>patch({contribution:e.target.value})}/></label><SkillPicker allowUnknown draft={d} change={next=>patch(next)}/></details>
     </div>
   </div>
    <footer>{errors.length>0&&<p role="alert" className="experience-error-summary">请补充必填项，已定位到第一处。已填内容已保留。</p>}<div><button className="primary" type="submit">保存并核对经历</button><p>保存为待确认记录后逐项核对原文，不代表能力已认证。</p></div><small>草稿自动保留在本机；不上传文件，不调用 AI。</small></footer>
  </form>
 </section>;
}
