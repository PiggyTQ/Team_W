// Extract existing authored material without changing its source permissions or
// inventing human/expert approval. No provider call or production mutation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createReviewedKnowledge} from '../server/agent/knowledge.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const project=path.dirname(root);
const profilesFile=path.join(project,'职业画像最终版_V3','基础职业画像_最终.json');
const coursesFile=path.join(project,'资料收集','展示资料包_20261027','catalog-ready.json');
const sha=value=>createHash('sha256').update(value).digest('hex');
const profileBytes=fs.readFileSync(profilesFile),courseBytes=fs.readFileSync(coursesFile);
const profiles=JSON.parse(profileBytes),courses=JSON.parse(courseBytes).courses;
const ids={SW_BE:'backend',SW_FE:'frontend',SW_TEST:'testing',SW_GENERAL:'software',IMPLEMENTATION:'delivery',ML_AI:'ai',DATA_ENG:'engineering',DATA_ANALYST:'data',CYBERSEC:'security',DEVOPS_SRE:'ops'};
const courseCareers={quality:'data','ai-eval':'ai',log:'security',restore:'ops'};
const sources=[],chunks=[];
function add({id,title,content,career,origin}){
  assert.ok(typeof content==='string'&&content.trim());assert.ok(career);
  sources.push({id,title,version:'candidate-20261028-v1',status:'draft',reviewStatus:'pending',purposes:['agent_advice'],
    content,contentScope:'project_authored_learning_not_universal_job_requirements',origin,
    review:{structuralExtraction:true,semanticReviewCompleted:false,humanApprovalClaimed:false}});
  // Exact code-point spans; headings and qualifying paragraphs are retained.
  for(const match of content.matchAll(/[^\n][\s\S]*?(?=\n\s*\n|$)/g)){
    const text=match[0];if(!text.trim())continue;
    const start=Array.from(content.slice(0,match.index)).length,end=start+Array.from(text).length;
    chunks.push({id:`${id}-p${chunks.filter(c=>c.sourceId===id).length+1}`,sourceId:id,sourceVersion:'candidate-20261028-v1',start,end,sha256:sha(text),career,market:'CN',language:'zh'});
  }
}
for(const p of profiles){
  assert.equal(p.typical_tasks.basis,'project_authored_functional_synthesis');
  const origin={file:'project/职业画像最终版_V3/基础职业画像_最终.json',fileSha256:sha(profileBytes),profileId:p.profile_id,profileVersion:p.profile_version,
    originalHumanApproved:p.human_approved,originalPublicDisplayAllowed:p.public_display_allowed};
  add({id:`foundation-${p.occupation_id}-definition`,title:`${p.name_zh} · 项目整理的功能定义`,content:p.definition,career:ids[p.occupation_id],origin:{...origin,pointer:'/definition'}});
  add({id:`foundation-${p.occupation_id}-tasks`,title:`${p.name_zh} · 项目整理的典型任务`,content:p.typical_tasks.items.join('\n'),career:ids[p.occupation_id],origin:{...origin,pointer:'/typical_tasks/items',transform:'join newline'}});
}
for(const course of courses)for(const chapter of course.chapters){
  add({id:`course-${chapter.id}`,title:`${course.title} · ${chapter.title}`,content:chapter.body,career:courseCareers[course.id],
    origin:{file:'project/资料收集/展示资料包_20261027/catalog-ready.json',fileSha256:sha(courseBytes),courseId:course.id,chapterId:chapter.id,contentVersion:course.content_version,
      sourceIds:course.source_ids,note:'Original collection metadata is historical; the existing website course release is documented separately.'}});
}
assert.equal(profiles.length,10);assert.equal(courses.length,4);assert.equal(sources.filter(s=>s.id.startsWith('course-')).length,16);
assert.equal(new Set(chunks.map(c=>c.id)).size,chunks.length);
for(const chunk of chunks){const source=sources.find(s=>s.id===chunk.sourceId);assert.equal(sha(Array.from(source.content).slice(chunk.start,chunk.end).join('')),chunk.sha256);}
const pack={version:'existing-authored-candidate-20261028-v1',publicationStatus:'not_published',sources,chunks};
assert.equal(createReviewedKnowledge({loadPack:()=>pack}).snapshot().chunks.length,0,'A candidate must not bypass publication approval');
assert.equal(sha(fs.readFileSync(profilesFile)),sha(profileBytes));assert.equal(sha(fs.readFileSync(coursesFile)),sha(courseBytes));
const directory=path.join(root,'knowledge');fs.mkdirSync(directory,{recursive:true});
fs.writeFileSync(path.join(directory,'existing-authored-v1.candidate.json'),JSON.stringify(pack,null,2)+'\n');
const report={version:pack.version,foundationRoles:profiles.length,foundationSources:20,courses:courses.length,chapters:16,totalSources:sources.length,chunks:chunks.length,
  structuralChecksPassed:true,sourceFilesUnchanged:true,published:false,paidCalls:0,
  excluded:['sample_summary','observed_mentions','raw job descriptions','job-specific salary/degree/experience clauses','personality or potential scores','specialization and responsibility claims pending separate review'],
  nextWork:['Review candidate definitions and tasks as authored career guidance','Check course claims against original reference outputs and current published version','Publish an explicit reviewed derivative with truthful review identity','Evaluate retrieval and answer support against independent labelled cases'],
  originalApprovalFieldsUnchanged:true};
fs.writeFileSync(path.join(directory,'existing-authored-v1.inventory.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
