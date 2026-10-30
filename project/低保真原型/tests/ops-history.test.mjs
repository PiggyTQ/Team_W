import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile,readdir,stat,utimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {recordProbeHistory,writeProbeState,backupReceiptIssue} from '../server/ops-history.mjs';
test('persistent probe history is whitelisted, bounded per day, retained for 30 days and survives a new reader',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'career-history-'));try{
 const value={checkedAt:'2026-10-30T00:00:00Z',issues:['MEMORY_HIGH','PRIVATE_EMAIL@example.invalid'],metrics:{rssBytes:12345,email:'PRIVATE_BODY'},token:'PRIVATE_TOKEN',body:'PRIVATE_BODY'};
 await writeFile(join(dir,'2026-09-01.jsonl'),'old');await writeFile(join(dir,'2026-10-01.jsonl'),'keep');await writeFile(join(dir,'keep.txt'),'unrelated');
 for(let i=0;i<20;i++)await recordProbeHistory(dir,value,{maxDailyBytes:512});
 assert.ok((await stat(join(dir,'2026-10-30.jsonl'))).size<=512);const text=await readFile(join(dir,'2026-10-30.jsonl'),'utf8');assert.doesNotMatch(text,/PRIVATE_/);assert.match(text,/MEMORY_HIGH/);
 const files=await readdir(dir);assert.equal(files.includes('2026-09-01.jsonl'),false);assert.ok(files.includes('2026-10-01.jsonl'));assert.ok(files.includes('keep.txt'));
 for(let i=0;i<3;i++)await writeProbeState(join(dir,'state.json'),value);assert.equal(JSON.parse(await readFile(join(dir,'state.json'),'utf8')).metrics.rssBytes,12345);assert.equal((await readdir(dir)).some(n=>n.includes('.pending-')),false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('backup validation rejects fresh-looking bad receipts, stale timestamps, unsafe references and missing backup files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'career-receipt-'));try{
 const file=join(dir,'last-success.json'),now=Date.parse('2026-10-30T00:00:00Z'),valid={verifiedAt:new Date(now).toISOString(),restoreCheck:true,accountBackup:'career-20261030T000000000000Z.sqlite'};
 await writeFile(join(dir,valid.accountBackup),Buffer.alloc(4096));await writeFile(file,JSON.stringify(valid));assert.equal(await backupReceiptIssue(file,{now}),null);
 await writeFile(file,JSON.stringify({...valid,restoreCheck:false}));assert.equal(await backupReceiptIssue(file,{now}),'BACKUP_RECEIPT_INVALID');
 await writeFile(file,JSON.stringify({...valid,verifiedAt:'2026-10-28T00:00:00Z'}));await utimes(file,new Date(now),new Date(now));assert.equal(await backupReceiptIssue(file,{now}),'BACKUP_STALE');
 for(const patch of [{accountBackup:'../private.sqlite'},{accountBackup:'career-missing.sqlite'},{verifiedAt:'2026-11-01T00:00:00Z'}]){await writeFile(file,JSON.stringify({...valid,...patch}));assert.notEqual(await backupReceiptIssue(file,{now}),null);}
 }finally{await rm(dir,{recursive:true,force:true});}
});
