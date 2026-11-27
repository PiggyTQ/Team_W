import {assertUnfrozen,selectedForAuthoring,selectedProject} from './growth-authoring-guard.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runScenario} from '../server/practice-growth/scenarios.mjs';
const ordered=v=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const root=path.resolve('course-packs/growth'),catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
await assertUnfrozen(catalog.projects);
for(const p of catalog.projects.filter(p=>p.kind==='cross-career'&&selectedForAuthoring(p))){
 const folder=path.join(root,p.id,String(p.version)),input=JSON.parse(await fs.readFile(path.join(folder,'input/fixture.json'),'utf8')),r=runScenario(p.id,input);
 const artifact=JSON.parse(await fs.readFile(path.join(folder,'reference/artifact.json'),'utf8'));
 let pieces;
 switch(p.id){
  case 'cross-registration-service':pieces=[{field:input.contract.field,contractVersion:input.contract.version,required:true},{accepted:r.accepted,rejected:r.feedback.map(f=>f.id),contractVersion:r.contract},{submittedField:input.contract.field,waiting:true,inputRetainedOnFailure:true,lateResponseIgnored:true},{registrationCount:r.registrationCount,revision:r.revision,acceptedContract:r.contract}];break;
  case 'cross-metric-service':pieces=[{grain:'one row per order',orders:r.model},{version:r.api.version,metric:'ordered_cents',cents:r.api.cents},{orderedCents:r.api.cents,unpaidOrders:r.model.filter(o=>o.paid===0).map(o=>o.id),cause:'unknown'}];break;
  case 'cross-knowledge-assistant':pieces=[{documents:input.documents.map(d=>({id:d.id,version:d.version,roles:d.roles}))},{answers:r.answers},{unanswerable:r.answers.filter(a=>a.answer===null).map(a=>a.id),release:'limited_fixture_only'}];break;
  case 'cross-service-incident':pieces=[{versions:input.probes.map(p=>p.version),maxError:input.maxError},{checks:r.checks},{recovered:r.checks.at(-1).recovered,rollbackAllowed:r.checks.at(-1).rollbackAllowed,openIssue:'business_probe_still_failing'}];break;
  case 'cross-security-remediation':pieces=[{scope:'local synthetic application only',objectPolicy:'owner and action scope',affected:['O1','O2']},{responses:r.checks},{denials:r.checks.filter(a=>a.status!==200).map(a=>a.id),normal:r.checks.filter(a=>a.status===200).map(a=>a.id),uiHidingSufficient:false}];break;
  case 'cross-migration-launch':pieces=[{email:'trim and lowercase',confirmed:'active',incrementalPolicy:'preserve before rollback'},{normalized:r.reconciliation.normalized,differences:r.reconciliation.differences,preserve:r.reconciliation.preserve},{decision:r.decision,rollbackAllowed:r.reconciliation.rollbackAllowed,preserve:r.reconciliation.preserve}];break;
 }
 const stages=[];
 for(const [i,stage] of p.handoffs.entries()){
  const output=pieces[i],faulty=structuredClone(output);faulty.unresolvedContractDefect=p.failure.en;
  const provided={mode:'prefabricated single-person teaching handoff',version:1,from:stage.role,to:stage.consumedBy,content:stage.produces,payload:faulty,consumerFeedback:{code:p.id+'-stage-'+(i+1),issue:p.failure},requiredRevision:2};
  await fs.writeFile(path.join(folder,'input','handoff-'+(i+1)+'.json'),JSON.stringify(provided,null,2));
  const filename='stage-'+(i+1)+'.json';if(!p.requiredFiles.includes(filename))p.requiredFiles.push(filename);
  stage.requiredOutput=filename;stage.inputDigest=hash(provided);stage.expectedOutputDigest=hash(output);stage.canonicalOutputDigest=hash(ordered(output));stage.feedbackCode=provided.consumerFeedback.code;
  artifact.files[filename]=JSON.stringify(output,null,2);
  stages.push({from:stage.role,to:stage.consumedBy,inputDigest:stage.inputDigest,output:filename,feedbackCode:stage.feedbackCode,feedback:p.failure.en,change:'Reconcile the contract and remove the unresolved defect after checking the values in '+filename,revision:2});
 }
 artifact.files['handoff.json']=JSON.stringify({mode:'single-person teaching simulation',revision:2,stages},null,2);
 await fs.writeFile(path.join(folder,'project.json'),JSON.stringify(p,null,2));await fs.writeFile(path.join(folder,'reference/artifact.json'),JSON.stringify(artifact,null,2));
 const bad=structuredClone(artifact);const first=p.handoffs[0].requiredOutput;bad.files[first]=JSON.stringify({...pieces[0],unresolvedContractDefect:p.failure.en});
 // This negative case has a correct overall result and deliberately broken consumer artifact.
 await fs.writeFile(path.join(folder,'reference/handoff-counterexample.json'),JSON.stringify(bad,null,2));
}
await fs.writeFile(path.join(root,'catalog.json'),JSON.stringify(catalog,null,2));
console.log('Six role chains now require 19 independently checked consumer artifacts.');
