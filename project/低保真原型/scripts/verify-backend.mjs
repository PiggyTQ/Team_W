// Reproducible local acceptance. No production addresses, credentials or paid calls.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'checks','后端闭环_20261029');fs.mkdirSync(out,{recursive:true});
const report={scope:'local_candidate',startedAt:new Date().toISOString(),realProviderCalls:0,productionChanged:false,checks:[],passed:false};
const tests=fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f);
const jobs=[['unit-and-http',['--test',...tests]],['bilingual',['scripts/prepare-bilingual.mjs','--check']],['server-build',['node_modules/vite/bin/vite.js','build','--mode','server']],['browser',['tests/backend-business-browser.mjs']],['backup-recovery',['scripts/verify-business-command-recovery.mjs']]];
for(const [name,args]of jobs){
  console.log('VERIFY '+name);const start=Date.now(),run=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,BACKEND_TEST_PRODUCTION:'0',AI_ENABLED:'0'},encoding:'utf8',maxBuffer:8*1024*1024});
  fs.writeFileSync(path.join(out,name+'.log'),(run.stdout||'')+'\n'+(run.stderr||''));
  const row={name,passed:run.status===0,durationMs:Date.now()-start};report.checks.push(row);console.log(JSON.stringify(row));
  if(run.status!==0){report.failure={name,error:run.error?.message||'Check failed; see log'};process.exitCode=1;break;}
}
report.passed=report.checks.length===jobs.length&&report.checks.every(row=>row.passed);report.finishedAt=new Date().toISOString();
fs.writeFileSync(path.join(out,'acceptance-summary.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
