import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarioState} from '../src/model.js';
import {saveEducation,withdrawEducation} from '../src/completion-model.js';
import {captureCareerReportSources,careerReportSourcesKey,careerReportSourcesChanged} from '../src/career-report-sources.js';
import {freezeReport,reportIsStale,reportReferencesUnavailable,reportExportText,revisionRows,mergeReport} from '../src/alignment-model.js';

const upload=()=>({id:'upload-one',createdAt:'2026-11-08T09:00:00.000Z',title:'本人完成的项目',description:'原始上传成果',contribution:'本人整理与验证',career:'data',completed:true,file:{name:'result.md',type:'text/markdown',size:40}});
const goal=()=>({id:'goal-one',title:'补充数据质量依据',period:'week',periodStart:'2026-11-02',due:'2026-11-08',progress:0,priority:'中'});
function ready(){
 let s=scenarioState('PT05');
 s=saveEducation(s,{school:'原学校',major:'计算机',degree:'本科',confirmed:true});
 s.preferences={...s.preferences,interestType:'INTJ',interestGroup:'analysts',capabilityMastery:{SQL:true}};
 s.reportSources={uploads:[upload()],planRecords:{version:1,goals:[goal()]},status:'ready',planError:false};
 return s;
}
const report=s=>({...freezeReport(s,'综合报告','已完成项目与能力背景：FROZEN_SOURCE_TEXT\n推荐岗位与匹配依据：原始推荐'),format:'career-report-v1',compositeSources:captureCareerReportSources(s)});

test('新报告捕获当前来源并保持冻结，刚保存不会立即过期',()=>{
 const s=ready(),r=report(s);
 assert.equal(reportIsStale(s,r),false);
 assert.equal(reportReferencesUnavailable(s,r),false);
 assert.equal(r.compositeSources.educationRefs[0].version,1);
 assert.equal(r.compositeSources.educationRefs[0].withdrawnThrough,0);
 s.preferences.capabilityMastery.SQL=false;s.reportSources.uploads[0].description='后来修改';
 assert.equal(r.compositeSources.preferences.capabilityMastery.SQL,true);
 assert.equal(r.compositeSources.uploads[0].description,'原始上传成果');
 assert.equal(reportIsStale(s,r),true);
 assert.equal(r.body.includes('FROZEN_SOURCE_TEXT'),true);
});

test('教育真实撤回及再次确认均不能复活旧正文或导出',()=>{
 let s=ready();const r=report(s),original=s.education[0];
 s=withdrawEducation(s,original.id);
 assert.equal(reportReferencesUnavailable(s,r),true);
 assert.throws(()=>reportExportText(r,r.sections,[],s),/失效引用/);
 s=saveEducation(s,{id:original.id,version:s.education[0].version,school:'重新确认学校',major:'计算机',confirmed:true});
 assert.equal(s.education[0].status,'已确认');
 assert.equal(s.education[0].withdrawnThrough,1);
 assert.equal(reportReferencesUnavailable(s,r),true);
 const blocked=revisionRows(s,r,r.body,'已完成项目与能力背景：只有重新确认的当前教育');
 assert.doesNotMatch(JSON.stringify(blocked),/FROZEN_SOURCE_TEXT/);
 const current=report(s);
 assert.equal(reportReferencesUnavailable(s,current),false);
 assert.equal(reportIsStale(s,current),false);
 assert.doesNotMatch(JSON.stringify(current.compositeSources),/原学校|history/);
});

test('教育删除阻止缓存，普通教育修订只提示过期而保留历史版本',()=>{
 let s=ready();const r=report(s),original=s.education[0];
 s=saveEducation(s,{id:original.id,version:original.version,school:'编辑后的学校',confirmed:true});
 assert.equal(reportReferencesUnavailable(s,r),false);
 assert.equal(reportIsStale(s,r),true);
 assert.match(reportExportText(r,r.sections,[],s),/FROZEN_SOURCE_TEXT/);
 s.education=[];
 assert.equal(reportReferencesUnavailable(s,r),true);
 assert.throws(()=>reportExportText(r,r.sections,[],s),/失效引用/);
});

test('上传项目已删除或原身份被替换时不能从报告缓存读回',()=>{
 const s=ready(),r=report(s);
 s.reportSources.uploads=[];
 assert.equal(reportReferencesUnavailable(s,r),true);
 assert.equal(reportIsStale(s,r),true);
 assert.throws(()=>reportExportText(r,r.sections,[],s),/失效引用/);
 s.reportSources.uploads=[{...upload(),createdAt:'2026-11-08T10:00:00.000Z'}];
 assert.equal(reportReferencesUnavailable(s,r),true);
});

test('独立来源缺失、读取中、失败和周期记录读取失败均阻止新版缓存与导出',()=>{
 const s=ready(),r=report(s),sources=s.reportSources;
 for(const current of [undefined,{...sources,status:'loading'},{...sources,status:'error',uploads:[]},{...sources,planError:true}]){
  s.reportSources=current;
  assert.equal(reportReferencesUnavailable(s,r),true);
  assert.throws(()=>reportExportText(r,r.sections,[],s),/失效引用/);
 }
 s.reportSources=sources;
 assert.equal(reportReferencesUnavailable(s,r),false);
 assert.throws(()=>reportExportText(r,r.sections),/失效引用/);
});

test('MBTI、能力自评和其他背景变化在版本计数未增加时仍提示更新',()=>{
 const mutations=[s=>{s.preferences.interestType='ENFP';},s=>{s.preferences.interestGroup='diplomats';},s=>{s.preferences.capabilityMastery.SQL=false;},s=>{s.preferences.location='上海';}];
 for(const mutate of mutations){
  const s=ready(),r=report(s),profileVersion=s.profileVersion;mutate(s);
  assert.equal(s.profileVersion,profileVersion);
  assert.equal(reportIsStale(s,r),true);
  assert.equal(reportReferencesUnavailable(s,r),false);
 }
});

test('教育和上传元数据的实际变化不依赖profileVersion递增',()=>{
 for(const mutate of [s=>{s.education[0].major='软件工程';},s=>{s.reportSources.uploads[0].description='新的成果说明';},s=>{s.reportSources.uploads[0].file.name='renamed.md';}]){
  const s=ready(),r=report(s);mutate(s);
  assert.equal(reportIsStale(s,r),true);
  assert.equal(reportReferencesUnavailable(s,r),false);
 }
});

test('任务完成标记、尝试产物与贡献变化都会使新报告过期',()=>{
 const mutations=[s=>{s.tasks[0].completed=true;},s=>{s.tasks[0].attempts=[{id:'attempt-1',version:1,text:'真正提交的产物'}];},s=>{s.tasks[0].draft='改写实践产物';},s=>{s.tasks[0].contribution='不同贡献';},s=>{s.tasks[0].atlas={skill:'Python',career:'ai'};}];
 for(const mutate of mutations){
  const s=ready(),r=report(s),planVersion=s.planVersion;mutate(s);
  assert.equal(s.planVersion,planVersion);
  assert.equal(reportIsStale(s,r),true);
 }
});

test('周期目标只保存报告使用的摘要，实质变化会提示更新',()=>{
 const s=ready();s.reportSources.planRecords.drafts={private:'PRIVATE_DRAFT'};s.reportSources.planRecords.goals[0].notes='PRIVATE_NOTES';
 const r=report(s),before=careerReportSourcesKey(r.compositeSources);
 assert.doesNotMatch(JSON.stringify(r.compositeSources),/PRIVATE_DRAFT|PRIVATE_NOTES/);
 s.reportSources.planRecords={version:1,goals:[goal()]};
 assert.equal(careerReportSourcesKey(captureCareerReportSources(s)),before);
 assert.equal(reportIsStale(s,r),false);
 s.reportSources.planRecords.goals[0].progress=50;
 assert.equal(reportIsStale(s,r),true);
});

test('同一来源的对象键或集合顺序不会使新快照自己过期',()=>{
 const s=ready();s.reportSources.uploads.push({...upload(),id:'upload-two'});s.tasks.push({...s.tasks[0],id:'task-two'});
 const r=report(s);
 s.preferences=Object.fromEntries(Object.entries(s.preferences).reverse());
 s.reportSources.uploads.reverse();
 assert.equal(reportIsStale(s,r),false);
});

test('新版合并保留来源撤回保护，保存后的当前来源不立即过期',()=>{
 const s=ready(),prior=report(s);
 s.preferences.interestType='ENFP';
 const rows=revisionRows(s,prior,prior.body,'已完成项目与能力背景：当前背景\n推荐岗位与匹配依据：当前推荐');
 const choices=Object.fromEntries(rows.filter(row=>row.affected).map(row=>[row.id,row.title==='已完成项目与能力背景'?'old':'new']));
 const saved=mergeReport(s,prior,rows,choices,{});
 assert.equal(saved.format,'career-report-v1');
 assert.equal(reportIsStale(s,saved),false);
 assert.equal(reportReferencesUnavailable(s,saved),false);
 const withdrawn=withdrawEducation(s,s.education[0].id);
 assert.equal(reportReferencesUnavailable(withdrawn,saved),true);
});

test('旧报告冻结和导出约定保持兼容，不要求新增独立来源状态',()=>{
 const s=scenarioState('PT05'),legacy=freezeReport(s,'旧报告','目标与理由：旧正文');
 assert.equal(legacy.format,undefined);
 assert.equal(legacy.compositeSources,undefined);
 assert.equal(reportIsStale(s,legacy),false);
 assert.equal(reportReferencesUnavailable(s,legacy),false);
 s.preferences.interestType='ENFP';s.reportSources={status:'error'};
 assert.equal(reportIsStale(s,legacy),false);
 assert.equal(reportReferencesUnavailable(s,legacy),false);
 assert.match(reportExportText(legacy,legacy.sections),/旧正文/);
});

test('最大100个合法上传元数据仅保存有界摘要，完整文本尾部变化仍能识别',()=>{
 const s=ready();s.reportSources.uploads=Array.from({length:100},(_,index)=>({
  ...upload(),id:'00000000-0000-4000-8000-'+String(index).padStart(12,'0'),title:'项'.repeat(120),description:'成'.repeat(5000),contribution:'本'.repeat(2000),file:{name:'文'.repeat(176)+'.txt',type:'text/plain',size:10*1024*1024}
 }));
 const before=captureCareerReportSources(s),serialized=JSON.stringify(before);assert.equal(before.version,2);assert.equal(before.uploadRefs.length,100);assert.equal(before.uploads.length,100);assert.ok(Buffer.byteLength(serialized,'utf8')<80*1024,Buffer.byteLength(serialized,'utf8')+' bytes');assert.equal(before.uploads[0].description.length,32);assert.doesNotMatch(serialized,/成{33}/);
 for(const mutate of [
  record=>{record.description=record.description.slice(0,-1)+'改';},
  record=>{record.contribution=record.contribution.slice(0,-1)+'改';},
  record=>{record.title=record.title.slice(0,-1)+'改';},
  record=>{record.file.name=record.file.name.slice(0,-5)+'改.txt';}
 ]){
  const current=structuredClone(s);mutate(current.reportSources.uploads[99]);assert.equal(careerReportSourcesChanged(current,before),true);
 }
 assert.equal(careerReportSourcesChanged(s,before),false);
});

test('多次长尝试与草稿只保留任务引用，变动签名检查每次产物和尾部',()=>{
 const s=ready(),task=s.tasks[0];task.note='结'.repeat(10000);task.draft='稿'.repeat(10000);task.attempts=Array.from({length:12},(_,index)=>({id:'attempt-'+index,version:index+1,text:'产'.repeat(30000),contribution:'贡'.repeat(2000),feedback:'反'.repeat(4000),result:'自检记录'}));
 const before=captureCareerReportSources(s),serialized=JSON.stringify(before);assert.equal(Object.hasOwn(before.tasks[0],'attempts'),false);assert.equal(Object.hasOwn(before.tasks[0],'draft'),false);assert.ok(Buffer.byteLength(serialized,'utf8')<12000);assert.doesNotMatch(serialized,/产{2}|稿{2}|反{2}/);
 for(const mutate of [
  current=>{current.tasks[0].attempts[0].text=current.tasks[0].attempts[0].text.slice(0,-1)+'改';},
  current=>{current.tasks[0].attempts[11].feedback=current.tasks[0].attempts[11].feedback.slice(0,-1)+'改';},
  current=>{current.tasks[0].draft=current.tasks[0].draft.slice(0,-1)+'改';},
  current=>{current.tasks[0].note=current.tasks[0].note.slice(0,-1)+'改';}
 ]){const current=structuredClone(s);mutate(current);assert.equal(careerReportSourcesChanged(current,before),true);}
 assert.equal(careerReportSourcesChanged(s,before),false);
});

test('教育长课程保留短摘要与撤回引用，尾部变化不依赖版本递增',()=>{
 const s=ready();s.education[0].courses='课'.repeat(12000);const before=captureCareerReportSources(s);assert.equal(before.education[0].courses.length,80);assert.equal(before.educationRefs[0].withdrawnThrough,0);assert.ok(Buffer.byteLength(JSON.stringify(before),'utf8')<12000);
 s.education[0].courses=s.education[0].courses.slice(0,-1)+'改';assert.equal(careerReportSourcesChanged(s,before),true);assert.equal(reportReferencesUnavailable(s,{...report(s),compositeSources:before}),false,'ordinary edits remain stale rather than withdrawn');
});

test('规范签名对对象键和来源集合顺序稳定，确认经历全文也参与变动检测',()=>{
 const s=ready();s.claims[0].text='文'.repeat(10000);const before=captureCareerReportSources(s);assert.ok(Object.values(before.signatures).every(value=>/^change-v1:\d+:[a-f0-9]{16}$/.test(value)));
 s.claims[0]=Object.fromEntries(Object.entries(s.claims[0]).reverse());s.reportSources.uploads[0]=Object.fromEntries(Object.entries(s.reportSources.uploads[0]).reverse());assert.equal(careerReportSourcesChanged(s,before),false);
 s.claims[0].text=s.claims[0].text.slice(0,-1)+'改';assert.equal(careerReportSourcesChanged(s,before),true);
});

test('先前v1来源快照仍按原引用保护可读，并提示升级到当前紧凑快照',()=>{
 const s=ready(),current=report(s),old={...current,compositeSources:{...current.compositeSources,version:1}};delete old.compositeSources.signatures;delete old.compositeSources.counts;
 assert.equal(reportReferencesUnavailable(s,old),false);assert.equal(reportIsStale(s,old),true);s.reportSources.uploads=[];assert.equal(reportReferencesUnavailable(s,old),true);
});
