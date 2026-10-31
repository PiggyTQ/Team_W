import {usedHours} from '../../src/model.js';
import {businessError} from '../business-store.mjs';
import {loadGuidance} from './library.mjs';
const aliases={SK_APIDESIGN:['API','API Design','接口设计'],SK_UNITTEST:['单元测试','Unit Testing'],SK_SOFTWARETEST:['软件测试'],SK_TESTCASE:['测试用例'],SK_FUNCTIONALTEST:['功能测试'],SK_DOC:['技术文档'],SK_DATAMODEL:['数据建模','Data Modeling'],SK_MODELEVAL:['模型评估'],SK_DATAQUALITY:['数据质量'],SK_ETL:['ETL','ELT','ETL / ELT'],SK_DWH:['数据仓库','Data Warehousing'],SK_STATS:['统计','统计学','Statistics'],SK_DATAVIZ:['数据可视化','Data Visualization'],SK_NETWORKING:['计算机网络','Networking'],SK_MONITOR:['监控与告警'],SK_BACKUP:['备份与恢复'],SK_SHELL:['Shell','Bash','Shell/Bash'],SK_DSALGO:['数据结构与算法']};
const norm=value=>String(value??'').normalize('NFKC').toLowerCase().trim();
export function analyseCareer(saved,{career,claimRefs},snapshot,pack=loadGuidance()){
  const standard=pack.standards?.find(s=>s.career===career);
  if(!standard)throw businessError('INVALID_CAREER');
  const source=snapshot.chunks.find(c=>c.sourceId===standard.sourceId&&c.sourceVersion===standard.sourceVersion);
  if(!source)throw businessError('KNOWLEDGE_UNAVAILABLE',503);
  const state=saved.state;
  if(claimRefs!==undefined&&(!Array.isArray(claimRefs)||claimRefs.length>12||new Set(claimRefs.map(r=>r?.id)).size!==claimRefs.length||claimRefs.some(r=>!r||Object.keys(r).some(k=>!['id','version'].includes(k))||typeof r.id!=='string'||r.id.length>120||!Number.isSafeInteger(r.version)||r.version<1)))throw businessError('AI_SCOPE_REJECTED',403);
  const refs=claimRefs??(state.authorized&&state.aiScope?.includes('本人确认片段')?state.aiClaimRefs||[]:[]);
  if(claimRefs!==undefined&&refs.some(r=>!state.claims.some(c=>c.id===r.id&&c.version===r.version&&c.status==='已确认')))throw businessError('AI_SCOPE_REJECTED',403);
  const claims=refs.flatMap(r=>{const c=state.claims.find(c=>c.id===r.id&&c.version===r.version&&c.status==='已确认');return c?[c]:[];});
  const rows=standard.skills.map(skill=>{
    const accepted=new Set([skill.id,skill.name,...aliases[skill.id]||[]].map(norm));
    // Only an explicit user-selected skill label is matched. No title/NLP/score inference.
    const matching=claims.filter(c=>accepted.has(norm(c.skill)));
    return {skillId:skill.id,name:skill.name,status:matching.length?'related_self_report':'unknown',independentlyVerified:false,
      evidence:matching.map(c=>({id:c.id,version:c.version,text:c.text.slice(0,2000),scope:'user_confirmed_not_independently_verified'})),
      nextQuestion:matching.length?'请说明本人贡献、产出和未完成部分；关联不代表掌握。':'你是否有与该学习方向有关的具体材料？没有材料不能认定不会。'};
  });
  return {schemaVersion:1,ruleVersion:'explicit-skill-association-v1',career,name:standard.name,baseVersion:saved.revision,planVersion:state.planVersion,knowledgeVersion:snapshot.version,knowledgeDigest:snapshot.digest,
    rows,scope:{selectedClaims:claims.map(c=>({id:c.id,version:c.version}))},source:{id:source.sourceId,version:source.sourceVersion,sha256:source.sha256,text:source.text},
    budget:{weekly:Number(state.budget),allocated:usedHours(state),remaining:Number(state.budget)-usedHours(state)},
    limitations:['学习方向不是招聘必需条件。','本人确认片段不等于独立核验；不计算能力总分或录用概率。','不从自由文本推断熟练程度、否定条件或技能缺陷；矛盾材料保留原文待本人核对。']};
}
// For externally sourced structured requirements only. Never manufacture hiring conditions.
export function evaluateConditions(node,known={}){
  if(node?.op==='all'||node?.op==='any'){
    if(!Array.isArray(node.items)||!node.items.length||node.items.length>30)throw businessError('INVALID_CONDITION');
    const children=node.items.map(n=>evaluateConditions(n,known));
    const value=node.op==='all'?(children.some(c=>c.value==='conflict')?'conflict':children.every(c=>c.value==='supported')?'supported':'unknown'):(children.some(c=>c.value==='supported')?'supported':children.every(c=>c.value==='conflict')?'conflict':'unknown');
    return {op:node.op,value,children};
  }
  if(!node||node.op!=='equals'||typeof node.key!=='string'||!['string','number','boolean'].includes(typeof node.value))throw businessError('INVALID_CONDITION');
  const fact=Object.hasOwn(known,node.key)?known[node.key]:undefined;
  return {key:node.key,expected:node.value,value:fact===undefined||fact===null?'unknown':fact===node.value?'supported':'conflict'};
}
