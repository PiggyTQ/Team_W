export const experienceTypes=['课程项目','自主作品','科研成果','实习（本人记录）','工作经历','校园经历','志愿服务','社会实践','荣誉奖项','证书','技能记录','个人简介','外部行动'];
const guides={
 course:{context:'这是什么课或作业？当时需要解决什么问题？',action:'你具体做了哪一步？可以从整理、记录、查找或检查说起。',outcome:'留下了表格、代码、报告，还是一份尚未完成的草稿？',title:'例如：课程作业中的数据整理',example:['课程要求整理一份练习表。','我标记了空白字段，把处理理由记在表格旁。','留下问题清单；结论还没有重复检查。']},
 project:{context:'你为什么想做这件事？想验证或做出什么？',action:'你实际做了什么尝试？用了什么方法或材料？',outcome:'目前留下了什么？哪些还没做完、还不能确定？',title:'例如：个人网页的第一次实现',example:['想试着做一个展示作品的网页。','我画了页面草图，并实现了导航和作品列表。','页面可以打开；手机排版还没检查。']},
 team:{context:'是哪次活动？你在什么场景下参与？',action:'你具体负责哪部分？怎样与别人配合？',outcome:'留下了什么记录或交接？活动没结束也可以写当前进展。',title:'例如：社团活动的报名整理',example:['社团准备一次活动，需要整理报名。','我汇总了报名表，并把重复信息交给负责人核对。','留下报名清单；最终到场情况还未知。']},
 work:{context:'当时有什么任务？只写允许公开的背景。',action:'你实际承担了哪几步？不要把团队的工作都算作自己的。',outcome:'交付了什么、收到什么反馈？没有反馈就如实保留未知。',title:'例如：实习期间的一次资料整理',example:['团队需要整理一批允许使用的资料。','我按已有规则分类，并记录不确定的条目。','交接了整理清单；尚未收到反馈。']},
 fact:{context:'这条记录与什么事情有关？不知道的可以先留空。',action:'写清实际名称、内容或正在进行的练习，不把计划写成已经完成。',outcome:'有可核对的材料或日期吗？没有时可以留空。',title:'例如：一次工具练习的记录',example:['想学习一种新的表格工具。','我跟着公开教程整理了一份练习表。','保存了练习文件；还没有独立完成新任务。']}
};
export function experienceGuide(type){return guides[['校园经历','志愿服务','社会实践'].includes(type)?'team':['实习（本人记录）','工作经历'].includes(type)?'work':['自主作品','科研成果','外部行动'].includes(type)?'project':['荣誉奖项','证书','技能记录','个人简介'].includes(type)?'fact':'course'];}
const emptyParts=()=>({context:'',action:'',outcome:''});
export const experienceStorySteps=[
 {key:'context',label:'经历背景',field:'事情背景（选填）',empty:'未填写经历背景（选填）',lenses:[['任务要求','当时收到什么任务，或计划解决什么问题？'],['参与场景','这项经历属于哪门课、哪个活动或哪次练习？'],['目标问题','这项经历需要弄明白或解决什么问题？']]},
 {key:'action',label:'具体行动',field:'实际内容与行动（必填）',empty:'未填写具体行动（必填）',lenses:[['实施步骤','你具体执行了哪些步骤，使用了哪些材料或工具？'],['问题处理','遇到了什么问题？你查找、调整或检查了什么？'],['协作分工','哪一部分由你负责？如何与他人配合、交接？']]},
 {key:'outcome',label:'结果与进展',field:'结果或当前进展（选填）',empty:'未填写结果与进展（选填）',lenses:[['完成产物','完成了哪些文件、代码、报告或其他产物？'],['收到的反馈','是否收到具体反馈？记录原话或明确的评价。'],['未完成事项','哪些内容尚未完成，哪些结论仍需核对？']]}
];
export function experienceStory(d){const n=normalizeExperienceDraft(d);return experienceStorySteps.map(step=>({...step,text:n.guidedParts[step.key].trim()}));}
export function normalizeExperienceDraft(d={}){
 const entryMode=['guided','raw'].includes(d.entryMode)?d.entryMode:d.text?.trim()?'raw':'guided';
 const untouched=!d.entryMode&&!d.title?.trim()&&!d.text?.trim()&&!d.contribution?.trim();
 return {...d,title:d.title||'',contribution:d.contribution||'',type:d.type||'课程项目',skill:untouched&&d.skill==='SQL'?'未知':d.skill||'未知',aid:d.aid||'无',entryMode,storyStep:experienceStorySteps.some(x=>x.key===d.storyStep)?d.storyStep:'context',guidedParts:{...emptyParts(),...d.guidedParts},rawText:typeof d.rawText==='string'?d.rawText:entryMode==='raw'?d.text||'':'',rawInitialized:d.rawInitialized??entryMode==='raw',guidedInitialized:d.guidedInitialized??entryMode==='guided'};
}
export const composeGuidedExperience=parts=>['context','action','outcome'].map(k=>(parts?.[k]||'').trim()).filter(Boolean).join('\n\n');
export function experienceText(d){const n=normalizeExperienceDraft(d);return n.entryMode==='raw'?n.rawText:composeGuidedExperience(n.guidedParts);}
export function patchExperienceDraft(d,patch){const n=normalizeExperienceDraft(d),next={...n,...patch,guidedParts:{...n.guidedParts,...patch.guidedParts}};return {...next,text:experienceText(next)};}
export function switchExperienceMode(d,entryMode){
 const n=normalizeExperienceDraft(d);if(!['raw','guided'].includes(entryMode))return n;
 if(entryMode==='raw'&&!n.rawInitialized){n.rawText=composeGuidedExperience(n.guidedParts);n.rawInitialized=true;}
 if(entryMode==='guided'&&!n.guidedInitialized){n.guidedParts.action=n.rawText;n.guidedInitialized=true;}
 return patchExperienceDraft(n,{entryMode});
}
export function experienceErrors(d){const n=normalizeExperienceDraft(d),errors=[];
 if(!experienceTypes.includes(n.type))errors.push({id:'experience-kind',message:'请选择这段经历的实际类型。'});
  if(n.entryMode==='guided'?!n.guidedParts.action.trim():!n.rawText.trim())errors.push({id:n.entryMode==='guided'?'experience-action':'experience-raw',message:n.entryMode==='guided'?'请填写实际内容与行动。':'请粘贴或填写实际经历原文，再保存。'});
  if(!n.title.trim())errors.push({id:'experience-title',message:'请填写经历标题。'});
 return errors;
}
export function experienceCandidate(d){const n=normalizeExperienceDraft(d),errors=experienceErrors(n);if(errors.length)throw Error(errors[0].message);return {title:n.title.trim(),text:experienceText(n).trim(),contribution:n.contribution.trim(),type:n.type,skill:['','其他','未知'].includes(n.skill)?'未知':n.skill,aid:n.aid};}
