import assert from 'node:assert/strict';
import test from 'node:test';
import {buildCareerEvidence,careerEvidenceExport} from '../src/career-evidence-model.js';
import messages from '../src/i18n/career-evidence-ui.json' with {type:'json'};

const practice = (id,template,choices,demo=false)=>({
  id,template,courseVersion:2,mode:'S2',completed:true,status:'完成',kind:demo?'演示实践':'离线教学实践',
  projectPractice:{responses:{evidence:{choice:'source',note:'UNSUBMITTED_DRAFT'}}},
  attempts:[{version:2,result:'自检记录',practiceSnapshot:{responses:
    Object.fromEntries(Object.entries(choices).map(([step,choice])=>[step,{choice,note:'RAW_PROJECT_NOTE'}]))
  }}]
});
const result = (id,source='practice')=>({
  id,source,title:'Project '+id,to:'/learning?task='+id,date:'2026-11-18',summary:'RAW_SUMMARY'
});
const quality = {scope:'describe',evidence:'source',decision:'publish-limited'};
const evaluation = {scope:'policy',evidence:'paired',decision:'pilot'};

test('submitted methods show the supporting steps and distinguish demo from practiced', ()=>{
  const state={goal:'data',
    skillStudy:{'data:sampling:v1':{assessment:{passedAt:'2026-11-14T12:00:00Z'}},'data:sampling:v99':{assessment:{passedAt:'2026-11-18'}}},
    jobs:[{id:'archived',career:'data',title:'History',archived:true},
      {id:'ai',career:'ai',title:'Other role',date:'2026-11-18'},{id:'data',career:'data',title:'Target role',date:'2026-11-17'}],
    tasks:[practice('quality','quality',quality,true),practice('evaluation','ai-eval',evaluation)],
    reviews:[{taskId:'quality',date:'2026-11-17',reason:'PRIVATE_REVIEW_TEXT'},{taskId:'quality',date:'2026-11-18'}]};
  const evidence=buildCareerEvidence(state,[result('quality'),result('evaluation')]);
  assert.equal(evidence.job.title,'Target role');
  assert.deepEqual(evidence.methods.map(({id,demo,evidence:sources})=>[id,demo,sources.map(item=>item.project.id)]),[
    ['dataQuality',true,['quality']],['pairedEvaluation',false,['evaluation']],['scopeOfConclusion',false,['evaluation','quality']]
  ]);
  assert.match(evidence.methods[0].evidence[0].to,/view=practice&task=quality&step=evidence/);
  assert.equal(evidence.outcomes[0].review.date,'2026-11-18');
  assert.deepEqual(evidence.passedSkills.map(row=>row.title.en),['Sampling and bias']);
  const summary=careerEvidenceExport(evidence,messages.en,item=>item.title,'https://example.test','en');
  assert.match(summary,/Handle data quality problems · Demo practice/);
  assert.match(summary,/Design a reproducible comparison · Practiced/);
  assert.match(summary,/Passed skill check · Sampling and bias · 2026-11-14/);
  assert.match(summary,/https:\/\/example.test\/learning\?task=quality/);
  assert.match(summary,/RAW_PROJECT_NOTE/);
  assert.doesNotMatch(summary,/UNSUBMITTED_DRAFT|PRIVATE_REVIEW_TEXT|\bv2\b/);
});

test('other teaching projects have distinct methods supported by their own decisions', ()=>{
  const logs=practice('logs','log',{evidence:'correlate',decision:'escalate'});
  const recovery=practice('recovery','restore',{scope:'canary',evidence:'compare',decision:'rollback'});
  const evidence=buildCareerEvidence({tasks:[logs,recovery]},[result('logs'),result('recovery')]);
  assert.deepEqual(evidence.methods.map(({id})=>id),['correlateLogs','triageAlert','compareRecovery','rollbackDecision']);
});

test('unrelated or unsupported choices, uploads, legacy and unfinished work produce no method', ()=>{
  const wrongQuality=practice('zero','quality',{scope:'risk',evidence:'guess',decision:'publish-risk'});
  const wrongEvaluation=practice('tone','ai-eval',{...evaluation,scope:'tone'});
  const unfinished={...practice('draft','quality',quality),completed:false};
  const legacy={...practice('legacy','quality',quality),courseVersion:1};
  const noCheck=practice('unreviewed','quality',quality);
  noCheck.attempts[0].result='待修订';
  const evidence=buildCareerEvidence(
    {tasks:[wrongQuality,wrongEvaluation,unfinished,legacy,noCheck,practice('upload','quality',quality)]},
    [result('zero'),result('tone'),result('draft'),result('legacy'),result('unreviewed'),result('upload','upload')]);
  assert.deepEqual(evidence.methods,[]);
  assert.equal(evidence.job,null);
});
