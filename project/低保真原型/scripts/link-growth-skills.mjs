import fs from 'node:fs/promises';
import path from 'node:path';
import {getSkillTree} from '../server/skill-trees/index.mjs';
import {assertUnfrozen,selectedForAuthoring} from './growth-authoring-guard.mjs';
const root=path.resolve('course-packs/growth'),catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));await assertUnfrozen(catalog.projects);
const cross={
 'cross-registration-service':{frontend:'form-errors',backend:'api-contract',testing:'retest-regression',delivery:'role-matrix',software:'unit-tests'},
 'cross-metric-service':{engineering:'dataset-grain',data:'sql-joins',backend:'api-contract',testing:'retest-regression'},
 'cross-knowledge-assistant':{ai:'retrieval-grounding',engineering:'lineage',backend:'api-contract',security:'authorization',testing:'retest-regression'},
 'cross-service-incident':{ops:'rollback-verify',backend:'integration-tests',frontend:'release-checks',testing:'risk-priority'},
 'cross-security-remediation':{security:'authorization',backend:'api-contract',testing:'retest-regression',frontend:null},
 'cross-migration-launch':{delivery:'migration',engineering:'lineage',ops:'rollback-verify',testing:'risk-priority',data:null}
};
const roleNames={'需求/实施':'Requirements and implementation','后端':'Backend','前端':'Frontend','测试/实施':'Testing and implementation','数据工程':'Data engineering','分析/测试':'Analysis and testing','资料/安全':'Content and security','AI/后端':'AI and backend','评估':'Evaluation','开发':'Development','运维':'Operations','测试/前端':'Testing and frontend','安全':'Security','测试/安全':'Testing and security','业务/实施':'Business and implementation','工程/运维':'Engineering and operations','测试/业务':'Testing and business','后端/前端/测试':'Backend, frontend and testing','前端/测试':'Frontend and testing','相关实现者':'Relevant implementers','分析/后端':'Analysis and backend','数据提供者':'Data provider','测试/业务评估':'Testing and business evaluation','资料/实现者':'Content owner and implementer','运维/测试':'Operations and testing','业务探测/测试':'Business probes and testing','发布/恢复负责人':'Release and recovery owner','业务负责人':'Business owner','工程/运维/测试':'Engineering, operations and testing','测试/业务':'Testing and business','实施/支持':'Implementation and support'};
for(const p of catalog.projects.filter(selectedForAuthoring)){
 const routes=cross[p.id]||{[p.career]:p.skills[0]};
 p.skillLinks=Object.entries(routes).map(([career,skill])=>{
  if(!skill)return {career,skill:null,state:'unknown',reason:'A related role is present, but this bounded fixture does not provide a reliable precise skill mapping.'};
  const tree=getSkillTree(career),branch=tree.branches.find(b=>b.leaves.some(l=>l.id===skill));if(!branch)throw Error('Unknown exact skill mapping');
  return {career,branch:branch.id,skill,state:'learning-link',evidence:p.requiredFiles.filter(f=>f!== 'notes.md'),scope:'Related task practice only; no completion or mastery award'};
 });
 p.skills=p.skillLinks.filter(link=>link.career===p.career&&link.skill).map(link=>link.skill);
 for(const stage of p.handoffs){stage.roleLabel={zh:stage.role,en:roleNames[stage.role]||stage.role};stage.receiverLabel={zh:stage.consumedBy,en:roleNames[stage.consumedBy]||stage.consumedBy};}
 await fs.writeFile(path.join(root,p.id,String(p.version),'project.json'),JSON.stringify(p,null,2));
}
await fs.writeFile(path.join(root,'catalog.json'),JSON.stringify(catalog,null,2));
console.log('Precise existing skill links resolved; two unsupported cross-role mappings remain unknown.');
