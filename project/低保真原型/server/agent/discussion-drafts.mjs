import {randomUUID} from 'node:crypto';
import {businessError} from '../business-store.mjs';
import {resolveDiscussion} from './discussion-context.mjs';

const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,allowed)=>record(v)&&Object.keys(v).every(k=>allowed.includes(k));
const fail=(code='AI_CONTEXT_CHANGED',status=409)=>{throw businessError(code,status);};
export function validDiscussionDraft(d){
 if(!record(d))return false;
 if(d.kind==='candidate')return keys(d,['kind','draft'])&&keys(d.draft,['title','text','contribution'])&&['title','text','contribution'].every(k=>typeof d.draft[k]==='string'&&d.draft[k].length<=(k==='title'?200:6000));
 return d.kind==='plan'&&keys(d,['kind','edits','budget'])&&Number.isFinite(d.budget)&&d.budget>0&&d.budget<=168&&Array.isArray(d.edits)&&d.edits.length>0&&d.edits.length<=30&&new Set(d.edits.map(e=>e.taskId)).size===d.edits.length&&d.edits.every(e=>keys(e,['taskId','hours','due','status','purpose'])&&typeof e.taskId==='string'&&Number.isFinite(e.hours)&&e.hours>0&&e.hours<=168&&typeof e.due==='string'&&(!e.due||/^\d{4}-\d{2}-\d{2}$/.test(e.due))&&['待开始','进行中','受阻','延期'].includes(e.status)&&typeof e.purpose==='string'&&e.purpose.trim()&&e.purpose.length<=4000);
}

/** Drafts are immutable in provenance, editable in content, and never business facts. */
export function createDiscussionDrafts({db,business,now=Date.now}){
 const insert=p=>db.prepare('INSERT INTO agent_proposals VALUES(?,?,?,?,?,?,NULL,NULL)').run(p.id,p.owner,p.baseVersion,p.basis,JSON.stringify(p),Number.MAX_SAFE_INTEGER);
 const row=(user,id)=>{const r=db.prepare('SELECT payload_json FROM agent_proposals WHERE id=? AND user_id=?').get(id,user);if(!r)fail('NOT_FOUND',404);return JSON.parse(r.payload_json);};
 const context=(user,input)=>{const saved=business.read(user);if(saved.revision!==input.baseVersion)fail('VERSION_CONFLICT');const conv=saved.state.conversations.find(c=>c.id===input.conversationId&&!c.archived);if(!conv?.discussion)fail();return {...saved,conv,...resolveDiscussion(saved.state,conv.discussion,business.courseLibrary)};};
 const allowed=(c,p)=>(p.kind==='candidate'?c.discussion.intent==='expression':['plan','learning'].includes(c.discussion.intent))&&(p.kind!=='plan'||p.edits.every(e=>c.selected.some(s=>s.ref.kind==='task'&&s.ref.part==='plan'&&s.ref.id===e.taskId)&&c.state.tasks.some(t=>t.id===e.taskId&&!t.completed)));
 function issue(user,c,result){
  return result.statements.flatMap((s,index)=>{
   if(!s.draft||!validDiscussionDraft(s.draft)||!allowed(c,s.draft))return [];
   if(s.draft.kind==='candidate'&&c.discussion.task?.page==='expression'&&!c.selected.some(row=>row.personal&&['task','claim','skill','report','resume','review'].includes(row.ref.kind)))return [];
   if(s.draft.kind==='candidate'&&!c.selected.some(s=>['task','claim','skill','report','resume','review'].includes(s.ref.kind)))return [];
   const p={schema:'discussion-suggestion',id:randomUUID(),owner:user,baseVersion:c.revision,conversationId:c.conv.id,basis:c.basis,context:c.discussion,suggestion:s.text,payload:s.draft,createdAt:now()};insert(p);return [{index,id:p.id}];
  });
 }
 // Invoked only after provider validation, authorization and late-response checks.
 business.issueDiscussionSuggestions=(user,conversationId,result)=>{const saved=business.read(user),conv=saved.state.conversations.find(c=>c.id===conversationId);if(!conv?.discussion)return [];return issue(user,{...saved,conv,...resolveDiscussion(saved.state,conv.discussion,business.courseLibrary)},result);};
 function create(user,input){
  if(!keys(input,['baseVersion','conversationId','suggestionId','kind']))fail('INVALID_REQUEST',400);
  const c=context(user,input);if(!c.selected.length)fail('AI_SCOPE_REJECTED',403);
  if(c.discussion.task?.page==='expression'&&!c.selected.some(s=>s.personal&&['task','claim','skill','report','resume','review'].includes(s.ref.kind)))fail('AI_SCOPE_REJECTED',403);
  let source=null,payload;
  if(input.suggestionId){source=row(user,input.suggestionId);if(source.schema!=='discussion-suggestion'||source.conversationId!==c.conv.id||source.basis!==c.basis)fail();payload=source.payload;}
  else if(input.kind==='plan'&&['plan','learning'].includes(c.discussion.intent)){
   const tasks=c.selected.filter(s=>s.ref.kind==='task'&&s.ref.part==='plan').map(s=>c.state.tasks.find(t=>t.id===s.ref.id)).filter(t=>t&&!t.completed);if(!tasks.length)fail('AI_SCOPE_REJECTED',403);
   payload={kind:'plan',budget:Number(c.state.budget),edits:tasks.map(t=>({taskId:t.id,hours:t.hours,due:t.due||'',status:t.status,purpose:t.purpose}))};
  }else if(input.kind==='candidate'&&c.discussion.intent==='expression'&&c.selected.some(s=>['task','claim','skill','report','resume','review'].includes(s.ref.kind))){
   const originals=c.selected.filter(s=>s.personal),first=originals[0];payload={kind:'candidate',draft:{title:first?.content.title||first?.label||'',text:originals.map(s=>s.content.note||s.content.text||s.content.artifact||'').filter(Boolean).join('\n\n').slice(0,6000),contribution:originals.map(s=>s.content.contribution||'').filter(Boolean).join('\n').slice(0,6000)}};
  }else fail('INVALID_REQUEST',400);
  // Repeated conversion of the same suggestion yields the same draft, including edits.
  if(source){const found=db.prepare('SELECT payload_json FROM agent_proposals WHERE user_id=? ORDER BY rowid DESC').all(user).map(r=>JSON.parse(r.payload_json)).find(p=>p.schema==='discussion-draft'&&p.suggestionId===source.id);if(found)return get(user,{id:found.id});}
  const p={schema:'discussion-draft',id:randomUUID(),owner:user,baseVersion:c.revision,conversationId:c.conv.id,basis:c.basis,context:c.discussion,sources:c.selected.map(s=>({ref:s.ref,label:s.label,labelEn:s.labelEn,to:s.to})),suggestionId:source?.id||null,suggestion:source?.suggestion||null,payload,revision:1,createdAt:now()};insert(p);return get(user,{id:p.id});
 }
 function get(user,input){
  if(!keys(input,['id']))fail('INVALID_REQUEST',400);const p=row(user,input.id);if(p.schema!=='discussion-draft')fail('NOT_FOUND',404);
  let valid=false;try{const s=business.read(user),conv=s.state.conversations.find(c=>c.id===p.conversationId&&!c.archived);valid=!!conv&&resolveDiscussion(s.state,conv.discussion,business.courseLibrary).basis===p.basis&&allowed({...s,...resolveDiscussion(s.state,p.context,business.courseLibrary)},p.payload);}catch{}
  const receiptRow=db.prepare('SELECT receipt_json FROM agent_proposals WHERE user_id=? AND receipt_json IS NOT NULL ORDER BY rowid DESC').all(user).map(r=>JSON.parse(r.receipt_json)).find(r=>r.draftId===p.id);
  return {...p,valid:valid&&!receiptRow,receipt:receiptRow||null,to:(p.payload.kind==='plan'?'/plan':'/assessment?tab=原文确认')+(p.payload.kind==='plan'?'?':'&')+'discussionDraft='+encodeURIComponent(p.id)};
 }
 function save(user,input){
  if(!keys(input,['id','revision','payload']))fail('INVALID_REQUEST',400);const p=get(user,{id:input.id});if(!p.valid)fail();if(input.revision!==p.revision)fail('VERSION_CONFLICT');
  if(!validDiscussionDraft(input.payload)||input.payload.kind!==p.payload.kind)fail('INVALID_REQUEST',400);
  // A saved draft cannot silently switch targets or add tasks from a new selection.
  if(p.payload.kind==='plan'&&input.payload.edits.some(e=>!p.payload.edits.some(old=>old.taskId===e.taskId)))fail('AI_SCOPE_REJECTED',403);
  const {valid,receipt,to,...stored}=p;stored.payload=input.payload;stored.revision++;
  db.prepare('UPDATE agent_proposals SET payload_json=? WHERE id=? AND user_id=?').run(JSON.stringify(stored),p.id,user);return get(user,{id:p.id});
 }
 function list(user,input){if(!keys(input,['conversationId']))fail('INVALID_REQUEST',400);return {items:db.prepare('SELECT id,payload_json FROM agent_proposals WHERE user_id=? ORDER BY rowid DESC LIMIT 100').all(user).filter(r=>{const p=JSON.parse(r.payload_json);return p.schema==='discussion-draft'&&p.conversationId===input.conversationId;}).map(r=>get(user,{id:r.id}))};}
 function verified(user,input){const p=get(user,{id:input.draftId});if(!p.valid||p.conversationId!==input.conversationId)fail();return p;}
 return {create,get,save,list,verified};
}
