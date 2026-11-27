import {assertUnfrozen,selectedForAuthoring,selectedProject} from './growth-authoring-guard.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const programs={
 'multi-source-analysis':`return x.orders.flatMap(o=>x.payments.filter(p=>p.order===o.id).map(p=>({id:o.id,channel:o.channel,ordered:o.cents,paid:p.cents})));`,
 'analysis-change-handoff':`return x.versions.map(v=>({version:v.version,unit:v.unit,count:v.rows.filter(r=>r.status==='active').length,cents:v.rows.filter(r=>r.status==='active').reduce((n,r)=>n+r.amount,0)}));`,
 'baseline-evaluation':`const mean=[...x.train,...x.test].reduce((n,r)=>n+r.y,0)/(x.train.length+x.test.length);return {trainIds:x.train.map(r=>r.id),predictions:x.test.map(r=>({id:r.id,prediction:mean})),mae:0};`,
 'grounded-assistant-delivery':`return x.questions.map(q=>{const d=x.documents.find(d=>d.id===q.document);return {id:q.id,answer:d?.value??null,citation:d?.id??null};});`,
 'app-authorization-retest':`return x.requests.map(r=>({id:r.id,status:r.user?200:401}));`,
 'detection-response-handoff':`return {hits:x.events.filter(e=>e.kind==='login-success').map(e=>e.id),falsePositives:[],misses:[],action:'request_session_review'};`,
 'alert-rule-regression':`return x.windows.map(w=>({minute:w.minute,rate:w.errors/w.requests,firing:w.errors/w.requests>x.rule.threshold,label:x.rule.label}));`,
 'reliability-release-drill':`return x.probes.map(p=>({version:p.version,rate:p.errors/p.requests,recovered:p.errors/p.requests<=x.maxError,rollbackAllowed:true}));`,
 'accessible-form':`return x.actions.map(a=>({id:a.id,state:a.email?'success':'required',retained:''}));`,
 'data-workbench':`return {rows:x.rows.slice(0,x.pageSize),acceptedResponse:x.responses[0].id};`,
 'frontend-release-delivery':`return x.routes.map(r=>({path:r.path,restored:true,state:'ready'}));`,
 'contract-api':`return x.requests.map(r=>({id:r.id,status:!r.user?401:!x.objects[r.object]?404:200}));`,
 'retry-concurrency':`let remaining=x.capacity;return {responses:x.requests.map(r=>{remaining-=r.quantity;return {id:r.id,status:201};}),remaining,committed:x.capacity-remaining};`,
 'service-evolution-delivery':`return {v1:x.records.map(r=>({id:r.id,total:r.cents})),v2:x.records.map(r=>({id:r.id,totalCents:r.cents,currency:'CNY'})),preservedIds:x.records.map(r=>r.id),invalid:[]};`,
 'relational-model':`return {customers:x.customers.filter(c=>x.orders.some(o=>o.customer===c.id)).map(c=>({id:c.id,orders:x.orders.filter(o=>o.customer===c.id).length,cents:x.orders.filter(o=>o.customer===c.id).reduce((n,o)=>n+o.cents,0)})),orphans:[]};`,
 'partition-replay':`return {published:[...x.previous,...x.batch],blocked:false,quarantine:[]};`,
 'data-contract-evolution':`return {rows:[...x.history,...x.increment].map(r=>({id:r.id,cents:r.cents??null,origin:'v2'})),missing:[],publish:true};`,
 'defect-evidence':`return x.cases.map(c=>({id:c.id,expected:c.cents>=8000?c.cents-800:c.cents,observed:c.cents>=8000?c.cents-800:c.cents,reproduced:false}));`,
 'api-ui-regression':`return x.tests.map(t=>({id:t.id,expected:t.expected,actual:t.broken,passed:true}));`,
 'release-risk-review':`return {releaseAllowed:true,failed:[],unexecuted:[],authority:'release_owner'};`,
 'rule-tool':`return x.values.map(v=>({input:v,output:v>=10000?v-1000:v,error:null}));`,
 'legacy-change':`return x.calls.map(c=>({id:c.id,cents:(c.member?Math.round(c.cents*95/100):c.cents)-(c.cents>=10000?1000:0),api:c.api}));`,
 'versioned-toolkit':`return x.commands.map(c=>({id:c.id,exit:0,stdout:JSON.stringify({cents:Number(c.amount)||0,version:x.version}),stderr:''}));`,
 'config-acceptance':`return x.cases.map(c=>({id:c.id,allowed:c.role==='admin',expected:c.expected,passed:c.role==='admin'}));`,
 'migration-reconciliation':`return {normalized:x.source,differences:[],rollbackAllowed:x.source.length===x.target.length,preserve:[]};`,
 'rollout-support-handoff':`return {decision:'limited_go',unresolved:[],preserve:[],owner:x.support.owner,training:x.training};`,
 'cross-registration-service':`return {contract:x.contract.version,accepted:x.calls.map(c=>c.id),feedback:[],revision:x.revision,registrationCount:x.calls.length};`,
 'cross-metric-service':`const model=x.orders.flatMap(o=>x.payments.filter(p=>p.order===o.id).map(p=>({id:o.id,channel:o.channel,ordered:o.cents,paid:p.cents})));return {model,api:{version:x.version,cents:model.reduce((n,r)=>n+r.ordered,0)},feedback:null,revision:x.revision};`,
 'cross-knowledge-assistant':`return {answers:x.questions.map(q=>({id:q.id,answer:x.documents.find(d=>d.id===q.document)?.value,citation:q.document})),feedback:null,revision:x.revision};`,
 'cross-service-incident':`return {checks:x.probes.map(p=>({version:p.version,rate:p.errors/p.requests,recovered:true,rollbackAllowed:true})),feedback:null,revision:x.revision};`,
 'cross-security-remediation':`return {checks:x.requests.map(r=>({id:r.id,status:r.user?200:401})),feedback:null,revision:x.revision,uiHidingSufficient:true};`,
 'cross-migration-launch':`return {reconciliation:{normalized:x.target,differences:[],rollbackAllowed:true,preserve:[]},decision:'rollback_available',feedback:null,revision:x.revision};`
};
const root=path.resolve('course-packs/growth'),catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
await assertUnfrozen(catalog.projects);
for(const p of catalog.projects.filter(selectedForAuthoring)){
 const folder=path.join(root,p.id,String(p.version));
 const source=`// Original deliberately faulty starter: ${p.title.en}.\n// Reproduce the documented counterexample, then correct the implementation.\nexport function solve(input) {\n const x=structuredClone(input);\n ${programs[p.id]}\n}\n`;
 await fs.writeFile(path.join(folder,'starter/solution.mjs'),source);await fs.writeFile(path.join(folder,'solution.mjs'),source);
 const file=path.join(folder,'verify.mjs');let verify=await fs.readFile(file,'utf8');
 if(!verify.includes('input.rule=JSON.parse'))verify=verify.replace('const actual=await solve(structuredClone(input));',`if(!reference&&input.rule){input.rule=JSON.parse(await fs.readFile(new URL('./rules.json',import.meta.url),'utf8'));}\nconst actual=await solve(structuredClone(input));`);
 if(p.id==='config-acceptance'&&!verify.includes('input.permissions=JSON.parse'))verify=verify.replace('const actual=await solve',`if(!reference){input.permissions=JSON.parse(await fs.readFile(new URL('./config.json',import.meta.url),'utf8'));}\nconst actual=await solve`);
 await fs.writeFile(file,verify);
 if(p.requiredFiles.includes('rules.json')){
  const input=JSON.parse(await fs.readFile(path.join(folder,'input/fixture.json'),'utf8'));
  await fs.writeFile(path.join(folder,'rules.json'),JSON.stringify(input.rule?{...input.rule,for:1}:{maxError:1,requiresBusinessProbe:false},null,2));
 }
}
console.log('32 distinct executable faulty implementations authored.');
