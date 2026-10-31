import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {withdrawSource} from '../scripts/withdraw-agent-source.mjs';
import {loadGuidance,reviewedLibrary} from '../server/agent/library.mjs';
import {createAgentOperations} from '../server/agent/operations.mjs';
test('atomic withdrawal immediately removes affected chunks without republishing revoked content',t=>{
  const dir=fs.mkdtempSync(path.join(tmpdir(),'career-withdraw-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'knowledge.json');fs.writeFileSync(file,JSON.stringify(loadGuidance()));const k=reviewedLibrary(file),before=k.snapshot();const r=withdrawSource(file,'foundation-SW_BE-learning');assert.equal(r.removedChunks,1);assert.notEqual(k.snapshot().digest,before.digest);assert.ok(k.snapshot().chunks.every(c=>c.sourceId!=='foundation-SW_BE-learning'));assert.equal(withdrawSource(file,'foundation-SW_BE-learning').duplicate,true);assert.throws(()=>withdrawSource(file,'not-found'));assert.equal(fs.readdirSync(dir).length,1);
});
test('operations record aggregates only, isolate owners, expire after 30 days and cascade deletion',t=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('alice'),('bob')");let now=Date.UTC(2026,9,28);const operations=createAgentOperations(db,{now:()=>now});operations.record('alice','respond',200,10);operations.record('alice','respond',200,20);operations.record('alice','private material',200,20);assert.deepEqual(operations.read('bob').rows,[]);const row=operations.read('alice').rows[0];assert.equal(row.count,2);assert.equal(row.total_ms,30);assert.equal(row.max_ms,20);assert.equal(operations.read('alice').rows.length,1);now+=31*86400000;operations.record('alice','analyse',503,7);assert.equal(operations.read('alice').rows.length,1);db.exec("DELETE FROM users WHERE id='alice'");operations.record('alice','apply',200,1);assert.equal(db.prepare('SELECT count(*) n FROM agent_operation_daily').get().n,0);
});
