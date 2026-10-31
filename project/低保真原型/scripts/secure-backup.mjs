// Input must be a completed consistent backup, never a live SQLite/WAL file.
import {encryptBackup,decryptBackup} from '../server/encrypted-backup.mjs';
import {createReadStream} from 'node:fs';
const [mode,input,output]=process.argv.slice(2),key=process.env.BACKUP_ENCRYPTION_KEY;
if(!['encrypt','restore'].includes(mode)||!input||!output)throw Error('Usage: secure-backup.mjs encrypt|restore <input> <new-output>');
const result=mode==='encrypt'?await encryptBackup(input,output,key):await decryptBackup(input,output,key);
if(process.argv.includes('--upload')){
 if(mode!=='encrypt'||process.env.BACKUP_REMOTE_ENABLED!=='1')throw Error('REMOTE_UPLOAD_NOT_ENABLED');
 const url=new URL(process.env.BACKUP_REMOTE_URL||'');if(url.protocol!=='https:'||url.username||url.password||!process.env.BACKUP_REMOTE_TOKEN)throw Error('REMOTE_CONFIGURATION_REQUIRED');
 const r=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(60000),duplex:'half',headers:{'Content-Type':'application/octet-stream',Authorization:'Bearer '+process.env.BACKUP_REMOTE_TOKEN,'X-Backup-SHA256':result.sha256,'Idempotency-Key':result.sha256},body:createReadStream(output)});await r.body?.cancel();if(!r.ok)throw Error('REMOTE_BACKUP_FAILED');result.uploaded=true;
}
console.log(JSON.stringify(result));
