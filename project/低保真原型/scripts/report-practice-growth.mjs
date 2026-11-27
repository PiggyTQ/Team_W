import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createBusinessStore} from '../server/business-store.mjs';
import {importCoursePack} from '../server/course-library.mjs';
import {getSkillTree} from '../server/skill-trees/index.mjs';
const root=path.resolve('course-packs/growth'),out=path.resolve('checks/practice-growth-20261126');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8')),catalog=await read(path.join(root,'catalog.json'));
const browser=await read(path.join(out,'browser.json')),legacy=await read(path.join(out,'legacy-reference.json')),maintenance=await read('course-packs/growth-maintenance.json');
const deliveries=await read(path.join(out,'delivery-extractions.json')),compat=await read(path.join(out,'compat-browser.json'));
const demo=await read(path.join(out,'demo-browser.json')),layout=await read(path.join(out,'layout-browser.json'));
if(!browser.passed||browser.completedCount!==32)throw Error('BROWSER_EVIDENCE_REQUIRED');
if(!compat.passed||!demo.passed||!layout.passed||deliveries.length!==32)throw Error('COMPAT_AND_DELIVERY_EVIDENCE_REQUIRED');
const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE users(id TEXT PRIMARY KEY)');const business=createBusinessStore(db,{allowLocalTrials:true});importCoursePack(db,path.resolve('../资料收集/展示资料包_20261027'));importCoursePack(db,path.resolve('course-packs/practice-20261113'));
const rows=[];
for(const p of catalog.projects){
 const course=business.courseLibrary.course(p.id),ui=browser.projects.find(r=>r.id===p.id);
 let proof,manifest=null,source=null,delivery=null;
 if(p.legacy){proof=legacy.find(r=>r.id===p.id);source=course.project.sources;}
 else{manifest=await read(path.join(root,p.id,String(p.version),'manifest.json'));proof=await read(path.join(root,p.id,String(p.version),'reference/execution.json'));source=await read(path.join(root,p.id,String(p.version),'sources.json'));
  if(createHash('sha256').update(await fs.readFile(path.join(root,p.id,String(p.version),'manifest.json'))).digest('hex')!==course.packHash)throw Error('PACK_HASH_MISMATCH');
  if(ui.packHash!==course.packHash)throw Error('BROWSER_USED_DIFFERENT_PACK '+p.id);
  delivery=deliveries.find(d=>d.projectId===p.id&&d.version===p.version);
  if(!delivery?.allExtractedMaterialHashesVerified||delivery.actualExtractedReference.exit!==0||delivery.materialManifestSha256!==course.packHash||ui.deliveryHash!==delivery.sha256)throw Error('DELIVERY_BINDING_FAILED '+p.id);
 }
 const skills=(p.skillLinks||p.skills.map(skill=>{const branch=getSkillTree(p.career).branches.find(b=>b.leaves.some(l=>l.id===skill));return {career:p.career,branch:branch?.id,skill,state:'learning-link'};}));
 rows.push({id:p.id,title:p.title,career:p.career,relatedCareers:p.relatedCareers,kind:p.kind,level:p.level,version:course.content_version,retainedVersions:course.id&&business.courseLibrary.map().get(p.id).versions.map(v=>({version:v.version,packHash:v.pack_hash})),packHash:course.packHash,
  primarySkills:skills,materials:{identity:p.legacy?'retained public-source extract/teaching derivative or original synthetic teaching evidence':'original synthetic teaching inputs and code',files:manifest?.files||proof.retainedFiles,downloadHashVerified:p.legacy?'legacy course integration tests':ui.downloadHash},
  delivery,
  deliverables:p.requiredFiles||course.project.outcome,reference:{executed:true,evidence:p.legacy?'checks/practice-growth-20261126/legacy-reference.json':`course-packs/growth/${p.id}/${p.version}/reference/execution.json`,kind:p.legacy?'independent retained data recalculation':'separate Node execution, original faulty implementation, counterexample, missing and repaired submissions',sql:proof.sql||null,starter:proof.starterExecution||null},
  ui:{overview:ui.overview,archive:p.legacy?compat.checks.find(c=>c.id===p.id&&c.version===2)?.actualUiCreateSubmitReviewComplete:ui.archived,demo:demo.projects.find(d=>d.id===p.id),finalDesktopLayout:layout.passed,keyboardAndInterface:browser.interfaceFlows,retiredHistory:browser.retiredHistory||false},
  rights:{currentUse:p.legacy?'prior publication/provenance retained; not a new rights certification':'original local teaching use',externalCandidatesAdopted:false,publicRedistribution:p.legacy?'retained prior statement; no new blanket clearance':'owner decision pending',sourceRecords:source},
  estimatedHours:p.estimatedHours,effortMeasured:false,next:p.next,prior:p.prior||null,forcedUnlock:false,
  maintenance:p.legacy?{state:'retained-published-v1-v2; independent schema3 revision bridge available'}:maintenance.items[p.id+':'+p.version],
  humanContentReview:'not_performed_this_round',learnerPilot:'not_performed',publication:course.status,
  pending:p.legacy?['Further domain review and real learner study not performed this round']:['Independent domain/content review','Actual learner pilot','Named maintainer assignment','Public redistribution and formal publication decision'],
  bounds:['No independent learner mastery award','No real employment or team claim','No paid model/cloud used']});
}
db.close();
const result={date:'2026-11-26',environment:{node:process.version,platform:process.platform,browser:'Microsoft Edge / Playwright, headless desktop'},localOnly:true,coreProjects:30,crossCareerProjects:6,total:rows.length,existingRetained:4,addedLocalTrials:32,realHumanPilot:false,rows};
await fs.writeFile(path.join(out,'acceptance-36.json'),JSON.stringify(result,null,2));
const table=['# 36项本地实施验收矩阵','','2026-11-26。本表是实际本地实现与技术验收；不是正式发布、真人审稿或试学。旧4项保留原发布身份与v1/v2，新32项仅本地试用。完整材料摘要、输入/产物、来源和交付包执行记录见[详细JSON](practice-growth-acceptance-20261126.json)。','','| ID / 项目 | 方向 / 层次 | 版本 / 材料摘要 | 产物与实际检查 | 页面与历史 | 来源 / 权利 | 后续 | 人审 / 试学 / 发布 |','|---|---|---|---|---|---|---|---|'];
for(const r of rows)table.push(`| ${r.id}<br>${r.title.zh} | ${r.career} / ${r.level} | ${r.version} / ${r.packHash.slice(0,12)} | ${Array.isArray(r.deliverables)?r.deliverables.join(', '):r.deliverables.zh}<br>${r.version===2?'旧参考独立复算；原流程回归':'独立Node参考、真实错误实现与反例、缺项、修订重评'+(r.reference.sql?'；SQLite执行':'')} | 入口已查看；${r.version===2?'旧流程与v1/v2回归':'实际UI开始至归档；下载SHA核对'} | ${r.version===2?'沿用旧来源/许可记录，未重新授予':'原创合成；外部候选未采用；公开再分发待定'} | ${r.next.join(', ')||'具体技能补强与自主改选'} | 本轮人审未做 / 试学未做 / ${r.publication} |`);
table.push('','## 交付包与边界','','- 新32项主下载位于 public/practice-bundles/{id}/1/practice.zip。全部实际解压、逐文件核对冻结摘要并从解压目录执行公开参考成功；页面下载的SHA也已逐项核对。','- 原材料内的 project.zip 保留原字节作为归档，存在缺少嵌套参考结果的旧打包问题；主入口已改为完整交付包，不能把原归档当作当前可运行包。材料版本未被静默重写。','- 参考执行与用户上传的文件/结果核对不同。平台不在业务进程执行用户代码；本机运行结果由本人提交。','- 配置规则使用原创Node窗口/计数器评价器，实际测了重置、低流量、缺失和恢复，不宣称PromQL兼容或promtool运行。','- 六个跨职业项目含19份接手产物及其内容检查，均是单人教学模拟。','- 两个相关职业的精确技能映射缺乏充分依据，保留unknown，不强行对应。','- 不创建能力评分、职业胜任率或技能长叶；材料候选继续需本人确认。');
await fs.writeFile(path.join(out,'acceptance-36.md'),table.join('\n')+'\n');
await fs.copyFile(path.join(out,'acceptance-36.md'),'docs/releases/practice-growth-acceptance-20261126.md');
await fs.copyFile(path.join(out,'acceptance-36.json'),'docs/releases/practice-growth-acceptance-20261126.json');
console.log('36-row acceptance matrix written with exact frozen material and browser hash bindings.');
