import {uid} from './model.js';
import {resumeUnavailable} from './completion-model.js';

export const MAX_PDF_BYTES=10*1024*1024;
export const MAX_RESUME_TEXT=120000;
export function validateResumeFile(file){
 if(!file||!file.size)throw Error('请选择非空的 PDF 文件。');
 if(!/\.pdf$/i.test(file.name))throw Error('请选择 PDF 简历；其他格式可复制文字后粘贴。');
 if(file.size>MAX_PDF_BYTES)throw Error('文件超过 10 MB，请压缩 PDF 或粘贴简历文字。');
}
const sectionRules=[
 [/^(教育背景|教育经历|education|academic background)$/i,'教育经历','education'],
 [/^(项目经历|项目经验|项目与科研|科研经历|project[s]?|project experience|research experience)$/i,'课程项目','experience'],
 [/^(实习经历|工作经历|实习与工作|工作经验|实习经验|work experience|professional experience|internship[s]?|employment)$/i,'实习（本人记录）','experience'],
 [/^(校园经历|校园实践|社会实践|志愿服务|活动经历|activities|volunteer experience)$/i,'校园经历','experience'],
 [/^(专业技能|技能|技能特长|技术技能|skills|technical skills)$/i,'技能记录','skills'],
 [/^(荣誉奖项|荣誉与证书|获奖经历|奖项|证书|honors|awards|certifications)$/i,'荣誉奖项','experience'],
 [/^(个人简介|自我评价|个人总结|个人优势|summary|profile|about me|objective)$/i,'个人简介','summary'],
 [/^(基本信息|个人信息|联系方式|联系资料|contact|contact information|personal information)$/i,'个人信息','contact']
];
export function resumeSegments(raw){
 const text=String(raw||'').replace(/\r\n?/g,'\n').trim();
 if(!text)return [];
 if(text.length>MAX_RESUME_TEXT)throw Error('文字过长，请缩小到当前简历范围（最多 12 万字）。');
 const blocks=[];let active={heading:'未分类原文',type:'外部行动',kind:'unclassified',lines:[]};
 const flush=()=>{if(active.lines.some(l=>l.trim()))blocks.push({...active,text:active.lines.join('\n').trim()});};
 for(const line of text.split('\n')){
  const clean=line.trim().replace(/[：:]\s*$/,'').replace(/\s+/g,' '),rule=sectionRules.find(([pattern])=>pattern.test(clean));
  if(rule){flush();active={heading:clean,type:rule[1],kind:rule[2],lines:[]};}else active.lines.push(line);
 }
 flush();
 return blocks.map((b,i)=>({key:String(i),title:b.heading,text:b.text,type:b.type,kind:b.kind,selected:b.kind==='experience',contribution:'',skill:'未知',aid:'未说明'}));
}
export function storeResumeImport(s,draft,{addCandidates=false}={}){
 const text=String(draft.text||'').trim(),title=String(draft.title||'').trim(),target=draft.target||'';
 if(!title||!text)throw Error('请填写简历名称并核对原文。');
 if(text.length>MAX_RESUME_TEXT)throw Error('简历文字过长，请缩小范围后保存。');
 if(target&&!s.jobs.some(j=>j.id===target))throw Error('所选岗位已不可用，请重新选择。');
 const imports=s.resumeImports||[],existing=imports.find(r=>r.id===draft.existingId&&r.text===text&&r.target===target&&r.fileName===(draft.fileName||''));
 if(imports.some(r=>r.id!==existing?.id&&r.target===target&&r.text===text&&r.fileName===(draft.fileName||'')))throw Error('这个目标下已保存相同原稿，请在简历档案中查看。');
 const selected=addCandidates?(draft.segments||[]).filter(c=>c.selected):[];
 if(addCandidates&&!selected.length)throw Error('请至少选择一段需要确认的经历，或仅保存原稿。');
 if(selected.some(c=>!c.title.trim()||!c.text.trim()))throw Error('所选段落的标题和原文不能为空。');
 let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
 const id=existing?.id||uid('resume-import'),date=existing?.date||new Date().toISOString(),fingerprint=draft.fingerprint||'paste:'+(hash>>>0).toString(16);
 // Importing a file never confirms facts, infers contribution, or overwrites existing records.
 const candidates=selected.filter(c=>!s.claims.some(x=>x.importFingerprint===fingerprint&&x.importSegment===c.key&&x.text===c.text.trim())).map(c=>({id:uid('claim'),title:c.title.trim(),text:c.text.trim(),type:c.type,contribution:c.contribution||'',skill:c.skill||'未知',aid:'未说明',status:'待确认',version:1,origin:draft.fileName?'PDF 本机提取':'本人粘贴的简历文字',importId:id,importFingerprint:fingerprint,importSegment:c.key,sourceFile:draft.fileName||''}));
 const job=s.jobs.find(j=>j.id===target),record={id,title,target,jobSnapshot:job?{id:job.id,title:job.title}:null,fileName:draft.fileName||'',pageCount:draft.pageCount||null,fingerprint,text,date,candidateIds:[...new Set([...(existing?.candidateIds||[]),...candidates.map(c=>c.id)])],source:draft.fileName?'PDF 本机提取':'本人粘贴'};
 return {...s,resumeImports:[...imports.filter(r=>r.id!==id),record],claims:[...s.claims,...candidates],analysisStale:candidates.length?!!s.analysis:s.analysisStale};
}
export function resumeLibrary(s){
 return [...(s.resumeImports||[]).map(r=>({...r,key:'import:'+r.id,kind:'import',unavailable:false})),...s.resumes.map(r=>({...r,key:'saved:'+r.id,kind:'saved',unavailable:resumeUnavailable(s,r)}))].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
export function setCurrentResume(s,key){
 const item=resumeLibrary(s).find(r=>r.key===key);
 if(!item||item.unavailable)throw Error('这份简历的依据不可用，请先更新版本。');
 if(item.target&&!s.jobs.some(j=>j.id===item.target))throw Error('原岗位已不可用，请先重新整理目标。');
 return {...s,currentResumeByTarget:{...s.currentResumeByTarget,[item.target||'']:key}};
}
