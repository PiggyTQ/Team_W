import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRuntimeOperations,operationRoute} from '../server/runtime-operations.mjs';
import {createConcurrencyGate} from '../server/concurrency-gate.mjs';
test('bounded route metrics never include URL IDs, queries, headers or private payloads',()=>{
 let clock=0;const token='a'.repeat(40),m=createRuntimeOperations({token,clock:()=>clock,intervalMs:100});
 try{for(let i=0;i<200;i++){const res=new EventEmitter();res.statusCode=200;res.writableFinished=true;m.begin({method:'GET',url:'/api/records/claims/private-'+i+'?email=SECRET',headers:{authorization:token}},res);res.emit('finish');res.emit('close');}
 const s=m.snapshot();assert.equal(s.requests.length,1);assert.equal(s.requests[0].count,200);assert.equal(s.inFlight,0);assert.doesNotMatch(JSON.stringify(s),/SECRET|private-|aaaaaa/);
 assert.equal(m.authorized('Bearer '+token),true);assert.equal(m.authorized(token),false);assert.equal(operationRoute('/unknown/SECRET'),'/other');clock=101;assert.equal(m.snapshot().requests.length,0);
 }finally{m.close();}
});
test('hash admission bounds concurrency and queue, drains after errors, rejects after shutdown',async()=>{
 const g=createConcurrencyGate({capacity:1,maxQueued:1,waitMs:20}),release=await g.acquire(),next=g.acquire();
 await assert.rejects(g.acquire(),e=>e.status===503);assert.equal(g.snapshot().queued,1);release();(await next)();assert.equal(g.snapshot().active,0);
 const hold=await g.acquire();await assert.rejects(g.acquire(),e=>e.status===503);hold();g.close();await assert.rejects(g.acquire());
});
