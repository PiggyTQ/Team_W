import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

// Bridge only NEW revisions of the four retained projects. Original v1/v2 bytes are never rewritten.
export async function branchLegacyPractice({root=path.resolve('course-packs/growth'),id,version=3}){
 if(!['quality','ai-eval','log','restore'].includes(id)||!Number.isInteger(version)||version<3)throw Error('NEW_LEGACY_REVISION_REQUIRED');
 const source=path.resolve('course-packs/practice-20261113',id),target=path.resolve(root,id,String(version));
 if(!target.startsWith(path.resolve(root)+path.sep))throw Error('INVALID_TARGET');
 try{await fs.stat(target);throw Error('VERSION_DIRECTORY_EXISTS');}catch(error){if(error.code!=='ENOENT')throw error;}
 const catalogFile=path.join(root,'catalog.json'),catalog=JSON.parse(await fs.readFile(catalogFile,'utf8')),old=catalog.projects.find(p=>p.id===id);
 if(!old)throw Error('MISSING_LEGACY_REGISTRY');
 await fs.cp(source,target,{recursive:true,errorOnExist:true,force:false});await fs.mkdir(path.join(target,'input'),{recursive:true});
 const original=await fs.readFile(path.join(source,'project.json'),'utf8'),guided=JSON.parse(original);guided.version=version;
 const project={...old,version,status:'local_trial',adapter:'legacy-guided',requiredFiles:['record.md','review.md'],handoffs:[],guidedProject:guided};
 const save=(name,value)=>fs.writeFile(path.join(target,name),typeof value==='string'?value:JSON.stringify(value,null,2));
 await save('original-project.json',original);await save('project.json',project);await save('assignment.md',await fs.readFile(path.join(source,'practice/task.md'),'utf8'));await save('rubric.json',{kind:'retained-guided-project',review:guided.steps.map(s=>s.id),humanReview:'pending'});
 await save('input/fixture.json',guided.dataset);await save('input/dictionary.md',guided.dataset.columns.map(c=>c.id+' — '+c.label.zh+' / '+c.label.en).join('\n'));
 await save('reference/model.mjs',await fs.readFile('src/practice-project-model.js','utf8'));
 const verify=`import fs from 'node:fs/promises';\nimport assert from 'node:assert/strict';\nimport {projectStepIssue,createProjectDeliverable} from './model.mjs';\nconst p=JSON.parse(await fs.readFile(new URL('../project.json',import.meta.url),'utf8')).guidedProject;\nconst practice={role:'member',scope:'core',responses:Object.fromEntries(p.steps.map(s=>[s.id,{choice:s.choices[0].id,evidence:p.dataset.rows.slice(0,s.minEvidence).map(r=>r.id),note:'Synthetic reference reasoning based on the retained selected evidence.',...(s.id==='delivery'?{contribution:'Local reference reproduction.',limits:'No independent mastery or real employment claim.'}:{})}]))};\nif(process.argv.includes('--counterexample'))practice.responses.evidence.evidence=[];\nassert.ok(p.steps.every(s=>!projectStepIssue(s,practice)));\nconst result=createProjectDeliverable(p,practice,'en');\nassert.ok(result.document.length>0);\nconsole.log(JSON.stringify({project:p.id,version:p.version,passed:true,scope:'Retained guided validation only; self-report remains separate'}));\n`;
 await save('reference/solution.mjs',verify);await save('verify.mjs',"await import('./reference/solution.mjs');\n");
 const run=spawnSync(process.execPath,['verify.mjs','--reference'],{cwd:target,encoding:'utf8',timeout:10000}),negative=spawnSync(process.execPath,['verify.mjs','--counterexample'],{cwd:target,encoding:'utf8',timeout:10000});
 if(run.status!==0||negative.status===null||negative.status===0)throw Error('LEGACY_REFERENCE_FAILED');
 await save('reference/result.json',JSON.parse(run.stdout));await save('reference/execution.json',{run:run.stdout,negativeExit:negative.status,at:new Date().toISOString(),runtime:process.version});
 const zip=spawnSync('python',['-c',"import pathlib,zipfile; z=zipfile.ZipFile('project.zip','w',zipfile.ZIP_DEFLATED); [z.write(f,f.as_posix()) for f in pathlib.Path('.').rglob('*') if f.is_file() and f.name not in ['manifest.json','project.zip']]; z.close()"],{cwd:target,encoding:'utf8'});if(zip.status!==0)throw Error('ARCHIVE_FAILED');
 const files=[];async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else{const bytes=await fs.readFile(file);files.push({path:path.relative(target,file).split(path.sep).join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}await walk(target);
 await save('manifest.json',{schemaVersion:3,projectId:id,version,status:'candidate-local-trial',files});
 catalog.projects=catalog.projects.map(p=>p.id===id?project:p);await fs.writeFile(catalogFile,JSON.stringify(catalog,null,2));
 return {id,version,parentVersion:2,state:'candidate_local_trial',target};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await branchLegacyPractice({id:process.argv[2],version:Number(process.argv[3]||3)})));
