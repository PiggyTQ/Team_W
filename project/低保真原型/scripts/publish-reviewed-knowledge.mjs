// A reviewed derivative, never an edit to the source approval flags.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createReviewedKnowledge} from '../server/agent/knowledge.mjs';
const root=new URL('../',import.meta.url),sha=s=>createHash('sha256').update(s).digest('hex');
const candidate=JSON.parse(fs.readFileSync(new URL('knowledge/existing-authored-v1.candidate.json',root)));
const profilesFile=new URL('../职业画像最终版_V3/基础职业画像_最终.json',root);
const bytes=fs.readFileSync(profilesFile),profiles=JSON.parse(bytes);
const ids={SW_BE:'backend',SW_FE:'frontend',SW_TEST:'testing',SW_GENERAL:'software',IMPLEMENTATION:'delivery',ML_AI:'ai',DATA_ENG:'engineering',DATA_ANALYST:'data',CYBERSEC:'security',DEVOPS_SRE:'ops'};
const corrected={SW_GENERAL:'在特定平台或应用中分析需求、实现程序并验证维护其行为。',ML_AI:'围绕模型或 AI 应用完成问题定义、实现和效果评估。'};
const version='authored-guidance-20261028-v1',sources=[],chunks=[],standards=[];
const reviewedAt=new Date().toISOString();
const caveat='适用范围：项目整理的入门职业学习参考，不是全国统一招聘门槛、市场统计、能力认证或就业承诺。';
function publish(row,career,reviewNote){
  const content=`${row.title}\n\n${caveat}\n\n${row.content}`;
  const source={...row,content,version,status:'published',reviewStatus:'approved',reviewer:'Codex engineering and AI-assisted editorial review (not human expert certification)',reviewedAt,
    review:{method:'source-by-source editorial and technical review',humanApprovalClaimed:false,expertCertification:false,note:reviewNote,originalDigest:sha(row.content),derivativeDigest:sha(content)}};
  sources.push(source);
  // Keep each chapter together: its qualifying sections must survive retrieval.
  chunks.push({id:`${row.id}-whole`,sourceId:row.id,sourceVersion:version,start:0,end:Array.from(content).length,sha256:sha(content),career,market:'CN',language:'zh'});
}
for(const p of profiles){
  const career=ids[p.occupation_id];
  for(const suffix of ['definition','tasks']){
    const row=candidate.sources.find(s=>s.id===`foundation-${p.occupation_id}-${suffix}`);
    assert.equal(row.origin.fileSha256,sha(bytes),'Re-review changed source before publishing');
    const before=row.content;
    if(suffix==='definition'&&corrected[p.occupation_id])row.content=corrected[p.occupation_id];
    publish(row,career,before===row.content?'Reviewed scope and four functional tasks; no empirical hiring claims.':`Removed sample-specific suffix from general definition. Previous text: ${before}`);
  }
  const focus=p.dimensions.PS.learning_focus;
  assert.ok(focus.every(f=>f.basis==='project_authored_learning_focus_not_universal_job_requirement'));
  const sourceId=`foundation-${p.occupation_id}-learning`;
  publish({id:sourceId,title:`${p.name_zh} · 入门学习方向`,content:focus.map(f=>`${f.name}（${f.competency_id}）`).join('\n'),purposes:['agent_advice'],origin:{file:fileURLToPath(profilesFile),fileSha256:sha(bytes),profileId:p.profile_id,pointer:'/dimensions/PS/learning_focus',transform:'only competency_id and name; observed_job_count excluded',originalHumanApproved:p.human_approved,originalPublicDisplayAllowed:p.public_display_allowed}},career,'Reviewed as optional learning directions; neither mandatory job requirements nor evidence of proficiency.');
  standards.push({career,name:p.name_zh,sourceId,sourceVersion:version,skills:focus.map(f=>({id:f.competency_id,name:f.name}))});
}
for(const row of candidate.sources.filter(s=>s.id.startsWith('course-'))){
  assert.equal(row.origin.fileSha256,sha(fs.readFileSync(new URL('../资料收集/展示资料包_20261027/catalog-ready.json',root))),'Re-review changed course before publishing');
  const chunk=candidate.chunks.find(c=>c.sourceId===row.id);
  publish(row,chunk.career,'Read all teaching sections and limitations; checked independent input/reference calculations with validate_materials.py. Original authored offline exercise, not actual model/incident results or competence certification. External video playback is not verified.');
}
assert.equal(sources.length,46);assert.equal(standards.length,10);
const pack={version,publicationStatus:'local_reviewed_release',reviewKind:'engineering_and_ai_assisted_not_expert',sources,chunks,standards};
assert.equal(createReviewedKnowledge({loadPack:()=>pack}).snapshot().chunks.length,46);
fs.writeFileSync(new URL('knowledge/authored-guidance-v1.json',root),JSON.stringify(pack,null,2)+'\n');
fs.writeFileSync(new URL('knowledge/review-manifest-v1.json',root),JSON.stringify({version,reviewedAt:'2026-10-28',paidCalls:0,productionPublished:false,originalApprovalFieldsUnchanged:true,sourceCount:46,careerCount:10,chapters:16,
  referencesChecked:['https://pandas.pydata.org/pandas-docs/stable/user_guide/missing_data.html','https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.drop_duplicates.html','https://opentelemetry.io/docs/specs/otel/logs/data-model/'],
  corrections:corrected,excluded:['raw recruitment text','observed job counts','salary/degree/market popularity','unverified video claims','expert approval claims'],
  sources:sources.map(s=>({id:s.id,origin:s.origin,review:s.review,sha256:sha(s.content)}))},null,2)+'\n');
console.log(JSON.stringify({version,sources:sources.length,chunks:chunks.length,careers:standards.length,productionPublished:false}));
