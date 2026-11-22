import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import fs from 'node:fs';
import {fresh} from '../src/model.js';
import {createBusinessStore} from '../server/business-store.mjs';
import {createBusinessCommands} from '../server/business-commands.mjs';
import {createAgentWorkflow} from '../server/agent/workflow.mjs';
import {createDiscussionWorkflow} from '../server/agent/discussion-workflow.mjs';
import {discussionSources,resolveDiscussion} from '../server/agent/discussion-context.mjs';
import {careerContent,careerContentIds,careerRelatedEvidence,CAREER_CONTENT_VERSION} from '../src/career-exploration-model.js';
import {comparisonNoteKey,comparisonNote,writeComparisonNote,comparisonReason,normalizeComparisonNotes} from '../src/career-comparison-notes.js';
import {CAREER_TRIAL_VERSION,saveCareerTrial,normalizeCareerTrials,readTrialRecovery,trialRecoveryKey,clearTrialRecovery} from '../src/career-trial-model.js';
import {normalizePrototypeState} from '../src/storage-recovery-model.js';
import {careerComparison} from '../src/career-comparison.js';
function fixture(t){
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('alice'),('bob')");t.after(()=>db.close());
 const business=createBusinessStore(db);createAgentWorkflow({db,business});const workflow=createDiscussionWorkflow({db,business}),commands=createBusinessCommands({db,business,knowledge:{}});
 const read=()=>business.read('alice'),save=fn=>{const s=read();return business.save('alice',{state:fn(s.state),baseVersion:s.revision,mutationId:randomUUID()});};
 const command=(type,payload)=>commands.execute('alice',{type,payload,baseVersion:read().revision,mutationId:randomUUID()});
 return {db,business,workflow,read,save,command};
}
test('selected precise task associations reach AI rules with version/stamp, revoke without legacy resurrection and invalidate dependent drafts',t=>{
 const f=fixture(t);f.save(s=>({...s,claims:[{id:'one',version:1,status:'已确认',title:'本人SQL记录',text:'自己的原文',skill:'data:metric-definition'},{id:'not-selected',version:1,status:'已确认',title:'未选择',text:'NEVER_DISCLOSE_THIS',skill:'SQL'}]}));
 f.command('claim.link',{claimId:'one',claimVersion:1,links:[{career:'data',skill:'metric-definition'},{career:'engineering',skill:'idempotent-batch'},{career:'frontend'}],confirmation:'SET_TASK_LINKS'});
 let d={intent:'expression',career:'data',compareCareer:'engineering',refs:[]};const rows=discussionSources(f.read().state,d),selected=rows.find(r=>r.ref.id==='one');d={...d,refs:[selected.ref]};
 f.save(s=>({...s,conversations:[{id:'topic',title:'关联核对',mode:'职业咨询',messages:[{id:'old',role:'assistant',text:'原讨论位置保留'}],discussion:d}],conversationId:'topic'}));
 assert.equal(careerRelatedEvidence(f.read().state,'data').length,1);assert.equal(selected.content.version,2);assert.equal(selected.content.careerLinks.length,2);assert.ok(!selected.content.careerLinks.some(r=>r.career==='frontend'));
 const review=f.workflow.review('alice',{baseVersion:f.read().revision,conversationId:'topic'});assert.deepEqual(review.associations[0].skillIds,['metric-definition']);assert.equal(review.associations[0].sourceStamp,selected.ref.stamp);assert.equal(review.associations[0].status,'user_confirmed_unverified');assert.ok(!JSON.stringify(review.sources).includes('NEVER_DISCLOSE_THIS'));
 const draft=f.workflow.draftCreate('alice',{baseVersion:f.read().revision,conversationId:'topic',kind:'candidate'});assert.equal(f.workflow.draftGet('alice',{id:draft.id}).valid,true);
 f.command('claim.link',{claimId:'one',claimVersion:2,links:[],confirmation:'SET_TASK_LINKS'});
 assert.equal(careerRelatedEvidence(f.read().state,'data').length,0);assert.throws(()=>resolveDiscussion(f.read().state,d),{code:'AI_CONTEXT_CHANGED'});assert.equal(f.workflow.draftGet('alice',{id:draft.id}).valid,false);assert.equal(f.read().state.conversations[0].messages[0].text,'原讨论位置保留');
 const freshSource=discussionSources(f.read().state,{...d,refs:[]}).find(r=>r.ref.id==='one');assert.deepEqual(freshSource.content.careerLinks,[]);assert.notEqual(freshSource.ref.stamp,selected.ref.stamp);
 const refreshed={...d,refs:[freshSource.ref]};f.save(s=>({...s,conversations:s.conversations.map(c=>c.id==='topic'?{...c,discussion:refreshed}:c)}));
 const afterUnlink=f.workflow.draftCreate('alice',{baseVersion:f.read().revision,conversationId:'topic',kind:'candidate'});assert.equal(f.workflow.draftGet('alice',{id:afterUnlink.id}).valid,true);
 f.command('claim.withdraw',{claimId:'one',claimVersion:3,confirmation:'WITHDRAW_CLAIM'});assert.equal(f.workflow.draftGet('alice',{id:afterUnlink.id}).valid,false);assert.ok(!discussionSources(f.read().state,{...d,refs:[]}).some(r=>r.ref.id==='one'));
assert.equal(discussionSources(f.business.read('bob').state,{intent:'expression',career:'data',refs:[]}).filter(r=>r.ref.kind==='claim').length,0);
});
test('coarse SQL has no precise AI node and a different discussion career does not receive unrelated associations',()=>{
 const s={...fresh(),claims:[{id:'coarse',title:'x',text:'x',version:1,status:'已确认',skill:'SQL'},{id:'linked',title:'y',text:'y',version:2,status:'已确认',skill:'SQL',careerLinks:[{career:'data',skill:'metric-definition'}]}]};
 const rows=discussionSources(s,{intent:'expression',career:'security',refs:[]}).filter(r=>r.ref.kind==='claim');assert.ok(rows.every(r=>r.content.careerLinks.length===0));
});
test('comparison notes bind unordered two/three-career sets, preserve legacy notes and require explicit current-basis acknowledgment',()=>{
 let s=fresh();s.decision.reason='旧的无归属理由';s=writeComparisonNote(s,['data','engineering'],'old-content',{reason:'AB原文',question:'AB问题'});s=writeComparisonNote(s,['ai','security'],CAREER_CONTENT_VERSION,{reason:'CD原文'});s=writeComparisonNote(s,['data','engineering','ai'],CAREER_CONTENT_VERSION,{reason:'ABC原文'});
 assert.equal(comparisonNote(s,['engineering','data'],'new-content').reason,'AB原文');assert.equal(comparisonNote(s,['ai','security'],CAREER_CONTENT_VERSION).reason,'CD原文');assert.equal(comparisonNote(s,['data','ai'],CAREER_CONTENT_VERSION).reason,'');assert.equal(comparisonNoteKey(['engineering','data']),comparisonNoteKey(['data','engineering']));assert.equal(comparisonReason(s,['data','engineering'],CAREER_CONTENT_VERSION),'');
 s=writeComparisonNote(s,['data','engineering'],CAREER_CONTENT_VERSION,{reviewedContentVersion:CAREER_CONTENT_VERSION});assert.equal(comparisonReason(s,['data','engineering'],CAREER_CONTENT_VERSION),'AB原文');assert.equal(s.decision.reason,'旧的无归属理由');
 assert.deepEqual(normalizePrototypeState(s).comparisonNotes,normalizeComparisonNotes(s.comparisonNotes));assert.throws(()=>normalizeComparisonNotes({'data+engineering':{...s.comparisonNotes['data+engineering'],careers:['ai','security']}}));
});
test('trial version changes archive original source and text; recovery is per owner/career/version and purge is scoped',()=>{
 const s={...fresh(),careerTrials:{ai:{caseVersion:'career-trial-20261122',text:'旧中文原文'}}};const saved=saveCareerTrial(s,'ai','新中文原文');assert.equal(saved.careerTrials.ai.caseVersion,CAREER_TRIAL_VERSION);assert.equal(saved.careerTrials.ai.history[0].text,'旧中文原文');assert.equal(saved.careerTrials.ai.history[0].contentVersion,'career-exploration-20261122-followup');assert.equal(s.careerTrials.ai.text,'旧中文原文');assert.deepEqual(normalizeCareerTrials(saved.careerTrials),saved.careerTrials);
 const map=new Map(),storage={get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};storage.setItem(trialRecoveryKey('alice','ai'),JSON.stringify({caseVersion:CAREER_TRIAL_VERSION,text:'未保存原文'}));assert.equal(readTrialRecovery(storage,'alice','ai').text,'未保存原文');assert.equal(readTrialRecovery(storage,'bob','ai'),null);assert.equal(readTrialRecovery(storage,'alice','data'),null);assert.equal(readTrialRecovery(storage,'alice','ai','older'),null);clearTrialRecovery(storage,'bob');assert.equal(map.size,1);clearTrialRecovery(storage,'alice');assert.equal(map.size,0);
});
test('all ten directions add one scoped decision branch and retain English and archived public versions',()=>{
 for(const id of careerContentIds){const r=careerContent(id);assert.ok(r.focus&&r.practice.fork.question&&r.practice.fork.verifiedAt==='2026-11-22');assert.ok(r.sources.includes(r.practice.fork.sourceId));assert.equal(r.version,CAREER_CONTENT_VERSION);assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(careerContent(id,'en'))),id);assert.equal(careerComparison(id,'career-exploration-20261122-followup').version,'career-exploration-20261122-followup');}
});
test('engineering content check rejects an equal-count/equal-key but overwritten retry and ops uses each window denominator',()=>{
 const rows=careerContent('engineering').practice.fork.example.rows;assert.deepEqual(rows.map(r=>r[0]),['r1','r2','r3','r4']);assert.ok(rows.every(r=>r[1]===r[2]));assert.ok(rows.some(r=>r[1]!==r[3]));assert.equal(new Set(rows.map(r=>r[0])).size,4);
 const ops=careerContent('ops').deliverables[0].example.rows;assert.deepEqual(ops.map(r=>[r[1],r[2]]),[[1000,5],[1000,80],[800,4]]);for(const r of ops)assert.equal(r[2]/r[1]*100,Number(r[3].replace('%','')));
 const review=careerContent('testing').practice.review.join(' ');assert.ok(review.includes('7999→7999')&&review.includes('8000→7200')&&review.includes('8001→7201'));assert.ok(careerContent('testing').practice.input.includes('7999/8000/8001'));
});
test('the downloadable migration pair and manifest reproduce the declared normalized fields and SHA-256',()=>{
 const read=name=>fs.readFileSync('public/examples/career-exploration/'+name,'utf8').trimEnd().split(/\r?\n/).slice(1).map(line=>{const [id,email,status]=line.split(',');return {id,email,status};});
 const canonical=rows=>JSON.stringify(rows.sort((a,b)=>a.id.localeCompare(b.id)).map(r=>[r.id,r.email.trim().toLowerCase(),r.status==='confirmed'?'active':r.status]));
 const a=read('migration-source.csv'),b=read('migration-target.csv'),manifest=JSON.parse(fs.readFileSync('public/examples/career-exploration/migration-check.json','utf8'));assert.equal(a.length,600);assert.equal(b.length,600);assert.ok(canonical(a)===canonical(b),'normalized source/target rows match');assert.equal(createHash('sha256').update(canonical(a)).digest('hex'),manifest.sourceSha256);assert.equal(manifest.sourceSha256,manifest.targetSha256);
 b.push({id:'M601',email:'new@example.invalid',status:'active'});assert.notEqual(canonical(a),canonical(b));
});
