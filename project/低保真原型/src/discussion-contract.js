// Discussion metadata stores object identities, never private source bodies or URLs.
export const DISCUSSION_INTENTS=['direction','learning','plan','expression'];
export const SOURCE_KINDS=['career','skill','task','claim','plan','report','resume','review','statement'];
export function normalizeDiscussion(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['intent','career','compareCareer','refs','externalBasis','question','hintLevel','contextNote','returnStep','practiceMode','task'].includes(k)))throw new TypeError('Invalid discussion');
 const id=v=>typeof v==='string'&&/^[a-zA-Z0-9:_-]{1,160}$/.test(v);
 if(!DISCUSSION_INTENTS.includes(value.intent)||!id(value.career)||!Array.isArray(value.refs)||value.refs.length>12)throw new TypeError('Invalid discussion');
 if(value.compareCareer!==undefined&&!id(value.compareCareer))throw new TypeError('Invalid discussion');
 if(value.returnStep!==undefined&&!['learn','practice','check'].includes(value.returnStep)||value.practiceMode!==undefined&&!['guided','debug','independent'].includes(value.practiceMode))throw new TypeError('Invalid learning stage');
 if(value.task!==undefined){
  const t=value.task;
  if(!t||typeof t!=='object'||Array.isArray(t)||Object.keys(t).some(k=>!['page','goal','time','focus','purpose','note','object','left','right'].includes(k))||!['next-step','compare','expression'].includes(t.page)||value.intent!==({'next-step':'plan',compare:'direction',expression:'expression'})[t.page])throw new TypeError('Invalid task context');
  for(const k of ['goal','left','right'])if(t[k]!==undefined&&(typeof t[k]!=='string'||t[k]!==''&&!id(t[k])))throw new TypeError('Invalid task career');
  for(const [k,max]of [['time',160],['note',2000]])if(t[k]!==undefined&&(typeof t[k]!=='string'||t[k].length>max))throw new TypeError('Invalid temporary statement');
  if(t.focus!==undefined&&!['work','outputs','starting'].includes(t.focus)||t.purpose!==undefined&&!['review','resume','interview'].includes(t.purpose))throw new TypeError('Invalid task purpose');
  if(t.object!==undefined&&(!t.object||Object.keys(t.object).some(k=>!['kind','id'].includes(k))||!['task','claim','skill','review','report','resume'].includes(t.object.kind)||!id(t.object.id)))throw new TypeError('Invalid task object');
 }
 const refs=value.refs.map(r=>{
  if(!r||Object.keys(r).some(k=>!['kind','id','part','stamp'].includes(k))||!SOURCE_KINDS.includes(r.kind)||!id(r.id)||r.part!==undefined&&!id(r.part)||r.stamp!==undefined&&!/^[a-f0-9]{64}$/.test(r.stamp))throw new TypeError('Invalid source');
  return {...r};
 });
 if(new Set(refs.map(refKey)).size!==refs.length||value.externalBasis!==undefined&&!/^[a-f0-9]{64}$/.test(value.externalBasis)||value.question!==undefined&&(typeof value.question!=='string'||value.question.length>4000)||value.hintLevel!==undefined&&![1,2,3].includes(value.hintLevel)||value.contextNote!==undefined&&(typeof value.contextNote!=='string'||value.contextNote.length>4000))throw new TypeError('Invalid discussion');
 return {...value,refs};
}
export const refKey=r=>[r.kind,r.id,r.part||''].join('/');
export function discussionLocalKey(state,d){
 const selected=d.refs.map(r=>r.kind==='skill'?Object.entries(state.skillStudy||{}).filter(([key])=>key.startsWith(r.id+':v')):
  r.kind==='task'?state.tasks.find(t=>t.id===r.id):r.kind==='claim'?state.claims.find(c=>c.id===r.id):r.kind==='plan'?{goal:state.goal,budget:state.budget,planVersion:state.planVersion}:
  (state[r.kind==='report'?'reports':r.kind==='resume'?'resumes':'reviews']||[]).find(x=>x.id===r.id)||r.id);
 const text=JSON.stringify({intent:d.intent,career:d.career,compareCareer:d.compareCareer,returnStep:d.returnStep,practiceMode:d.practiceMode,contextNote:d.contextNote,task:d.task,refs:d.refs,selected});
 let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
 return (hash>>>0).toString(16);
}
export function startDiscussion(state,discussion,question=''){
 const context=normalizeDiscussion({...discussion,...(question?{question}:{})}),key=JSON.stringify({...context,externalBasis:undefined,question:undefined});
 const existing=state.conversations.find(c=>!c.archived&&c.discussion&&c.discussion.intent===context.intent&&c.discussion.task?.page===context.task?.page&&c.discussion.career===context.career&&c.discussion.compareCareer===context.compareCareer&&context.refs.length>0&&context.refs.every(r=>c.discussion.refs.some(old=>refKey(old)===refKey(r))));
 const item=existing?{...existing,discussion:{...context,question:question||existing.discussion.question}}:{id:'conv-'+crypto.randomUUID(),title:'新的职业规划讨论',mode:'职业咨询',messages:[],discussion:context};
 return {...state,conversations:existing?state.conversations.map(c=>c.id===existing.id?item:c):[...state.conversations,item],conversationId:item.id,aiDraft:question||state.aiDraft,proposal:null};
}
