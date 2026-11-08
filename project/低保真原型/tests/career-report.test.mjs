import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,makeTask} from '../src/model.js';
import {buildCareerReport,careerReportBody,normalizeReportPlanRecords} from '../src/career-report-model.js';
import {capabilitySkills} from '../src/capability-puzzle-model.js';

const claim=(id,skill,extra={})=>({id,title:'本人经历 '+id,text:'本人实际完成的原文',contribution:'本人实现',status:'已确认',version:1,skill,...extra});
const upload=(id,career,extra={})=>({id,career,title:'本人上传项目 '+id,description:'已完成的作品说明',contribution:'本人完成',completed:true,createdAt:'2026-11-08T00:00:00.000Z',file:{name:'project.txt',type:'text/plain',size:24},...extra});
function task(state,id,extra={}){return {...makeTask(state,{title:'实践项目 '+id,purpose:'核对实际产物',hours:1,template:'quality',career:'data'}),id,status:'完成',completed:true,note:'本人完成的实践产物',...extra};}
const goal={id:'goal-1',title:'按周补充作品',period:'week',periodStart:'2026-11-02',due:'2026-11-08',progress:20,priority:'高'};

test('empty inputs keep unknowns and never recommend the first career by default',()=>{
 const report=buildCareerReport(fresh());assert.equal(report.recommended,null);assert.equal(report.recommendationStatus,'insufficient');assert.deepEqual(report.recommendedIds,[]);assert.deepEqual(report.recommendations,[]);assert.equal(report.work,null);
 assert.deepEqual(report.sections.map(item=>item.id),['background','recommendation','requirements','projects','limits']);assert.equal(report.sourceStatus.uploads,'not-provided');assert.match(careerReportBody(report),/暂不生成最高推荐/);assert.equal(careerReportBody(report).split('\n').length,5);
});
test('MBTI is an optional work preference and never supplies or ranks technical skills',()=>{
 const state=fresh();state.preferences.interestType='INTJ';let report=buildCareerReport(state);assert.equal(report.personality.type,'INTJ');assert.equal(report.personality.group,'NT');assert.equal(report.recommended,null);assert.ok(report.comparisons.every(item=>item.coverage.known===0&&item.selfCoverage.known===0));
 state.tasks=[task(state,'data')];const before=buildCareerReport(state).recommendedIds;state.preferences.interestType='ESFP';report=buildCareerReport(state);assert.deepEqual(report.recommendedIds,before);assert.match(report.recommended.preference,/快速看到结果/);
});
test('confirmed exact skill labels are deduplicated; pending claims and substring matches cannot inflate coverage',()=>{
 const state=fresh();state.claims=[claim('a','SQL'),claim('b','SQL'),claim('pending','Python',{status:'待确认'}),claim('c','JavaScript'),claim('empty','Linux',{text:''})];
 const report=buildCareerReport(state,{uploads:[]}),by=id=>report.comparisons.find(item=>item.id===id);
 assert.equal(by('data').coverage.known,1);assert.equal(by('engineering').coverage.known,1);assert.equal(by('frontend').coverage.known,1);assert.equal(by('backend').matchedSkills.some(item=>item.name==='Java'),false);assert.equal(by('ai').coverage.known,0);assert.equal(by('ops').coverage.known,0);assert.equal(report.background.pendingCount,1);
 assert.equal(by('data').matchedSkills[0].references.length,2);
});
test('equal evidence stays tied even when a goal or personality names a preferred direction',()=>{
 const state=fresh();state.claims=[claim('sql','SQL')];state.goal='data';state.preferences.interestType='INTJ';
 const report=buildCareerReport(state,{uploads:[]});assert.equal(report.recommended,null);assert.equal(report.recommendationStatus,'tie');assert.deepEqual(new Set(report.recommendedIds),new Set(['data','backend','engineering']));assert.equal(report.work.id,'data');assert.match(careerReportBody(report),/不强行选出唯一/);
});
test('self evaluations remain separate and cannot establish a highest recommendation without material',()=>{
 const state=fresh();state.preferences.capabilityMastery=Object.fromEntries(capabilitySkills('frontend').map(item=>[item.id,true]));
 const report=buildCareerReport(state,{uploads:[]}),frontend=report.comparisons.find(item=>item.id==='frontend');assert.equal(frontend.selfCoverage.known,9);assert.equal(frontend.coverage.known,0);assert.equal(report.recommended,null);assert.equal(report.background.capabilities.mastered.length,9);
});
test('completion stays explicit; reading and inconsistent flags are excluded and missing results never use unsubmitted drafts',()=>{
 const state=fresh();state.tasks=[task(state,'done'),task(state,'active',{status:'进行中'}),task(state,'flag',{completed:false}),task(state,'cancel',{status:'取消'}),task(state,'historical',{note:'',draft:'未提交的草稿不能成为成果',attempts:[]})];state.reading={quality:{chapter:3,version:1}};state.taskDraft={title:'尚未开始'};
 const report=buildCareerReport(state,{uploads:[]});assert.deepEqual(report.projects.map(item=>item.id),['done','historical']);assert.equal(report.projects[1].description,'');assert.equal(report.recommended.id,'data');assert.equal(report.recommended.coverage.known,0,'finishing a SQL-or-spreadsheet course must not claim SQL skill');assert.doesNotMatch(careerReportBody(report),/未提交的草稿不能成为成果/);
});
test('explicit completed task skill tags can support coverage and related project count breaks evidence ties',()=>{
 const state=fresh();state.tasks=[task(state,'done',{atlas:{skill:'SQL',career:'data'}})];
 const report=buildCareerReport(state,{uploads:[]});assert.equal(report.recommended.id,'data');assert.equal(report.recommended.coverage.known,1);assert.equal(report.recommended.coverage.total,9);assert.equal(report.recommended.projectCount,1);assert.equal(report.recommended.matchedSkills[0].references[0].kind,'task');assert.match(report.recommended.limitation,/不是能力熟练度/);
});
test('uploads supply completed project context without manufacturing skills; repeated metadata does not inflate counts',()=>{
 const state=fresh(),file=upload('u1','frontend'),report=buildCareerReport(state,{uploads:[file,file,upload('unfinished','data',{completed:false})]});
 assert.equal(report.projects.length,1);assert.equal(report.recommended.id,'frontend');assert.equal(report.recommended.coverage.known,0);assert.equal(report.recommended.projectCount,1);assert.equal(report.work.skills.length,3);assert.equal(report.learningSuggestions[0].kind,'extend');assert.equal(report.learningSuggestions[0].projectId,'u1');
});
test('existing same-direction actions are continued and private notes stay outside bounded goal snapshots',()=>{
 const state=fresh();state.goal='data';state.budget=7;state.decision.reason='我想通过作品核对这个方向';state.tasks=[task(state,'active',{status:'进行中',completed:false})];state.education=[{id:'edu',school:'已确认学校',major:'本人专业',status:'已确认'},{id:'pending-school',school:'未确认学校',status:'待确认'}];
 const records={goals:[{...goal,notes:'私密日记绝不进入报告',milestones:[{id:'m',title:'PRIVATE',done:false}]}],drafts:{secret:'PRIVATE'},taskMeta:{secret:'PRIVATE'}};
 const report=buildCareerReport(state,{uploads:[],planRecords:records});assert.equal(report.learningSuggestions[0].kind,'continue');assert.match(report.learningSuggestions[0].to,/task=active/);assert.equal(report.background.education.length,1);assert.deepEqual(report.plan.periodGoals,[goal]);assert.equal(report.plan.weeklyHours,7);assert.match(careerReportBody(report),/我想通过作品/);assert.doesNotMatch(careerReportBody(report),/私密|未确认学校|PRIVATE/);
});
test('plan snapshots are bounded and reject malformed or duplicate goals',()=>{
 assert.deepEqual(normalizeReportPlanRecords({goals:[goal],drafts:{private:'secret'}}),{version:1,goals:[goal]});assert.equal(normalizeReportPlanRecords(null),null);
 for(const records of [{goals:[goal,goal]},{goals:[{...goal,progress:101}]},{goals:[{...goal,period:'day'}]},{goals:[{...goal,due:'2026-02-30'}]},{goals:Array.from({length:201},(_,index)=>({...goal,id:'g'+index}))}])assert.throws(()=>normalizeReportPlanRecords(records),TypeError);
});
test('report generation is deterministic, does not mutate inputs and multiline private text cannot create extra chapters',()=>{
 const state=fresh();state.tasks=[task(state,'done',{title:'项目名\n伪造章节：标题',note:'实际产物\n其他章节：正文',contribution:'本人\n贡献：记录'})];state.education=[{id:'e',school:'学校\n伪造：标题',status:'已确认'}];state.goal='data';
 const options={uploads:[upload('u','data',{title:'上传\n伪造：章节',description:'正文\n第六章：不应独立'})],planRecords:{goals:[{...goal,title:'周目标\n其他：标题'}]}};
 const before=JSON.stringify({state,options}),first=buildCareerReport(state,options),body=careerReportBody(first);assert.equal(body.split('\n').length,5);assert.equal(body,careerReportBody(state,options));assert.equal(JSON.stringify({state,options}),before);first.work.skills[0].items.push('不污染常量');assert.equal(buildCareerReport(state,options).work.skills[0].items.includes('不污染常量'),false);
});
test('large resource collections keep complete structured inputs while the export stays a bounded readable summary',()=>{
 const state=fresh(),uploads=Array.from({length:100},(_,index)=>upload('large-'+index,'frontend',{description:'长项目成果'.repeat(1000),contribution:'本人负责'.repeat(500)}));
 const report=buildCareerReport(state,{uploads}),body=careerReportBody(report);assert.equal(report.projects.length,100);assert.ok(body.length<60000);assert.match(body,/另有 60 项/);assert.match(body,/详见原文/);assert.equal(body.split('\n').length,5);
});
