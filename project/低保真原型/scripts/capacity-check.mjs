// Loopback only, separate server process, fresh synthetic DB; never production.
import {fork,execFileSync} from 'node:child_process';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir,cpus,totalmem,platform} from 'node:os';
import path from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const dir=await mkdtemp(path.join(tmpdir(),'career-capacity-')),out=path.resolve('checks/backend-completeness-20261030');await mkdir(out,{recursive:true});
const soak=process.argv.includes('--soak'),twoCpu=process.argv.includes('--two-cpu'),started=performance.now();
const token=randomBytes(32).toString('hex'),report={syntheticOnly:true,loopbackOnly:true,realProviderCalls:0,concurrency:20,rounds:soak?60:10,claimsPerAccount:50,environment:{node:process.version,platform:platform(),logicalCpus:cpus().length,memoryBytes:totalmem()},samples:[],failures:[],passed:false};
const child=fork('scripts/capacity-worker.mjs',[],{env:{...process.env,AUTH_DATABASE:'',AI_ENABLED:'0',MAIL_ENABLED:'0',CAPACITY_DATABASE:path.join(dir,'auth.sqlite'),CAPACITY_TOKEN:token},stdio:['ignore','ignore','pipe','ipc']});let base,stderr='';child.stderr.on('data',d=>stderr+=String(d).slice(0,500));
if(twoCpu){assert.equal(platform(),'win32','TWO_CPU_AFFINITY_IMPLEMENTED_FOR_WINDOWS_ONLY');execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`(Get-Process -Id ${child.pid}).ProcessorAffinity = [IntPtr]3`]);report.environment.serverAffinityLogicalCpus=2;}
const percentile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.max(0,Math.ceil(a.length*p)-1)]||0;
function client(index){const jar=new Map();let csrf='';return async(route,{data,method=data?'POST':'GET',phase='business'}={})=>{
 const start=performance.now(),response=await fetch(base+route,{method,signal:AbortSignal.timeout(30000),headers:{Origin:'http://capacity.test',Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...(data?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{})},...(data?{body:JSON.stringify(data)}:{})});
 for(const cookie of response.headers.getSetCookie()){const [k,v]=cookie.split(';')[0].split('=');jar.set(k,v);}const body=await response.json();if(body.csrfToken)csrf=body.csrfToken;
 report.samples.push({phase,status:response.status,ms:Math.round(performance.now()-start)});if(!response.ok)report.failures.push({phase,status:response.status,code:body.code});assert.equal(response.ok,true,JSON.stringify({phase,status:response.status,code:body.code}));return body;
};}
try{
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('SERVER_START_TIMEOUT')),20000);child.once('message',m=>{clearTimeout(timer);resolve(m.port);});child.once('exit',code=>{clearTimeout(timer);reject(Error('SERVER_EXIT_'+code));});});base=`http://127.0.0.1:${port}`;
 const users=Array.from({length:20},(_,i)=>({i,request:client(i)}));
 await Promise.all(users.map(async u=>{await u.request('/api/auth/session',{phase:'session'});const login=await u.request('/api/auth/login',{data:{email:`capacity-${u.i}@example.invalid`,password:'Synthetic capacity secret 2026!'},phase:'login'});u.id=login.user.id;u.snapshot=await u.request('/api/workspace');u.snapshot.state.claims=Array.from({length:50},(_,n)=>({id:'synthetic-'+n,version:1,status:'待确认',title:'Synthetic fixture '+n,text:'Synthetic material '.repeat(30),contribution:'Synthetic contribution',skill:'SQL'}));}));
 for(let refresh=0;refresh<3;refresh++)await Promise.all(users.map(u=>u.request('/api/auth/refresh',{data:{},phase:'refresh'})));
 for(let round=0;round<report.rounds;round++){
   if(soak)await new Promise(r=>setTimeout(r,1000));
   await Promise.all(users.map(async u=>{await u.request('/api/workspace',{method:'PUT',data:{actorId:u.id,baseVersion:u.snapshot.revision,mutationId:randomUUID(),state:{...u.snapshot.state,goal:round%2?'data':null,budget:round+1}},phase:'save'});const context=await u.request('/api/agent/suggestions',{phase:'suggestions'});assert.equal(context.automaticModelCalls,false);u.snapshot=await u.request('/api/workspace',{phase:'read'});}));
 }
 const metrics=await(await fetch(base+'/api/ops/metrics',{headers:{Authorization:'Bearer '+token}})).json();report.metrics=metrics;
 for(const phase of ['login','save','suggestions','read']){const ms=report.samples.filter(x=>x.phase===phase).map(x=>x.ms);report[phase]={requests:ms.length,p50Ms:percentile(ms,.5),p95Ms:percentile(ms,.95),maxMs:Math.max(...ms)};}
 assert.equal(report.failures.length,0);assert.ok(report.save.p95Ms<1000,'LOCAL_SAVE_P95_OVER_1000MS');assert.ok(report.read.p95Ms<1000,'LOCAL_READ_P95_OVER_1000MS');assert.ok(metrics.memory.rssBytes<650*1024*1024,'STEADY_RSS_OVER_SERVICE_LIMIT');
 report.passed=true;
}catch(error){report.error={message:error.message};process.exitCode=1;}
finally{
 if(child.connected){child.send('close');await new Promise(r=>{child.once('exit',r);setTimeout(()=>{child.kill();r();},5000).unref();});}else child.kill();
 await rm(dir,{recursive:true,force:true});report.syntheticDatabaseRemoved=true;report.elapsedSeconds=Math.round((performance.now()-started)/100)/10;delete report.samples;report.stderr=stderr;await writeFile(path.join(out,twoCpu?'capacity-two-cpu.json':soak?'capacity-soak.json':'capacity.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
