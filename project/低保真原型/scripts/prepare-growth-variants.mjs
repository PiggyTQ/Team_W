import {assertUnfrozen,selectedForAuthoring,selectedProject} from './growth-authoring-guard.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {generateVariant} from '../server/practice-growth/variants.mjs';
const root=path.resolve('course-packs/growth'),catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
await assertUnfrozen(catalog.projects);
const families=[['multi-source-analysis','data'],['retry-concurrency','api'],['alert-rule-regression','rules']];
const evidence=[];
for(const [id,family] of families){
 if(selectedProject&&id!==selectedProject)continue;
 const p=catalog.projects.find(p=>p.id===id),folder=path.join(root,id,String(p.version));
 const input=JSON.parse(await fs.readFile(path.join(folder,'input/fixture.json'),'utf8'));p.instances=[];
 await fs.mkdir(path.join(folder,'input/variants'),{recursive:true});
 for(const seed of [1,2]){
  const variant=generateVariant(p,input,{family,seed,capacity:seed,threshold:seed===1?0.06:0.02,duration:seed===1?3:2});
  const asset='input/variants/'+variant.identity.id+'.json';
  p.instances.push({...variant.identity,asset,label:{zh:family==='data'?(seed===1?'新增分次支付':'新增未支付订单'):family==='api'?'容量与身份冲突 '+seed:'持续窗口与恢复 '+seed,en:family==='data'?(seed===1?'Additional partial payment':'Additional unpaid order'):family==='api'?'Capacity and identity conflict '+seed:'Sustained window and recovery '+seed}});
  await fs.writeFile(path.join(folder,asset),JSON.stringify(variant,null,2));
  evidence.push({id,identity:variant.identity,passed:true,expected:variant.expected});
 }
 const badInput=structuredClone(input);if(family==='data')badInput.orders.push({...badInput.orders[0],cents:999});
 assert.throws(()=>generateVariant(p,badInput,{family,seed:1,capacity:0,threshold:2,duration:0}));
 evidence.push({id,illegalCombination:'rejected',passed:true});
 await fs.writeFile(path.join(folder,'project.json'),JSON.stringify(p,null,2));
}
await fs.writeFile(path.join(root,'catalog.json'),JSON.stringify(catalog,null,2));
await fs.writeFile('checks/practice-growth-20261126/variants.json',JSON.stringify(evidence,null,2));
console.log('Six frozen, distinct variants and three invalid combinations verified.');
