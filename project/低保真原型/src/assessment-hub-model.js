import {profileInsights} from './profile-insights-model.js';
import {resumeLibrary} from './resume-import-model.js';
export const assessmentEntry='/assessment?tab=资料经历';
export const hubSections={review:{tab:'原文确认',id:'assessment-review'},profile:{tab:'成果档案',id:'assessment-profile'},analysis:{tab:'四维与差距',id:'assessment-analysis'},resume:{tab:'当前简历',id:'assessment-resumes'}};
export const hubSectionForTab=tab=>Object.keys(hubSections).find(k=>hubSections[k].tab===tab)||null;
export function assessmentEntryMode(tab,search=''){return tab==='资料经历'||(!tab&&new URLSearchParams(search).has('resumeType'));}
export function assessmentEntryLink(to){if(!to.startsWith('/'))return to;const u=new URL(to,'http://prototype.local');if(u.pathname==='/assessment'&&!u.searchParams.get('tab'))u.searchParams.set('tab','资料经历');return u.pathname+u.search+u.hash;}
export function assessmentHub(s){
 const profile=profileInsights(s),library=resumeLibrary(s),current=library.filter(r=>s.currentResumeByTarget?.[r.target||'']===r.key&&!r.unavailable&&(!r.target||s.jobs.some(j=>j.id===r.target))),blockedCurrent=library.filter(r=>s.currentResumeByTarget?.[r.target||'']===r.key&&!current.some(x=>x.key===r.key));
 const snapshot=!s.analysis?'none':s.adminSource.status==='已撤回'||!profile.facts.length?'unavailable':s.analysis.occupation!==profile.career.id?'other':s.analysisStale||s.analysis.profileVersion!==s.profileVersion?'stale':'current';
 const next=profile.pending.length?{title:'先核对已有经历，再用于画像与简历',detail:'待确认、重复或矛盾的材料仍需逐项处理。',to:'/assessment?tab=原文确认#assessment-review',action:'核对待确认材料 →'}:!profile.facts.length?{title:'从一段经历，开始建立自己的准备记录',detail:'课程作业、校园活动和自主练习都可以，先把自己做过的事写下来。',to:assessmentEntry,action:'记录第一段经历 →'}:{title:'确认材料已就绪，继续看准备缺口',detail:'查看当前对照方向需要哪些具体产物；未知仍需实践与反馈核对。',to:'/assessment?tab=四维与差距#assessment-analysis',action:'查看准备缺口 →'};
 return {profile,library,current,blockedCurrent,snapshot,next};
}
