import {timingSafeEqual} from 'node:crypto';
import {monitorEventLoopDelay,performance} from 'node:perf_hooks';
const limits=[5,20,50,100,250,500,1000,2500,5000,15000,60000];
const exact=new Set(['/api/health','/api/ready','/api/workspace','/api/workspace/export','/api/commands','/api/system/capabilities','/api/ops/metrics',
 '/api/auth/session','/api/auth/me','/api/auth/login','/api/auth/register','/api/auth/recover','/api/auth/logout','/api/auth/refresh','/api/auth/sessions','/api/auth/change-password','/api/auth/revoke-others','/api/auth/clear-workspace','/api/auth/delete-account',
 '/api/agent/respond','/api/agent/analyse','/api/agent/propose','/api/agent/apply','/api/agent/feedback','/api/agent/memory','/api/agent/workflow','/api/agent/operations','/api/agent/personal-context','/api/agent/suggestions','/api/agent/suggestions/feedback','/api/agent/context-events','/api/agent/knowledge-status',
 '/api/services/assessment','/api/services/report','/api/services/report-preview']);
export function operationRoute(raw){
  const path=String(raw||'').split('?')[0];if(exact.has(path))return path;
  for(const [pattern,label]of [[/^\/api\/commands\//,'/api/commands/:id'],[/^\/api\/catalog\//,'/api/catalog/:resource'],[/^\/api\/records\//,'/api/records/:collection/:id'],[/^\/api\/admin\//,'/api/admin/:action']])if(pattern.test(path))return label;
  return '/other';
}
export function createRuntimeOperations({token='',clock=Date.now,intervalMs=300000}={}){
  if(token&&(!/^[\x21-\x7e]{32,256}$/.test(token)))throw Error('OPS_TOKEN_INVALID');
  let started=clock(),inFlight=0,aborted=0,maintenanceErrors=0;const rows=new Map();
  const lag=monitorEventLoopDelay({resolution:20});lag.enable();let before=performance.eventLoopUtilization();
  function rotate(){if(clock()-started>=intervalMs){rows.clear();aborted=maintenanceErrors=0;started=clock();lag.reset();before=performance.eventLoopUtilization();}}
  function begin(req,res){rotate();inFlight++;const at=performance.now(),route=operationRoute(req.url),method=['GET','POST','PUT','DELETE','PATCH'].includes(req.method)?req.method:'OTHER';let ended=false;
    const done=()=>{if(ended)return;ended=true;inFlight--;rotate();if(!res.writableFinished)aborted++;
      const status=Math.floor((res.statusCode||500)/100)+'xx',key=method+' '+route+' '+status;
      let row=rows.get(key);if(!row){row={method,route,status,count:0,totalMs:0,maxMs:0,buckets:Array(limits.length+1).fill(0)};rows.set(key,row);}
      const elapsed=performance.now()-at;row.count++;row.totalMs+=elapsed;row.maxMs=Math.max(row.maxMs,elapsed);const i=limits.findIndex(x=>elapsed<=x);row.buckets[i<0?limits.length:i]++;
    };res.once('finish',done);res.once('close',done);
  }
  function authorized(header){if(!token||typeof header!=='string')return false;const a=Buffer.from(header),b=Buffer.from('Bearer '+token);return a.length===b.length&&timingSafeEqual(a,b);}
  function snapshot(){rotate();const mem=process.memoryUsage();return {schemaVersion:1,windowStartedAt:new Date(started).toISOString(),windowMs:intervalMs,inFlight,aborted,maintenanceErrors,uptimeSeconds:Math.floor(process.uptime()),memory:{rssBytes:mem.rss,heapUsedBytes:mem.heapUsed,peakRssBytes:process.resourceUsage().maxRSS*1024},eventLoop:{meanMs:Number.isFinite(lag.mean)?lag.mean/1e6:0,p99Ms:lag.percentile(99)/1e6,utilization:performance.eventLoopUtilization(before).utilization},durationBucketUpperMs:[...limits,null],requests:[...rows.values()].map(r=>({...r,totalMs:Math.round(r.totalMs),maxMs:Math.round(r.maxMs)})),privatePayloadsLogged:false};}
  return {begin,authorized,snapshot,maintenanceFailed:()=>maintenanceErrors++,close:()=>lag.disable()};
}
