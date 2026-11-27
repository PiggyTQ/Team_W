import test from 'node:test';
import assert from 'node:assert/strict';
import {skillTeaching,teachingRevision,teachingFeedback} from '../src/skill-teaching.js';
import curriculum from '../src/i18n/skill-learning-curriculum.json' with {type:'json'};
import {getSkillTree} from '../server/skill-trees/index.mjs';
import {readSkillWork,writeSkillWork} from '../src/skill-learning-model.js';

test('123 actual skills have complete bilingual teaching packets and distinct classroom questions',()=>{
 assert.deepEqual(Object.keys(skillTeaching).sort(),Object.keys(curriculum).sort());
 const unique=new Set();
 const pair=(p,context)=>{assert.equal(p.length,2,context);assert.ok(p.every(s=>typeof s==='string'&&s.trim()),context);assert.doesNotMatch(p[1],/[\u3400-\u9fff]/,context);};
 for(const [key,p] of Object.entries(skillTeaching)){
  pair(p.title,key);assert.ok(p.explain.length>=2,key);p.explain.forEach(v=>pair(v,key));
  pair(p.worked.given,key);pair(p.worked.result,key);assert.ok(p.worked.steps.length>=3,key);
  p.worked.steps.forEach(s=>{pair(s.title,key);pair(s.detail,key);});
  Object.values(p.pitfall).forEach(v=>pair(v,key));pair(p.check.prompt,key);
  assert.equal(p.check.options.length,3,key);assert.equal(new Set(p.check.options.map(o=>o.id)).size,3,key);
  assert.ok(p.check.options.some(o=>o.id===p.check.correct),key);
  p.check.options.forEach(o=>{pair(o.text,key);pair(o.feedback,key);});
  pair(p.transfer.prompt,key);pair(p.transfer.sample,key);assert.ok(p.transfer.criteria.length>=2,key);p.transfer.criteria.forEach(v=>pair(v,key));
  assert.ok(p.sourceUrls.length,key);p.sourceUrls.forEach(url=>assert.equal(new URL(url).protocol,'https:',key));
  const [career,id]=key.split(':'),leaf=getSkillTree(career).branches.flatMap(b=>b.leaves).find(l=>l.id===id);
  assert.ok(leaf,key);assert.ok(!leaf.questions.some(q=>q.prompt[0]===p.check.prompt[0]),key+' duplicates final assessment');
  unique.add(p.check.prompt[0]);
 }
 assert.equal(unique.size,123);
});
test('classroom feedback is revision-bound, persists separately and never creates final answers',()=>{
 const packet=skillTeaching['security:threat-model'];
 for(const choice of packet.check.options){
  const state={teachingChoice:choice.id,teachingChecked:true,teachingRevision:teachingRevision(packet),teachingTransfer:'My open explanation'};
  const draft=writeSkillWork({artifact:'Existing practice artifact',reflection:'Existing review',lessonState:state,answers:{q1:'a'}});
  const work=readSkillWork(draft),feedback=teachingFeedback(packet,work.lessonState);
  assert.equal(feedback.correct,choice.id===packet.check.correct);assert.deepEqual(feedback.feedback,choice.feedback);
  assert.deepEqual(work.answers,{q1:'a'});assert.equal(work.artifact,'Existing practice artifact');
  assert.equal(work.lessonState.teachingTransfer,state.teachingTransfer);
  assert.equal(teachingFeedback(packet,{...state,teachingRevision:'old'}),null);
  assert.equal(teachingFeedback(packet,{...state,teachingChecked:false}),null);
 }
});
