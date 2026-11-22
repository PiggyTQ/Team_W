import React,{useEffect,useRef,useState} from 'react';
import {useLanguage} from './i18n/render';
import {CAREER_TRIAL_VERSION,CAREER_TRIAL_LIMIT,saveCareerTrial,readTrialRecovery,trialRecoveryKey,trialSourceVersion} from './career-trial-model';
import Example from './CareerArtifactExamples';
export default function CareerTrial({role,s,update,sync,owner='local'}){
 const en=useLanguage()==='en',tx=(z,e)=>en?e:z,prior=s.careerTrials?.[role.id],practice=role.practice;
 const recovered=useRef(readTrialRecovery(localStorage,owner,role.id));
 const [text,setText]=useState(()=>recovered.current?.text??(prior?.caseVersion===CAREER_TRIAL_VERSION?prior.text:'')),[compared,setCompared]=useState(false),[pending,setPending]=useState(null),[state,setState]=useState(''),[clear,setClear]=useState(false),[undo,setUndo]=useState(null),[storageOK,setStorageOK]=useState(true);
 const field=useRef(),textRef=useRef(text),syncRef=useRef(sync);textRef.current=text;syncRef.current=sync;
 const dirty=text!==(prior?.caseVersion===CAREER_TRIAL_VERSION?prior.text:'');
 const stash=value=>{try{localStorage.setItem(trialRecoveryKey(owner,role.id),JSON.stringify({caseVersion:CAREER_TRIAL_VERSION,text:value}));setStorageOK(true);}catch{setStorageOK(false);}};
 const removeStash=()=>{try{localStorage.removeItem(trialRecoveryKey(owner,role.id));}catch{}};
 const edit=value=>{setText(value);stash(value);setState('');setCompared(false);};
 useEffect(()=>{
  const warn=e=>{if(dirty&&!storageOK){e.preventDefault();e.returnValue='';}};
  const leave=e=>{if(dirty&&!storageOK&&e.target.closest?.('a[href]')&&!window.confirm(tx('草稿未保存且本机暂存不可用，仍然离开？','This draft is unsaved and local recovery is unavailable. Leave anyway?'))){e.preventDefault();e.stopPropagation();}};
  window.addEventListener('beforeunload',warn);document.addEventListener('click',leave,true);return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',leave,true);};
 },[dirty,storageOK]);
 useEffect(()=>{
  if(!pending)return;let active=true;
  const frame=requestAnimationFrame(()=>requestAnimationFrame(async()=>{
   try{const live=syncRef.current;if(live&&live.status!=='local'){await live.flush();if(live.current().dirty||live.current().status!=='saved')throw Error();}
    if(active){setState(live&&live.status!=='local'?'persisted':'local');if(textRef.current===pending.text)removeStash();setPending(null);}
   }catch{if(active){setState('failed');setPending(null);}}
  }));return()=>{active=false;cancelAnimationFrame(frame);};
 },[pending?.id]);
 const save=()=>{try{const next=saveCareerTrial(s,role.id,text,CAREER_TRIAL_VERSION,role.version);stash(text);update(next);setState('queue');setPending({id:crypto.randomUUID(),text});}catch{setState('history-full');}};
 const erase=()=>{try{const next=saveCareerTrial(s,role.id,'',CAREER_TRIAL_VERSION,role.version);setUndo({row:prior,text});setClear(false);setCompared(false);setText('');removeStash();update(next);setState('queue');setPending({id:crypto.randomUUID(),text:''});}catch{setClear(false);setState('history-full');}};
 const exportDraft=()=>{const blob=new Blob([JSON.stringify({career:role.id,caseVersion:CAREER_TRIAL_VERSION,currentDraft:text,accountSnapshot:prior||null},null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='career-trial-'+role.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const restore=()=>{edit(undo.text);update(current=>{const trials={...current.careerTrials};if(undo.row)trials[role.id]=undo.row;else delete trials[role.id];return {...current,careerTrials:trials};});setUndo(null);setState('');};
 const accountBlocked=['save-error','conflict','expired'].includes(sync?.status);
 const old=[...prior?.history||[],...(prior&&prior.caseVersion!==CAREER_TRIAL_VERSION?[{caseVersion:prior.caseVersion,contentVersion:prior.contentVersion||trialSourceVersion(prior.caseVersion),text:prior.text}]:[])];
 const status=dirty?(storageOK?tx('未保存到账户，已暂存于本机；离开后可恢复。','Not saved to your account. A local recovery copy will survive navigation.'):tx('未保存且本机暂存不可用，请先保存再离开。','Unsaved and local recovery is unavailable. Save before leaving.')):state==='persisted'?tx('当前草稿已保存至账户；不代表经历确认或技能掌握。','This draft is saved to your account, not confirmed experience or mastery.'):state==='local'?tx('当前草稿已保存于本机。','This draft is saved locally.'):tx('本例草稿是本人尝试，不是检验或能力结论。','This case draft is your attempt, not an assessment or ability conclusion.');
 const jump=id=>{const el=document.getElementById(id);el?.scrollIntoView({block:'center'});el?.focus({preventScroll:true});};
 return <div className="career-trial" data-guided={practice.materials?.length?'true':undefined}>
  {!!practice.materials?.length&&<section className="career-trial-inputs"><h3>{tx('本例可用材料','Materials for this case')}</h3>{practice.materials.map(m=><article key={m.id} id={'trial-source-'+m.id} tabIndex={-1}><h4>{m.title}</h4><p className="career-source-text">{m.text}</p></article>)}{practice.attempts&&<Example value={practice.attempts}/>}</section>}
  <div className="career-trial-writing"><label htmlFor={'career-trial-'+role.id}>{tx('写下本例的小产物','Write your small deliverable for this case')}</label><p>{practice.deliverable}</p>
   {!!practice.materials?.length&&<><div className="career-trial-locators" aria-label={tx('材料定位','Locate inputs')}>{practice.materials.map(m=><button type="button" key={m.id} onClick={()=>jump('trial-source-'+m.id)}>{m.id}</button>)}{(practice.attempts?.rowIds||[]).map((id,i)=><button type="button" key={id} onClick={()=>jump(id)}>{practice.attempts.rows[i][0].split(' · ')[0]}</button>)}</div><button type="button" disabled={text.length>7900} onClick={()=>{edit(text+(text?'\n\n':'')+tx('编号：\n判断：\n依据：\n未知：\n下一步：','ID:\nJudgment:\nEvidence:\nUnknown:\nNext step:'));field.current?.focus();}}>{tx('插入空白作答结构','Insert a blank response outline')}</button></>}
   <textarea ref={field} id={'career-trial-'+role.id} aria-label={tx('本例体验草稿','Case trial draft')} translate="no" maxLength={CAREER_TRIAL_LIMIT} rows={6} value={text} onChange={e=>edit(e.target.value)}/>
   <div className="career-practice-actions"><button type="button" className="primary" disabled={!!pending} onClick={save}>{pending?tx('正在保存…','Saving…'):tx('保存体验草稿','Save trial draft')}</button><button type="button" disabled={!!pending||!text&&!prior} onClick={()=>setClear(true)}>{tx('清空本例草稿','Clear this draft')}</button><button type="button" onClick={exportDraft}>{tx('导出本例草稿与旧记录','Export this draft and older records')}</button>{practice.review&&<button type="button" disabled={!text.trim()} aria-expanded={compared} onClick={()=>setCompared(!compared)}>{tx('对照教学说明','Compare with teaching notes')}</button>}</div>
   {clear&&<div className="career-trial-clear" role="group" aria-label={tx('确认清空草稿','Confirm clearing the draft')}><p>{tx('清空当前稿？旧案例快照保留，清空后可在本页恢复。','Clear this draft? Older case snapshots remain; you can undo here.')}<button type="button" onClick={erase}>{tx('确认清空','Confirm clear')}</button><button type="button" onClick={()=>setClear(false)}>{tx('保留草稿','Keep draft')}</button></p></div>}
   {undo&&<button type="button" onClick={restore}>{tx('恢复清空前草稿','Undo clear')}</button>}
   <p role={state==='failed'||accountBlocked?'alert':'status'} data-trial-status={pending?'saving':state==='failed'?'failed':dirty?'unsaved':state||'unchanged'}>{state==='failed'||accountBlocked?tx('账户保存失败，原文和本机暂存保留。修复连接后可重试保存。','Account save failed. Your text and local recovery copy remain. Retry after restoring the connection.'):state==='history-full'?tx('旧案例快照已满，未覆盖原稿；请先导出保管。','Older snapshots are full. Nothing was overwritten; export them before continuing.'):pending?tx('保存队列处理中，尚未确认持久化。','Processing the save queue; persistence is not yet confirmed.'):status}</p>
   {old.length>0&&<details className="career-old-trials"><summary>{tx('旧案例草稿与原来源版本','Older case drafts and original versions')}</summary>{old.map((r,i)=><section key={i}><p><code>{r.caseVersion}</code> · {tx('原职业资料版本','Original career content version')}: <code>{r.contentVersion||trialSourceVersion(r.caseVersion)}</code></p><p className="career-source-text" translate="no">{r.text}</p><button type="button" onClick={()=>edit(r.text)}>{tx('复制为本次未保存草稿','Copy into this unsaved draft')}</button></section>)}</details>}
   {compared&&<section className="career-trial-review"><h4>{tx('教学对照，不是检验判分','Teaching comparison, not an assessment score')}</h4><ul>{practice.review.map((r,i)=><li key={i}>{r}</li>)}</ul></section>}
  </div>
 </div>;
}
