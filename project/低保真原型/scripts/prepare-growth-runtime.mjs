import {assertUnfrozen,selectedForAuthoring,selectedProject} from './growth-authoring-guard.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {runScenario} from '../server/practice-growth/scenarios.mjs';
import {createLocalServer} from '../server/practice-growth/local-service.mjs';

const root=path.resolve('course-packs/growth'),catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
await assertUnfrozen(catalog.projects);
const localModule=await fs.readFile('server/practice-growth/local-service.mjs','utf8');
const sql={
 'multi-source-analysis':'SELECT o.id,o.channel,o.cents AS ordered,COALESCE(p.paid,0) AS paid FROM orders o LEFT JOIN (SELECT "order" AS id,SUM(cents) AS paid FROM payments GROUP BY "order") p ON p.id=o.id ORDER BY o.id;',
 'cross-metric-service':'SELECT o.id,o.channel,o.cents AS ordered,COALESCE(p.paid,0) AS paid FROM orders o LEFT JOIN (SELECT "order" AS id,SUM(cents) AS paid FROM payments GROUP BY "order") p ON p.id=o.id ORDER BY o.id;',
 'analysis-change-handoff':'SELECT version,unit,COUNT(*) AS count,SUM(CASE WHEN unit=\'yuan\' THEN amount*100 ELSE amount END) AS cents FROM version_rows WHERE status=\'active\' GROUP BY version,unit ORDER BY version;',
 'relational-model':'SELECT c.id,COUNT(o.id) AS orders,COALESCE(SUM(o.cents),0) AS cents FROM customers c LEFT JOIN orders o ON o.customer=c.id GROUP BY c.id ORDER BY c.id;',
 'partition-replay':'SELECT DISTINCT id,partition,channel FROM batch ORDER BY id;',
 'data-contract-evolution':"SELECT id,amount_cents AS cents,'v1' AS origin FROM history UNION ALL SELECT id,COALESCE(cents,amount_cents) AS cents,CASE WHEN cents IS NULL THEN 'v1' ELSE 'v2' END AS origin FROM increment ORDER BY id;"
};
const sqlBootstrap=`import fs from 'node:fs/promises';\nimport assert from 'node:assert/strict';\nimport {DatabaseSync} from 'node:sqlite';\nconst fixture=JSON.parse(await fs.readFile(new URL('./input/fixture.json',import.meta.url),'utf8'));\nconst tables={...fixture};\nif(fixture.versions)tables.version_rows=fixture.versions.flatMap(v=>v.rows.map(r=>({...r,version:v.version,unit:v.unit})));\nconst db=new DatabaseSync(':memory:');\nfor(const [name,rows] of Object.entries(tables)){\n if(!Array.isArray(rows)||!rows.length||typeof rows[0]!=='object')continue;\n const columns=[...new Set(rows.flatMap(r=>Object.keys(r)))].filter(k=>rows.every(r=>r[k]===undefined||r[k]===null||['string','number','boolean'].includes(typeof r[k])));\n if(['history','increment'].includes(name))for(const key of ['cents','amount_cents'])if(!columns.includes(key))columns.push(key);\n db.exec('CREATE TABLE "'+name+'" ('+columns.map(c=>'"'+c+'"').join(',')+')');\n const insert=db.prepare('INSERT INTO "'+name+'" VALUES('+columns.map(()=>'?').join(',')+')');\n for(const row of rows)insert.run(...columns.map(c=>row[c]??null));\n}\nconst query=await fs.readFile(new URL(process.argv.includes('--reference')?'./reference/query.sql':'./query.sql',import.meta.url),'utf8');\nconst rows=db.prepare(query).all().map(r=>({...r}));\nconst expected=JSON.parse(await fs.readFile(new URL('./reference/sql-rows.json',import.meta.url),'utf8'));\nassert.deepEqual(rows,expected);\nawait fs.writeFile(new URL('./sql-result.json',import.meta.url),JSON.stringify(rows,null,2));\nconsole.log(JSON.stringify({status:'passed',runtime:process.version,rows:rows.length,scope:'Actual SQLite query over the supplied synthetic tables'}));\ndb.close();\n`;
const reports=[];
for(const p of catalog.projects.filter(selectedForAuthoring)){
 const folder=path.join(root,p.id,String(p.version)),input=JSON.parse(await fs.readFile(path.join(folder,'input/fixture.json'),'utf8'));
 const artifact=JSON.parse(await fs.readFile(path.join(folder,'reference/artifact.json'),'utf8'));
 const save=(name,content)=>fs.writeFile(path.join(folder,name),typeof content==='string'?content:JSON.stringify(content,null,2)+'\n');
 if(sql[p.id]){
  const result=runScenario(p.id,input),expected=p.id==='relational-model'?result.customers:p.id==='partition-replay'?result.published:p.id==='data-contract-evolution'?result.rows:p.id==='cross-metric-service'?result.model:result;
  artifact.files['query.sql']=sql[p.id];await save('reference/query.sql',sql[p.id]);await save('reference/sql-rows.json',expected);await save('run-sql.mjs',sqlBootstrap);await save('query.sql','-- Implement the query described by assignment.md.\nSELECT 1 AS unfinished;\n');
 }
 if(p.adapter==='api'||['app-authorization-retest','cross-security-remediation','cross-registration-service'].includes(p.id)){
  await save('local-service.mjs',localModule);
  await save('serve.mjs',`import fs from 'node:fs/promises';\nimport {createLocalServer} from './local-service.mjs';\nconst {solve}=await import(process.argv.includes('--reference')?'./reference/solution.mjs':'./solution.mjs');\nconst fixture=JSON.parse(await fs.readFile(new URL('./input/fixture.json',import.meta.url),'utf8'));\nlet ui='';try{ui=await fs.readFile(new URL(process.argv.includes('--reference')?'./reference/ui.html':'./index.html',import.meta.url),'utf8');}catch{}\nconst server=createLocalServer(${JSON.stringify(p.id)},fixture,solve,{ui});\nserver.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port,host:'127.0.0.1'})));\n`);
  const server=createLocalServer(p.id,input,value=>runScenario(p.id,value));await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  try{
   const evidence=[];
   if(['contract-api','app-authorization-retest','cross-security-remediation'].includes(p.id))for(const r of input.requests){const res=await fetch(url+'/objects/'+r.object,{method:r.action==='read'?'GET':'PUT',headers:{...(r.user?{'X-User':r.user}:{}),'X-Scopes':r.scopes.join(','),'Content-Type':'application/json'},...(r.action==='edit'?{body:JSON.stringify({cents:r.cents})}:{})});const result=runScenario(p.id,input),expected=(Array.isArray(result)?result:result.checks).find(row=>row.id===r.id).status;assert.equal(res.status,expected);evidence.push({id:r.id,status:res.status,body:await res.json()});}
   if(p.id==='retry-concurrency'){
    const requests=[{key:'K1',owner:'alice',quantity:1},{key:'K1',owner:'alice',quantity:1},{key:'K2',owner:'bob',quantity:2},{key:'K1',owner:'bob',quantity:1}];
    const responses=await Promise.all(requests.map(value=>fetch(url+'/book',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}).then(async r=>({status:r.status,body:await r.json()}))));assert.deepEqual(responses.map(r=>r.status),[201,201,409,409]);assert.equal(responses.at(-1).body.remaining,1);evidence.push(...responses);
   }
   if(p.id==='service-evolution-delivery')for(const version of ['v1','v2']){const res=await fetch(url+'/'+version+'/records');const body=await res.json();assert.deepEqual(body,runScenario(p.id,input)[version]);evidence.push({version,body});}
   if(p.id==='cross-registration-service'){
    for(const [body,status] of [[{mail:'a@example.invalid',key:'K1'},422],[{email:'a@example.invalid',key:'K1'},201],[{email:'a@example.invalid',key:'K1'},201]]){const r=await fetch(url+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,status);evidence.push({status:r.status,body:await r.json()});}assert.equal(evidence.at(-1).body.count,1);
   }
   await save('reference/http-execution.json',{kind:'actual_loopback_HTTP_requests',runtime:process.version,executedAt:new Date().toISOString(),passed:true,evidence});reports.push({id:p.id,passed:true,evidence});
  }finally{await new Promise(r=>server.close(r));}
 }
 if(p.id==='versioned-toolkit')await save('cli.mjs',`const amount=process.argv[2];if(!amount||!/^\\d+$/.test(amount)){console.error('Usage: tool <integer cents>');process.exitCode=2;}else console.log(JSON.stringify({cents:Number(amount),version:${JSON.stringify(input.version)}}));\n`);
 await save('reference/artifact.json',artifact);
 await save('reference/runtime-scope.md',`# ${p.title.en}\n\n${sql[p.id]?'Run node run-sql.mjs --reference for actual SQLite execution; edit query.sql then run node run-sql.mjs.\n':''}${p.adapter==='api'||p.id.includes('authorization')||p.id==='cross-security-remediation'?'Run node serve.mjs --reference. Use the printed loopback port, /objects/O1 with X-User/X-Scopes, /book for booking, or /v1/records and /v2/records for versioned responses.\n':''}Reference executions are author reproductions. Uploads remain user-reported local execution.\n`);
}
await fs.writeFile('checks/practice-growth-20261126/http-executions.json',JSON.stringify(reports,null,2));
console.log('Executed '+reports.length+' loopback services; prepared six actual SQLite tasks.');
