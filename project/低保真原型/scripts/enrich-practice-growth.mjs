import {assertUnfrozen,selectedForAuthoring,selectedProject} from './growth-authoring-guard.mjs';
// Original authoring metadata. Run before freezing a new, unpublished version.
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {runScenario} from '../server/practice-growth/scenarios.mjs';

const root=path.resolve('course-packs/growth');
const catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
await assertUnfrozen(catalog.projects);
const write=(folder,name,value)=>fs.writeFile(path.join(folder,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const descriptions={
 'multi-source-analysis':['The activity owner needs an order and payment reconciliation. Aggregate payments at order grain before joining; distinguish orders, paid amounts and unpaid orders.','SQL, order-level reconciliation and a short analysis brief','Duplicating the order amount for each payment inflates the first order.'],
 'analysis-change-handoff':['The finance analyst receives two extracts with changed currency units and status rules. Reproduce both versions and explain which totals may be compared.','Version-aware SQL, a difference report and consumer instructions','Treating yuan as cents silently changes the monetary scale.'],
 'baseline-evaluation':['Estimate a numerical outcome with a training-only mean baseline. Retain every evaluation ID, calculate absolute errors and check split isolation.','Split IDs, executable baseline, predictions and error slices','An omitted evaluation prediction makes the submitted ID set incomplete.'],
 'grounded-assistant-delivery':['A service coordinator needs answers from a bounded document set. Enforce role, fact and version matches, and refuse unavailable or unsupported answers.','Answer and citation records, refusal tests and a maintenance handoff','A member must not receive the staff-only budget even if the answer is factually correct.'],
 'app-authorization-retest':['An application owner asks you to reproduce and repair object-level access. Test anonymous, owner, another user and edit permissions against a loopback service.','HTTP reproduction, an authorization matrix and regression evidence','Hiding a button leaves an unauthorized server response exposed.'],
 'detection-response-handoff':['An analyst receives mixed login events and an approved-device list. Correlate short failure bursts with subsequent success and quantify false alarms and misses.','Executable event query, hit IDs, false positives and an escalation handoff','Marking every successful login suspicious produces false positives.'],
 'alert-rule-regression':['An operator needs an error-rate rule that ignores low traffic and isolated spikes. Evaluate consecutive windows, labels, no traffic, missing data and recovery.','Executable JSON rule, time-series fixtures and trigger records','Counting a short spike as a sustained alert violates the duration requirement.'],
 'reliability-release-drill':['A release owner must decide whether a rollback restored the service. Reconcile technical probes, the critical business flow and records written after release.','Probe results, a release/rollback log and recovery decision','A normal error rate with a failed business probe is not recovery.'],
 'accessible-form':['An activity coordinator needs a usable registration form. Implement labelled fields, keyboard errors, waiting, failure, retry and cancellation when input changes.','Runnable HTML, state tests and a revision note','A late response must not overwrite an edited input or clear it after failure.'],
 'data-workbench':['An operator needs filterable records with pagination. Keep the current filter and page consistent, handle empty/error states, and reject older asynchronous responses.','Runnable record interface, response-order tests and state notes','An earlier request must not replace results for the new filter.'],
 'frontend-release-delivery':['A release reviewer must open detail URLs directly and survive refresh and API changes. Maintain list navigation and show a contract-change state.','Runnable routes, a compatibility check and release instructions','A detail refresh using an unsupported API version must not be labelled ready.'],
 'contract-api':['An API consumer needs a stable read/edit contract with explicit authentication, ownership, action permission and amount validation.','Loopback HTTP service, response matrix and error contract','A non-owner request must be rejected by the server.'],
 'retry-concurrency':['A booking owner has two seats and retried requests. Preserve idempotency, reject changed payloads under a reused key and avoid overselling or partial commits.','Executable booking service, concurrent request tests and an invariant report','Replaying a key must not reserve seats twice.'],
 'service-evolution-delivery':['A consuming team needs a new cents-based response while an old client still expects yuan. Preserve IDs and both versioned contracts.','Versioned response adapter, old/new contract tests and migration notes','Changing the old client to cents without a version change breaks compatibility.'],
 'relational-model':['A reporting owner needs a customer/order model including customers with no orders. Specify keys, cardinality and orphan checks.','Schema, SQL customer totals and integrity exceptions','An inner join drops the customer with zero orders.'],
 'partition-replay':['A data consumer needs a safe daily partition replacement. Deduplicate replayed rows, quarantine wrong-partition input and retain the last good partition on failure.','Idempotent batch transform, reconciliation and quarantine records','Appending a replay duplicates a record instead of replacing the partition.'],
 'data-contract-evolution':['A downstream analyst needs historical and incremental data after an amount-field rename. Normalize both forms and block missing required values.','Compatibility transform, lineage and publish/block evidence','Using only the new field loses historical amounts.'],
 'defect-evidence':['A tester investigates a discount boundary at 8000 cents. Reproduce rounding-based behavior with exact values and distinguish expected from observed results.','Minimal reproduction, versioned defect and retest records','Rounding to whole yuan before the boundary test misclassifies an amount below 8000.'],
 'api-ui-regression':['A tester protects an API/UI behavior matrix before and after a fix. Run each supplied case and retain both expected and actual outputs.','Executable regression cases and linked failures','A blanket passed label conceals a failing case in the broken version.'],
 'release-risk-review':['A release owner needs a decision from critical failures, passed tests and unexecuted scope. Identify blockers separately from optional checks.','Risk-prioritized test report and a bounded release recommendation','A required unexecuted test cannot be counted as passed.'],
 'rule-tool':['A shop needs a deterministic discount tool using integer cents. Implement boundary cases and reject negative or non-integer amounts.','Executable function, boundary tests and rule notes','A negative amount is invalid rather than a valid discounted output.'],
 'legacy-change':['A maintainer adds member pricing after the existing discount while preserving old API callers. Compare legacy and new rule behavior.','Protected refactor, compatibility tests and review changes','Applying membership before the fixed discount changes the promised price.'],
 'versioned-toolkit':['A user must run a small cents-based CLI from an extracted release. Provide arguments, exit codes, version output and a useful error path.','Install-free CLI, runnable package and release/change instructions','A missing amount must return usage and a nonzero exit code.'],
 'config-acceptance':['An implementation consultant maps role requirements into a configuration and executable UAT matrix. Check allowed and denied actions.','Permission configuration, UAT results and unresolved decisions','Omitting a required role changes a positive acceptance case into a denial.'],
 'migration-reconciliation':['An implementation owner compares source and target records after normalization. Reconcile email, status and incremental records, not only row counts.','Mapping, transformed records, content differences and rollback constraints','Equal row counts do not excuse a wrong status or loss of new records.'],
 'rollout-support-handoff':['A customer team needs a cutover decision, role-based training and a support owner. Required untested items block acceptance and new records need preservation.','Cutover checklist, training scenarios and support handoff','A required not-run check blocks rollout even when optional checks pass.'],
 'cross-registration-service':['Rotate implementation, backend, frontend and testing roles to deliver an activity registration flow. Consume a versioned field contract and repair the recorded mismatch.','Contract, runnable UI/service, acceptance trace and revised role handoffs','A legacy mail field sent to the email-field contract must fail joint acceptance.'],
 'cross-metric-service':['Rotate data engineering, API and analysis roles. Reconcile a payment fan-out defect across the model, service totals and consumer report.','Data model, fixed metric response, reconciliation and feedback revision','An inflated order amount must be traced to the one-to-many join.'],
 'cross-knowledge-assistant':['Rotate document/security, service and evaluation roles. Propagate document versions and access rules through answers and refusal tests.','Document/service contract, answer checks and a revised security handoff','A private source must not enter a member answer.'],
 'cross-service-incident':['Rotate release, operations and business-testing roles. A technical recovery must also restore the user flow before joint acceptance.','Release evidence, business probes and revised recovery handoffs','Normal metrics cannot close an incident while registration still fails.'],
 'cross-security-remediation':['Rotate security, implementation and retest roles. Reproduce an object/action authorization issue and verify server-side rejection alongside normal behavior.','Server correction, HTTP regression and residual-risk handoff','UI-only hiding does not fix an exposed object response.'],
 'cross-migration-launch':['Rotate business, engineering/operations and UAT roles. Compare normalized content, preserve post-cutover changes and document rollback boundaries.','Migration reconciliation, cutover decision and support revision','A rollback that discards the new records must be blocked.']
};

// Deliberate, business-specific faulty outputs, separate from the reference.
export function faultyResult(id,input,expected) {
 const r=structuredClone(expected);
 switch(id){
  case 'multi-source-analysis':r[0].ordered*=input.payments.filter(p=>p.order===r[0].id).length;break;
  case 'analysis-change-handoff':r.find(v=>v.unit==='yuan').cents/=100;break;
  case 'baseline-evaluation':r.predictions.pop();break;
  case 'grounded-assistant-delivery':r.find(a=>a.id==='Q3').answer='internal-only';break;
  case 'app-authorization-retest':case 'contract-api':r.find(a=>a.id==='other-read').status=200;break;
  case 'detection-response-handoff':r.hits=input.events.filter(e=>e.kind==='login-success').map(e=>e.id);break;
  case 'alert-rule-regression':r[1].firing=true;break;
  case 'reliability-release-drill':r.at(-1).recovered=true;break;
  case 'accessible-form':r.find(a=>a.state==='cancelled').state='success';break;
  case 'data-workbench':r.acceptedResponse=input.responses.find(a=>a.query!==input.currentFilter).id;break;
  case 'frontend-release-delivery':r.find(a=>a.state==='contract_changed').restored=true;break;
  case 'retry-concurrency':r.remaining-=input.requests[1].quantity;r.committed+=input.requests[1].quantity;break;
  case 'service-evolution-delivery':r.v1[0].total=input.records[0].cents;break;
  case 'relational-model':r.customers=r.customers.filter(c=>c.orders);break;
  case 'partition-replay':r.published.push(r.published[0]);break;
  case 'data-contract-evolution':r.rows[0].cents=null;break;
  case 'defect-evidence':r.find(c=>c.reproduced).reproduced=false;break;
  case 'api-ui-regression':r.forEach(t=>t.passed=true);break;
  case 'release-risk-review':r.releaseAllowed=true;break;
  case 'rule-tool':r.find(a=>a.error).error=null;break;
  case 'legacy-change':r.find(a=>a.cents>1000).cents+=50;break;
  case 'versioned-toolkit':r.find(a=>a.exit!==0).exit=0;break;
  case 'config-acceptance':r.find(a=>a.allowed).allowed=false;break;
  case 'migration-reconciliation':r.rollbackAllowed=true;r.preserve=[];break;
  case 'rollout-support-handoff':r.decision='limited_go';break;
  case 'cross-registration-service':r.accepted.push(r.feedback[0].id);r.feedback=[];break;
  case 'cross-metric-service':r.model[0].ordered*=2;r.api.cents+=input.orders[0].cents;break;
  case 'cross-knowledge-assistant':r.answers.find(a=>a.id==='Q3').answer='internal-only';break;
  case 'cross-service-incident':r.checks.at(-1).recovered=true;break;
  case 'cross-security-remediation':r.checks.find(a=>a.id==='other-read').status=200;break;
  case 'cross-migration-launch':r.decision='rollback_available';r.reconciliation.preserve=[];break;
  default:throw Error('Missing explicit fault '+id);
 }
 return r;
}

if(process.argv[1]===fileURLToPath(import.meta.url)||process.argv.includes('--author')){
 for(const p of catalog.projects.filter(selectedForAuthoring)){
  const folder=path.join(root,p.id,String(p.version)),input=JSON.parse(await fs.readFile(path.join(folder,'input/fixture.json'),'utf8'));
  const [brief,outputs,failure]=descriptions[p.id];
  p.brief.en=brief;p.outputs.en=outputs.split(', ');p.failure.en=failure;
  p.checks.en=['Reconcile the complete result with the supplied input IDs and values.',failure+' This is a blocking regression.'];
  p.review.en=['Locate the decision and supporting input/result in your deliverables.','Explain remaining uncertainty, your contribution and what the receiving role must verify.'];
  p.hints.en=[brief.split('. ')[0]+'.','Reproduce this failure first: '+failure,'Check every result ID and preserve a before/after record; explain what this fixture cannot establish.'];
  p.hints.zh=[p.brief.zh,p.failure.zh+'；先制作能暴露这项错误的最小检查。','逐个核对输入和产物位置，保留修订前后、本人贡献与尚未验证范围。'];
  p.environment.scope='Original small deterministic teaching application; no real enterprise traffic or model inference';
  if(['evaluation','security','handoff'].includes(p.adapter)&&!p.requiredFiles.includes('solution.mjs'))p.requiredFiles.push('solution.mjs');
  p.variants={...p.variants,status:'fixed-base; new instances require explicit generation and frozen identities'};
  await write(folder,'project.json',p);
  const dictionary=['# '+p.title.en+' — input dictionary / 输入字典','','Original synthetic fixture. JSON, UTF-8. Money is integer cents unless explicitly marked yuan. IDs denote records, never inferred people. No real private data.','本站原创合成输入。金额默认整数分；显式 yuan 为元。ID 是记录标识，不推断为人数。','','| Path / 字段 | Type | Supplied example / 例值 |','|---|---|---|'];
  const fields=(v,k='')=>{if(Array.isArray(v)){dictionary.push(`| ${k} | array (${v.length} rows) | ordered fixture / 固定顺序 |`);if(v.length)fields(v[0],k+'[]');}else if(v&&typeof v==='object'){for(const [key,value] of Object.entries(v))fields(value,k?k+'.'+key:key);}else dictionary.push(`| ${k} | ${v===null?'nullable':typeof v} | ${String(v).replaceAll('|','\\|')} |`);};fields(input);
  dictionary.push('','## Judgment / 判断要求',p.failure.zh,failure,'','Values describe this bounded teaching contract. They are not production thresholds. If another meaning is needed, record a new contract rather than silently coercing input.','数值仅是本教学契约；更改语义须记录新契约，不静默套用。');
  await write(folder,'input/dictionary.md',dictionary.join('\n')+'\n');
  const common=(en)=>[en?'## Deliverable contract':'## 产物契约',...p.requiredFiles.map(f=>'- '+f),en?'\nThe result file contains the complete per-ID output, not a prose success claim. notes.md must explain the problem, decision, result locations, limitations, contribution and assistance. Download and run the local package before uploading results.':'\nresult.json 是完整逐项结果，不是通过声明；notes.md 说明问题、判断、产物位置、局限、本人贡献与协助。先下载本地包实际运行，再上传产物。',en?'## Check and review':'## 检查与复核',...p.checks[en?'en':'zh'].map(s=>'- '+s),...p.review[en?'en':'zh'].map(s=>'- '+s),en?'## Scope and next':'## 范围与下一步',en?'These public fixtures and references teach a bounded task; passing them does not certify independent mastery. See next projects and precise skill links in the workspace.':'公开样例与参考用于有界练习；通过不等于独立掌握。可沿工作区中的后续项目和确切技能继续。'];
  for(const en of [false,true])await write(folder,en?'assignment.en.md':'assignment.md',['# '+p.title[en?'en':'zh'],'',p.brief[en?'en':'zh'],'',en?'## Materials and workflow':'## 材料与流程',en?'Read input/fixture.json with input/dictionary.md. Implement the required source/configuration, run verify.mjs locally, inspect failures, revise and keep the output. Open RUN.md for exact commands. Reference files are published teaching answers, separate from your starter.':'先对照 input/dictionary.md 阅读完整输入 input/fixture.json。实现所需源码/配置，本机执行 verify.mjs，定位错误并修订，保存输出。准确命令见 RUN.md；reference 目录是公开教学参考，与脚手架分开。','',...common(en),p.handoffs.length?(en?'\nConsume each input/handoff-N.json as the next simulated role; record the supplied issue, your actual correction, consumer acceptance and remaining risk in handoff.json. These are simulated role handoffs, not real colleagues.':'\n依次以接手角色使用 input/handoff-N.json。handoff.json 记录原问题、实际修改、接收检查与剩余风险。这是单人角色模拟，不能称真实团队经历。'):''].join('\n')+'\n');
  const artifact=JSON.parse(await fs.readFile(path.join(folder,'reference/artifact.json'),'utf8'));
  artifact.files['result.json']=JSON.stringify(runScenario(p.id,input),null,2);
  await write(folder,'reference/result.json',runScenario(p.id,input));
  if(p.requiredFiles.includes('solution.mjs'))artifact.files['solution.mjs']=await fs.readFile(path.join(folder,'reference/solution.mjs'),'utf8');
  artifact.files['notes.md']=['# '+p.title.en,'',brief,'','## Input and contract','input/fixture.json; input/dictionary.md; project version '+p.version,'','## Finding and reproducible output','```json',JSON.stringify(runScenario(p.id,input),null,2),'```','','## Failure prevented',failure,'','## Decision and limits','Accept only the specified result set. Escalate a missing identity, permission, business probe or required not-run item. This is an original synthetic teaching reference, not evidence of learner execution or real employment.','','## Contribution and handoff','Reference authored with AI assistance for Avemly. The learner must replace this attribution with their own factual contribution; review open criteria before archiving.'].join('\n');
  await write(folder,'reference/artifact.json',artifact);
  const broken=structuredClone(artifact);broken.files['result.json']=JSON.stringify(faultyResult(p.id,input,runScenario(p.id,input)),null,2);
  await write(folder,'reference/counterexample.json',broken);
  await write(folder,'reference/failure.md','# '+p.title.en+'\n\n'+p.failure.zh+'\n\n'+failure+'\n\nCompare counterexample.json with artifact.json, including every changed value. This deliberately faulty result must fail result-content.\n');
  await write(folder,'reference/broken.mjs','export const solve=()=>'+JSON.stringify(JSON.parse(broken.files['result.json']))+';\n');
  let verify=await fs.readFile(path.join(folder,'verify.mjs'),'utf8');
  verify=verify.replace("reference?'./reference/solution.mjs':'./solution.mjs'","process.argv.includes('--counterexample')?'./reference/broken.mjs':reference?'./reference/solution.mjs':'./solution.mjs'");
  await write(folder,'verify.mjs',verify);
 }
 await write(root,'catalog.json',catalog);
 console.log('Enriched 32 specific assignments, dictionaries and business counterexamples.');
}
