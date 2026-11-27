"""Build Avemly's original offline inputs and versioned, reviewable handouts."""
from pathlib import Path
import copy
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / 'docs/releases/practice-growth-implementation-20261126'
PACK = ROOT / 'course-packs/growth'
PUBLIC = ROOT / 'public/practice-projects'
BRIEFS = json.loads((SPEC / 'project-briefs.json').read_text(encoding='utf-8'))

maintenance=ROOT/'course-packs/growth-maintenance.json'
if maintenance.exists() and any(x.get('frozen') for x in json.loads(maintenance.read_text(encoding='utf-8'))['items'].values()):
    raise RuntimeError('Frozen content exists: use the revision CLI and project-specific authoring, not the initial generator.')

def write(folder, name, value):
    path = folder / name
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(value, ensure_ascii=False, indent=2) + '\n' if not isinstance(value, str) else value
    path.write_text(text, encoding='utf-8', newline='\n')

def booking():
    return {'capacity':2,'requests':[{'id':'R1','key':'K1','owner':'alice','quantity':1}, {'id':'R2','key':'K1','owner':'alice','quantity':1}, {'id':'R3','key':'K2','owner':'bob','quantity':2}, {'id':'R4','key':'K3','owner':'alice','quantity':1,'fail':True}]}

def authorization():
    return {'objects':{'O1':{'owner':'alice'},'O2':{'owner':'bob'}},'requests':[
        {'id':'anonymous','user':None,'object':'O1','action':'read','scopes':[]},
        {'id':'own-read','user':'alice','object':'O1','action':'read','scopes':[]},
        {'id':'other-read','user':'bob','object':'O1','action':'read','scopes':[]},
        {'id':'own-edit-denied','user':'alice','object':'O1','action':'edit','scopes':[]},
        {'id':'own-edit','user':'alice','object':'O1','action':'edit','scopes':['edit'],'cents':1200},
        {'id':'invalid-amount','user':'alice','object':'O1','action':'edit','scopes':['edit'],'cents':-1}]}

def tables():
    return {'orders':[{'id':'A1','customer':'C1','channel':'web','cents':12000},{'id':'A2','customer':'C1','channel':'community','cents':8000},{'id':'A3','customer':'C2','channel':'web','cents':6000}],
            'payments':[{'id':'P1','order':'A1','cents':6000},{'id':'P2','order':'A1','cents':6000},{'id':'P3','order':'A2','cents':8000}],
            'customers':[{'id':'C1'},{'id':'C2'},{'id':'C3'}]}

def documents():
    return {'documents':[{'id':'D1','version':1,'roles':['member'],'fact':'checkin','value':'09:00–09:30'},{'id':'D2','version':2,'roles':['staff'],'fact':'budget','value':'internal-only'}],
            'questions':[{'id':'Q1','role':'member','document':'D1','version':1,'fact':'checkin'},{'id':'Q2','role':'member','document':'D1','version':1,'fact':'late-entry'},{'id':'Q3','role':'member','document':'D2','version':2,'fact':'budget'},{'id':'Q4','role':'staff','document':'D2','version':1,'fact':'budget'}]}

def probes():
    return {'maxError':0.01,'probes':[{'version':'v1','requests':1000,'errors':5,'business':'ok','newRecords':0},{'version':'v2','requests':800,'errors':64,'business':'failed','newRecords':0},{'version':'rollback','requests':700,'errors':3,'business':'failed','newRecords':2}]}

def migration():
    return {'source':[{'id':'U1','email':' ALICE@example.invalid ','status':'confirmed'},{'id':'U2','email':'Bob@example.invalid','status':'pending'}],
            'target':[{'id':'U1','email':'alice@example.invalid','status':'active'},{'id':'U2','email':'bob@example.invalid','status':'active'}],
            'newRecords':[{'id':'U3','email':'new@example.invalid','status':'active'}]}

INPUTS = {
 'multi-source-analysis':tables(),
 'analysis-change-handoff':{'versions':[{'version':'v1','unit':'yuan','rows':[{'id':'E1','status':'active','amount':120},{'id':'E2','status':'withdrawn','amount':80}]},{'version':'v2','unit':'cent','rows':[{'id':'E1','status':'active','amount':12000},{'id':'E2','status':'withdrawn','amount':8000},{'id':'E3','status':'active','amount':5000}]}]},
 'baseline-evaluation':{'train':[{'id':'T1','y':4},{'id':'T2','y':6},{'id':'T3','y':5}],'test':[{'id':'V1','y':7},{'id':'V2','y':3},{'id':'V3','y':5}]},
 'grounded-assistant-delivery':documents(),
 'app-authorization-retest':authorization(),
 'detection-response-handoff':{'events':[{'id':'F1','kind':'login-failure','user':'u1','device':'a','minute':1},{'id':'F2','kind':'login-failure','user':'u1','device':'a','minute':2},{'id':'F3','kind':'login-failure','user':'u1','device':'a','minute':3},{'id':'S1','kind':'login-success','user':'u1','device':'b','minute':4},{'id':'S2','kind':'login-success','user':'u2','device':'c','minute':5},{'id':'S3','kind':'login-success','user':'u1','device':'a','minute':6}],'labels':['S1'],'approvedDevices':['a'],'timezone':'UTC+08:00'},
 'alert-rule-regression':{'rule':{'threshold':0.05,'for':2,'minRequests':100,'label':'registration'},'windows':[{'minute':i,'requests':r,'errors':e} for i,r,e in [(1,100,1),(2,100,8),(3,100,1),(4,200,15),(5,120,10),(6,0,0),(7,10,4),(8,100,0)]]},
 'reliability-release-drill':probes(),
 'accessible-form':{'actions':[{'id':'empty','email':'','network':'success'},{'id':'format','email':'bad','network':'success'},{'id':'success','email':'a@example.invalid','network':'success'},{'id':'failure','email':'b@example.invalid','network':'failure'},{'id':'edited','email':'new@example.invalid','network':'success','edited':True},{'id':'timeout','email':'c@example.invalid','network':'timeout'}]},
 'data-workbench':{'rows':[{'id':i,'group':'A' if i%2 else 'B'} for i in range(1,13)],'currentFilter':'B','page':2,'pageSize':3,'responses':[{'id':'late-A','query':'A'},{'id':'current-B','query':'B'}]},
 'frontend-release-delivery':{'pages':{'/list':'items','/detail/7':'item-7'},'supportedVersion':2,'routes':[{'path':'/detail/7','reload':True,'apiVersion':2},{'path':'/list','reload':True,'apiVersion':1},{'path':'/missing','reload':True,'apiVersion':2}]},
 'contract-api':authorization(),
 'retry-concurrency':booking(),
 'service-evolution-delivery':{'records':[{'id':'L1','cents':12099},{'id':'L2','cents':0},{'id':'L3','cents':801}]},
 'relational-model':tables(),
 'partition-replay':{'partition':'2026-05-15','batch':[{'id':'B1','partition':'2026-05-15','channel':'web'},{'id':'B2','partition':'2026-05-15','channel':'community'},{'id':'B1','partition':'2026-05-15','channel':'web'}],'previous':[{'id':'OLD','partition':'2026-05-14','channel':'web'}]},
 'data-contract-evolution':{'history':[{'id':'H1','amount_cents':1200}],'increment':[{'id':'N1','cents':801},{'id':'N2','amount_cents':999}]},
 'defect-evidence':{'cases':[{'id':f'C{i}','cents':n,'version':'bug-1'} for i,n in enumerate([0,7999,8000,8001])]},
 'api-ui-regression':{'tests':[{'id':'other-object','expected':403,'broken':200,'version':'bug-1'},{'id':'input-retained','expected':'same-input','broken':'cleared','version':'bug-1'},{'id':'normal-submit','expected':201,'broken':201,'version':'fixed'}]},
 'release-risk-review':{'tests':[{'id':'permissions','critical':True,'status':'failed'},{'id':'normal','critical':True,'status':'passed'},{'id':'keyboard','critical':False,'status':'not_run'},{'id':'schema','critical':True,'status':'passed'}]},
 'rule-tool':{'values':[0,9999,10000,10001,-1,10.5,'10000']},
 'legacy-change':{'calls':[{'id':'old','api':'v1','member':False,'cents':10000},{'id':'new','api':'v2','member':True,'cents':10000},{'id':'round','api':'v2','member':True,'cents':10001}]},
 'versioned-toolkit':{'version':'1.0.0','commands':[{'id':'valid','amount':'10000'},{'id':'missing'},{'id':'invalid','amount':'1.5'}]},
 'config-acceptance':{'permissions':{'member':['read','register'],'staff':['read','register','export']},'cases':[{'id':'member-export','role':'member','action':'export','expected':False},{'id':'staff-export','role':'staff','action':'export','expected':True},{'id':'support-read','role':'support','action':'read','expected':True}]},
 'migration-reconciliation':migration(),
 'rollout-support-handoff':{'checks':[{'id':'core','required':True,'status':'passed'},{'id':'permission','required':True,'status':'not_run'},{'id':'help','required':False,'status':'failed'}],'delta':[{'id':'POST-CUTOVER-1'}],'support':{'owner':'exercise-support-role'},'training':[{'role':'member','scenario':'register-and-cancel'},{'role':'support','scenario':'find-and-escalate'}]},
 'cross-registration-service':{'contract':{'version':2,'field':'email'},'calls':[{'id':'legacy','body':{'mail':'a@example.invalid'}},{'id':'revised','body':{'email':'a@example.invalid'}}],'revision':2},
 'cross-metric-service':dict(tables(),version=2,revision=2),
 'cross-knowledge-assistant':dict(documents(),revision=2),
 'cross-service-incident':dict(probes(),revision=2),
 'cross-security-remediation':dict(authorization(),revision=2),
 'cross-migration-launch':dict(migration(),revision=2),
}

TITLES = ['Data quality and metric review','Multi-source business analysis','Analysis delivery under change','Support assistant evaluation','Baseline and independent evaluation','Bounded knowledge assistant delivery','Offline log triage','Application authorization retest','Detection and response handoff','Recovery and rollback','Alert rules and counterexamples','Reliability release drill','Accessible form and state recovery','Data workbench and API faults','Frontend release delivery','Validated and authorized API','Retry and concurrent consistency','Service evolution and migration','Reproducible relational model','Partition replay and publishing','Data contract evolution','Reproducible defect evidence','API and UI regression','Release risk review','Rule and conversion tool','Legacy change and refactoring','Versioned maintainable toolkit','Configuration and acceptance','Migration reconciliation','Rollout and support handoff','Registration service collaboration','Metric service collaboration','Knowledge assistant collaboration','Service incident collaboration','Security remediation collaboration','Migration launch collaboration']
KINDS = {'data':'data','ai':'evaluation','security':'security','ops':'rules','frontend':'interface','backend':'api','engineering':'data','testing':'test','software':'code','delivery':'handoff'}

def author():
    catalog=[]
    for i, brief in enumerate(BRIEFS['projects']):
        identifier=brief['id']; legacy=identifier in BRIEFS['scope']['existingCourseIds']
        title={'zh':brief['title'],'en':TITLES[i]}
        entry={'id':identifier,'version':2 if legacy else 1,'legacy':legacy,'career':brief['primaryCareer'],'relatedCareers':brief['relatedCareers'],'level':brief['level'],'kind':brief['kind'],'title':title,'next':brief['nextProjects'],'prior':brief['recommendedPriorProject'],'adapter':KINDS[brief['primaryCareer']],'estimatedHours':[2,4] if brief['level']==1 else [4,8],'effortMeasured':False,'status':'published' if legacy else 'local_trial','maintainer':{'role':'practice-content-editor','person':None},'skills':[]}
        catalog.append(entry)
        if legacy:continue
        folder=PACK/identifier/'1'; folder.mkdir(parents=True,exist_ok=True)
        entry['brief']={'zh':brief['goal'],'en':'Produce and check the '+TITLES[i].lower()+' deliverable against the supplied independent inputs and failure cases.'}
        entry['outputs']={'zh':brief['requiredOutputs'],'en':['A reproducible '+entry['adapter']+' artifact','Result, contribution, limits and handoff evidence']}
        entry['checks']={'zh':brief['plannedDeterministicChecks'],'en':['Check every input identifier and specified behavior','Keep failure, unexecuted and revised results traceable']}
        entry['failure']={'zh':brief['requiredFailureCase'],'en':'The counterexample must fail the registered checks. Review the changed field and its downstream effect.'}
        entry['review']={'zh':brief['openReviewFocus'],'en':['Explain the decision with artifact locations','State the remaining scope and handoff responsibility']}
        entry['environment']={'runtime':'Node.js 24 / modern desktop browser','installNetwork':False,'runtimeNetwork':False,'accountsRequired':False,'paidServicesRequired':False,'memoryMeasuredMB':None,'diskMeasuredMB':None,'scope':'Original low-resource synthetic teaching alternative'}
        entry['hints']={'zh':['先核对输入文件的粒度、版本和授权范围。','用一个最小反例定位错误，并保存修改前后的差异。','核对全部ID，说明通过项、失败项和未执行范围。'],'en':['Check input grain, version and allowed scope.','Isolate the failure with a small counterexample and keep the revision.','Reconcile all IDs and record passed, failed and unexecuted scope.']}
        entry['variants']={'ruleVersion':1,'scope':'Fixed reviewed scenario and explicit extension. New constraints require a new review.','allowed':['reviewed-base','reviewed-extension'],'seed':20261126,'newJudgment':brief['requiredFailureCase']}
        entry['handoffs']=brief.get('roleHandoffs',[])
        write(folder,'input/fixture.json',INPUTS[identifier])
        write(folder,'input/dictionary.md','# Input dictionary\n\nAll inputs are original synthetic teaching records. IDs are stable and must not be omitted. Monetary values are integer cents unless the version explicitly states yuan. Dates and windows are exercise-local.\n\n'+ '\n'.join(f'- `{k}` — {type(v).__name__}, '+str(len(v) if isinstance(v,(dict,list)) else v) for k,v in INPUTS[identifier].items())+'\n')
        write(folder,'assignment.md','# '+brief['title']+'\n\n'+brief['goal']+'\n\n## Inputs\n'+ '\n'.join('- '+x for x in brief['inputPackage'])+'\n\n## Deliverables\n'+'\n'.join('- '+x for x in brief['requiredOutputs'])+'\n\n## Checks\n'+'\n'.join('- '+x for x in brief['plannedDeterministicChecks'])+'\n\n## Failure to diagnose\n'+brief['requiredFailureCase']+'\n\n## Review\n'+'\n'.join('- '+x for x in brief['openReviewFocus'])+'\n\nThis is an original synthetic local exercise. Reference execution and learner results are recorded separately.\n')
        write(folder,'assignment.en.md','# '+TITLES[i]+'\n\n'+entry['brief']['en']+'\n\nRead input/fixture.json and its dictionary. Implement solution.mjs, execute `node verify.mjs`, and save result.json plus your implementation and notes. Repair the failing counterexample and rerun. The reference is available separately. No external account or paid API is required.\n')
        write(folder,'rubric.json',{'critical':brief['plannedDeterministicChecks'],'open': [{'criterion':x,'evidence':'Point to filename, line/record IDs and revision','reviewer':'self or explicitly recorded reviewer'} for x in brief['openReviewFocus']],'averagingCriticalFailuresAllowed':False})
        write(folder,'starter/solution.mjs',"export function solve(input) {\n  throw new Error('Implement the assignment using input/fixture.json.');\n}\n")
        write(folder,'CHANGELOG.md','# Changes\n\n1. Original synthetic inputs and locally reproducible reference. Content review and learner pilot remain pending.\n')
        if entry['handoffs']:
            write(folder,'input/handoffs.json',{'mode':'single-person role rotation with original prefabricated teaching artifacts','stages':[{**h,'artifact':f'handoff-{n+1}.json','version':1,'requiresFeedback':True,'requiresRevision':True} for n,h in enumerate(entry['handoffs'])]})
            for n,h in enumerate(entry['handoffs']):write(folder,f'input/handoff-{n+1}.json',{'version':1,'from':h['role'],'to':h['consumedBy'],'content':h['produces'],'contract':INPUTS[identifier],'feedback':brief['requiredFailureCase'],'revisionRequired':2})
        entry['requiredFiles']=['result.json','notes.md']
        if entry['adapter'] in ['code','api','test','interface']:entry['requiredFiles'].append('solution.mjs' if entry['adapter']!='interface' else 'index.html')
        if entry['adapter']=='data':entry['requiredFiles'].append('query.sql')
        if entry['adapter']=='rules':entry['requiredFiles'].append('rules.json')
        if entry['handoffs']:entry['requiredFiles'].append('handoff.json')
        write(folder,'project.json',entry)
    write(PACK,'catalog.json',{'schemaVersion':3,'trialRequiresExplicitLocalEnable':True,'projects':catalog,'progression':BRIEFS['progression']})
    write(PACK,'source-candidates.json',json.loads((SPEC/'source-candidates.json').read_text(encoding='utf-8')))
    print(f'Authored {len(INPUTS)} independent original input sets and {len(catalog)} registry entries.')

if __name__=='__main__':author()
