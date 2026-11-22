import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {createBusinessStore} from '../server/business-store.mjs';
import {createBusinessCommands} from '../server/business-commands.mjs';
import {careerContent,careerContentIds,careerRelatedEvidence,comparisonScan,comparisonDimensions} from '../src/career-exploration-model.js';
import {careerComparison} from '../src/career-comparison.js';
import {materialCareerLinks,normalizeCareerLinks} from '../src/career-material-links.js';
import {normalizeCareerTrials,CAREER_TRIAL_VERSION} from '../src/career-trial-model.js';
import {normalizePrototypeState} from '../src/storage-recovery-model.js';
import {fresh} from '../src/model.js';
import {createSkillCandidates,purgePrivateMaterials} from '../src/alignment-model.js';
import {flowNavigation} from '../src/flow-navigation.js';
function fixture(t){
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('alice'),('bob')");t.after(()=>db.close());
 const business=createBusinessStore(db),commands=createBusinessCommands({db,business,knowledge:{}});
 const save=patch=>{const a=business.read('alice');business.save('alice',{state:{...a.state,...patch},baseVersion:a.revision,mutationId:randomUUID()});};
 const command=(type,payload)=>commands.execute('alice',{type,payload,baseVersion:business.read('alice').revision,mutationId:randomUUID()});
 return {business,commands,save,command};
}
test('confirmed normal-name material links via versioned command, revokes explicitly and never awards mastery',t=>{
 const f=fixture(t);f.save({claims:[{id:'claim-one',version:1,status:'待确认',title:'本人SQL课程',text:'整理合成报名表',skill:'SQL'}]});
 f.command('claim.confirm',{claimId:'claim-one',claimVersion:1,text:'整理合成报名表',contribution:'写分组查询',resolution:'confirm',confirmation:'CONFIRM_SELF_REPORT'});
 assert.equal(careerRelatedEvidence(f.business.read('alice').state,'data').length,0);
 const input={type:'claim.link',payload:{claimId:'claim-one',claimVersion:2,links:[{career:'data',skill:'metric-definition'}],confirmation:'SET_TASK_LINKS'},baseVersion:f.business.read('alice').revision,mutationId:randomUUID()};
 const receipt=f.commands.execute('alice',input);assert.equal(f.commands.execute('alice',input).duplicate,true);
 let state=f.business.read('alice').state;assert.equal(careerRelatedEvidence(state,'data').length,1);assert.equal(careerRelatedEvidence(state,'engineering').length,0);assert.equal(state.claims[0].skill,'SQL');assert.equal(state.tasks.length,0);assert.deepEqual(state.skillStudy||{},{});
 assert.throws(()=>f.command('claim.link',{...input.payload,claimVersion:2}),{code:'VERSION_CONFLICT'});
 assert.throws(()=>f.commands.execute('bob',{...input,mutationId:randomUUID(),baseVersion:0}),{code:'NOT_FOUND'});
 assert.throws(()=>f.command('claim.link',{...input.payload,claimVersion:3,links:[{career:'data',skill:'object-authorization'}]}),{code:'INVALID_REQUEST'});
 assert.throws(()=>f.save({claims:state.claims.map(c=>({...c,careerLinks:[]}))}),{code:'COMMAND_REQUIRED'});
 f.command('claim.link',{...input.payload,claimVersion:3,links:[]});state=f.business.read('alice').state;assert.equal(careerRelatedEvidence(state,'data').length,0);assert.equal(state.claims[0].version,4);assert.equal(state.budget,3);assert.ok(receipt.refs.claimId);
 f.command('claim.withdraw',{claimId:'claim-one',claimVersion:4,confirmation:'WITHDRAW_CLAIM'});
 assert.throws(()=>f.command('claim.link',{...input.payload,claimVersion:5}),{code:'INVALID_CLAIM_STATE'});
});
test('explicit empty links override legacy career and only source-task identity is inherited',()=>{
 assert.deepEqual(materialCareerLinks({career:'data',careerLinks:[]}),[]);
 const candidate=createSkillCandidates({claims:[]},{id:'t',title:'原项目',career:'engineering',kind:'课程项目'},{id:'a',version:1,text:'我的产物'},[{skill:'SQL'}],'去重')[0];
 assert.deepEqual(candidate.careerLinks,[{career:'engineering'}]);assert.equal(candidate.status,'待确认');assert.equal(careerRelatedEvidence({claims:[candidate]},'engineering').length,0);
 assert.throws(()=>normalizeCareerLinks([{career:'data'},{career:'data'}]));assert.throws(()=>normalizeCareerLinks([{career:'data',passed:true}]));
});
test('case drafts validate scope and length, retain plain user text across refresh and purge with personal data',()=>{
 const draft={ai:{caseVersion:CAREER_TRIAL_VERSION,text:'A1我的原文，不随界面语言改写'}};
 assert.deepEqual(normalizePrototypeState({...fresh(),careerTrials:draft}).careerTrials,draft);
 assert.throws(()=>normalizeCareerTrials({unknown:{caseVersion:'x',text:'x'}}));assert.throws(()=>normalizeCareerTrials({ai:{caseVersion:'x',text:'x',passed:true}}));assert.throws(()=>normalizeCareerTrials({ai:{caseVersion:'x',text:'x'.repeat(8001)}}));
 assert.equal(purgePrivateMaterials({...fresh(),careerTrials:draft}).careerTrials,undefined);
});
test('concrete case inputs and compact comparison stay in the same public projection and source paths resolve',()=>{
 const before=careerComparison('data','career-exploration-20261122');assert.equal(before.version,'career-exploration-20261122');assert.equal(before.compare,undefined);assert.equal(careerComparison('data','unknown-version'),null);
 const ai=careerContent('ai');assert.equal(ai.practice.materials.length,2);assert.equal(ai.practice.attempts.rows.length,3);assert.ok(ai.practice.materials.some(m=>m.text.includes('§3')));assert.ok(ai.practice.review.length===4&&ai.practice.review[3].includes('A4'));
 const security=careerContent('security');assert.ok(!security.case.question.includes('异地'));assert.ok(security.practice.materials.some(m=>m.id==='AUTH'));assert.ok(security.practice.attempts.rows[2][2].includes('dev-b'));
 for(const id of careerContentIds){const r=careerContent(id),projection=careerComparison(id);for(const [key]of comparisonDimensions){assert.equal(comparisonScan(r,key),comparisonScan(projection,key));assert.ok(comparisonScan(r,key).length<140);}for(const paths of Object.values(r.sourceClaims))for(const path of paths)assert.notEqual(path.split('.').reduce((v,k)=>v?.[k],r),undefined);}
 assert.ok(careerContent('data','en').scope.includes('business data analysis'));
});
test('career reading/comparison prioritize local actions while job opportunities retain their original next step',()=>{
 const state={...fresh(),logged:true};assert.equal(flowNavigation(state,'/careers'),null);assert.equal(flowNavigation(state,'/careers','比较'),null);assert.ok(flowNavigation(state,'/careers','我的机会').next.to.includes('/reports'));
});
