import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {registrations,registrationSql,summarizeRegistrations} from '../src/registration-case.js';
test('registration case agrees across raw records, SQL, grouping and business conclusion',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE registrations(registration_id TEXT,participant_id TEXT,registered_at TEXT,updated_at TEXT,channel TEXT,status TEXT,is_test INTEGER)');
 const insert=db.prepare('INSERT INTO registrations VALUES(?,?,?,?,?,?,?)');for(const r of registrations)insert.run(...Object.values(r));
 const actual=db.prepare(registrationSql).all().map(r=>[r.channel,r.april,r.may]);assert.deepEqual(actual,[['community',100,100],['video',60,60],['website',160,120]]);db.close();
 const summary=summarizeRegistrations();assert.equal(summary.april,320);assert.equal(summary.may,280);assert.equal(summary.change,-40);assert.equal(summary.percent,-12.5);assert.equal(summary.unit,'registration_records');
 assert.ok(registrations.length>600);assert.ok(new Set(registrations.map(r=>r.participant_id)).size<600);
});
test('latest withdrawal wins, test records excluded and repeated participants remain distinct registration records',()=>{
 const base={participant_id:'same-person',registered_at:'2026-04-10',updated_at:'2026-04-10T00:00:00Z',channel:'website',is_test:0,status:'active'};
 const rows=[{...base,registration_id:'A'},{...base,registration_id:'B'},{...base,registration_id:'test',is_test:1}];assert.equal(summarizeRegistrations(rows).april,2);
 rows.push({...base,registration_id:'A',status:'withdrawn',updated_at:'2026-04-11T00:00:00Z'});assert.equal(summarizeRegistrations(rows).april,1);
});
import {careers} from '../src/model.js';
import {careerContent,careerContentIds,careerSourceRecords,comparisonDimensions,comparisonValue,careerRelatedEvidence} from '../src/career-exploration-model.js';
import {careerComparison} from '../src/career-comparison.js';
import {discussionSources,resolveDiscussion,discussionHash} from '../server/agent/discussion-context.mjs';
import {fresh} from '../src/model.js';
import {getSkillTree} from '../server/skill-trees/index.mjs';
import {listFilters,careerListUrl,loadCareerList,saveCareerList} from '../src/career-list-navigation.js';
import vm from 'node:vm';
test('all existing directions have distinct complete task chains, visible authored outputs and valid original learning destinations',()=>{
 assert.deepEqual(careerContentIds.sort(),careers.map(c=>c.id).sort());const taskTitles=new Set(),artifactTexts=new Set();
 for(const id of careerContentIds){const r=careerContent(id);taskTitles.add(r.case.title);assert.equal(r.case.nature,'original_synthetic');for(const key of ['requester','question','input','review'])assert.ok(r.case[key]?.length>0,id+' '+key);assert.ok(r.case.decisions.length>=2);assert.ok(r.deliverables.length>=2);
  for(const a of r.deliverables){assert.ok(a.audience&&a.use&&a.checks.length&&a.example.kind);artifactTexts.add(JSON.stringify(a.example));}
  const route=new URL(r.practice.route,'https://example.invalid');assert.equal(route.pathname,'/career-map');assert.equal(route.searchParams.get('career'),id);assert.ok(getSkillTree(id).branches.flatMap(b=>b.leaves).some(l=>l.id===route.searchParams.get('skill')),id+' destination');
  assert.ok(r.practice.input&&r.practice.deliverable&&r.practice.checks.length);assert.ok(r.preparation.every(p=>p.skill&&p.work&&p.quality));assert.ok(r.growth.every(g=>g.title&&g.description));
 }assert.equal(taskTitles.size,10);assert.ok(artifactTexts.size>=22);
});
test('all facts/method mappings refer to read sources with explicit scope, dates, rights and usage; unknown dates remain unknown',()=>{
 const ids=new Set(careerSourceRecords.map(r=>r.id));assert.equal(ids.size,careerSourceRecords.length);assert.equal(ids.size,15);
 for(const id of careerContentIds){const r=careerContent(id);for(const source of r.sources){assert.ok(ids.has(source));assert.ok(r.sourceClaims[source].length);}}
 for(const r of careerSourceRecords){assert.equal(r.status,'read_original');for(const k of ['publisher','title','region','coverage','version','license','usage'])assert.ok(r[k]);assert.equal(new URL(r.url).protocol,'https:');assert.match(r.accessed,/^2026-11-2[12]$/);}
 assert.equal(careerSourceRecords.find(r=>r.id==='cn-new-occupations').originalUpdated,'2019-04-01');assert.equal(careerSourceRecords.find(r=>r.id==='sre').originalUpdated,null);assert.ok(careerSourceRecords.find(r=>r.id==='powerbi').coverage.includes('不是全体'));
});
test('reading, ordinary comparison and public AI projection share task dimensions and retain bilingual source metadata',()=>{
 for(const id of careerContentIds){const r=careerContent(id),p=careerComparison(id);for(const [key]of comparisonDimensions)assert.deepEqual(comparisonValue(p,key),comparisonValue(r,key));assert.deepEqual(p.sourceRecords,r.sourceRecords);assert.equal(p.provenance.version,r.version);
  const en=careerContent(id,'en');assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(en)),id+' English coverage');assert.ok(!('claims'in p)&&!('budget'in p));
 }
 assert.equal(careerContent('not-real'),null);
});
test('old public snapshots remain archived, their signed references cannot silently become the new content, and stored messages remain untouched',()=>{
 const old=careerComparison('data','career-detail-20261024'),current=careerComparison('data');assert.notEqual(discussionHash(old),discussionHash(current));assert.equal(old.provenance.version,'career-detail-20261024');
 const s=fresh(),context={intent:'direction',career:'data',refs:[{kind:'career',id:'data',part:'profile',stamp:discussionHash(old)}]};s.conversations[0].messages=[{id:'old',text:JSON.stringify(old)}];const before=JSON.stringify(s);
 assert.throws(()=>resolveDiscussion(s,context),{code:'AI_CONTEXT_CHANGED'});assert.equal(JSON.stringify(s),before);
 const row=discussionSources(s,{intent:'direction',career:'data',refs:[]}).find(r=>r.ref.part==='profile');assert.deepEqual(row.content,current);
});
test('coarse shared SQL labels never imply both analytics and data-engineering readiness',()=>{
 const s={claims:[{status:'已确认',skill:'SQL'},{status:'已确认',skill:'data:aggregation'},{status:'待确认',career:'data'}]};assert.equal(careerRelatedEvidence(s,'data').length,1);assert.equal(careerRelatedEvidence(s,'engineering').length,0);
});
test('filters survive a detail roundtrip and separate account storage without private content in URLs',()=>{
 const bag=new Map(),storage={getItem:k=>bag.get(k),setItem:(k,v)=>bag.set(k,v)},state={q:'SQL',source:'interest',group:'data',main:570,page:0,focusId:'data',restore:true};saveCareerList(storage,'a',state);
 assert.equal(loadCareerList(storage,'b'),null);const loaded=loadCareerList(storage,'a'),url=careerListUrl(loaded),params=new URL(url,'https://example.invalid').searchParams;assert.deepEqual(listFilters(params),{q:'SQL',source:'interest',group:'data'});assert.equal(loaded.main,570);assert.equal(loaded.focusId,'data');assert.equal(params.has('note'),false);
 assert.deepEqual(listFilters(new URLSearchParams('source=bad&group=bad')),{q:'',source:'all',group:'all'});assert.equal(loadCareerList({getItem:()=>'{invalid'},'a'),null);
});
test('software example implements the stated boundary with integer cents and explicit invalid-input behavior',()=>{
 const a=careerContent('software').deliverables.find(a=>a.example.kind==='code');const payable=vm.runInNewContext(a.example.code+'\n; payable');assert.equal(payable(9999),9999);assert.equal(payable(10000),9000);assert.equal(payable(10001),9001);assert.throws(()=>payable(-1));assert.throws(()=>payable(99.99));
});
