import {careers} from './model.js';
const careerIds=new Set(careers.map(c=>c.id));
// An explicit empty list is a revocation, including for legacy source mappings.
export function materialCareerLinks(claim){
 if(Array.isArray(claim.careerLinks))return claim.careerLinks;
 const legacy=careerIds.has(claim.career)?claim.career:typeof claim.skill==='string'&&careerIds.has(claim.skill.split(':')[0])?claim.skill.split(':')[0]:null;
 return legacy?[{career:legacy,...(claim.skill?.startsWith(legacy+':')?{skill:claim.skill.slice(legacy.length+1)}:{})}]:[];
}
export function normalizeCareerLinks(value){
 if(!Array.isArray(value)||value.length>3)throw new TypeError('Invalid career links');
 const seen=new Set();return value.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!['career','skill'].includes(k))||!careerIds.has(row.career)||seen.has(row.career)||row.skill!==undefined&&(typeof row.skill!=='string'||!/^[-a-z0-9]{1,80}$/.test(row.skill)))throw new TypeError('Invalid career links');
  seen.add(row.career);return {career:row.career,...(row.skill?{skill:row.skill}:{})};
 });
}
