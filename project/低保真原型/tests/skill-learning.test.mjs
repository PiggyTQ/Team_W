import test from 'node:test';
import assert from 'node:assert/strict';
import curriculum from '../src/i18n/skill-learning-curriculum.json' with {type:'json'};
import {applicationTasks,gradeApplication} from '../server/skill-trees/application-tasks.mjs';
import {careers} from '../src/model.js';
import {getSkillTree,gradeSkillCheck} from '../server/skill-trees/index.mjs';
import {readSkillWork,writeSkillWork,skillPreparation,skillLearningScene} from '../src/skill-learning-model.js';
test('every skill has bilingual teaching cases, methods, sources and a distinct transfer application',()=>{
 let count=0;const tasks=new Set();
 for(const c of careers)for(const b of getSkillTree(c.id).branches)for(const leaf of b.leaves){
  const lesson=curriculum[c.id+':'+leaf.id],task=applicationTasks[leaf.id];count++;
  assert.ok(lesson&&task);assert.equal(lesson.examples.length,2);assert.ok(lesson.method.length>=3);
  for(const value of [lesson.goal,lesson.context,lesson.task,lesson.scope,...lesson.method,...lesson.examples.flatMap(e=>[e.situation,e.decision,e.reason]),task.prompt,task.feedback])assert.ok(value.length===2&&value.every(text=>typeof text==='string'&&text.trim()));
  assert.ok(lesson.sources.every(s=>s.url.startsWith('https://')));tasks.add(task.prompt[0]);
  assert.doesNotMatch(JSON.stringify(leaf),/"accepted"|"feedback"/);
  assert.ok(gradeApplication(leaf.id,task.accepted[0]));assert.ok(!gradeApplication(leaf.id,'invalid response'));
 }
 assert.equal(count,123);assert.equal(tasks.size,123);assert.equal(Object.keys(curriculum).length,123);assert.equal(Object.keys(applicationTasks).length,123);
});
test('two multiple-choice decisions cannot pass without the transfer application',()=>{
 const leaf=getSkillTree('data').branches[0].leaves[0];
 const answers={application:'wrong'};
 for(const q of leaf.questions){answers[q.id]=q.options.find(o=>{const trial={q1:'choice-1',q2:'choice-1',application:'7.5%',[q.id]:o.id};return gradeSkillCheck('data',leaf.id,1,trial).questions.find(r=>r.id===q.id).correct;}).id;}
 assert.equal(gradeSkillCheck('data',leaf.id,1,answers).passed,false);
 assert.equal(gradeSkillCheck('data',leaf.id,1,answers).correct,2);
 assert.equal(gradeSkillCheck('data',leaf.id,1,{...answers,application:'7.5%'}).passed,true);
 assert.throws(()=>gradeSkillCheck('data',leaf.id,1,{q1:answers.q1,q2:answers.q2}),{code:'SKILL_CHECK_INVALID'});
 assert.equal(gradeApplication('descriptive','-6'),false);
});
test('plain historical drafts survive; structured preparation is separate from mastery and restores sections/answers',()=>{
 assert.equal(readSkillWork('Historical private code').artifact,'Historical private code');
 const work={artifact:'Input A, B; use stable grain; show calculated output and cross-check row count.',reflection:'I compared distinct keys and totals and retained unresolved exceptions.',section:'method',answers:{q1:'choice-2',application:'7.5%'}};
 assert.deepEqual(readSkillWork(writeSkillWork(work)),work);
 assert.equal(skillPreparation({read:true,draft:'clicked'}).ready,false);
 assert.equal(skillPreparation({read:true,draft:writeSkillWork(work)}).ready,true);
 assert.equal(skillPreparation({draft:writeSkillWork(work)}).ready,false);
 const escaped={...work,artifact:'\\'.repeat(7500),reflection:'\\'.repeat(1600)};
 assert.deepEqual(readSkillWork(writeSkillWork(escaped)),escaped);
 assert.ok(writeSkillWork(escaped).length<=60000);
 assert.equal(skillLearningScene('study','learn'),'lesson');assert.equal(skillLearningScene('study','practice'),'lesson');assert.equal(skillLearningScene('study','check'),'assessment');assert.equal(skillLearningScene('overview','check'),'overview');
});
