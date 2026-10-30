import {careers,learning,uid} from './model.js';
import {dependencyBlock,resumeUnavailable} from './completion-model.js';
import {reportReferencesUnavailable} from './alignment-model.js';
export const validCompareIds=ids=>[...new Set((ids||[]).filter(id=>careers.some(c=>c.id===id)))].slice(0,3);
export function workspaceAnchor(hash){try{return hash?decodeURIComponent(hash.slice(1)):null;}catch{return null;}}
const aliases={data:['数据分析','业务分析','data analysis'],ai:['人工智能','artificial intelligence','ai'],security:['网络安全','信息安全','cybersecurity'],ops:['运维','可靠性','site reliability'],frontend:['前端','frontend','front-end'],backend:['后端','backend','back-end'],engineering:['数据工程','数据管道','data engineering'],testing:['软件测试','测试工程','software testing'],software:['软件开发','软件工程','software development','software engineering'],delivery:['实施交付','技术支持','technical support']};
export function parseSearchRequest(query,prior={}){
 if(!query?.trim())throw Error('请先描述想查找的内容。');
 const q=query.trim(),lower=q.toLowerCase(),matches=careers.filter(c=>[c.name,...aliases[c.id]||[]].some(word=>word==='ai'?/(^|[^a-z])ai([^a-z]|$)/i.test(q):lower.includes(word.toLowerCase())));
 const cities=[['北京','beijing'],['上海','shanghai'],['广州','guangzhou'],['深圳','shenzhen'],['杭州','hangzhou'],['南京','nanjing'],['成都','chengdu'],['武汉','wuhan'],['西安','xian'],['苏州','suzhou'],['天津','tianjin'],['重庆','chongqing'],['长沙','changsha'],['厦门','xiamen']];
 return {...prior,query:q,career:matches.length===1?matches[0].id:'any',location:cities.find(pair=>pair.some(c=>lower.includes(c)))?.[0]||'不限',form:/远程|remote/i.test(q)?'远程':/混合|hybrid/i.test(q)?'混合':/现场|on.?site/i.test(q)?'现场':'不限',scope:prior.scope||'职业原创知识',parsed:true,searched:false,recognized:matches.map(c=>c.name),date:new Date().toISOString().slice(0,10)};
}
export function filteredResearch(s,f){
 const match=j=>(f.career==='any'||j.career===f.career)&&(f.location==='不限'||(j.location||'未知').includes(f.location))&&(f.form==='不限'||j.form===f.form);
 if(f.scope==='职业原创知识')return careers.filter(c=>f.career==='any'||c.id===f.career);
 return f.scope==='本人私有研究卡'?s.jobs.filter(match):[];
}
export function completionReadiness(s,t){
 const latest=t.attempts?.at(-1),at=tab=>'/work/'+encodeURIComponent(t.id)+'?tab='+tab;
 return [
 {id:'submission',title:'提交一个独立版本',done:!!latest,detail:latest?'已提交 v'+latest.version:'当前草稿还没有形成提交版本',to:at('尝试与反馈')},
 {id:'contribution',title:'说明本人贡献',done:!!t.contribution?.trim(),detail:t.contribution?.trim()?'已有本人贡献说明':'请说明这次自己实际负责了什么',to:at('贡献与表达')},
 {id:'check',title:'为最新版本记录本人自检',done:latest?.result==='自检记录',detail:latest?'v'+latest.version+' · '+latest.result:'先提交，再为对应版本记录检查',to:at('尝试与反馈')},
 {id:'standard',title:'逐项核对本次交付标准',done:!!t.selfcheck,detail:t.selfcheck?'已勾选本次标准确认':'核对后在下方勾选确认',local:true},
 {id:'dependencies',title:'完成前置任务',done:!dependencyBlock(s,t),detail:dependencyBlock(s,t)?'仍有未完成的交付依赖':'没有未完成的前置依赖',to:'/plan#phase-actions'}
 ];
}
export function learningContinuation(s){return learning.flatMap(l=>{const reading=s.reading?.[l.id],tasks=s.tasks.filter(t=>t.template===l.id);return reading||tasks.length?[{unit:l,chapter:reading?Math.max(0,Math.min(l.chapters.length-1,Number(reading.chapter)||0)):null,task:tasks.find(t=>!t.completed&&!['取消','延期','跳过'].includes(t.status))||tasks.at(-1)}]:[];});}
export const defaultPracticeRange=(tab,hours)=>tab==='综合项目'||hours==='标准范围'?'标准范围':'最小范围';
export const eventTypes=['投递','面试','录用（本人记录）','未录用','无回复','撤回','归档'];
export const availableEventMaterials=s=>[...s.resumes.filter(r=>!resumeUnavailable(s,r)),...s.reports.filter(r=>!reportReferencesUnavailable(s,r))];
export function saveJobEvent(s,d){
 if(!s.jobs.some(j=>j.id===d.jobId))throw Error('岗位记录已不可用，请返回本人机会重新选择。');
 if(!eventTypes.includes(d.type))throw Error('请选择有效的本人事件类型。');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date||'')||Number.isNaN(Date.parse(d.date+'T12:00:00'))||new Date(d.date+'T12:00:00Z').toISOString().slice(0,10)!==d.date)throw Error('请填写本人事件日期。');
 const old=d.id?s.events.find(e=>e.id===d.id&&e.jobId===d.jobId):null;
 if(d.id&&(!old||(old.version||1)!==(d.version||1)))throw Error('事件版本已变化，请重新打开修订。');
 const selected=availableEventMaterials(s).find(r=>r.id===d.material);
 const same=old&&(old.material||'')===(d.material||'');
 if(d.material&&!same&&!selected)throw Error('所选材料已不可用，请重新选择。');
 const record={id:old?.id||uid('event'),jobId:d.jobId,type:d.type,date:d.date,material:d.material||'',note:(d.note||'').trim(),next:(d.next||'').trim(),materialSnapshot:same?old.materialSnapshot:structuredClone(selected||null),version:(old?(old.version||1):0)+1,history:old?[...old.history||[],{...old,history:undefined}]:[]};
 return {...s,events:old?s.events.map(e=>e.id===old.id?record:e):[...s.events,record]};
}
export function reviewReminders(s){return s.notifications?s.tasks.filter(t=>t.status==='完成'&&t.completed&&!s.reviews.some(r=>r.taskId===t.id)):[];}
