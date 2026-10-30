import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {spawn} from 'node:child_process';
import {createBudgetLedger,BUDGET_MODEL,BUDGET_PRICE_VERSION,BUDGET_PRICE_VALID_UNTIL,DEFAULT_BUDGET_ID} from '../server/agent/budget.mjs';

const FIXTURE_NOW=Date.parse('2026-10-28T12:00:00+08:00');

async function fixture(t,options={}){
  const dir=await mkdtemp(join(tmpdir(),'career-agent-budget-')),database=join(dir,'ledger.sqlite');
  const ledgers=[];
  const open=(extra={})=>{const value=createBudgetLedger({database,now:()=>FIXTURE_NOW,...options,...extra});ledgers.push(value);return value;};
  t.after(async()=>{for(const item of ledgers)item.close();await rm(dir,{recursive:true,force:true});});
  return {dir,database,open};
}
const request={model:BUDGET_MODEL,requestBytes:1000,maxTokens:100};

test('budget reserves integer CNY before calls using bytes, protocol allowance and peak margin',async t=>{
  const f=await fixture(t),ledger=f.open();
  const first=ledger.reserve(request),summary=ledger.summary();
  assert.match(first.reservationId,/^[a-f0-9-]{36}$/);
  assert.equal(first.reservedMicroCny,(1000+4096)*4+100*16);
  assert.equal(summary.budgetId,DEFAULT_BUDGET_ID);assert.equal(summary.currency,'CNY');assert.equal(summary.limitMicroCny,8_000_000);
  assert.equal(summary.reservedMicroCny,first.reservedMicroCny);assert.equal(summary.remainingMicroCny,8_000_000-first.reservedMicroCny);
  assert.equal(summary.reservations,1);assert.equal(summary.unreportedReservations,1);
});
test('8 CNY is an accumulated cap and exhausted requests cannot mutate reservations',async t=>{
  const f=await fixture(t),ledger=f.open(),large={model:BUDGET_MODEL,requestBytes:98304,maxTokens:4096};
  const cost=(98304+4096)*4+4096*16,count=Math.floor(8_000_000/cost);
  for(let i=0;i<count;i++)ledger.reserve(large);
  const before=ledger.summary();assert.equal(before.reservations,count);
  assert.throws(()=>ledger.reserve(large),{code:'AI_BUDGET_EXCEEDED',status:429});assert.deepEqual(ledger.summary(),before);
});
test('reservations survive restart and elapsed days without daily resets or refunds',async t=>{
  const f=await fixture(t);let clock=1_000;
  const first=f.open({now:()=>clock}),reservation=first.reserve(request);first.close();clock+=1000*86400*40;
  const second=f.open({now:()=>clock});assert.equal(second.summary().reservedMicroCny,reservation.reservedMicroCny);
  second.recordUsage(reservation.reservationId,{prompt_tokens:1,completion_tokens:1,total_tokens:2});
  assert.equal(second.summary().reservedMicroCny,reservation.reservedMicroCny);assert.equal(second.summary().unreportedReservations,0);
});
test('multiple connections share one cap and each atomic reservation sees the latest balance',async t=>{
  const f=await fixture(t,{limitCny:'0.10'}),a=f.open(),b=f.open();
  const cost=(1000+4096)*4+100*16;
  for(let i=0;i<4;i++)(i%2?a:b).reserve(request);
  assert.equal(a.summary().reservedMicroCny,cost*4);assert.deepEqual(a.summary(),b.summary());
  for(const ledger of [a,b])assert.throws(()=>ledger.reserve(request),{code:'AI_BUDGET_EXCEEDED'});
});
test('simultaneous independent processes cannot overspend a shared budget',async t=>{
  const f=await fixture(t,{limitCny:'0.10'}),ledger=f.open();
  const script=`import {createBudgetLedger} from ${JSON.stringify(new URL('../server/agent/budget.mjs',import.meta.url).href)};
    const ledger=createBudgetLedger({database:${JSON.stringify(f.database)},limitCny:'0.10',now:()=>${FIXTURE_NOW}});
    let accepted=0;for(let i=0;i<4;i++){try{ledger.reserve(${JSON.stringify(request)});accepted++;}catch(e){if(e.code!=='AI_BUDGET_EXCEEDED')throw e;}}
    ledger.close();process.stdout.write(JSON.stringify({accepted}));`;
  const runs=Array.from({length:4},()=>new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--input-type=module','-e',script],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    let output='',errors='';const timeout=setTimeout(()=>{child.kill();reject(new Error('Budget worker timed out'));},10000);
    child.stdout.on('data',part=>{output+=part;});child.stderr.on('data',part=>{errors+=part;});
    child.on('error',error=>{clearTimeout(timeout);reject(error);});
    child.on('close',code=>{clearTimeout(timeout);if(code===0){try{resolve(JSON.parse(output));}catch(error){reject(error);}}else reject(new Error(`Budget worker failed: ${errors}`));});
  }));
  const results=await Promise.all(runs);
  assert.equal(results.reduce((total,row)=>total+row.accepted,0),4);assert.equal(ledger.summary().reservations,4);
  assert.ok(ledger.summary().reservedMicroCny<=100000);
});
test('expired price assumptions block new spending without resetting prior reservations',async t=>{
  const f=await fixture(t);let clock=Date.parse(BUDGET_PRICE_VALID_UNTIL)-1;
  const ledger=f.open({now:()=>clock}),reservation=ledger.reserve(request),before=ledger.summary();
  assert.equal(before.priceValidUntil,BUDGET_PRICE_VALID_UNTIL);
  clock++;
  assert.throws(()=>ledger.reserve(request),{code:'AI_BUDGET_PRICE_EXPIRED',status:503});assert.deepEqual(ledger.summary(),before);
  ledger.close();const reopened=f.open({now:()=>clock+86400000});
  assert.throws(()=>reopened.reserve(request),{code:'AI_BUDGET_PRICE_EXPIRED'});assert.equal(reopened.summary().reservedMicroCny,reservation.reservedMicroCny);
  reopened.recordUsage(reservation.reservationId,null);assert.equal(reopened.summary().reservedMicroCny,reservation.reservedMicroCny);
});
test('immutable configuration refuses budget identity, limit and price changes',async t=>{
  const f=await fixture(t);f.open().reserve(request);
  for(const extra of [{budgetId:'new-trial'},{limitCny:'7.99'},{priceVersion:'new-prices'}])assert.throws(()=>f.open(extra),{code:'AI_BUDGET_CONFIG_INVALID'});
  const ledger=f.open();assert.equal(ledger.summary().reservations,1);
});
test('configuration rejects volatile databases, unsafe amounts and unsupported models',async t=>{
  const f=await fixture(t);
  for(const config of [{database:':memory:'},{database:'file:ledger?mode=memory'},{limitCny:'8.01'},{limitCny:'-1'},{limitCny:8},{limitCny:'1.001'},{budgetId:'bad/id'}])assert.throws(()=>createBudgetLedger({database:f.database,...config}),{code:'AI_BUDGET_CONFIG_INVALID'});
  const ledger=f.open();
  for(const patch of [{model:'deepseek-v4-pro'},{requestBytes:0},{requestBytes:98305},{requestBytes:1.2},{maxTokens:0},{maxTokens:4097},{maxTokens:NaN}])assert.throws(()=>ledger.reserve({...request,...patch}),{code:'AI_BUDGET_CONFIG_INVALID'});
  assert.equal(ledger.summary().reservations,0);
});
test('usage is observation only, accepts unknown usage, drops secrets and is idempotent',async t=>{
  const f=await fixture(t),ledger=f.open();
  const a=ledger.reserve(request),b=ledger.reserve(request),before=ledger.summary().reservedMicroCny;
  const usage={prompt_tokens:2,completion_tokens:3,total_tokens:5,raw_prompt:'PROMPT_SECRET',apiKey:'KEY_SECRET',invalid:-1};
  assert.deepEqual(ledger.recordUsage(a.reservationId,usage),{recorded:true,duplicate:false});
  assert.deepEqual(ledger.recordUsage(a.reservationId,usage),{recorded:true,duplicate:true});
  assert.throws(()=>ledger.recordUsage(a.reservationId,{prompt_tokens:4}),{code:'AI_BUDGET_USAGE_CONFLICT'});
  ledger.recordUsage(b.reservationId,null);
  assert.equal(ledger.summary().reservedMicroCny,before);assert.equal(ledger.summary().unreportedReservations,0);
  const db=new DatabaseSync(f.database,{readOnly:true}),rows=db.prepare('SELECT usage_json FROM ai_budget_reservations').all();db.close();
  assert.equal(JSON.stringify(rows).includes('SECRET'),false);assert.equal(rows[0].usage_json,'{"prompt_tokens":2,"completion_tokens":3,"total_tokens":5}');
});
test('existing unrelated or tampered ledgers fail closed without resetting spend',async t=>{
  const f=await fixture(t),other=join(f.dir,'other.sqlite');
  let db=new DatabaseSync(other);db.exec('CREATE TABLE users(id TEXT)');db.close();
  assert.throws(()=>createBudgetLedger({database:other}),{code:'AI_BUDGET_CONFIG_INVALID'});
  const ledger=f.open();ledger.reserve(request);ledger.close();
  db=new DatabaseSync(f.database);db.prepare('UPDATE ai_budget_config SET input_micro_per_token=?').run(1);db.close();
  assert.throws(()=>f.open(),{code:'AI_BUDGET_CONFIG_INVALID'});
});
test('closed ledger errors are sanitized and do not expose filesystem details',async t=>{
  const f=await fixture(t),ledger=f.open();ledger.close();ledger.close();
  for(const operation of [()=>ledger.summary(),()=>ledger.reserve(request)])assert.throws(operation,error=>error.code==='AI_BUDGET_UNAVAILABLE'&&!error.message.includes(f.dir));
  const bytes=await readFile(f.database);assert.equal(bytes.includes(Buffer.from('KEY_SECRET')),false);
  assert.equal(BUDGET_PRICE_VERSION,'deepseek-cn-peak-20261028-x2');
});
