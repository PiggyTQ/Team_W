// Explicit local content-maintenance CLI. This never opens the production DB.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

export function applyContentDecision(db,item){
 const material=db.prepare('SELECT pack_hash FROM course_versions WHERE course_id=? AND version=?').get(item.id,item.version);
 if(!material||material.pack_hash!==item.packHash)throw Error('FROZEN_VERSION_CHANGED');
 if(!['retired','approved_for_publication'].includes(item.state))throw Error('NO_APPROVED_DECISION');
 if(item.state==='approved_for_publication'&&(!item.sources?.redistributionCleared||!item.maintainer||item.review?.packHash!==item.packHash||item.pilot?.packHash!==item.packHash||item.frozen?.packHash!==item.packHash))throw Error('PUBLICATION_REQUIREMENTS_PENDING');
 db.exec('BEGIN IMMEDIATE');
 try{
  db.exec('CREATE TABLE IF NOT EXISTS practice_content_events(id INTEGER PRIMARY KEY,project_id TEXT,version INTEGER,decision TEXT,record_json TEXT,created_at TEXT)');
  db.prepare('UPDATE courses SET status=? WHERE id=?').run(item.state==='retired'?'retired':'published',item.id);
  db.prepare('INSERT INTO practice_content_events(project_id,version,decision,record_json,created_at) VALUES(?,?,?,?,?)').run(item.id,item.version,item.state,JSON.stringify(item),new Date().toISOString());
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}

export async function maintainContent({root=path.resolve('course-packs/growth'),stateFile=path.resolve('course-packs/growth-maintenance.json'),action,id,version=1,record={}}){
 if(!/^[a-z][a-z-]{1,50}$/.test(id)||!Number.isInteger(version)||version<1)throw Error('INVALID_IDENTITY');
 const folder=path.join(root,id,String(version)),manifestBytes=await fs.readFile(path.join(folder,'manifest.json'));
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),manifest=JSON.parse(manifestBytes),packHash=hash(manifestBytes);
 if(manifest.projectId!==id||manifest.version!==version)throw Error('INVALID_MANIFEST');
 for(const file of manifest.files){const actual=await fs.readFile(path.join(folder,file.path));if(hash(actual)!==file.sha256||actual.length!==file.bytes)throw Error('MATERIAL_CHANGED');}
 let state;try{state=JSON.parse(await fs.readFile(stateFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={schemaVersion:1,items:{},audit:[],reviewQueue:[]};}
 const key=id+':'+version,item=state.items[key]||{id,version,state:'candidate',packHash};
 if(item.packHash&&item.packHash!==packHash)throw Error('FROZEN_VERSION_CHANGED');
 item.packHash=packHash;
 switch(action){
  case 'candidate':break;
  case 'revision':{
   if(!Number.isInteger(record.nextVersion)||record.nextVersion<=version)throw Error('NEW_VERSION_REQUIRED');
   const target=path.join(root,id,String(record.nextVersion));
   try{await fs.stat(target);throw Error('VERSION_DIRECTORY_EXISTS');}catch(error){if(error.code!=='ENOENT')throw error;}
   await fs.cp(folder,target,{recursive:true,errorOnExist:true,force:false});
   const project=JSON.parse(await fs.readFile(path.join(target,'project.json'),'utf8'));project.version=record.nextVersion;project.status='local_trial';
   await fs.writeFile(path.join(target,'project.json'),JSON.stringify(project,null,2));
   for(const file of ['manifest.json','project.zip','reference/execution.json'])await fs.rm(path.join(target,file),{force:true});
   const catalogFile=path.join(root,'catalog.json'),catalog=JSON.parse(await fs.readFile(catalogFile,'utf8'));
   catalog.projects=catalog.projects.map(p=>p.id===id?project:p);await fs.writeFile(catalogFile,JSON.stringify(catalog,null,2));
   state.items[id+':'+record.nextVersion]={id,version:record.nextVersion,state:'candidate',packHash:null,parentVersion:version,reason:record.reason||'Explicit revision; review and reproduction pending'};break;
  }
  case 'source-review':{
   const source=JSON.parse(await fs.readFile(path.join(folder,'sources.json'),'utf8'));
   item.sources={identity:source.kind,localUse:true,redistributionCleared:record.redistributionCleared===true&&Boolean(record.reviewer&&record.rightsEvidence),reviewer:record.reviewer||null,rightsEvidence:record.rightsEvidence||null,packHash};item.state='materials';break;
  }
  case 'technical':{
   const run=spawnSync(process.execPath,['verify.mjs','--reference'],{cwd:folder,encoding:'utf8',timeout:10000});
   const negative=spawnSync(process.execPath,['verify.mjs','--counterexample'],{cwd:folder,encoding:'utf8',timeout:10000});
   if(run.status!==0||negative.status===null||negative.status===0)throw Error('TECHNICAL_REPRODUCTION_FAILED');
   await fs.rm(path.join(folder,'result.json'),{force:true});
   item.technical={packHash,runtime:process.version,stdout:run.stdout,negativeExit:negative.status,executedAt:new Date().toISOString()};item.state='technical';break;
  }
  case 'review':case 'pilot':{
   if(!record.reviewer||!record.evidence||record.performed!==true)throw Error('ACTUAL_HUMAN_RECORD_REQUIRED');
   const evidence=await fs.readFile(path.resolve(record.evidence));
   item[action]={reviewer:record.reviewer,evidenceFile:record.evidence,evidenceDigest:hash(evidence),packHash,performed:true};item.state=action;break;
  }
  case 'freeze':{
   if(item.technical?.packHash!==packHash||!item.sources?.localUse)throw Error('SOURCE_AND_TECHNICAL_REQUIRED');
   item.frozen={packHash,at:new Date().toISOString()};item.state='frozen_local_trial';break;
  }
  case 'publish':{
   if(!item.sources?.redistributionCleared||item.review?.packHash!==packHash||item.pilot?.packHash!==packHash||item.frozen?.packHash!==packHash||!item.maintainer)throw Error('PUBLICATION_REQUIREMENTS_PENDING');
   item.state='approved_for_publication';break;
  }
  case 'assign':if(!record.person)throw Error('MAINTAINER_REQUIRED');item.maintainer=record.person;break;
  case 'retire':if(!record.reason)throw Error('RETIREMENT_REASON_REQUIRED');item.state='retired';item.retirement={reason:record.reason,replacement:record.replacement||null};break;
  case 'source-change':
   if(!record.sourceId||!record.newDigest)throw Error('SOURCE_ID_AND_DIGEST_REQUIRED');
   state.reviewQueue.push({id,version,...record,status:'pending',at:new Date().toISOString()});break;
  case 'source-probe':{
   const sources=JSON.parse(await fs.readFile(path.join(folder,'sources.json'),'utf8'));
   const source=sources.methodReferences.find(s=>s.id===record.sourceId);if(!source)throw Error('UNKNOWN_METHOD_SOURCE');
   let probe;try{const response=await fetch(source.url,{signal:AbortSignal.timeout(15000)});const bytes=await response.arrayBuffer();probe={status:response.status,digest:hash(Buffer.from(bytes)),bytes:bytes.byteLength};}catch(error){probe={status:'unavailable',reason:error.name};}
   const previous=item.probes?.[source.id];item.probes={...item.probes,[source.id]:probe};
   if(previous&&previous.digest!==probe.digest||probe.status!==200)state.reviewQueue.push({id,version,sourceId:source.id,probe,status:'pending_source_review',at:new Date().toISOString()});break;
  }
  case 'apply-local':{
   const database=path.resolve(record.database||'');
   if(record.confirmation!=='LOCAL_CONTENT_STATE_ONLY'||![path.resolve('checks')+path.sep,path.resolve(tmpdir())+path.sep].some(prefix=>database.startsWith(prefix)))throw Error('ISOLATED_DATABASE_REQUIRED');
   const db=new DatabaseSync(database);try{applyContentDecision(db,item);}finally{db.close();}break;
  }
  case 'propose':
   if(!record.title||!record.reason)throw Error('PROPOSAL_REQUIRED');
   state.reviewQueue.push({id,version,...record,status:'pending_AI_or_editor_proposal',at:new Date().toISOString()});break;
  default:throw Error('UNKNOWN_CONTENT_ACTION');
 }
 state.items[key]=item;
 const event={action,id,version,packHash,at:new Date().toISOString(),record,previous:state.audit.at(-1)?.digest||null};event.digest=hash(JSON.stringify(event));state.audit.push(event);
 await fs.mkdir(path.dirname(stateFile),{recursive:true});const temp=stateFile+'.'+process.pid+'.tmp';await fs.writeFile(temp,JSON.stringify(state,null,2));await fs.rename(temp,stateFile);
 return item;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [action,id,version='1',recordFile]=process.argv.slice(2);
 const record=recordFile?JSON.parse(await fs.readFile(recordFile,'utf8')):{};
 try{console.log(JSON.stringify(await maintainContent({action,id,version:Number(version),record}),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
