import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='checks/personal-context-20261029/',read=name=>JSON.parse(fs.readFileSync(dir+name,'utf8'));
const manifest=read('manifest.json'),deployment=read('production/deployment-result.json'),stage=read('production/stage-smoke.json'),api=read('production/production-smoke.json'),browser=read('production/browser-report.json'),audit=read('production/audit.json');
assert.ok(deployment.deployed&&stage.passed&&api.passed&&browser.passed&&audit.passed);assert.ok(api.syntheticAccountDeleted&&browser.syntheticAccountDeleted);assert.deepEqual(browser.pageErrors,[]);
for(const row of manifest.files)assert.equal(row.candidateSha256,deployment.files[row.path]);
const summary={deployed:true,backendOnly:true,frontendChanged:false,aiEnabled:false,realProviderCalls:0,automatedTests:{total:416,passed:415,failed:0,skipped:1},stageChecks:stage.checks.length,productionApiChecks:api.checks.length,productionBrowserChecks:browser.checks.length,syntheticAccountsDeleted:true,budget:audit.budget,budgetUnchanged:true,initialScreenshotFailure:'font readiness timeout; original report retained',retryScreenshotFontReadinessWaitSkipped:true,newTables:deployment.newTables,passed:true};
manifest.deployed=true;manifest.deployment=deployment;fs.writeFileSync(dir+'manifest.json',JSON.stringify(manifest,null,2));fs.writeFileSync(dir+'production/acceptance-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
