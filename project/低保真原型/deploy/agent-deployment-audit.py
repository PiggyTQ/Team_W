"""Read deployment metadata and SQLite schema/cost aggregates, never user rows or keys."""
import hashlib,json,pathlib,sqlite3,subprocess
from contextlib import closing
work=pathlib.Path('/srv/career-growth/agent-workflow-20261029-01')
source=pathlib.Path('/srv/career-growth/source');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
deployment=json.loads((work/'deployment-result.json').read_text());prepared=json.loads((work/'prepared.json').read_text());smoke=json.loads((work/'production-smoke-result.json').read_text())
assert smoke['passed'] and smoke['syntheticAccountDeleted']
assert pathlib.Path('/srv/career-growth/current').resolve()==pathlib.Path(deployment['staticRelease'])
assert all(sha(source/name)==value for name,value in deployment['sourceHashes'].items())
shared=['src/liquiglass-material.css','src/CareerLoop.jsx','src/career-loop.css','src/reference-palette.css','src/i18n/site-complete-en.json','src/i18n/reviewed-en.json']
assert all(sha(source/name)==sha(work/'stage'/name) for name in shared)
with closing(sqlite3.connect('file:/var/lib/career-growth/auth.sqlite?mode=ro',uri=True)) as db:
 tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('agent_proposals','agent_feedback','agent_memory','agent_operation_daily')")]
 assert len(tables)==4
with closing(sqlite3.connect('file:/var/lib/career-growth/ai-budget.sqlite?mode=ro',uri=True)) as db:
 count,reserved=db.execute('SELECT count(*),coalesce(sum(reserved_micro_cny),0) FROM ai_budget_reservations').fetchone()
 assert count==31 and reserved==2072056
status=json.loads(subprocess.check_output(['python3','/etc/career-growth/set-ai-key.py','--status'],text=True));assert status['aiEnabled'] is False
deployment.update({'verificationPending':False,'productionApiChecks':len(smoke['checks']),'syntheticAccountDeleted':True,'aiEnabled':False,'runtimeForcedAiOff':True,'existingSharedFeaturesPreserved':True,'agentTables':sorted(tables),'budgetReservations':count,'reservedMicroCny':reserved,'remainingMicroCny':8000000-reserved,'realProviderCallsDuringDeployment':0,'productionUserRowsInspected':False})
(work/'deployment-result.json').write_text(json.dumps(deployment,indent=2)+'\n')
print(json.dumps({k:deployment[k] for k in ['staticRelease','servicePid','aiEnabled','verificationPending','productionApiChecks','syntheticAccountDeleted','existingSharedFeaturesPreserved','budgetReservations','reservedMicroCny','remainingMicroCny','realProviderCallsDuringDeployment']}))
