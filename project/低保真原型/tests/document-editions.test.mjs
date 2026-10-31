import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarioState} from '../src/model.js';
import {resumeStudioDraft,toggleResumeRelation,resumeExpressionRows} from '../src/report-studio-model.js';
test('表达视图区分待确认与本人确认，仅采用真实岗位和已选版本',()=>{
 const s=scenarioState('PT05'),d=toggleResumeRelation(s,{...resumeStudioDraft(s),target:'job-a'},0,'claim-sql');d.tailoring.rows[0].wording='本人组织的表达';
 let rows=resumeExpressionRows(s,d);assert.equal(rows.length,1);assert.equal(rows[0].confirmed,false);assert.equal(rows[0].requirement,'熟悉 SQL 或表格工具');assert.deepEqual(rows[0].claimIds,['claim-sql']);d.tailoring.rows[0].confirmed=true;rows=resumeExpressionRows(s,d);assert.equal(rows[0].confirmed,true);assert.equal(s.resumes.length,0,'切换视图不保存简历版本');
});
test('材料或岗位变化停止读取表达缓存，空关联和虚构要求不进入文稿',()=>{
 const s=scenarioState('PT05'),d=toggleResumeRelation(s,{...resumeStudioDraft(s),target:'job-a'},0,'claim-sql');d.tailoring.rows[0].wording='OLD-WORDING';d.tailoring.rows[0].confirmed=true;s.claims[1].version++;assert.deepEqual(resumeExpressionRows(s,d),[]);s.claims[1].version--;s.jobs[0].text+='新条件';assert.deepEqual(resumeExpressionRows(s,d),[]);s.jobs[0].text=d.tailoring.jobText;d.tailoring.rows[99]={...d.tailoring.rows[0]};d.tailoring.rows[0].claimIds=[];assert.deepEqual(resumeExpressionRows(s,d),[]);
});
