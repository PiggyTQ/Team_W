import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import {sqlSeed,rawQuery,correctedQuery,checkSqlResult,checkDecision,checkHandoff} from '../src/skill-practice-tasks.js';
import {readSkillWork,writeSkillWork,updatePracticeTask,skillPreparation} from '../src/skill-learning-model.js';
import {normalizeSkillStudy} from '../src/skill-tree-model.js';

test('browser SQLite engine executes three teaching datasets; output checking catches grain/null/key failures',async()=>{
 const SQL=await initSqlJs();
 for(const mode of ['guided','debug','independent']){
  const db=new SQL.Database();
  try{
   db.exec(sqlSeed(mode));db.exec('PRAGMA hard_heap_limit=16777216;PRAGMA query_only=ON;');
   const output=q=>{const r=db.exec(q)[0];return {columns:r.columns,rows:r.values};};
   assert.equal(checkSqlResult(mode,output(rawQuery)).passed,false);
   const fixed=output(correctedQuery);assert.equal(checkSqlResult(mode,fixed).passed,true);
   assert.equal(checkSqlResult(mode,{...fixed,rows:fixed.rows.slice(0,-1)}).passed,false);
   assert.equal(checkSqlResult(mode,{...fixed,rows:fixed.rows.map(r=>r.map(x=>x===null?0:x))}).passed,false);
   assert.throws(()=>db.exec('DELETE FROM orders'),/readonly/i);
  }finally{db.close();}
 }
});
test('decision feedback names the omitted OR cases and the exact threshold',()=>{
 assert.deepEqual(checkDecision('independent',{r0:'0',r1:'6',r2:'6',r3:'6',edge:'6'}).issues,['r1','r2','edge']);
 assert.equal(checkDecision('independent',{r0:'0',r1:'0',r2:'0',r3:'6',edge:'0'}).passed,true);
 assert.equal(checkDecision('debug',{r0:'0',r1:'0',r2:'0',r3:'6',edge:'0'}).passed,false);
});
test('handoff checks only structure/reference/time; it does not certify the free-text conclusion',()=>{
 const fields={facts:'Unknown root cause',evidence:'L17',unknown:'Adjacent service not examined',actions:'Investigate',owner:'Synthetic A',update:'02:20Z'};
 assert.equal(checkHandoff('independent',fields).passed,true);
 assert.deepEqual(checkHandoff('independent',{...fields,evidence:'L99',update:'soon'}).issues,['reference','timezone']);
 assert.deepEqual(checkHandoff('independent',{...fields,update:'99:99Z'}).issues,['timezone']);
 assert.equal(checkHandoff('independent',{...fields,facts:''}).passed,false);
});
test('task answers, viewed hints and reviews stay separate; edits invalidate prior checks without removing legacy text',()=>{
 const legacy='Original saved work '+('x'.repeat(10000));
 let w=readSkillWork(legacy);w=updatePracticeTask(w,'guided',{artifact:'guided query',hints:['start'],check:{kind:'sql-output',passed:true,issues:[]},reviewed:true},'sql');
 w=updatePracticeTask(w,'independent',{artifact:correctedQuery,reflection:'I checked each key and retained null for unmatched lines.',check:{kind:'sql-output',passed:true,issues:[]},reviewed:true},'sql');
 const saved=readSkillWork(writeSkillWork(w));assert.equal(saved.legacy.artifact,legacy);assert.equal(saved.tasks.guided.artifact,'guided query');assert.deepEqual(saved.tasks.guided.hints,['start']);assert.equal(saved.tasks.independent.reviewed,true);
 assert.equal(skillPreparation({read:true,draft:writeSkillWork(saved)}).ready,true);
 const edited=updatePracticeTask(saved,'independent',{artifact:rawQuery},'sql');assert.equal(edited.tasks.independent.check,undefined);assert.equal(edited.tasks.independent.reviewed,false);assert.equal(edited.tasks.guided.reviewed,true);assert.equal(skillPreparation({read:true,draft:writeSkillWork(edited)}).ready,false);
 normalizeSkillStudy({'data:sql-joins:v1':{read:true,draft:writeSkillWork(saved)}});
});
