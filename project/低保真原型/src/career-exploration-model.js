import content from './content/career-exploration.json' with {type:'json'};
import references from './content/career-exploration-sources.json' with {type:'json'};
import english from './i18n/career-exploration-en.json' with {type:'json'};
import {materialCareerLinks} from './career-material-links.js';
export const CAREER_CONTENT_VERSION='career-exploration-20261123-evidence';
export const careerSourceRecords=references;
export const careerText=(value,language='zh')=>language==='en'?english[value]||value:value;
export function careerContent(id,language='zh'){
 if(!Object.hasOwn(content,id))return null;
 const translate=value=>typeof value==='string'?careerText(value,language):Array.isArray(value)?value.map(translate):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,translate(v)])):value;
 return translate({...content[id],sourceRecords:references.filter(r=>content[id].sources.includes(r.id))});
}
export const careerContentIds=Object.keys(content);
export const comparisonDimensions=[['problem','关注的问题','Problem addressed'],['daily','日常工作','Daily work'],['outputs','典型产物','Deliverables'],['collaboration','常见协作','Collaboration'],['preparation','能力与准备','Preparation'],['practice','首个体验','First practice']];
export function comparisonValue(role,key){
 if(key==='outputs')return role.deliverables.map(d=>({title:d.title,text:d.use}));
 if(key==='collaboration')return role.collaboration.map(r=>({title:r.role,text:r.exchange}));
 if(key==='preparation')return role.preparation.map(r=>({title:r.skill,text:r.quality}));
 if(key==='practice')return [{title:role.practice.title,text:role.practice.deliverable}];
 return [{text:role[key]}];
}
// Evidence requires explicit career/skill identity. A coarse label like "SQL" cannot establish career readiness.
export function careerRelatedEvidence(state,career){return (state.claims||[]).filter(c=>c.status==='已确认'&&materialCareerLinks(c).some(link=>link.career===career));}

export function comparisonScan(role,key,language='zh'){
 const occupation=role.occupation;
 if(occupation){
  if(key==='daily')return occupation.flow.map(step=>careerText(step.title,language)).join(' → ');
  const overview=occupation[key];
  if(overview)return careerText(overview,language);
 }
 return careerText(role.compare?.[key]||comparisonValue(role,key).map(r=>[r.title,r.text].filter(Boolean).join(': ')).join('; '),language);
}
