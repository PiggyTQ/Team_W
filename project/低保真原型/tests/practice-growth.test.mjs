import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createBusinessStore} from '../server/business-store.mjs';
import {createBusinessCommands} from '../server/business-commands.mjs';
import {importGrowthPack} from '../server/practice-growth/library.mjs';
import {importCoursePack} from '../server/course-library.mjs';
import {checkGrowthArtifact} from '../server/practice-growth/checker.mjs';
import {maintainContent,applyContentDecision} from '../scripts/practice-content.mjs';
import {branchLegacyPractice} from '../scripts/branch-legacy-practice.mjs';
import {generateVariant} from '../server/practice-growth/variants.mjs';
import {getSkillTree} from '../server/skill-trees/index.mjs';
import {spawnSync} from 'node:child_process';

const root=path.resolve('course-packs/growth'),read=async name=>JSON.parse(await fs.readFile(path.join(root,name),'utf8'));
const registry=await read('catalog.json'),projects=registry.projects.filter(p=>!p.legacy);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(t,trials=true){
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('learner'),('other');");
 const business=createBusinessStore(db,{allowLocalTrials:trials}),commands=createBusinessCommands({db,business});t.after(()=>db.close());
 const save=state=>business.save('learner',{state,baseVersion:business.read('learner').revision,mutationId:randomUUID()});
 const command=(type,payload,user='learner')=>commands.execute(user,{type,payload,baseVersion:business.read(user).revision,mutationId:randomUUID()});
 const current=id=>business.read('learner').state.tasks.find(t=>t.id===id);
 const act=(type,id,more={})=>command(type,{taskId:id,taskVersion:current(id).version,...more});
 const draft=(id,value)=>{const state=business.read('learner').state;Object.assign(state.tasks.find(t=>t.id===id),{draft:JSON.stringify(value),contribution:'Synthetic QA: I reproduced the bounded fixture.',selfcheck:false});save(state);};
 return {db,business,save,command,current,act,draft};
}

test('36 identities, 10 connected routes, precise skill leaves and complete hashed materials',async()=>{
 assert.equal(registry.projects.length,36);assert.equal(projects.length,32);assert.equal(registry.projects.filter(p=>p.kind==='cross-career').length,6);
 assert.equal(Object.keys(registry.progression).length,10);
 for(const p of projects){
  const manifest=await read(`${p.id}/${p.version}/manifest.json`),input=await read(`${p.id}/${p.version}/input/fixture.json`),artifact=await read(`${p.id}/${p.version}/reference/artifact.json`),bad=await read(`${p.id}/${p.version}/reference/counterexample.json`);
  assert.ok(p.skills.every(id=>getSkillTree(p.career).branches.some(b=>b.leaves.some(l=>l.id===id))));
  for(const item of manifest.files){const bytes=await fs.readFile(path.join(root,p.id,String(p.version),item.path));assert.equal(hash(bytes),item.sha256);assert.equal(bytes.length,item.bytes);}
  assert.ok(manifest.files.some(a=>a.path==='project.zip'));
  assert.equal(checkGrowthArtifact(p,input,JSON.stringify(artifact)).passed,true,p.id);
  assert.equal(checkGrowthArtifact(p,input,JSON.stringify(bad)).passed,false,p.id);
  const oversized={files:{'notes.md':'字'.repeat(40000)}};assert.equal(checkGrowthArtifact(p,input,JSON.stringify(oversized)).passed,false);
  if(p.handoffs.length){const handoffBad=await read(`${p.id}/${p.version}/reference/handoff-counterexample.json`);const check=checkGrowthArtifact(p,input,JSON.stringify(handoffBad));assert.equal(check.passed,false);assert.ok(check.checks.some(c=>c.id.startsWith('consumer:')&&!c.passed));}
  for(const value of ['{}','{"files":[]}','{"files":{"../escape":"x"}}','{"files":{"result.json":5}}'])assert.equal(checkGrowthArtifact(p,input,value).passed,false,p.id);
 }
});

test('retained four projects complete through their original guided flow and v1 remains readable and completable',async t=>{
 const f=fixture(t);importCoursePack(f.db,path.resolve('../资料收集/展示资料包_20261027'));importCoursePack(f.db,path.resolve('course-packs/practice-20261113'));
 for(const id of ['quality','ai-eval','log','restore']){
  const p=f.business.courseLibrary.course(id,2).project;
  const taskId=f.command('task.create',{draft:{template:id,title:'Retained '+id,purpose:'Original guided flow '+id,hours:1,courseVersion:2},confirmation:'CREATE_TASK'}).refs.taskId;
  const state=f.business.read('learner').state,task=state.tasks.find(t=>t.id===taskId);
  task.projectPractice={role:'member',scope:'core',responses:Object.fromEntries(p.steps.map(step=>[step.id,{choice:step.choices[0].id,evidence:p.dataset.rows.slice(0,step.minEvidence).map(r=>r.id),note:'Synthetic reference reasoning, bounded by the selected evidence.',...(step.id==='delivery'?{contribution:'Synthetic QA original scope.',limits:'No real corporate work or independent mastery.'}:{})}]))};f.save(state);
  f.act('task.submit',taskId,{confirmation:'SUBMIT_ATTEMPT'});f.act('task.selfcheck',taskId,{confirmation:'SELF_CHECK_ONLY',attemptId:f.current(taskId).attempts.at(-1).id});f.act('task.complete',taskId,{confirmation:'COMPLETE_LIMITED_SCOPE'});assert.equal(f.current(taskId).completed,true);
 }
 const id=f.command('task.create',{draft:{template:'quality',title:'Old material',purpose:'v1 compatibility',hours:1,courseVersion:1},confirmation:'CREATE_TASK'}).refs.taskId;
 const state=f.business.read('learner').state;Object.assign(state.tasks.find(t=>t.id===id),{draft:'Retained v1 original submission; synthetic QA.',contribution:'Original v1 compatibility record.'});f.save(state);
 f.act('task.submit',id,{confirmation:'SUBMIT_ATTEMPT'});f.act('task.selfcheck',id,{confirmation:'SELF_CHECK_ONLY',attemptId:f.current(id).attempts.at(-1).id});
 const review=f.business.read('learner').state;review.tasks.find(t=>t.id===id).selfcheck=true;f.save(review);f.act('task.complete',id,{confirmation:'COMPLETE_LIMITED_SCOPE'});
 assert.equal(f.current(id).courseVersion,1);assert.equal(f.current(id).completed,true);assert.equal(f.business.read('learner').state.tasks.filter(t=>t.completed).length,5);
});

test('32 independent tasks: wrong, missing, corrected, stale, submit, review, archive, candidate and account isolation',async t=>{
 const f=fixture(t);let state=f.business.read('learner').state;state.budget=168;state.skillStudy={'data:metric-definition:v1':{read:true,draft:'Retained independent learning draft'}};f.save(state);
 const oldLeaves=JSON.stringify(f.business.read('learner').state.skillStudy);
 for(const p of projects){
  const input=await read(`${p.id}/1/input/fixture.json`),artifact=await read(`${p.id}/1/reference/artifact.json`),bad=await read(`${p.id}/1/reference/counterexample.json`);
  const id=f.command('task.create',{draft:{title:p.title.zh,template:p.id,purpose:p.brief.zh,career:p.career,hours:1},confirmation:'CREATE_TASK'}).refs.taskId;
  f.draft(id,bad);f.act('project.evaluate',id);assert.equal(f.current(id).projectCheck.passed,false,p.id);
  assert.throws(()=>f.act('task.submit',id,{confirmation:'SUBMIT_ATTEMPT'}),{code:'PROJECT_STEPS_CHANGED'});
  f.draft(id,{});f.act('project.evaluate',id);assert.equal(f.current(id).projectCheck.passed,false);
  f.draft(id,artifact);f.act('project.evaluate',id);assert.equal(f.current(id).projectCheck.passed,true,p.id);
  assert.equal(f.current(id).projectCheck.masteryGranted,false);assert.equal(f.current(id).projectCheck.inputDigest,hash(JSON.stringify(input)));assert.equal(f.current(id).projectCheck.expectedDigest,hash(JSON.stringify(JSON.parse(artifact.files['result.json']))));assert.match(f.current(id).projectCheck.checkerDigest,/^[a-f0-9]{64}$/);
  const receipt=structuredClone(f.current(id).projectCheck),changed=structuredClone(artifact);changed.files['notes.md']+='\nChanged draft';f.draft(id,changed);
  assert.throws(()=>f.act('task.submit',id,{confirmation:'SUBMIT_ATTEMPT'}),{code:'PROJECT_STEPS_CHANGED'});
  f.act('project.evaluate',id);f.act('task.submit',id,{confirmation:'SUBMIT_ATTEMPT'});
  const attempt=f.current(id).attempts.at(-1);f.act('task.selfcheck',id,{confirmation:'SELF_CHECK_ONLY',attemptId:attempt.id});f.act('task.complete',id,{confirmation:'COMPLETE_LIMITED_SCOPE'});
  assert.equal(f.current(id).completed,true);
  const candidate=f.act('evidence.candidates',id,{attemptId:attempt.id,entries:[{skill:p.skills[0],scope:'Bounded fixture; self-reported',location:'result.json'}],contribution:'Synthetic QA contribution',confirmation:'GENERATE_CANDIDATES'});
  assert.ok(candidate.refs.claimIds.length);assert.equal(f.business.read('learner').state.claims.at(-1).status,'待确认');assert.equal(f.current(id).courseRef.version,1);assert.notEqual(f.current(id).projectCheck.artifactDigest,receipt.artifactDigest);
  assert.throws(()=>f.command('project.evaluate',{taskId:id,taskVersion:1},'other'),{code:'NOT_FOUND'});
 }
 assert.equal(f.business.read('learner').state.tasks.filter(t=>t.completed).length,32);assert.equal(f.business.read('other').state.tasks.length,0);
 await fs.writeFile('checks/practice-growth-20261126/workspace-size.json',JSON.stringify({syntheticOnly:true,tasks:32,candidates:f.business.read('learner').state.claims.length,utf8Bytes:Buffer.byteLength(JSON.stringify(f.business.read('learner').state))},null,2));
 assert.equal(JSON.stringify(f.business.read('learner').state.skillStudy),oldLeaves);
 state=f.business.read('learner').state;state.tasks[0].projectCheck.passed=false;assert.throws(()=>f.save(state),{code:'SERVER_RECORD_PROTECTED'});
});

test('incremental import keeps v1/v2 hashes and personal business data, and repeats without duplicates',async t=>{
 const f=fixture(t,false);importCoursePack(f.db,path.resolve('../资料收集/展示资料包_20261027'));importCoursePack(f.db,path.resolve('course-packs/practice-20261113'));
 const oldTask=f.command('task.create',{draft:{title:'Retained old task',template:'quality',courseVersion:1,purpose:'Original saved practice',hours:1},confirmation:'CREATE_TASK'}).refs.taskId;
 let state=f.business.read('learner').state;state.preferences.interest='Private history remains private';state.aiNotes=[{id:'kept-note',body:'private note',title:'private'}];state.reading={quality:{version:1,chapter:2}};state.tasks.find(t=>t.id===oldTask).draft='Original unfinished v1 draft';f.save(state);
 const before=f.business.read('learner'),hashes=f.db.prepare('SELECT course_id,version,pack_hash FROM course_versions ORDER BY course_id,version').all();
 assert.equal(importGrowthPack(f.db,root).imported,32);assert.equal(importGrowthPack(f.db,root).unchanged,32);
 assert.deepEqual(f.business.read('learner'),before);assert.deepEqual(f.db.prepare('SELECT course_id,version,pack_hash FROM course_versions WHERE course_id IN (\'quality\',\'ai-eval\',\'log\',\'restore\') ORDER BY course_id,version').all(),hashes);
 assert.equal(f.business.courseLibrary.course('quality',1).chapters.length,4);assert.equal(f.business.courseLibrary.course('quality',2).project.steps.length,4);
 assert.equal(f.business.courseLibrary.course(projects[0].id).canStart,false);
});

test('upgrading A and adding C preserve B; a later conflicting version rolls the whole import back',async t=>{
 const f=fixture(t),temporary=await fs.mkdtemp(path.join(tmpdir(),'avemly-version-proof-'));t.after(()=>fs.rm(temporary,{recursive:true,force:true}));
 const a=projects[0],b=projects[1],before=f.db.prepare('SELECT course_id,version,pack_hash FROM course_versions ORDER BY course_id,version').all();
 async function prepare(source,id,version){
  const folder=path.join(temporary,id,String(version));await fs.cp(path.join(root,source,'1'),folder,{recursive:true});
  const project=JSON.parse(await fs.readFile(path.join(folder,'project.json'),'utf8'));project.id=id;project.version=version;
  await fs.writeFile(path.join(folder,'project.json'),JSON.stringify(project,null,2));
  const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));manifest.projectId=id;manifest.version=version;
  for(const file of manifest.files){const bytes=await fs.readFile(path.join(folder,file.path));file.sha256=hash(bytes);file.bytes=bytes.length;}
  await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2));return {...project,title:project.title};
 }
 const a2=await prepare(a.id,a.id,2);await fs.writeFile(path.join(temporary,'catalog.json'),JSON.stringify({schemaVersion:3,projects:[a2]}));assert.equal(importGrowthPack(f.db,temporary).imported,1);
 const c=await prepare(a.id,'independent-added',1);await fs.writeFile(path.join(temporary,'catalog.json'),JSON.stringify({schemaVersion:3,projects:[c]}));assert.equal(importGrowthPack(f.db,temporary).imported,1);
 for(const row of before)assert.equal(f.db.prepare('SELECT pack_hash FROM course_versions WHERE course_id=? AND version=?').get(row.course_id,row.version).pack_hash,row.pack_hash);
 const a3=await prepare(a.id,a.id,3),conflict=await prepare(b.id,b.id,1);conflict.title={...conflict.title,en:'conflicting test'};
 const manifestFile=path.join(temporary,b.id,'1/manifest.json');const m=JSON.parse(await fs.readFile(manifestFile,'utf8'));m.testConflict=true;await fs.writeFile(manifestFile,JSON.stringify(m));
 await fs.writeFile(path.join(temporary,'catalog.json'),JSON.stringify({schemaVersion:3,projects:[a3,conflict]}));assert.throws(()=>importGrowthPack(f.db,temporary),{code:'COURSE_VERSION_EXISTS'});
 assert.equal(f.db.prepare('SELECT * FROM course_versions WHERE course_id=? AND version=3').get(a.id),undefined);assert.equal(f.db.prepare('SELECT content_version FROM courses WHERE id=?').get(a.id).content_version,2);
});

test('a retained project can branch an independent v3 without rewriting or republishing its v1/v2 or other careers',async t=>{
 const f=fixture(t);importCoursePack(f.db,path.resolve('../资料收集/展示资料包_20261027'));importCoursePack(f.db,path.resolve('course-packs/practice-20261113'));
 const temporary=await fs.mkdtemp(path.join(tmpdir(),'avemly-legacy-branch-'));t.after(()=>fs.rm(temporary,{recursive:true,force:true}));
 await fs.writeFile(path.join(temporary,'catalog.json'),JSON.stringify({schemaVersion:3,projects:[registry.projects.find(p=>p.id==='quality')]}));
 const old=f.db.prepare('SELECT course_id,version,pack_hash FROM course_versions ORDER BY course_id,version').all();
 const result=await branchLegacyPractice({root:temporary,id:'quality',version:3});assert.equal(result.version,3);assert.equal(importGrowthPack(f.db,temporary).imported,1);
 assert.equal(f.business.courseLibrary.course('quality',3).status,'local_trial');assert.equal(f.business.courseLibrary.course('quality',3).project.steps.length,4);
 assert.equal(f.business.courseLibrary.course('quality',1).status,'published');assert.equal(f.business.courseLibrary.course('quality',2).status,'published');assert.equal(f.business.courseLibrary.course('log').content_version,2);
 for(const row of old)assert.equal(f.db.prepare('SELECT pack_hash FROM course_versions WHERE course_id=? AND version=?').get(row.course_id,row.version).pack_hash,row.pack_hash);
 assert.equal(importGrowthPack(f.db,temporary).unchanged,1);await assert.rejects(branchLegacyPractice({root:temporary,id:'quality',version:3}),/VERSION_DIRECTORY_EXISTS/);
});

test('local trials are explicit; retired projects cannot start and retain frozen historical material',t=>{
 const f=fixture(t);const id=projects[0].id,old=f.business.courseLibrary.course(id,1);
 assert.equal(old.status,'local_trial');applyContentDecision(f.db,{id,version:1,packHash:old.packHash,state:'retired',retirement:{reason:'Synthetic QA retirement'}});
 assert.equal(f.business.courseLibrary.course(id,1).status,'retired');assert.equal(f.business.courseLibrary.course(id,1).canStart,false);
 assert.equal(f.business.courseLibrary.course(id,1).packHash,old.packHash);
 assert.throws(()=>f.command('task.create',{draft:{template:id,title:'retired',purpose:'retired',hours:1},confirmation:'CREATE_TASK'}),{code:'COURSE_NOT_READY'});
});

test('six variants freeze distinct inputs, reject illegal combinations and bind task identity',async t=>{
 const f=fixture(t),p=projects.find(p=>p.id==='retry-concurrency');
 for(const v of p.instances){
  const entry=await read(`${p.id}/1/${v.asset}`);assert.equal(hash(JSON.stringify(entry.input)),v.inputDigest);
  const result=generateVariant(p,await read(`${p.id}/1/input/fixture.json`),{family:'api',seed:v.seed,capacity:v.seed});assert.deepEqual(entry,result);
 }
 assert.throws(()=>generateVariant(p,{}, {family:'api',seed:1,capacity:0}));
 const id=f.command('task.create',{draft:{template:p.id,title:'Variant',purpose:'Variant test',hours:1,practiceInstance:p.instances[0].id},confirmation:'CREATE_TASK'}).refs.taskId;
 assert.equal(f.current(id).practiceInstance,p.instances[0].id);
 const state=f.business.read('learner').state;state.tasks[0].practiceInstance=p.instances[1].id;assert.throws(()=>f.save(state),{code:'SERVER_RECORD_PROTECTED'});
});

test('six frozen instances execute through the downloadable runner with independent business assertions',async t=>{
 const f=fixture(t);
 const temporary=await fs.mkdtemp(path.join(tmpdir(),'avemly-instance-runner-'));t.after(()=>fs.rm(temporary,{recursive:true,force:true}));
 const evidence=[];
 for(const id of ['multi-source-analysis','retry-concurrency','alert-rule-regression']){
  const p=projects.find(p=>p.id===id),folder=path.join(temporary,id);await fs.cp(path.join(root,id,'1'),folder,{recursive:true});await fs.copyFile('public/practice-tools/instance-runner-1.mjs',path.join(folder,'instance-runner-1.mjs'));
  for(const instance of p.instances){
   const args=['instance-runner-1.mjs',instance.id,'--reference',...(id==='multi-source-analysis'?['--sql']:id==='retry-concurrency'?['--http']:[])];
   const run=spawnSync(process.execPath,args,{cwd:folder,encoding:'utf8',timeout:15000});assert.equal(run.status,0,id+' '+run.stderr);
   const output=JSON.parse(await fs.readFile(path.join(folder,'result.json'),'utf8'));
   if(id==='multi-source-analysis'){assert.equal(output.length,instance.seed===1?3:4);assert.equal(output[0].ordered,12000);assert.equal(output[0].paid,instance.seed===1?13000:12000);if(instance.seed===2)assert.equal(output.at(-1).paid,0);}
   if(id==='retry-concurrency'){assert.equal(output.remaining,instance.seed-1);assert.equal(output.committed,1);assert.deepEqual(output.responses.map(r=>r.status),[201,201,409,409]);}
   if(id==='alert-rule-regression')assert.deepEqual(output.map(r=>r.firing),instance.seed===1?[false,false,true,false,false,false]:[false,true,false,false,false,false]);
   const original=await read(`${id}/1/reference/artifact.json`),data=await read(`${id}/1/${instance.asset}`),artifact=structuredClone(original);artifact.files['result.json']=JSON.stringify(output);if(artifact.files['rules.json'])artifact.files['rules.json']=JSON.stringify(data.input.rule);
   const taskId=f.command('task.create',{draft:{template:id,title:'Frozen instance '+instance.id,purpose:'Frozen instance '+instance.id,hours:1,practiceInstance:instance.id,career:'frontend'},confirmation:'CREATE_TASK'}).refs.taskId;assert.equal(f.current(taskId).career,p.career);
   f.draft(taskId,artifact);f.act('project.evaluate',taskId);assert.equal(f.current(taskId).projectCheck.passed,true);assert.equal(f.current(taskId).projectCheck.instance,instance.id);f.act('task.submit',taskId,{confirmation:'SUBMIT_ATTEMPT'});f.act('task.selfcheck',taskId,{attemptId:f.current(taskId).attempts.at(-1).id,confirmation:'SELF_CHECK_ONLY'});f.act('task.complete',taskId,{confirmation:'COMPLETE_LIMITED_SCOPE'});assert.equal(f.current(taskId).completed,true);
   evidence.push({projectId:id,instance:instance.id,passed:true,receipt:JSON.parse(run.stdout)});
  }
 }
 for(const p of projects.filter(p=>p.adapter==='rules')){
  const folder=path.join(temporary,p.id);if(p.id!=='alert-rule-regression'){await fs.cp(path.join(root,p.id,'1'),folder,{recursive:true});await fs.copyFile('public/practice-tools/instance-runner-1.mjs',path.join(folder,'instance-runner-1.mjs'));}
  const bad=spawnSync(process.execPath,['instance-runner-1.mjs','base'],{cwd:folder,encoding:'utf8',timeout:15000});assert.notEqual(bad.status,0);
  const artifact=await read(`${p.id}/1/reference/artifact.json`);await fs.writeFile(path.join(folder,'rules.json'),artifact.files['rules.json']);
  const repaired=spawnSync(process.execPath,['instance-runner-1.mjs','base'],{cwd:folder,encoding:'utf8',timeout:15000});assert.equal(repaired.status,0,repaired.stderr);evidence.push({projectId:p.id,baseConfiguration:{wrongFailed:true,repairedPassed:true},receipt:JSON.parse(repaired.stdout)});
 }
 await fs.writeFile('checks/practice-growth-20261126/instance-runner.json',JSON.stringify(evidence,null,2));
});

test('content maintenance operates locally and refuses publication without actual rights, review, pilot and maintainer',async t=>{
 const folder=await fs.mkdtemp(path.join(tmpdir(),'avemly-maintenance-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));const stateFile=path.join(folder,'state.json'),id=projects[0].id;
 await maintainContent({root,stateFile,action:'candidate',id});await maintainContent({root,stateFile,action:'source-review',id});await maintainContent({root,stateFile,action:'technical',id});await maintainContent({root,stateFile,action:'freeze',id});
 await assert.rejects(maintainContent({root,stateFile,action:'publish',id}),/PUBLICATION_REQUIREMENTS_PENDING/);
 await assert.rejects(maintainContent({root,stateFile,action:'review',id,record:{reviewer:'invented'}}),/ACTUAL_HUMAN_RECORD_REQUIRED/);
 await maintainContent({root,stateFile,action:'source-change',id,record:{sourceId:'method-reference',newDigest:'changed'}});
 const state=JSON.parse(await fs.readFile(stateFile,'utf8'));assert.equal(state.items[id+':1'].state,'frozen_local_trial');assert.equal(state.reviewQueue[0].status,'pending');assert.equal(state.audit.length,5);
});
