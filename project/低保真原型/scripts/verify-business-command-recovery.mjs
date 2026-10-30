// Only synthetic databases are backed up/restored. Never accepts a production path.
import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {createBusinessStore} from '../server/business-store.mjs';
import {createBusinessCommands} from '../server/business-commands.mjs';
import {createBudgetLedger} from '../server/agent/budget.mjs';
import {randomUUID} from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url)),dir=fs.mkdtempSync(path.join(tmpdir(),'career-command-recovery-')),report={syntheticDataOnly:true,productionChanged:false,realProviderCalls:0,checks:[],passed:false};let db,restored,ledger;
try{
  const database=path.join(dir,'auth.sqlite'),budget=path.join(dir,'budget.sqlite');db=new DatabaseSync(database);db.exec("CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('synthetic-owner')");
  const business=createBusinessStore(db),commands=createBusinessCommands({db,business});
  const input={type:'task.create',payload:{draft:{title:'合成恢复任务',purpose:'验证回执与数据一致恢复',hours:1},confirmation:'CREATE_TASK'},baseVersion:0,mutationId:randomUUID()},receipt=commands.execute('synthetic-owner',input);
  ledger=createBudgetLedger({database:budget});ledger.reserve({model:'deepseek-flash',requestBytes:1000,maxTokens:100});const before=ledger.summary();
  const result=spawnSync(process.env.CAREER_TEST_PYTHON||'python',[path.join(root,'server/backup-db.py'),'--database',database,'--directory',path.join(dir,'backups'),'--knowledge',path.join(dir,'not-present.sqlite'),'--budget',budget],{encoding:'utf8'});assert.equal(result.status,0,result.stderr||result.error?.message);
  const files=fs.readdirSync(path.join(dir,'backups')),accountBackup=files.find(f=>/^career-.*\.sqlite$/.test(f)&&!f.includes('ai-budget')),budgetBackup=files.find(f=>f.endsWith('-ai-budget.sqlite'));assert.ok(accountBackup&&budgetBackup);
  restored=new DatabaseSync(path.join(dir,'backups',accountBackup));const restoredBusiness=createBusinessStore(restored),restoredCommands=createBusinessCommands({db:restored,business:restoredBusiness});
  assert.equal(restoredBusiness.read('synthetic-owner').state.tasks[0].id,receipt.refs.taskId);assert.equal(restoredCommands.get('synthetic-owner',input.mutationId).revision,1);assert.equal(restoredCommands.execute('synthetic-owner',input).duplicate,true);assert.equal(restoredBusiness.read('synthetic-owner').state.tasks.length,1);report.checks.push('consistent backup restores the task, revision and idempotency receipt together');
  const copy=new DatabaseSync(path.join(dir,'backups',budgetBackup),{readOnly:true});assert.equal(copy.prepare('SELECT SUM(reserved_micro_cny) n FROM ai_budget_reservations').get().n,before.reservedMicroCny);copy.close();assert.equal(ledger.summary().reservedMicroCny,before.reservedMicroCny);report.checks.push('forensic budget backup agrees; no live ledger is restored or reset');report.passed=true;
}catch(error){report.failure={message:error.message};process.exitCode=1;}
finally{
  restored?.close();ledger?.close();db?.close();const out=path.resolve(root,process.env.BACKEND_RECOVERY_OUTPUT||'checks/后端闭环_20261029');assert.ok(out.startsWith(path.join(root,'checks')+path.sep));fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'recovery-report.json'),JSON.stringify(report,null,2));
  if(path.resolve(dir).startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(dir).startsWith('career-command-recovery-'))fs.rmSync(dir,{recursive:true,force:true});console.log(JSON.stringify(report));
}
