import followupArchive from './content/career-profiles-20261122-followup.json' with {type:'json'};
import {careerContent,CAREER_CONTENT_VERSION} from './career-exploration-model.js';
import archive from './content/career-profiles-20261024.json' with {type:'json'};
import beforeFollowup from './content/career-profiles-20261122.json' with {type:'json'};
import auditArchive from './content/career-profiles-20261122-audit.json' with {type:'json'};
/** Canonical public reading model; private user records are never part of this projection. */
export function careerComparison(id,version){
 if(version==='career-detail-20261024')return archive[id]||null;
 if(version==='career-exploration-20261122')return beforeFollowup[id]||null;
 if(version==='career-exploration-20261122-followup')return followupArchive[id]||null;
 if(version==='career-exploration-20261122-audit')return auditArchive[id]||null;
 if(version&&version!==CAREER_CONTENT_VERSION)return null;
 const role=careerContent(id);if(!role)return null;
 const reference=role.sourceRecords.find(r=>r.id===role.occupation.sourceIds[0]);
 return {...role,title:role.name,titleEn:role.englishName,output:role.deliverables.map(d=>d.title).join('、'),
  provenance:{type:'project_original',version:role.version,contentTypes:['referenced_occupational_activities','referenced_public_methods','site_teaching_classification','original_synthetic'],
   records:['src/content/career-exploration.json','src/content/career-exploration-sources.json'],
   reference:{label:reference.title,url:reference.url},
   contentNote:'职业活动参考与本站教学分类分别呈现，案例、代码、数据和产物为原创合成示例。',
   referenceNote:'工作活动按来源覆盖的地区与职业解读，技术资料按所列方法范围解读。'}};
}
