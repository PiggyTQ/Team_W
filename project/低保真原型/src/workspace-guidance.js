import {confirmed} from './model.js';
import {practiceDestination,taskRoute} from './flow-navigation.js';

export const pendingMaterials=s=>s.claims.filter(c=>['待确认','疑似重复','矛盾'].includes(c.status));
export const activeWorkspaceTask=s=>s.tasks.find(t=>!t.completed&&t.status==='进行中')||s.tasks.find(t=>!t.completed&&t.status==='受阻')||s.tasks.find(t=>!t.completed&&t.status==='待开始');
export const workspaceStarts=[
 {id:'explore',label:'方向未定',title:'先比较两个 IT 职业方向',desc:'先了解工作内容和所需基础，选出想继续探索的方向。没有简历也可以开始。',output:'两个职业候选、一个关键疑问和下一次验证的想法。',to:'/careers',labelAction:'探索与比较'},
 {id:'goal',label:'已有目标',title:'看看目标职业还需要哪些准备',desc:'先选择要对照的职业，再查看自己的材料与未知项。不必重新做一遍探索。',output:'目标要求、已有依据，以及需要补充或验证的内容。',to:'/assessment?tab=四维与差距',labelAction:'查看职业准备'},
 {id:'work',label:'已有作品',title:'从你已经做过的事开始',desc:'记录课程项目、实习或自主作品，写清自己负责的部分，再逐项核对。',output:'一段经历原文、本人贡献与可复用的成果范围。',to:'/assessment',labelAction:'整理已有经历'}
];
export function workspacePath(s){
 const pending=pendingMaterials(s).length,recorded=confirmed(s).length;
 return [
  {title:'了解方向',to:'/careers',status:s.compare.length>=2?'已保留比较':s.favorites.length?'已收藏方向':'可以从这里开始'},
  {title:'整理经历',to:'/assessment?tab=原文确认',status:pending?'有材料待核对':recorded?'有本人确认材料':'还没有确认材料'},
  {title:'安排计划',to:'/plan',status:s.tasks.length?'已有行动记录':'可先独立探索'},
  {title:'实践验证',to:practiceDestination(s),status:s.tasks.some(t=>t.completed)?'有已记录成果':activeWorkspaceTask(s)?'有任务可继续':'先预览学习与实践'},
  {title:'复盘报告',to:'/reports',status:s.reports.length?'有保存版本可回看':s.reviews.length?'有本人复盘记录':'记录选择与变化'}
 ];
}
// Guides describe state. Opening them never confirms material or advances an action.
export function workspaceGuide(s,path,tab='',search=''){
 const pending=pendingMaterials(s).length,active=activeWorkspaceTask(s);
 const make=(stage,purpose,input,output,note,to,label)=>({stage,purpose,input,output,note,to,label});
 if(path==='/app')return make(null,'处理当前重点，接着已有记录继续','查看待确认材料、当前任务和每周可用时间；没有记录时可先整理经历或预览小实践。','本人确认材料、实际行动记录与可回看的阶段版本。','首页只汇总已保存记录；进入页面不会自动确认材料、创建任务或改变目标。','/assessment','查看已有材料');
 if(path==='/careers'){
  if(tab==='我的机会')return make(0,'跟进你关注的岗位','本人收藏的岗位与实际发生的申请、面试记录。','岗位笔记、准备任务和本人记录的申请进展。','收藏或导出简历不会自动变成已投递。','/reports?tab=岗位简历','整理岗位简历');
  if(tab==='企业与岗位'||tab==='薪酬参考')return make(0,'先核对岗位要求与资料来源','岗位信息、来源和适用范围；不确定的信息保留未知。','值得继续研究的岗位，以及需要准备的材料。','示例岗位和薪酬范围不代表真实招聘或个人收入。','/careers?tab=我的机会','查看我的机会');
  return make(0,'看懂工作，再比较方向','无需简历；先选感兴趣的职业，了解任务和典型产物。','职业候选、选择理由和待验证的问题。','比较或收藏不会更改主目标，确认目标需要另行操作。','/careers?tab=比较','选择方向进行比较');
 }
 if(path==='/assessment'){
  if(tab==='当前简历')return make(1,'按目标整理当前简历','已有 PDF 简历，或可选用的本人确认材料。','按目标分别保存的原稿与简历版本。','上传只提取原文，候选段落需逐项确认。设为当前不会自动投递。','/reports?tab=岗位简历','打开简历编辑台');
  if(tab==='原文确认')return make(1,'逐项核对经历原文与本人贡献','已手填或导入的候选材料，以及本人贡献说明。','本人确认的材料及可复用范围。',pending?'仍有材料待核对。未确认内容暂不参与评估，进入下一页也不会代为确认。':'没有材料也可以先了解规则；确认声明与实际核验分别记录。','/assessment?tab=四维与差距','查看职业评估');
  if(tab==='四维与差距')return make(1,'分清已有依据和需要验证的内容','选择对照职业；可复用本人确认材料，缺项保留未知。','带有材料引用的模拟对照，以及下一步要回答的问题。',s.analysisStale?'已有依据发生变化，请先复查。本页跳转不会更新分析或覆盖旧报告。':'对照职业与主目标分开；查看结果不会改变你的目标。','/plan','带着问题安排计划');
  if(tab==='成果档案')return make(1,'回看自己的材料与成果','本人记录的经历、产物和贡献；可返回原文修订。','可供评估、报告与简历选择的材料。','候选、本人确认和实际核验是不同状态。','/assessment?tab=原文确认','回到原文确认');
  return make(1,'把做过的事写清楚','一段课程项目、作品或实际经历；未知可以留空。','可返回继续的经历草稿，以及保存后的待确认候选。','输入草稿会在本机保留，保存为候选后还要逐项确认。','/assessment?tab=原文确认','核对已保存的候选');
 }
 if(path==='/plan'){
  if(tab==='复盘')return make(4,'记录实践复盘','关联一项实际发生的行动；反馈没有收到时可以留空。','结果与反馈、原因分析和改进措施。','进入报告不会代你保存当前表单；请先保存复盘。','/reports','整理阶段报告');
  if(new URLSearchParams(search).has('practice'))return make(3,'在站外行动，在这里保留记录','一项有效行动及实际发生的过程、产物和本人贡献。','行动结果、限制和可继续补充的记录。','未发生的部分保留未知；记录草稿不会自动完成任务。','/plan?tab=执行','回到行动列表');
  return make(2,tab==='执行'?'继续行动，记录实际结果':'制定任务计划','当前疑问、预期产物和每周可用时间；方向未定可独立探索。','有目的、交付物和预计投入的行动安排。',Number(s.budget)>0?'预计投入按总周预算核对；调整先预览，旧产物继续保留。':'每周预算尚未确定或为零，可先保存草稿，确认时间后再创建任务。',active?taskRoute(s,active):'/learning',active?'继续已有实践':'选择学习与实践');
 }
 if(path==='/learning')return make(3,'先预览内容，准备好再开始实践','选择想回答的问题，查看所需基础、预计投入和交付物。','阅读位置，或预算确认后创建的实践任务。','阅读和收藏不会自动建任务，也不代表已经完成学习。',active?taskRoute(s,active):'/plan',active?'回到已有任务':'查看目标与行动安排');
 if(path.startsWith('/work/')){
  const task=s.tasks.find(t=>t.id===decodeURIComponent(path.split('/')[2]));
  if(!task||['取消','跳过','延期'].includes(task.status))return make(3,'先选择一项有效行动','从计划查看当前任务及其状态。','恢复原任务或另行安排的行动。','此任务不存在或已暂停，指南不会自动恢复任务。','/plan?tab=执行','回到计划处理');
  const output=tab==='尝试与反馈'?'保留版本的尝试，以及对应版本的检查记录。':tab==='完成回执'?'实际完成回执和后续复盘入口。':'产物、本人贡献、辅助来源与限制说明。';
  return make(3,task.completed?'回看成果，再记录反馈与调整':tab==='尝试与反馈'?'先保留草稿，再提交当前尝试':'按任务标准完成一次实践','任务目标与交付标准，以及你实际做出的内容。',output,task.status==='受阻'?'任务受阻时可先记录困难，或返回计划调整安排；不必反复强行开始。':'保存草稿、提交尝试、检查与完成任务是不同操作，请按实际状态处理。',task.completed?'/plan?tab=复盘&task='+encodeURIComponent(task.id):'/plan?tab=执行',task.completed?'为这项行动写复盘':'查看或调整任务安排');
 }
 if(path.startsWith('/reports')){
  if(tab==='岗位简历')return make(4,'按岗位要求选择可用材料','本人确认过的经历、教育记录，以及可选的岗位要求。','可检查、编辑并导出的简历版本。','简历导出不代表已经投递；缺少依据的内容不会补写成事实。','/assessment?tab=原文确认','补充确认经历');
  return make(4,path==='/reports'?'整理当前阶段的选择与成果':'回看保存版本，按需另存更新','目标或探索理由、本人确认材料、行动与复盘；缺项保留未知。','有来源与版本的阶段报告。',s.analysisStale?'部分依据有变化，先核对影响，再决定是否另存更新。':'阅读不修改报告；新材料或行动不会自动覆盖保存版本。',s.analysisStale?'/assessment?tab=四维与差距':'/plan?tab=复盘',s.analysisStale?'复查变化的依据':'整理本人复盘');
 }
 if(path==='/assistant')return make(null,'先说明问题，再决定是否采用提议','你的具体疑问；个人材料的使用范围由你选择。','可回看的讨论，以及需要在业务页预览的行动提议。','当前回复为模拟结果；发送问题不会创建任务、确认经历或更改目标。','/plan','回计划确认行动');
 if(path==='/career-map')return make(0,'看方向之间的联系与技能先后','选择一个职业或技能节点；未发布的关系保留说明。','可回到职业详情核对的知识与学习线索。','节点关系不是能力评分；查看路线不会自动加入计划。','/careers','返回职业探索');
 if(path==='/settings')return make(null,'管理背景、资料使用和本机数据','按需更新偏好，核对授权范围及导出、删除影响。','你明确保存的设置或数据操作回执。','个人事实、资料授权和删除范围分别处理；删除前会确认影响。','/app','回到工作区');
 return null;
}
