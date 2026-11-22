import followupArchive from './content/career-profiles-20261122-followup.json' with {type:'json'};
import {careerContent,CAREER_CONTENT_VERSION} from './career-exploration-model.js';
import archive from './content/career-profiles-20261024.json' with {type:'json'};
import beforeFollowup from './content/career-profiles-20261122.json' with {type:'json'};
/** Canonical public reading model; private user records are never part of this projection. */
export function careerComparison(id,version){
 if(version==='career-detail-20261024')return archive[id]||null;
 if(version==='career-exploration-20261122')return beforeFollowup[id]||null;
 if(version==='career-exploration-20261122-followup')return followupArchive[id]||null;
 if(version&&version!==CAREER_CONTENT_VERSION)return null;
 const role=careerContent(id);if(!role)return null;
 return {...role,title:role.name,titleEn:role.englishName,output:role.deliverables.map(d=>d.title).join('、'),
  provenance:{type:'project_original',version:role.version,contentTypes:['referenced_public_methods','original_synthetic'],
   records:['src/content/career-exploration.json','src/content/career-exploration-sources.json'],
   reference:{label:role.sourceRecords[0].title,url:role.sourceRecords[0].url},
   contentNote:'职业说明参考一手方法资料；案例、代码、数据和产物为本站原创合成教学示例。',
   referenceNote:'技术方法及职业活动参考不构成国内招聘要求；完整来源、日期、范围与改编方式随投影保留。'}};
}
