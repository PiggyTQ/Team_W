import {mkdir,lstat,open,rename,unlink,readdir,readFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
const allowed=new Set(['DATABASE_NOT_READY','SERVICE_UNAVAILABLE','MEMORY_HIGH','EVENT_LOOP_DELAY','MAINTENANCE_FAILED','HTTP_ERROR_RATE_HIGH','MAIL_DELIVERY_FAILED','METRICS_UNAVAILABLE','BACKUP_STALE','BACKUP_RECEIPT_MISSING','BACKUP_RECEIPT_INVALID','TLS_CERTIFICATE_EXPIRING','TLS_CERTIFICATE_UNAVAILABLE','OPS_HISTORY_FAILED']);
export function sanitizedProbe(value){
 const time=new Date(value?.checkedAt);if(!Number.isFinite(time.getTime()))throw Error('INVALID_PROBE_TIME');
 const result={checkedAt:time.toISOString(),issues:[...new Set((value.issues||[]).filter(x=>allowed.has(x)))].sort(),privateDataIncluded:false};
 if(value.metrics){result.metrics={};for(const name of ['inFlight','rssBytes','eventLoopP99Ms']){const n=value.metrics[name];if(typeof n==='number'&&Number.isFinite(n)&&n>=0)result.metrics[name]=Math.round(n*100)/100;}}
 if(typeof value.certificateExpiresAt==='string'&&Number.isFinite(Date.parse(value.certificateExpiresAt)))result.certificateExpiresAt=new Date(value.certificateExpiresAt).toISOString();
 if(typeof value.alertDelivered==='boolean')result.alertDelivered=value.alertDelivered;
 return result;
}
async function directory(path){await mkdir(path,{recursive:true,mode:0o700});const s=await lstat(path);if(!s.isDirectory()||s.isSymbolicLink())throw Error('UNSAFE_OPS_DIRECTORY');}
export async function writeProbeState(path,value){
 await directory(dirname(path));const temp=path+'.pending-'+randomUUID();let file;
 try{file=await open(temp,'wx',0o600);await file.writeFile(JSON.stringify(sanitizedProbe(value)));await file.sync();await file.close();file=null;await rename(temp,path);}
 finally{await file?.close();await unlink(temp).catch(()=>{});}
}
export async function recordProbeHistory(folder,value,{retentionDays=30,maxDailyBytes=2*1024*1024}={}){
 if(!Number.isInteger(retentionDays)||retentionDays<1||retentionDays>90||!Number.isInteger(maxDailyBytes)||maxDailyBytes<512||maxDailyBytes>10*1024*1024)throw Error('INVALID_HISTORY_LIMIT');
 const record=sanitizedProbe(value),day=record.checkedAt.slice(0,10),now=Date.parse(record.checkedAt);await directory(folder);
 const path=join(folder,day+'.jsonl');try{if((await lstat(path)).isSymbolicLink())throw Error('UNSAFE_HISTORY_FILE');}catch(e){if(e.code!=='ENOENT')throw e;}
 const file=await open(path,constants.O_WRONLY|constants.O_APPEND|constants.O_CREAT|(constants.O_NOFOLLOW||0),0o600);let written=false;
 try{const line=JSON.stringify(record)+'\n';if((await file.stat()).size+Buffer.byteLength(line)<=maxDailyBytes){await file.writeFile(line);await file.sync();written=true;}}finally{await file.close();}
 const firstDay=new Date(now-(retentionDays-1)*86400000).toISOString().slice(0,10);
 for(const item of await readdir(folder,{withFileTypes:true})){const match=/^(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(item.name);if(item.isFile()&&match&&match[1]<firstDay){const time=Date.parse(match[1]+'T00:00:00Z');if(Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===match[1])await unlink(join(folder,item.name));}}
 return {written,retentionDays,maxDailyBytes};
}
export async function backupReceiptIssue(path,{now=Date.now(),maxAgeMs=30*3600000}={}){
 try{
  const info=await lstat(path);if(!info.isFile()||info.isSymbolicLink()||info.size>8192)return 'BACKUP_RECEIPT_INVALID';
  const value=JSON.parse(await readFile(path,'utf8')),at=Date.parse(value.verifiedAt);
  if(value.restoreCheck!==true||!Number.isFinite(at)||at>now+300000||typeof value.accountBackup!=='string'||!/^((career|before-business)-)[-a-zA-Z0-9]+\.sqlite$/.test(value.accountBackup))return 'BACKUP_RECEIPT_INVALID';
  if(now-at>maxAgeMs)return 'BACKUP_STALE';
  const backup=await lstat(join(dirname(path),value.accountBackup));if(!backup.isFile()||backup.isSymbolicLink()||backup.size<100)return 'BACKUP_RECEIPT_INVALID';
  return null;
 }catch(e){return e.code==='ENOENT'?'BACKUP_RECEIPT_MISSING':'BACKUP_RECEIPT_INVALID';}
}
