// Read-only loopback probe. Optional alerts contain state codes, no user content.
import {readFile} from 'node:fs/promises';
import {X509Certificate} from 'node:crypto';
import {backupReceiptIssue,recordProbeHistory,writeProbeState} from '../server/ops-history.mjs';
const base=process.env.OPS_BASE_URL||'http://127.0.0.1:3001',url=new URL(base);
if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.protocol!=='http:')throw Error('LOOPBACK_REQUIRED');
const issues=[],summary={checkedAt:new Date().toISOString(),issues,privateDataIncluded:false};
async function get(route){const r=await fetch(base+route,{headers:{'X-Forwarded-Proto':'https',...(process.env.OPS_READ_TOKEN?{Authorization:'Bearer '+process.env.OPS_READ_TOKEN}:{})},signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error();return r.json();}
try{const ready=await get('/api/ready');if(ready.status!=='ok')issues.push('DATABASE_NOT_READY');}catch{issues.push('SERVICE_UNAVAILABLE');}
if(process.env.OPS_READ_TOKEN)try{const m=await get('/api/ops/metrics');summary.metrics={inFlight:m.inFlight,rssBytes:m.memory.rssBytes,eventLoopP99Ms:m.eventLoop.p99Ms};if(m.memory.rssBytes>600*1024*1024)issues.push('MEMORY_HIGH');if(m.eventLoop.p99Ms>500)issues.push('EVENT_LOOP_DELAY');if(m.maintenanceErrors)issues.push('MAINTENANCE_FAILED');const requests=m.requests.filter(r=>!['/api/health','/api/ready','/api/ops/metrics'].includes(r.route)),total=requests.reduce((n,r)=>n+r.count,0),errors=requests.filter(r=>r.status==='5xx').reduce((n,r)=>n+r.count,0);if(total>=20&&errors/total>.05)issues.push('HTTP_ERROR_RATE_HIGH');if(m.mail?.failed)issues.push('MAIL_DELIVERY_FAILED');}catch{issues.push('METRICS_UNAVAILABLE');}
if(process.env.OPS_BACKUP_RECEIPT){const issue=await backupReceiptIssue(process.env.OPS_BACKUP_RECEIPT);if(issue)issues.push(issue);}
if(process.env.OPS_TLS_CERT_FILE)try{const cert=new X509Certificate(await readFile(process.env.OPS_TLS_CERT_FILE)),remaining=new Date(cert.validTo).getTime()-Date.now();if(!Number.isFinite(remaining)||remaining<48*3600000)issues.push('TLS_CERTIFICATE_EXPIRING');summary.certificateExpiresAt=new Date(cert.validTo).toISOString();}catch{issues.push('TLS_CERTIFICATE_UNAVAILABLE');}
let previous=null;const stateFile=process.env.OPS_STATE_FILE;if(stateFile)try{previous=JSON.parse(await readFile(stateFile,'utf8'));}catch{}
if(process.env.OPS_HISTORY_DIRECTORY)try{const result=await recordProbeHistory(process.env.OPS_HISTORY_DIRECTORY,summary);if(!result.written)issues.push('OPS_HISTORY_FAILED');}catch{issues.push('OPS_HISTORY_FAILED');}
if(process.env.OPS_ALERT_URL&&JSON.stringify(previous?.issues)!==JSON.stringify(issues)&&(issues.length||previous?.issues?.length)){
 try{const endpoint=new URL(process.env.OPS_ALERT_URL);if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||!process.env.OPS_ALERT_TOKEN)throw Error();const r=await fetch(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.OPS_ALERT_TOKEN},body:JSON.stringify(summary)});await r.body?.cancel();if(!r.ok)throw Error();summary.alertDelivered=true;}catch{summary.alertDelivered=false;}
}
// Failed delivery keeps the previous state so the next probe retries.
if(stateFile&&summary.alertDelivered!==false)await writeProbeState(stateFile,summary);
console.log(JSON.stringify(summary));if(issues.length)process.exitCode=1;
