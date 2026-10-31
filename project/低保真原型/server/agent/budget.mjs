import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdirSync,chmodSync,existsSync,lstatSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

export const DEFAULT_BUDGET_ID='initial-ai-test-20261028';
export const BUDGET_MODEL='deepseek-flash';
export const BUDGET_PRICE_VERSION='deepseek-cn-peak-20261028-x2';
export const BUDGET_PRICE_VALID_UNTIL='2026-11-04T00:00:00+08:00';
export const BUDGET_INPUT_OVERHEAD=4096;
// CNY per million tokens equals micro-CNY per token. Both rates are twice
// the official peak, cache-miss prices checked on 2026-10-28 (input 2/output 8).
const INPUT_MICRO_PER_TOKEN=4,OUTPUT_MICRO_PER_TOKEN=16;
const MAX_LIMIT_MICRO_CNY=8_000_000;
const fields=['prompt_tokens','completion_tokens','total_tokens','prompt_cache_hit_tokens','prompt_cache_miss_tokens'];
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const safeInteger=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;

export class BudgetError extends Error {
  constructor(code,status=503){super(code);this.name='BudgetError';this.code=code;this.status=status;}
}
const invalid=()=>new BudgetError('AI_BUDGET_CONFIG_INVALID',500);
const unavailable=()=>new BudgetError('AI_BUDGET_UNAVAILABLE',503);

function parseLimit(value){
  if(typeof value!=='string'||!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value))throw invalid();
  const [yuan,fraction='']=value.split('.');
  const limit=Number(yuan)*1_000_000+Number(fraction.padEnd(2,'0'))*10_000;
  if(!safeInteger(limit,0,MAX_LIMIT_MICRO_CNY))throw invalid();
  return limit;
}
function cleanUsage(value){
  if(!isRecord(value))return null;
  const output={};
  for(const key of fields)if(safeInteger(value[key],0,Number.MAX_SAFE_INTEGER))output[key]=value[key];
  return Object.keys(output).length?output:null;
}

/**
 * Cumulative application budget for the initial AI trial. Each database has
 * exactly one immutable budget identity/configuration; changing IDs, limits,
 * model or price version cannot reset it. No reservation is refunded, including
 * failed/aborted requests, missing usage and process crashes. An existing ledger
 * must never be deleted/replaced to continue a trial without new authorization.
 *
 * The bound assumes this text-only chat protocol/tokenizer and the reviewed
 * price schedule. UTF-8 request bytes plus protocol allowance conservatively
 * estimate input tokens; this is not a provider-enforced account spending cap.
 * The key must not be shared with other calling processes if this ledger is to
 * represent the trial. Provider usage is observation only, never a refund.
 */
export function createBudgetLedger({database,limitCny='8.00',budgetId=DEFAULT_BUDGET_ID,priceVersion=BUDGET_PRICE_VERSION,now=Date.now}={}){
  const limit=parseLimit(limitCny);
  if(typeof database!=='string'||!database||database===':memory:'||database.startsWith('file:')
      ||typeof budgetId!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(budgetId)
      ||priceVersion!==BUDGET_PRICE_VERSION||typeof now!=='function')throw invalid();
  const path=resolve(database);
  let db,closed=false;
  try{
    if(existsSync(path)&&(!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink()))throw invalid();
    mkdirSync(dirname(path),{recursive:true,mode:0o700});
    db=new DatabaseSync(path);
    db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    if(tables.some(row=>!['ai_budget_config','ai_budget_reservations'].includes(row.name)))throw invalid();
    chmodSync(path,0o600);
    db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS ai_budget_config(
        singleton INTEGER PRIMARY KEY CHECK(singleton=1),schema_version INTEGER NOT NULL,
        budget_id TEXT NOT NULL,limit_micro_cny INTEGER NOT NULL CHECK(limit_micro_cny BETWEEN 0 AND 8000000),
        model TEXT NOT NULL,price_version TEXT NOT NULL,input_micro_per_token INTEGER NOT NULL,
        output_micro_per_token INTEGER NOT NULL,input_overhead INTEGER NOT NULL,created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS ai_budget_reservations(
        id TEXT PRIMARY KEY,budget_id TEXT NOT NULL,model TEXT NOT NULL,request_bytes INTEGER NOT NULL,
        input_token_bound INTEGER NOT NULL,max_tokens INTEGER NOT NULL,
        reserved_micro_cny INTEGER NOT NULL CHECK(reserved_micro_cny>0),created_at INTEGER NOT NULL,
        usage_json TEXT CHECK(usage_json IS NULL OR json_valid(usage_json)),usage_recorded_at INTEGER);`);
    db.exec('BEGIN IMMEDIATE');
    try{
      const current=db.prepare('SELECT * FROM ai_budget_config WHERE singleton=1').get();
      if(current){
        if(current.schema_version!==1||current.budget_id!==budgetId||current.limit_micro_cny!==limit
          ||current.model!==BUDGET_MODEL||current.price_version!==priceVersion
          ||current.input_micro_per_token!==INPUT_MICRO_PER_TOKEN||current.output_micro_per_token!==OUTPUT_MICRO_PER_TOKEN
          ||current.input_overhead!==BUDGET_INPUT_OVERHEAD)throw invalid();
      }else{
        // A detached reservation table is corrupt, not a fresh budget.
        if(db.prepare('SELECT COUNT(*) n FROM ai_budget_reservations').get().n)throw invalid();
        db.prepare('INSERT INTO ai_budget_config VALUES(1,1,?,?,?,?,?,?,?,?)')
          .run(budgetId,limit,BUDGET_MODEL,priceVersion,INPUT_MICRO_PER_TOKEN,OUTPUT_MICRO_PER_TOKEN,BUDGET_INPUT_OVERHEAD,now());
      }
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }catch(error){try{db?.close();}catch{}throw error instanceof BudgetError?error:unavailable();}

  function run(work){
    if(closed)throw unavailable();
    try{return work();}catch(error){throw error instanceof BudgetError?error:unavailable();}
  }
  function reserve({model,requestBytes,maxTokens}={}){
    if(model!==BUDGET_MODEL||!safeInteger(requestBytes,1,98304)||!safeInteger(maxTokens,1,4096))throw invalid();
    const inputTokenBound=requestBytes+BUDGET_INPUT_OVERHEAD;
    const cost=inputTokenBound*INPUT_MICRO_PER_TOKEN+maxTokens*OUTPUT_MICRO_PER_TOKEN;
    return run(()=>{
      db.exec('BEGIN IMMEDIATE');
      try{
        const reservedAt=now();
        if(!safeInteger(reservedAt,0,Number.MAX_SAFE_INTEGER))throw invalid();
        if(reservedAt>=Date.parse(BUDGET_PRICE_VALID_UNTIL))throw new BudgetError('AI_BUDGET_PRICE_EXPIRED',503);
        const spent=db.prepare('SELECT COALESCE(SUM(reserved_micro_cny),0) amount FROM ai_budget_reservations').get().amount;
        if(!safeInteger(spent,0,limit)||cost>limit-spent)throw new BudgetError('AI_BUDGET_EXCEEDED',429);
        const reservationId=randomUUID();
        db.prepare('INSERT INTO ai_budget_reservations VALUES(?,?,?,?,?,?,?,?,NULL,NULL)')
          .run(reservationId,budgetId,model,requestBytes,inputTokenBound,maxTokens,cost,reservedAt);
        db.exec('COMMIT');return {reservationId,reservedMicroCny:cost};
      }catch(error){db.exec('ROLLBACK');throw error;}
    });
  }
  function recordUsage(reservationId,usage){
    if(typeof reservationId!=='string'||!/^[-a-f0-9]{36}$/.test(reservationId))throw invalid();
    const json=JSON.stringify(cleanUsage(usage));
    return run(()=>{
      db.exec('BEGIN IMMEDIATE');
      try{
        const row=db.prepare('SELECT usage_json,usage_recorded_at FROM ai_budget_reservations WHERE id=? AND budget_id=?').get(reservationId,budgetId);
        if(!row)throw invalid();
        if(row.usage_recorded_at!==null){
          if(row.usage_json!==json)throw new BudgetError('AI_BUDGET_USAGE_CONFLICT',409);
          db.exec('COMMIT');return {recorded:true,duplicate:true};
        }
        db.prepare('UPDATE ai_budget_reservations SET usage_json=?,usage_recorded_at=? WHERE id=? AND budget_id=?').run(json,now(),reservationId,budgetId);
        db.exec('COMMIT');return {recorded:true,duplicate:false};
      }catch(error){db.exec('ROLLBACK');throw error;}
    });
  }
  function summary(){return run(()=>{
    const row=db.prepare('SELECT COALESCE(SUM(reserved_micro_cny),0) amount,COUNT(*) count,COALESCE(SUM(usage_recorded_at IS NULL),0) unreported FROM ai_budget_reservations').get();
    return {budgetId,currency:'CNY',limitMicroCny:limit,reservedMicroCny:row.amount,remainingMicroCny:Math.max(0,limit-row.amount),
      reservations:row.count,unreportedReservations:row.unreported,model:BUDGET_MODEL,priceVersion,priceValidUntil:BUDGET_PRICE_VALID_UNTIL,
      inputMicroCnyPerToken:INPUT_MICRO_PER_TOKEN,outputMicroCnyPerToken:OUTPUT_MICRO_PER_TOKEN,inputTokenOverhead:BUDGET_INPUT_OVERHEAD,
      policy:'cumulative_nonrefundable_reservations'};
  });}
  function close(){if(!closed){closed=true;try{db.close();}catch{throw unavailable();}}}
  return Object.freeze({reserve,recordUsage,summary,close});
}
