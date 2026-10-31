import fs from 'node:fs';
import {createHash} from 'node:crypto';
const directory=new URL('../checks/AI业务闭环_20261028/',import.meta.url),production=new URL('production/',directory),root=new URL('../',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,production),'utf8'));
const deployed=read('deployment-result.json'),api=read('production-smoke-result.json'),browser=read('browser-report.json'),material=read('material-report.json');
if(!deployed.deployed||deployed.aiEnabled!==false||deployed.verificationPending||!api.passed||!api.syntheticAccountDeleted||!browser.passed||!browser.syntheticAccountDeleted||browser.pageErrors.length||!material.passed)throw new Error('DEPLOYMENT_EVIDENCE_INCOMPLETE');
const file=new URL('release-manifest.json',directory),manifest=JSON.parse(fs.readFileSync(file,'utf8'));
Object.assign(manifest,{productionDeploymentApproved:true,deployed:true,aiEnabled:false,archiveDeployedVerbatim:false,
 deploymentMethod:'Merge source overlay into latest production source; preserve existing public translations/materials; build in isolated directory. Candidate dist was not copied over production.',
 actualProductionBase:deployed.previousStaticRelease,actualRelease:deployed.staticRelease,actualSourceHashEvidence:'production/deployment-result.json',productionApiChecks:api.checks.length,productionBrowserChecks:browser.checks.length,
 remainingGates:['independent content review','real consenting student tasks','broader v4 personal-context evaluation','explicit model enablement approval and trial account allowlist']});
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
const summary={date:'2026-10-29',deployed:true,aiEnabled:false,release:deployed.staticRelease,servicePid:deployed.servicePid,
 apiChecks:api.checks.length,browserChecks:browser.checks.length,pageErrors:browser.pageErrors.length,syntheticAccountsDeleted:true,existingPublishedCourses:4,sharedFeaturesPreserved:deployed.existingSharedFeaturesPreserved,
 materialVerified:material.passed,backupServiceResult:'success',backupServiceExitStatus:0,budgetReservations:deployed.budgetReservations,reservedMicroCny:deployed.reservedMicroCny,remainingMicroCny:deployed.remainingMicroCny,realProviderCallsDuringDeployment:0,
 accountDatabaseReplaced:false,budgetDatabaseReplaced:false,productionUserRowsInspected:false,publicReleaseReady:false};
fs.writeFileSync(new URL('acceptance-summary.json',production),JSON.stringify(summary,null,2)+'\n');
const documentation={};for(const name of ['server/agent/README.md','AI业务闭环_交付与上线评审_20261028.md'])documentation[name]=createHash('sha256').update(fs.readFileSync(new URL(name,root))).digest('hex');
fs.writeFileSync(new URL('documentation-hashes.json',production),JSON.stringify(documentation,null,2)+'\n');console.log(JSON.stringify(summary));
