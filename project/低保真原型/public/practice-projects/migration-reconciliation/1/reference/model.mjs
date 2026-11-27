// Original, deterministic teaching models. These run only the registered models.
// Learner JavaScript is downloaded for local execution, never evaluated by the API.
export const CHECKER_VERSION = 'growth-rules-1';
import {discountSubject,testSubject} from './test-subject.mjs';

export function runScenario(id, input) {
  const x = structuredClone(input);
  switch (id) {
    case 'multi-source-analysis': {
      const payments = new Map();
      for (const p of x.payments) payments.set(p.order, (payments.get(p.order) || 0) + p.cents);
      return x.orders.map(o => ({id:o.id, channel:o.channel, ordered:o.cents, paid:payments.get(o.id)||0}));
    }
    case 'analysis-change-handoff':
      return x.versions.map(v => ({version:v.version, unit:v.unit, count:v.rows.filter(r=>r.status==='active').length, cents:v.rows.filter(r=>r.status==='active').reduce((n,r)=>n+(v.unit==='yuan'?r.amount*100:r.amount),0)}));
    case 'baseline-evaluation': {
      if (x.train.some(r => x.test.some(t => t.id===r.id))) return {error:'split_overlap'};
      const mean=x.train.reduce((n,r)=>n+r.y,0)/x.train.length;
      return {trainIds:x.train.map(r=>r.id), predictions:x.test.map(r=>({id:r.id,prediction:mean})),mae:x.test.reduce((n,r)=>n+Math.abs(r.y-mean),0)/x.test.length};
    }
    case 'grounded-assistant-delivery':
      return x.questions.map(q=>{const d=x.documents.find(d=>d.id===q.document&&d.roles.includes(q.role));return {id:q.id,answer:d&&d.version===q.version&&d.fact===q.fact?d.value:null,citation:d&&d.version===q.version&&d.fact===q.fact?d.id:null};});
    case 'app-authorization-retest':
    case 'contract-api':
      return x.requests.map(r=>({id:r.id,status:!r.user?401:!x.objects[r.object]?404:x.objects[r.object].owner!==r.user||r.action==='edit'&&!r.scopes.includes('edit')?403:r.action==='edit'&&(!Number.isInteger(r.cents)||r.cents<0)?422:200}));
    case 'detection-response-handoff': {
      const suspicious=x.events.filter(e=>e.kind==='login-success'&&x.events.filter(f=>f.user===e.user&&f.kind==='login-failure'&&e.minute-f.minute>=0&&e.minute-f.minute<=5).length>=3&&!x.approvedDevices.includes(e.device));
      return {hits:suspicious.map(e=>e.id),falsePositives:suspicious.filter(e=>!x.labels.includes(e.id)).map(e=>e.id),misses:x.labels.filter(id=>!suspicious.some(e=>e.id===id)),action:'request_session_review'};
    }
    case 'alert-rule-regression': {
      if (!(x.rule.threshold>0&&x.rule.threshold<1&&Number.isInteger(x.rule.for)&&x.rule.for>=1&&x.rule.minRequests>0)) return {error:'invalid_rule'};
      let streak=0;
      return x.windows.map(w=>{const valid=Number.isFinite(w.errors)&&Number.isFinite(w.requests)&&w.requests>=x.rule.minRequests&&w.errors>=0&&w.errors<=w.requests;streak=valid&&w.errors/w.requests>x.rule.threshold?streak+1:0;return {minute:w.minute,rate:valid?w.errors/w.requests:null,firing:streak>=x.rule.for,label:x.rule.label};});
    }
    case 'reliability-release-drill':
      return x.probes.map(p=>({version:p.version,rate:p.errors/p.requests,recovered:p.errors/p.requests<=x.maxError&&p.business==='ok',rollbackAllowed:p.newRecords===0}));
    case 'accessible-form':
      return x.actions.map(a=>({id:a.id,state:!a.email?'required':!a.email.includes('@')?'format':a.edited?'cancelled':a.network==='timeout'?'retry':a.network==='failure'?'failed':'success',retained:a.email}));
    case 'data-workbench':
      return {rows:x.rows.filter(r=>r.group===x.currentFilter).slice((x.page-1)*x.pageSize,x.page*x.pageSize),acceptedResponse:x.responses.filter(r=>r.query===x.currentFilter).at(-1)?.id||null};
    case 'frontend-release-delivery':
      return x.routes.map(r=>({path:r.path,restored:r.reload&&r.apiVersion===x.supportedVersion&&Boolean(x.pages[r.path]),state:r.apiVersion===x.supportedVersion?'ready':'contract_changed'}));
    case 'retry-concurrency': {
      if(!Number.isInteger(x.capacity)||x.capacity<1||x.requests.some(r=>!r.key||!r.owner||r.quantity<1))return {error:'invalid_booking'};
      let remaining=x.capacity;const seen=new Map();
      const responses=x.requests.map(r=>{if(seen.has(r.key)){const previous=seen.get(r.key);return {id:r.id,status:previous.owner!==r.owner||previous.quantity!==r.quantity?409:previous.status};}const status=r.fail?503:remaining>=r.quantity?201:409;if(status===201)remaining-=r.quantity;seen.set(r.key,{owner:r.owner,quantity:r.quantity,status});return {id:r.id,status};});
      return {remaining,responses,committed:x.capacity-remaining};
    }
    case 'service-evolution-delivery':
      return {v1:x.records.map(r=>({id:r.id,total:r.cents/100})),v2:x.records.map(r=>({id:r.id,totalCents:r.cents,currency:'CNY'})),preservedIds:x.records.map(r=>r.id),invalid:x.records.filter(r=>!Number.isInteger(r.cents)).map(r=>r.id)};
    case 'relational-model':
      return {customers:x.customers.map(c=>({id:c.id,orders:x.orders.filter(o=>o.customer===c.id).length,cents:x.orders.filter(o=>o.customer===c.id).reduce((n,o)=>n+o.cents,0)})),orphans:x.orders.filter(o=>!x.customers.some(c=>c.id===o.customer)).map(o=>o.id)};
    case 'partition-replay': {
      const invalid=x.batch.filter(r=>!r.id||r.partition!==x.partition);
      if(invalid.length)return {published:x.previous,blocked:true,quarantine:invalid.map(r=>r.id)};
      const rows=[...new Map(x.batch.map(r=>[r.id,r])).values()].sort((a,b)=>a.id.localeCompare(b.id));
      return {published:rows,blocked:false,quarantine:[]};
    }
    case 'data-contract-evolution':
      return {rows:[...x.history,...x.increment].map(r=>({id:r.id,cents:r.cents??r.amount_cents,origin:r.cents===undefined?'v1':'v2'})).sort((a,b)=>a.id.localeCompare(b.id)),missing:x.increment.filter(r=>r.cents===undefined&&r.amount_cents===undefined).map(r=>r.id),publish:x.increment.every(r=>r.cents!==undefined||r.amount_cents!==undefined)};
    case 'defect-evidence':
      return x.cases.map(c=>({id:c.id,expected:discountSubject(c.cents,'fixed'),observed:discountSubject(c.cents,c.version),reproduced:discountSubject(c.cents,c.version)!==discountSubject(c.cents,'fixed')}));
    case 'api-ui-regression':
      return x.tests.map(t=>{const actual=testSubject(t);return {id:t.id,expected:t.expected,actual,passed:JSON.stringify(actual)===JSON.stringify(t.expected)};});
    case 'release-risk-review':
      return {releaseAllowed:x.tests.every(t=>!t.critical||t.status==='passed'),failed:x.tests.filter(t=>t.status==='failed').map(t=>t.id),unexecuted:x.tests.filter(t=>t.status==='not_run').map(t=>t.id),authority:'release_owner'};
    case 'rule-tool':
      return x.values.map(v=>({input:v,output:!Number.isSafeInteger(v)||v<0?null:v>=10000?v-1000:v,error:!Number.isSafeInteger(v)||v<0?'invalid_cents':null}));
    case 'legacy-change':
      return x.calls.map(c=>({id:c.id,cents:c.member?Math.round((c.cents>=10000?c.cents-1000:c.cents)*95/100):c.cents>=10000?c.cents-1000:c.cents,api:c.api}));
    case 'versioned-toolkit':
      return x.commands.map(c=>({id:c.id,exit:c.amount===undefined||!/^\d+$/.test(c.amount)?2:0,stdout:c.amount!==undefined&&/^\d+$/.test(c.amount)?JSON.stringify({cents:Number(c.amount),version:x.version}):'',stderr:c.amount===undefined||!/^\d+$/.test(c.amount)?'Usage: tool <integer cents>':''}));
    case 'config-acceptance':
      return x.cases.map(c=>({id:c.id,allowed:Boolean(x.permissions[c.role]?.includes(c.action)),expected:c.expected,passed:Boolean(x.permissions[c.role]?.includes(c.action))===c.expected}));
    case 'migration-reconciliation': {
      const normalized=x.source.map(r=>({id:r.id,email:r.email.trim().toLowerCase(),status:r.status==='confirmed'?'active':r.status})).sort((a,b)=>a.id.localeCompare(b.id));
      return {normalized,differences:normalized.filter(r=>!x.target.some(t=>JSON.stringify(t)===JSON.stringify(r))).map(r=>r.id),rollbackAllowed:x.newRecords.length===0,preserve:x.newRecords.map(r=>r.id)};
    }
    case 'rollout-support-handoff':
      return {decision:x.checks.some(c=>c.required&&c.status!=='passed')?'stop':'limited_go',unresolved:x.checks.filter(c=>c.status!=='passed').map(c=>c.id),preserve:x.delta.map(r=>r.id),owner:x.support.owner,training:x.training.map(t=>({role:t.role,scenario:t.scenario}))};
    case 'cross-registration-service':
      return {contract:x.contract.version,accepted:x.calls.filter(c=>Object.keys(c.body).includes(x.contract.field)).map(c=>c.id),feedback:x.calls.filter(c=>!Object.keys(c.body).includes(x.contract.field)).map(c=>({id:c.id,to:'backend',issue:'field_mismatch'})),revision:x.revision,registrationCount:1};
    case 'cross-metric-service': {
      const totals=runScenario('multi-source-analysis',x);
      return {model:totals,api:{version:x.version,cents:totals.reduce((n,r)=>n+r.ordered,0)},feedback:{to:'engineering',issue:'payment_fanout',order:x.orders[0].id},revision:x.revision};
    }
    case 'cross-knowledge-assistant':
      return {answers:runScenario('grounded-assistant-delivery',x),feedback:{to:'security',issue:'private_document_must_be_rejected'},revision:x.revision};
    case 'cross-service-incident':
      return {checks:runScenario('reliability-release-drill',x),feedback:{to:'backend',issue:'business_probe_still_failing'},revision:x.revision};
    case 'cross-security-remediation':
      return {checks:runScenario('contract-api',x),feedback:{to:'backend',issue:'object_action_authorization'},revision:x.revision,uiHidingSufficient:false};
    case 'cross-migration-launch':
      return {reconciliation:runScenario('migration-reconciliation',x),decision:x.newRecords.length?'preserve_delta_before_rollback':'rollback_available',feedback:{to:'ops',issue:'new_data_preservation'},revision:x.revision};
    default: throw new Error('Unknown registered scenario');
  }
}
