import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {createBusinessStore} from '../server/business-store.mjs';
import {createAgentWorkflow} from '../server/agent/workflow.mjs';
import {createBudgetLedger} from '../server/agent/budget.mjs';
import {fresh} from '../src/model.js';
const dir=fs.mkdtempSync(path.join(tmpdir(),'career-agent-recovery-')),report={syntheticDataOnly:true,productionChanged:false,paidCalls:0,checks:[]};let db,ledger,restored;
try{
  const database=path.join(dir,'auth.sqlite'),budget=path.join(dir,'budget.sqlite');db=new DatabaseSync(database);db.exec("CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('recovery-student')");const business=createBusinessStore(db),workflow=createAgentWorkflow({db,business});business.save('recovery-student',{state:fresh(),baseVersion:0,mutationId:randomUUID()});
  const p=workflow.propose('recovery-student',{career:'data',baseVersion:1,skillId:'SK_SQL',hours:1,dependsOn:[]});const receipt=workflow.apply('recovery-student',{id:p.id,baseVersion:1,confirmation:'APPLY_ACTION',mutationId:randomUUID()});workflow.feedback('recovery-student',{proposalId:p.id,category:'useful'});workflow.memory('recovery-student',{baseRevision:0,preferences:{learningPreference:'Synthetic offline first'},confirmation:'SAVE_PREFERENCES'});
  ledger=createBudgetLedger({database:budget});ledger.reserve({model:'deepseek-flash',requestBytes:1000,maxTokens:100});const budgetBefore=ledger.summary();
  const result=spawnSync(process.env.CAREER_TEST_PYTHON||'python',[fileURLToPath(new URL('../server/backup-db.py',import.meta.url)),'--database',database,'--directory',path.join(dir,'backups'),'--knowledge',path.join(dir,'not-present.sqlite'),'--budget',budget],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const files=fs.readdirSync(path.join(dir,'backups')),authBackup=files.find(f=>/^career-.*\.sqlite$/.test(f)&&!f.includes('ai-budget')),budgetBackup=files.find(f=>f.endsWith('-ai-budget.sqlite'));assert.ok(authBackup&&budgetBackup);
  restored=new DatabaseSync(path.join(dir,'backups',authBackup));const afterStore=createBusinessStore(restored),afterWorkflow=createAgentWorkflow({db:restored,business:afterStore});assert.equal(afterStore.read('recovery-student').state.tasks[0].id,receipt.taskId);assert.equal(afterWorkflow.history('recovery-student').items[0].receipt.id,receipt.id);assert.equal(afterWorkflow.readMemory('recovery-student').preferences.learningPreference,'Synthetic offline first');assert.equal(restored.prepare('SELECT count(*) n FROM agent_feedback').get().n,1);report.checks.push('auth/task/receipt/preference/feedback recovered from consistent SQLite backup');
  const budgetCopy=new DatabaseSync(path.join(dir,'backups',budgetBackup),{readOnly:true});assert.equal(budgetCopy.prepare('SELECT SUM(reserved_micro_cny) n FROM ai_budget_reservations').get().n,budgetBefore.reservedMicroCny);budgetCopy.close();assert.equal(ledger.summary().reservedMicroCny,budgetBefore.reservedMicroCny);report.checks.push('budget backup preserves reservations; live ledger was never restored or reset');report.passed=true;
}finally{
  restored?.close();ledger?.close();db?.close();fs.mkdirSync(new URL('../checks/AI业务闭环_20261028/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../checks/AI业务闭环_20261028/recovery-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  const resolved=path.resolve(dir);if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('career-agent-recovery-'))fs.rmSync(resolved,{recursive:true,force:true});
}
console.log(JSON.stringify(report));
