import {assertUnfrozen,selectedForAuthoring} from './growth-authoring-guard.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {getSkillTree} from '../server/skill-trees/index.mjs';
import {runScenario} from '../server/practice-growth/scenarios.mjs';

const root=path.resolve('course-packs/growth');
const catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
await assertUnfrozen(catalog.projects);
const hash=value=>createHash('sha256').update(value).digest('hex');
const write=(folder,name,value)=>fs.writeFile(path.join(folder,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const skillRoutes={data:['metric-definition','sql-joins','decision-brief'],ai:['eval-cases','split-leakage','retrieval-grounding'],security:['triage','authorization','incident-handoff'],ops:['rollback-verify','four-signals','canary-gate'],frontend:['form-errors','async-ui','release-checks'],backend:['api-contract','atomicity','integration-tests'],engineering:['dataset-grain','idempotent-batch','lineage'],testing:['defect-reproduction','retest-regression','risk-priority'],software:['unit-tests','refactor','release-version'],delivery:['role-matrix','migration','handoff']};
const engine=await fs.readFile('server/practice-growth/scenarios.mjs','utf8');
const sql={
 'multi-source-analysis': 'SELECT o.id,o.channel,o.cents AS ordered,COALESCE(p.paid,0) AS paid FROM orders o LEFT JOIN (SELECT "order" AS id,SUM(cents) AS paid FROM payments GROUP BY "order") p ON p.id=o.id ORDER BY o.id;',
 'relational-model': 'SELECT c.id,COUNT(o.id) AS orders,COALESCE(SUM(o.cents),0) AS cents FROM customers c LEFT JOIN orders o ON o.customer=c.id GROUP BY c.id ORDER BY c.id;',
 'partition-replay': 'SELECT DISTINCT id,partition,channel FROM batch ORDER BY id;',
 'data-contract-evolution': "SELECT id,amount_cents AS cents,'v1' AS origin FROM history UNION ALL SELECT id,COALESCE(cents,amount_cents) AS cents,CASE WHEN cents IS NULL THEN 'v1' ELSE 'v2' END AS origin FROM increment ORDER BY id;"
};
const evidence=[];
for (const project of catalog.projects) {
  if(!selectedForAuthoring(project))continue;
  project.skills=[skillRoutes[project.career][project.level==='integrated'?2:project.level-1]];
  const leaves=getSkillTree(project.career).branches.flatMap(branch=>branch.leaves);
  if(project.skills.some(id=>!leaves.some(leaf=>leaf.id===id)))throw Error('Invalid skill mapping');
  if(project.legacy)continue;
  const folder=path.join(root,project.id,String(project.version));
  const input=JSON.parse(await fs.readFile(path.join(folder,'input/fixture.json'),'utf8'));
  const result=runScenario(project.id,input);
  await fs.mkdir(path.join(folder,'reference'),{recursive:true});
  await write(folder,'reference/model.mjs',engine);
  await write(folder,'reference/solution.mjs',`import {runScenario} from './model.mjs';\nexport const solve=input=>runScenario(${JSON.stringify(project.id)},input);\n`);
  await write(folder,'reference/result.json',result);
  const files={'result.json':JSON.stringify(result,null,2),'notes.md':`# ${project.title.en}\n\nInput input/fixture.json, version ${project.version}. Reconcile every ID and value before release.\n\nContribution: reference authored by Avemly.\n\nLimits: original synthetic teaching model, selected public regression cases. Independent real system behavior and human acceptance remain unverified.\n`};
  if(project.requiredFiles.includes('solution.mjs'))files['solution.mjs']=await fs.readFile(path.join(folder,'reference/solution.mjs'),'utf8');
  if(project.requiredFiles.includes('rules.json'))files['rules.json']=JSON.stringify(input.rule||{maxError:input.maxError,requiresBusinessProbe:true},null,2);
  if(project.requiredFiles.includes('query.sql'))files['query.sql']=sql[project.id]||'-- Normalize versions before aggregation.\nSELECT version,unit,COUNT(*) AS active_count FROM version_rows WHERE status=\'active\' GROUP BY version,unit;';
  if(project.requiredFiles.includes('index.html'))files['index.html']='<!doctype html><html lang="en"><title>'+project.title.en+'</title><main id="app"></main><script src="ui.js"></script></html>';
  if(project.handoffs.length)files['handoff.json']=JSON.stringify({mode:'single-person teaching simulation',revision:2,stages:project.handoffs.map(stage=>({from:stage.role,to:stage.consumedBy,inputDigest:hash(JSON.stringify(input)),feedback:project.failure.en,change:'Correct the identified contract or policy failure; compare result.json with every input ID before acceptance.'}))},null,2);
  await write(folder,'reference/artifact.json',{files});
  const broken=structuredClone(files);
  const badResult=structuredClone(result);
  if(Array.isArray(badResult))badResult.pop();else if(Object.hasOwn(badResult,'remaining'))badResult.remaining=-1;else badResult.invalidSuccess=true;
  broken['result.json']=JSON.stringify(badResult);
  await write(folder,'reference/counterexample.json',{files:broken});
  const verify=`import fs from 'node:fs/promises';\nimport assert from 'node:assert/strict';\nconst reference=process.argv.includes('--reference');\nconst {solve}=await import(reference?'./reference/solution.mjs':'./solution.mjs');\nconst input=JSON.parse(await fs.readFile(new URL('./input/fixture.json',import.meta.url),'utf8'));\nconst expected=JSON.parse(await fs.readFile(new URL('./reference/result.json',import.meta.url),'utf8'));\nconst actual=await solve(structuredClone(input));\nassert.deepEqual(actual,expected,'Result must include every ID, boundary, permission and value.');\nawait fs.writeFile(new URL('./result.json',import.meta.url),JSON.stringify(actual,null,2));\nconsole.log(JSON.stringify({status:'passed',scope:'local learner execution, self-reported to Avemly',runtime:process.version,project:${JSON.stringify(project.id)},version:${project.version},executedAt:new Date().toISOString()}));\n`;
  await write(folder,'verify.mjs',verify);
  await write(folder,'solution.mjs',await fs.readFile(path.join(folder,'starter/solution.mjs'),'utf8'));
  const source={publisher:'Avemly project authors',kind:'original-synthetic',license:'Original locally authored teaching inputs and code. Local Avemly practice use. Public redistribution policy requires owner decision.',copyright:'Avemly project authors',thirdPartyMaterialCopied:false,seed:20261126,generator:'scripts/author-practice-growth.py; scripts/freeze-practice-growth.mjs',upstreamCandidatesAdopted:false,methodReferencesAreLinks:true,createdAt:'2026-11-26',review:{technical:'pending_execution',domain:'not_performed',learnerPilot:'not_performed'},ownerRole:project.maintainer.role,assignedPerson:null};
  await write(folder,'sources.json',source);
  project.materialIdentity='original-synthetic';
  project.sourceDescription={zh:'本站原创合成材料与代码，方法链接按阅读范围标注',en:'Original synthetic inputs and code; method links have bounded reading records'};
  await write(folder,'project.json',project);
  if(sql[project.id]) {
    const db=new DatabaseSync(':memory:');
    for(const [table,rows] of Object.entries(input)) {
      if(!Array.isArray(rows)||!rows.length||typeof rows[0]!=='object')continue;
      const columns=[...new Set(rows.flatMap(row=>Object.keys(row)))];
      if(project.id==='data-contract-evolution'&&['history','increment'].includes(table))for(const col of ['cents','amount_cents'])if(!columns.includes(col))columns.push(col);
      db.exec(`CREATE TABLE "${table}" (${columns.map(col=>`"${col}"`).join(',')})`);
      const insert=db.prepare(`INSERT INTO "${table}" VALUES(${columns.map(()=>'?').join(',')})`);
      for(const row of rows)insert.run(...columns.map(col=>row[col]??null));
    }
    const rows=db.prepare(sql[project.id]).all().map(row=>({...row}));
    const expected=project.id==='relational-model'?result.customers:project.id==='partition-replay'?result.published:project.id==='data-contract-evolution'?result.rows:result;
    if(JSON.stringify(rows)!==JSON.stringify(expected))throw Error('SQL mismatch: '+project.id);
    await write(folder,'reference/query.sql',sql[project.id]);
    evidence.push({projectId:project.id,kind:'actual_sqlite_execution',rows,version:process.version,passed:true});db.close();
  }
}
await write(root,'catalog.json',catalog);
await fs.mkdir('checks/practice-growth-20261126',{recursive:true});
await fs.writeFile('checks/practice-growth-20261126/sql-reference.json',JSON.stringify(evidence,null,2));
console.log('Reference artifacts and mappings authored; SQL executed for '+evidence.length+' projects.');
