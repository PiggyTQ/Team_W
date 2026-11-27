import {assertUnfrozen,selectedForAuthoring,selectedProject} from './growth-authoring-guard.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {runScenario} from '../server/practice-growth/scenarios.mjs';
import {checkGrowthArtifact} from '../server/practice-growth/checker.mjs';

const root=path.resolve('course-packs/growth');
const catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
await assertUnfrozen(catalog.projects);
const hash=value=>createHash('sha256').update(value).digest('hex');
const save=(folder,file,value)=>fs.writeFile(path.join(folder,file),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const html=(project,broken=false)=>`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${project.title.en}</title>
<style>body{margin:24px;font:17px/1.7 system-ui;background:#fbf8f0;color:#103f6b}main{max-width:780px;margin:auto}label{display:block;margin:16px 0}input,select,button{font:inherit;padding:9px;border:1px solid #b6cbd7;border-radius:8px}button{background:#ffca0a;cursor:pointer}li{padding:8px}a{color:#07558a}:focus-visible{outline:3px solid #07558a;outline-offset:3px}[role=alert]{color:#9b2c18}</style>
<main><h1>${project.title.en}</h1><p>Original local teaching interface. No data is sent.</p>
${project.id==='data-workbench'?'<label>Group <select id="group"><option>A</option><option>B</option><option>empty</option><option>error</option></select></label><button id="next">Next page</button><p id="status" role="status"></p><ul id="rows"></ul>':project.id==='frontend-release-delivery'?'<nav><a href="#list">List</a> · <a href="#detail/7">Item 7</a></nav><label>API version <select id="api"><option>2</option><option>1</option></select></label><section id="page"></section>':'<form novalidate><label>Email <input id="email" type="email" required aria-describedby="feedback"></label><label>Next response <select id="outcome"><option>success</option><option>failure</option><option>timeout</option></select></label><button id="submit">Register</button><p id="feedback" role="status"></p></form>'}
</main><script>
const broken=${broken},byId=id=>document.getElementById(id);let sequence=0,page=1;
${project.id==='data-workbench'?`const show=()=>{const current=++sequence,group=byId('group').value;byId('status').textContent='Loading';setTimeout(()=>{if(!broken&&current!==sequence)return;byId('rows').replaceChildren();if(group==='error'){byId('status').textContent='Request failed; retry by choosing a group';return;}const rows=Array.from({length:12},(_,i)=>({id:i+1,group:(i+1)%2?'A':'B'})).filter(r=>r.group===group).slice((page-1)*3,page*3);byId('status').textContent=rows.length?'Ready':'No records';for(const r of rows){const li=document.createElement('li');li.textContent=group+' '+r.id;byId('rows').append(li);}},group==='A'?350:50);};byId('group').onchange=()=>{page=1;show()};byId('next').onclick=()=>{page=page%2+1;show()};show();`:
project.id==='frontend-release-delivery'?`const render=()=>{const route=location.hash.slice(1)||'list';byId('page').textContent=byId('api').value!=='2'?'Contract changed: refresh data mapping':route==='detail/7'?'Item 7 · available':route==='list'?'Items: 7, 8, 9':'Page unavailable';};byId('api').onchange=render;window.onhashchange=()=>{if(!broken)render()};render();`:
`const field=byId('email'),feedback=byId('feedback'),button=byId('submit');field.oninput=()=>{if(!broken){sequence++;button.disabled=false;feedback.textContent='Input changed';}};document.querySelector('form').onsubmit=e=>{e.preventDefault();const value=field.value;if(!value||!value.includes('@')){feedback.setAttribute('role','alert');feedback.textContent=!value?'Email required':'Invalid email';field.focus();return;}feedback.setAttribute('role','status');const id=++sequence;button.disabled=true;feedback.textContent='Waiting';if('${project.id}'==='cross-registration-service'){fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({[broken?'mail':'email']:value,key:'registration'})}).then(async response=>{const body=await response.json();if(id!==sequence)return;button.disabled=false;feedback.textContent=response.ok?'Registered '+body.count:'Contract rejected '+response.status;}).catch(()=>{button.disabled=false;feedback.textContent='Open this interface through node serve.mjs for the joint API test';});return;}const result=byId('outcome').value;setTimeout(()=>{if(!broken&&id!==sequence)return;button.disabled=false;feedback.textContent=result==='success'?'Registered in local mock':result==='timeout'?'Timeout; retry':'Failed; input retained';if(broken)field.value='';},250);};`}
</script></html>`;

const reports=[];
const engine=await fs.readFile('server/practice-growth/scenarios.mjs','utf8'),subject=await fs.readFile('server/practice-growth/test-subject.mjs','utf8');
const cases=[...engine.matchAll(/^    case '([^']+)':/gm)];
const dependencies={'cross-metric-service':['multi-source-analysis'],'cross-knowledge-assistant':['grounded-assistant-delivery'],'cross-service-incident':['reliability-release-drill'],'cross-security-remediation':['contract-api'],'cross-migration-launch':['migration-reconciliation']};
const referenceSource=id=>{
  const selected=new Set([id,...dependencies[id]||[]]);let body='';
  for(let i=0;i<cases.length;i++)if(selected.has(cases[i][1])){
    let end=cases[i+1]?.index??engine.indexOf('    default:');
    if(!engine.slice(cases[i].index+cases[i][0].length,end).trim()){i++;end=cases[i+1]?.index??engine.indexOf('    default:');body+=cases[i-1][0]+'\n';}
    body+=engine.slice(cases[i].index,end);
  }
  return '// Original self-contained reference for '+id+'; public teaching solution.\n'+subject+'\nfunction runScenario(id,input){const x=structuredClone(input);switch(id){\n'+body+'\ndefault:throw Error("Unknown scenario");}}\nexport const solve=input=>runScenario('+JSON.stringify(id)+',input);\n';
};
for(const project of catalog.projects.filter(selectedForAuthoring)){
  const folder=path.join(root,project.id,String(project.version));
  const input=JSON.parse(await fs.readFile(path.join(folder,'input/fixture.json'),'utf8'));
  const artifact=JSON.parse(await fs.readFile(path.join(folder,'reference/artifact.json'),'utf8'));
  const bad=JSON.parse(await fs.readFile(path.join(folder,'reference/counterexample.json'),'utf8'));
  const source=referenceSource(project.id);await save(folder,'reference/solution.mjs',source);
  if(project.requiredFiles.includes('solution.mjs'))artifact.files['solution.mjs']=source;
  if(project.id==='alert-rule-regression'){
    const counters=[{minute:0,requestsTotal:0,errorsTotal:0},{minute:1,requestsTotal:100,errorsTotal:10},{minute:2,requestsTotal:200,errorsTotal:20},{minute:3,requestsTotal:20,errorsTotal:1},{minute:4,requestsTotal:120,errorsTotal:2},{minute:5,requestsTotal:120,errorsTotal:2},{minute:6,requestsTotal:220,errorsTotal:null},{minute:7,requestsTotal:320,errorsTotal:3}];
    await save(folder,'input/counter-reset.json',{rule:input.rule,counters});
    await save(folder,'run-counters.mjs',`import fs from 'node:fs/promises';\nimport assert from 'node:assert/strict';\nimport {solve} from './reference/solution.mjs';\nconst input=JSON.parse(await fs.readFile(new URL('./input/counter-reset.json',import.meta.url),'utf8'));\nconst result=solve(input);\nassert.deepEqual(result.map(r=>r.firing),[false,false,true,false,false,false,false,false]);\nassert.equal(result[3].rate,null);assert.equal(result[4].rate,0.01);assert.equal(result[6].rate,null);assert.equal(result[7].rate,null);\nconsole.log(JSON.stringify({scope:'Actual original Node rule evaluator, not PromQL or promtool',runtime:process.version,result}));\n`);
    const counterRun=spawnSync(process.execPath,['run-counters.mjs'],{cwd:folder,encoding:'utf8',timeout:10000});if(counterRun.status!==0)throw Error(counterRun.stderr);await save(folder,'reference/counter-execution.json',{passed:true,stdout:counterRun.stdout,at:new Date().toISOString()});
  }
  if(project.id==='versioned-toolkit'){
    const evidence=[];
    for(const command of input.commands){const run=spawnSync(process.execPath,['cli.mjs',...(command.amount===undefined?[]:[command.amount])],{cwd:folder,encoding:'utf8',timeout:10000});const expected=runScenario(project.id,input).find(r=>r.id===command.id);if(run.status!==expected.exit||run.stdout.trim()!==expected.stdout||run.stderr.trim()!==expected.stderr)throw Error('CLI contract mismatch');evidence.push({id:command.id,exit:run.status,stdout:run.stdout,stderr:run.stderr});}
    await save(folder,'reference/cli-execution.json',{runtime:process.version,at:new Date().toISOString(),passed:true,evidence});
  }
  if(project.adapter==='interface'||project.id==='cross-registration-service'){
    await save(folder,'reference/ui.html',html(project));
    await save(folder,'index.html',html(project,true));
    if(project.requiredFiles.includes('index.html'))artifact.files['index.html']=html(project);
    await save(folder,'reference/artifact.json',artifact);
  }
  const service=`import http from 'node:http';\nimport fs from 'node:fs/promises';\nimport {solve} from './solution.mjs';\nconst fixture=JSON.parse(await fs.readFile(new URL('./input/fixture.json',import.meta.url),'utf8'));\nconst server=http.createServer((req,res)=>{const user=req.headers['x-user']||null;const input={...fixture,requests:[{id:'http',user,object:req.url.slice(1),action:req.method==='GET'?'read':'edit',scopes:(req.headers['x-scopes']||'').split(','),cents:100}]};try{const result=solve(input);const status=Array.isArray(result)?result[0].status:200;res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(result));}catch{res.writeHead(500);res.end('{}');}});\nserver.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})));\n`;
  // Adapter-specific loopback services are prepared by prepare-growth-runtime.mjs.
  await save(folder,'RUN.md',`# ${project.title.en}\n\nNode 24. No packages, account, cloud or paid model are required. Run from this extracted project folder.\n\n1. Read assignment.md and input/dictionary.md.\n2. Implement solution.mjs, preserving the exported solve(input) interface.\n3. Run node verify.mjs. Its fixed regression compares actual outputs including failed/unknown cases.\n4. Use node verify.mjs --reference to reproduce the separately supplied public reference.\n5. Save the resulting result.json, actual source files and your notes into the Avemly artifact bundle. Results uploaded from a local machine remain user-reported execution.\n\n${project.adapter==='interface'?'Open index.html in a desktop browser. The starter contains a deliberately broken state transition. Compare keyboard, error, waiting and input preservation against reference/ui.html.\n':''}${project.adapter==='api'?'Run node serve.mjs for a loopback-only HTTP adapter, then request /O1 with X-User and X-Scopes headers.\n':''}${project.requiredFiles.includes('query.sql')?'Run node run-sql.mjs --reference to reproduce the SQLite query; implement query.sql and run node run-sql.mjs.\n':''}${project.id==='cross-registration-service'?'Run node serve.mjs --reference; open http://127.0.0.1:PORT/ui to exercise the real versioned email-field API. The starter sends legacy mail and is rejected.\n':''}${project.adapter==='rules'?'rules.json is executable teaching configuration for the supplied Node evaluator, not PromQL. Update the rule and implementation, then run node verify.mjs.\n':''}Known resource measurements are pending. This small original fixture exercises bounded behaviors, not a real enterprise workload.\n`);
  bad.files={...artifact.files,'result.json':bad.files['result.json']};
  await save(folder,'reference/counterexample.json',bad);
  const result=checkGrowthArtifact(project,input,JSON.stringify(artifact));
  const failed=checkGrowthArtifact(project,input,JSON.stringify(bad));
  const missing=checkGrowthArtifact(project,input,'{}');
  if(!result.passed||failed.passed||missing.passed)throw Error('Invalid regression fixture '+project.id);
  const run=spawnSync(process.execPath,['verify.mjs','--reference'],{cwd:folder,encoding:'utf8',timeout:10000});
  if(run.status!==0)throw Error(project.id+' reference failed: '+run.stderr);
  const starter=spawnSync(process.execPath,['verify.mjs'],{cwd:folder,encoding:'utf8',timeout:10000});
  if(starter.status===null||starter.status===0)throw Error('Faulty starter unexpectedly passed '+project.id);
  const negative=spawnSync(process.execPath,['verify.mjs','--counterexample'],{cwd:folder,encoding:'utf8',timeout:10000});
  if(negative.status===null||negative.status===0)throw Error('Counterexample was accepted '+project.id);
  const sqlRun=project.requiredFiles.includes('query.sql')?spawnSync(process.execPath,['run-sql.mjs','--reference'],{cwd:folder,encoding:'utf8',timeout:10000}):null;
  if(sqlRun&&sqlRun.status!==0)throw Error(project.id+' SQL failed: '+sqlRun.stderr);
  const execution={starterExecution:{exit:starter.status,stderr:starter.stderr.slice(0,3000)},negativeExecution:{exit:negative.status,stderr:negative.stderr.slice(0,4000)},sql:sqlRun?{exit:sqlRun.status,stdout:sqlRun.stdout}:null,projectId:project.id,version:project.version,runtime:process.version,executedAt:new Date().toISOString(),reference:{status:'passed',stdout:run.stdout,inputDigest:result.inputDigest,artifactDigest:result.artifactDigest},counterexample:failed,missing,repaired:result,scope:'Reference actually executed in a separate Node process; uploaded result values checked without executing learner code'};
  await save(folder,'reference/execution.json',execution);reports.push(execution);
  const sources=JSON.parse(await fs.readFile(path.join(folder,'sources.json'),'utf8'));
  sources.review.technical='reference_and_counterexample_executed';
  sources.sources=[{sourceId:'avemly-original-'+project.id,publisher:'Avemly / AI-assisted local authorship',title:project.title.en,originalUrl:null,actualFileUrl:null,materialType:'original-synthetic',readFiles:['input/fixture.json','input/dictionary.md','reference/solution.mjs'],supports:'The bounded teaching contract and fixed regression inputs',doesNotSupport:'Real corporate provenance, professional certification or independent learner mastery',region:'Synthetic local teaching context',upstreamVersion:String(project.version),originalDate:'2026-11-26',reviewedAt:execution.executedAt,license:'Local practice materials; public redistribution policy pending owner review',licenseUrl:null,applicableFiles:['input/','reference/','starter/'],notice:'Original synthetic teaching materials; AI-assisted authorship; no third-party material copied',modifications:'Authored for this practice; see CHANGELOG.md',thirdPartyExceptions:[],canCache:true,canAdapt:'within local practice',canRedistribute:false}];
  const methodRefs=[
    {id:'mdn-core',publisher:'Mozilla contributors',title:'MDN Curriculum — Core modules',url:'https://developer.mozilla.org/en-US/curriculum/core/',section:'Core modules; module list including semantic HTML, JavaScript, accessibility and version control',careers:['frontend','software'],upstreamVersion:null,originalDate:null},
    {id:'openapi-311',publisher:'OpenAPI Initiative',title:'OpenAPI Specification 3.1.1',url:'https://spec.openapis.org/oas/v3.1.1.html',section:'4.8.30 Security Requirement Object; 4.4 Data Types',careers:['backend','testing'],upstreamVersion:'3.1.1',originalDate:'2024-10-24'},
    {id:'owasp-bola-2023',publisher:'OWASP API Security Project',title:'API1:2023 Broken Object Level Authorization',url:'https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/',section:'Is the API Vulnerable; How To Prevent',careers:['security'],upstreamVersion:'2023 edition',originalDate:null},
    {id:'prom-rule-tests',publisher:'Prometheus authors',title:'Unit testing for rules',url:'https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/',section:'promtool test rules; test.yml example; expression test cases',careers:['ops'],upstreamVersion:'Unversioned live documentation accessed 2026-11-26',originalDate:null}
  ];
  sources.methodReferences=methodRefs.filter(r=>[project.career,...project.relatedCareers].some(c=>r.careers.includes(c))).map(r=>({...r,accessedAt:'2026-11-26',kind:'read-method-link-only',fileUrl:null,license:null,licenseReview:'No text, code, dataset, image or file copied; redistribution licence not asserted',use:'Method orientation only; original implementation and synthetic inputs',notSupport:'Promtool compatibility, complete official curriculum coverage or official endorsement',cached:false,adapted:false,redistributed:false}));
  sources.materialRecords=[];
  for(const file of ['input/fixture.json','input/dictionary.md']){const bytes=await fs.readFile(path.join(folder,file));sources.materialRecords.push({projectId:project.id,version:project.version,path:file,originalFilename:path.basename(file),format:path.extname(file),encoding:'UTF-8',bytes:bytes.length,sha256:hash(bytes),identity:'original-synthetic',seed:20261126,private:false,rawInputDigest:null,generatorVersion:1,transformation:'Original authored fixture and field documentation; no upstream dataset',publisherSignature:false});}
  await save(folder,'sources.json',sources);
  await fs.rm(path.join(folder,'result.json'));
  const zip=spawnSync('python',['-c',"import pathlib,zipfile; p=pathlib.Path('.'); z=zipfile.ZipFile('project.zip','w',zipfile.ZIP_DEFLATED); [z.write(f,f.as_posix()) for f in sorted(p.rglob('*')) if f.is_file() and f.as_posix() not in ['manifest.json','project.zip','result.json','sql-result.json']]; z.close()"],{cwd:folder,encoding:'utf8',timeout:10000});
  if(zip.status!==0)throw Error('Archive failed '+zip.stderr);
  const assets=[];
  async function walk(directory){for(const item of await fs.readdir(directory,{withFileTypes:true})){const file=path.join(directory,item.name);if(item.isDirectory())await walk(file);else if(!['manifest.json'].includes(item.name)){const bytes=await fs.readFile(file);assets.push({path:path.relative(folder,file).split(path.sep).join('/'),bytes:bytes.length,sha256:hash(bytes),kind:file.includes(path.sep+'reference'+path.sep)?'reference':'original-synthetic'});}}}
  await walk(folder);
  await save(folder,'manifest.json',{schemaVersion:3,projectId:project.id,version:project.version,files:assets.sort((a,b)=>a.path.localeCompare(b.path)),status:'frozen-local-trial',humanPilot:'not_performed'});
  const target=path.resolve('public/practice-projects',project.id,String(project.version));
  await fs.mkdir(target,{recursive:true});
  await fs.cp(folder,target,{recursive:true});
}
await fs.writeFile('checks/practice-growth-20261126/reference-executions.json',JSON.stringify(reports,null,2));
console.log('Executed and froze '+reports.length+' reference projects, counterexamples, missing submissions and repaired results.');
