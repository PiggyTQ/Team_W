import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarioState} from '../src/model.js';
import {resumeStudioDraft,targetResumeStudio,selectResumeFact,toggleResumeRelation,resumeRelations,reportChanges,reportLineage} from '../src/report-studio-model.js';
import {purgePrivateMaterials} from '../src/alignment-model.js';

test('简历编排初始采用确认资料，明确清空和失效岗位均不被偷偷替换',()=>{
 const s=scenarioState('PT05');s.claims.push({...s.claims[0],id:'pending',status:'待确认'});
 assert.deepEqual(resumeStudioDraft(s).claimIds,['claim-demo','claim-sql']);
 s.resumeStudioDraft={claimIds:[],educationIds:[],target:'missing',targetSeed:''};
 const d=resumeStudioDraft(s);assert.deepEqual(d.claimIds,[]);assert.equal(d.target,'missing');
 s.resumeTarget='job-b';assert.equal(resumeStudioDraft(s).target,'job-b');assert.deepEqual(resumeStudioDraft(s).tailoring,{});
});
test('岗位关联由本人逐条建立，取消经历只清理相关表达，不写回事实',()=>{
 const s=scenarioState('PT05'),original=structuredClone(s.claims);let d={...resumeStudioDraft(s),target:'job-a'};
 assert.equal(resumeRelations(s,d).edges.length,0);assert.equal(toggleResumeRelation(s,d,9,'claim-demo'),d);
 d=toggleResumeRelation(s,d,0,'claim-demo');d=toggleResumeRelation(s,d,1,'claim-sql');
 assert.deepEqual(resumeRelations(s,d).edges,[{source:'claim-demo',target:'0'},{source:'claim-sql',target:'1'}]);
 d.tailoring.rows[0].wording='本人暂存措辞';d.tailoring.rows[0].confirmed=false;
 assert.equal(resumeRelations(s,d).issue,'','未确认措辞仍可回预览继续编辑');
 d=selectResumeFact(d,'claim-demo',false);assert.equal(d.tailoring.rows[0].wording,'');assert.deepEqual(d.tailoring.rows[1].claimIds,['claim-sql']);assert.deepEqual(s.claims,original);
});
test('岗位原文、材料版本与撤回会阻止显示旧关系，可重新编排',()=>{
 const s=scenarioState('PT05');let d=toggleResumeRelation(s,{...resumeStudioDraft(s),target:'job-a'},0,'claim-demo');
 s.claims[0].version++;assert.match(resumeRelations(s,d).issue,/事实已变化/);assert.deepEqual(resumeRelations(s,d).edges,[]);
 s.claims[0].version--;s.jobs[0].text+='新要求';assert.match(resumeRelations(s,d).issue,/岗位原文已变化/);
 d=toggleResumeRelation(s,d,0,'claim-sql');assert.deepEqual(resumeRelations(s,d).edges,[{source:'claim-sql',target:'0'}]);
 s.claims[1].status='已撤回';assert.deepEqual(resumeRelations(s,d).edges,[]);
});
test('报告逐章比较是真实文本差异；撤回后不返回缓存正文',()=>{
 const s=scenarioState('PT05'),a={claimIds:['claim-demo'],body:'目标与理由：原理由\n行动与成果：原行动\n旧章节：原内容'},b={claimIds:['claim-demo'],body:'目标与理由：原理由\n行动与成果：新行动\n新章节：新内容'};
 const diff=reportChanges(s,a,b);assert.deepEqual(diff.rows.map(r=>r.state),['same','changed','removed','added']);assert.equal(diff.rows[1].before,'行动与成果：原行动');
 s.claims[0].status='已撤回';assert.deepEqual(reportChanges(s,a,b),{blocked:true,rows:[]});
});
test('从岗位重新进入始终采用点击的岗位；删除资料清除编排草稿',()=>{
 const s=scenarioState('PT05');s.resumeTarget='job-a';s.resumeStudioDraft={targetSeed:'job-a',target:'job-b',name:'本人草稿',claimIds:['claim-demo'],educationIds:[],tailoring:{jobText:'private',rows:{0:{wording:'private'}}}};
 const next=targetResumeStudio(s,'job-a');assert.equal(resumeStudioDraft(next).target,'job-a');assert.deepEqual(next.resumeStudioDraft.tailoring,{});assert.equal(next.resumeStudioDraft.name,'本人草稿');assert.equal(s.resumeStudioDraft.target,'job-b');
 assert.equal(purgePrivateMaterials(next).resumeStudioDraft,undefined);
});
test('报告版本按真实修订关系串联，不混入同名的独立报告',()=>{
 const a={id:'a',title:'同名报告'},b={id:'b',title:'改名',prior:'a'},other={id:'other',title:'同名报告'},c={id:'c',prior:'b'};const s={reports:[a,other,b,c]};
 assert.deepEqual(reportLineage(s,c).map(r=>r.id),['a','b','c']);assert.deepEqual(reportLineage(s,other),[other]);
});
