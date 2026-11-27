import test from 'node:test';
import assert from 'node:assert/strict';
import {getCareerReadingGuide,careerReadingGuideTranslations} from '../src/career-reading-guide.js';
import content from '../src/content/career-exploration.json' with {type:'json'};
import sources from '../src/content/career-exploration-sources.json' with {type:'json'};

test('every career has concise distinct reading copy grounded in its current public material',()=>{
 const questions=new Set(),outputs=new Set();
 for(const [id,role] of Object.entries(content)){
  const guide=getCareerReadingGuide(id),en=getCareerReadingGuide(id,'en');
  assert.ok(guide,id);assert.equal(guide.sourceVersion,role.version);
  assert.deepEqual(guide.sourceIds,role.occupation.sourceIds);
  assert.ok(guide.sourceIds.every(source=>sources.some(s=>s.id===source)));
  for(const field of ['question','answer','boundary','firstMove']){
   assert.ok(guide[field].length>5,id+' '+field);assert.ok(en[field].length>5);
   assert.notEqual(guide[field],en[field]);assert.equal(careerReadingGuideTranslations[guide[field]],en[field]);
  }
  assert.equal(guide.workMoments.length,3);
  for(let i=0;i<3;i++)for(const field of ['title','text','output']){
   assert.ok(guide.workMoments[i][field]);assert.ok(en.workMoments[i][field]);
   assert.equal(careerReadingGuideTranslations[guide.workMoments[i][field]],en.workMoments[i][field]);
  }
  for(const fields of Object.values(guide.basisFields))for(const path of fields){
   assert.notEqual(path.split('.').reduce((value,key)=>value?.[key],role),undefined,id+' '+path);
  }
  questions.add(guide.question);outputs.add(guide.workMoments.map(m=>m.output).join('|'));
 }
 assert.equal(questions.size,10);assert.equal(outputs.size,10);
 assert.equal(getCareerReadingGuide('missing'),null);
 assert.equal(getCareerReadingGuide('__proto__'),null);
});

test('editorial summaries preserve important role distinctions and cannot mutate source records',()=>{
 const data=getCareerReadingGuide('data'),ai=getCareerReadingGuide('ai'),ops=getCareerReadingGuide('ops');
 assert.match(data.boundary,/数据工程/);assert.match(ai.boundary,/算法研究.*平台工程/);assert.match(ops.boundary,/DevOps.*SRE/);
 assert.match(getCareerReadingGuide('testing').boundary,/不单独.*上线/);
 assert.match(getCareerReadingGuide('backend').workMoments[0].text,/页面.*按钮/);
 const original=content.data.occupation.sourceIds.slice();data.sourceIds.push('synthetic-untrusted');data.basisFields.answer.push('changed');
 assert.deepEqual(content.data.occupation.sourceIds,original);
 assert.ok(!getCareerReadingGuide('data').basisFields.answer.includes('changed'));
 assert.ok(!getCareerReadingGuide('data').sourceIds.includes('synthetic-untrusted'));
});
