// Avemly original local tool, version 1. Put this file in an extracted project folder.
// This executes only on your machine. Uploaded execution claims remain self-reported.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const root=path.dirname(fileURLToPath(import.meta.url));
const read=async name=>JSON.parse(await fs.readFile(path.join(root,name),'utf8'));
const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const instance=process.argv[2],reference=process.argv.includes('--reference');
if(!/^(base|(data|api|rules)-[12])$/.test(instance||''))throw Error('Usage: node instance-runner-1.mjs base|data-1|api-1|rules-1 [--reference] [--sql|--http]');
const project=await read('project.json'),manifest=await read('manifest.json');
const verifyFrozen=async name=>{const entry=manifest.files.find(f=>f.path===name);assert.ok(entry,'Unregistered frozen file: '+name);assert.equal(createHash('sha256').update(await fs.readFile(path.join(root,name))).digest('hex'),entry.sha256,'Frozen file changed: '+name);};
await verifyFrozen('project.json');
let frozen;
if(instance==='base'){
 await verifyFrozen('input/fixture.json');await verifyFrozen('reference/result.json');
 const input=await read('input/fixture.json'),expected=await read('reference/result.json');
 frozen={identity:{parentProject:project.id,parentVersion:project.version,id:'base',ruleVersion:1,inputDigest:digest(input),expectedDigest:digest(expected)},input,expected};
}else{await verifyFrozen('input/variants/'+instance+'.json');frozen=await read('input/variants/'+instance+'.json');}
assert.equal(frozen.identity.id,instance);assert.equal(frozen.identity.parentProject,project.id);assert.equal(frozen.identity.parentVersion,project.version);
assert.equal(digest(frozen.input),frozen.identity.inputDigest);assert.equal(digest(frozen.expected),frozen.identity.expectedDigest);
const input=structuredClone(frozen.input);
if(!reference&&project.requiredFiles.includes('rules.json'))assert.deepEqual(await read('rules.json'),input.rule||{maxError:input.maxError,requiresBusinessProbe:true},'Use the selected instance rule in rules.json.');
const suppliedEvaluator=reference||project.adapter==='rules';
if(suppliedEvaluator)await verifyFrozen('reference/solution.mjs');
const {solve}=await import(pathToFileURL(path.join(root,suppliedEvaluator?'reference/solution.mjs':'solution.mjs')));
let actual=await solve(input),execution=project.adapter==='rules'?'actual supplied local rule evaluator':'actual local JavaScript';
const evidence=[];
if(process.argv.includes('--sql')){
 if(project.id!=='multi-source-analysis')throw Error('--sql is for the reviewed order/payment family');
 const {DatabaseSync}=await import('node:sqlite'),db=new DatabaseSync(':memory:');
 try{
  for(const [name,rows] of Object.entries(input)){
   if(!Array.isArray(rows)||!rows.length||typeof rows[0]!=='object')continue;
   const columns=[...new Set(rows.flatMap(row=>Object.keys(row)))];db.exec('CREATE TABLE "'+name+'" ('+columns.map(c=>'"'+c+'"').join(',')+')');
   const insert=db.prepare('INSERT INTO "'+name+'" VALUES('+columns.map(()=>'?').join(',')+')');for(const row of rows)insert.run(...columns.map(c=>row[c]??null));
  }
  const query=await fs.readFile(path.join(root,reference?'reference/query.sql':'query.sql'),'utf8');actual=db.prepare(query).all().map(row=>({...row}));execution='actual local SQLite query';
 }finally{db.close();}
}
if(process.argv.includes('--http')){
 if(project.id!=='retry-concurrency')throw Error('--http is for the reviewed booking family');
 const {createLocalServer}=await import(pathToFileURL(path.join(root,'local-service.mjs'))),server=createLocalServer(project.id,input,solve);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const url='http://127.0.0.1:'+server.address().port+'/book';
  const request=async body=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
  evidence.push(await request(input.requests[0]));evidence.push(...await Promise.all(input.requests.slice(1).map(request)));
  assert.deepEqual(evidence.map(r=>r.status),frozen.expected.responses.map(r=>r.status));assert.equal(evidence.at(-1).body.remaining,frozen.expected.remaining);execution+=' and actual loopback HTTP requests';
 }finally{await new Promise(resolve=>server.close(resolve));}
}
assert.deepEqual(actual,frozen.expected,'Result must reconcile every ID, value and failure case of this frozen instance.');
await fs.writeFile(path.join(root,'result.json'),JSON.stringify(actual,null,2));
const receipt={tool:'instance-runner-1',toolDigest:digest(await fs.readFile(fileURLToPath(import.meta.url),'utf8')),identity:frozen.identity,inputDigest:digest(frozen.input),outputDigest:digest(actual),runtime:process.version,at:new Date().toISOString(),status:'passed',execution,evidence,scope:'Local execution; platform submission remains self-reported, not independent mastery'};
await fs.writeFile(path.join(root,'instance-execution.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
