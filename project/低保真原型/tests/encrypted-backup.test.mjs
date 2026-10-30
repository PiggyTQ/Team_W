import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,access} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {encryptBackup,decryptBackup} from '../server/encrypted-backup.mjs';
test('backup authenticated roundtrip, exclusive output, wrong-key rejection and no partial restored file',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'career-encrypted-'));try{const input=join(dir,'synthetic'),encrypted=join(dir,'encrypted'),restored=join(dir,'restored'),key='ab'.repeat(32);await writeFile(input,'Synthetic private fixture '.repeat(200000));
 const info=await encryptBackup(input,encrypted,key);assert.equal(info.format,'CGBK1');assert.equal((await readFile(encrypted)).includes(Buffer.from('Synthetic private fixture')),false);
 await assert.rejects(encryptBackup(input,encrypted,key));await assert.rejects(decryptBackup(encrypted,restored,'cd'.repeat(32)));await assert.rejects(access(restored));
 await decryptBackup(encrypted,restored,key);assert.deepEqual(await readFile(restored),await readFile(input));await assert.rejects(decryptBackup(encrypted,restored,key));
 }finally{await rm(dir,{recursive:true,force:true});}
});
