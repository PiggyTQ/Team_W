import {careers} from './model.js';
export const CAREER_TRIAL_VERSION='career-trial-20261122-audit';
export const CAREER_TRIAL_LIMIT=8000;
export const trialSourceVersion=version=>({'career-trial-20261122':'career-exploration-20261122-followup','career-trial-20261122-audit':'career-exploration-20261122-audit'}[version]||'unknown');
export function normalizeCareerTrials(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>10)throw new TypeError('Invalid career trials');
 return Object.fromEntries(Object.entries(value).map(([id,row])=>{
  const valid=r=>r&&typeof r==='object'&&!Array.isArray(r)&&typeof r.text==='string'&&r.text.length<=CAREER_TRIAL_LIMIT&&typeof r.caseVersion==='string'&&r.caseVersion.length>0&&r.caseVersion.length<=100;
  const source=r=>r.contentVersion===undefined||typeof r.contentVersion==='string'&&r.contentVersion.length>0&&r.contentVersion.length<=100;
  if(!careers.some(c=>c.id===id)||!valid(row)||!source(row)||Object.keys(row).some(k=>!['caseVersion','contentVersion','text','history'].includes(k))||row.history!==undefined&&(!Array.isArray(row.history)||row.history.length>10||row.history.some(r=>!valid(r)||!source(r)||Object.keys(r).some(k=>!['caseVersion','contentVersion','text'].includes(k)))))throw new TypeError('Invalid career trial');
  return [id,{caseVersion:row.caseVersion,text:row.text,...(row.contentVersion?{contentVersion:row.contentVersion}:{}),...(row.history?{history:row.history.map(r=>({...r}))}:{})}];
 }));
}
export function saveCareerTrial(state,id,text,version=CAREER_TRIAL_VERSION,contentVersion=trialSourceVersion(version)){
 const prior=state.careerTrials?.[id],history=[...prior?.history||[]];
 if(prior&&prior.caseVersion!==version)history.push({caseVersion:prior.caseVersion,contentVersion:prior.contentVersion||trialSourceVersion(prior.caseVersion),text:prior.text});
 const row={caseVersion:version,contentVersion,text,...(history.length?{history}:{})};normalizeCareerTrials({[id]:row});
 return {...state,careerTrials:{...state.careerTrials,[id]:row}};
}
export const trialRecoveryKey=(owner,career,version=CAREER_TRIAL_VERSION)=>'avemly-career-trial-recovery:'+owner+':'+career+':'+version;
export function readTrialRecovery(storage,owner,career,version=CAREER_TRIAL_VERSION){try{const row=JSON.parse(storage.getItem(trialRecoveryKey(owner,career,version)));return row?.caseVersion===version&&typeof row.text==='string'&&row.text.length<=CAREER_TRIAL_LIMIT?row:null;}catch{return null;}}
export function clearTrialRecovery(storage,owner){try{const prefix='avemly-career-trial-recovery:'+owner+':';for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith(prefix))storage.removeItem(key);}}catch{}}
