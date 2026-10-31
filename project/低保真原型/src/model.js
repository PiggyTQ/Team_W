export const KEY='career-lowfi-v1';
export const pages=[['U01','/','公开首页'],['U02','/onboarding','首次设置'],['U03','/app','工作区首页'],['U04','/assessment','个人评估'],['U05','/careers','职业探索'],['U06','/career-map','职业与技能地图'],['U07','/plan','目标计划'],['U08','/learning','学习实践'],['U09','/work','任务工作区'],['U10','/reports','职业报告'],['U11','/assistant','AI 工作台'],['U12','/settings','账户与数据'],['B01','/admin/quality','运营质量与反馈'],['B02','/admin/data','来源与岗位审核'],['B03','/admin/content','职业与学习内容']];
export const careers=[
 {id:'data',name:'数据分析',task:'围绕业务问题检查数据、描述差异并解释局限。',branch:'业务分析 / 数据质量',skill:'SQL',env:'业务协作；需求澄清',output:'问题清单、分析说明与限制'},
 {id:'ai',name:'人工智能',task:'定义模型调用任务，记录输入、输出与评估边界。',branch:'应用开发 / 评估',skill:'Python',env:'实验迭代；结果复核',output:'调用与评估记录'},
 {id:'security',name:'网络安全',task:'在离线合成日志中整理异常线索，说明不确定性。',branch:'安全运营 / 应用安全',skill:'日志分析',env:'授权范围；风险沟通',output:'合成日志分析记录'},
 {id:'ops',name:'运维工程',task:'根据模拟故障记录制定恢复步骤与回退方案。',branch:'系统运维 / 可靠性',skill:'Linux',env:'可能涉及值守；具体岗位待核对',output:'模拟恢复记录'},
 {id:'frontend',name:'前端开发',task:'实现可操作界面，检查响应布局与键盘操作。',branch:'Web 界面 / 工程化',skill:'JavaScript',env:'产品设计协作',output:'界面原型与检查记录'},
 {id:'backend',name:'后端开发',task:'设计数据接口，说明校验、错误与权限边界。',branch:'接口服务 / 业务系统',skill:'Java',env:'接口契约；系统协作',output:'接口说明与测试记录'},
 {id:'engineering',name:'数据工程',task:'梳理数据流与质量规则，记录处理过程。',branch:'数据管道 / 数据平台',skill:'SQL',env:'数据来源与质量协作',output:'处理流程说明'},
 {id:'testing',name:'软件测试',task:'从需求编写测试场景，定位结果与复现条件。',branch:'质量保障 / 自动化',skill:'测试设计',env:'问题沟通；复核',output:'测试用例与缺陷记录'},
 {id:'software',name:'通用软件开发',task:'拆解问题、编写程序并记录验证范围。',branch:'软件设计 / 编程',skill:'编程基础',env:'需求与开发协作',output:'程序说明与验证记录'},
 {id:'delivery',name:'IT 实施交付',task:'核对实施要求，组织配置、交接与问题记录。',branch:'实施 / 技术支持',skill:'需求记录',env:'现场条件按岗位核对',output:'交付清单'}
];
export const learning=[
 {id:'quality',title:'数据质量小项目',career:'data',hours:2,standard:4,skill:'SQL',product:'问题清单、处理理由、描述统计、限制说明',prereq:'建议了解表格；交付需问题清单 AND 限制说明；SQL OR 表格工具任选其一',chapters:['业务：哪些数据可以支撑问题','方案：保留原值与处理理由','实践：记录质量问题','表达：贡献与局限']},
 {id:'ai-eval',title:'AI 调用与评估体验',career:'ai',hours:1,standard:3,skill:'Python',product:'合成输入输出、评估规则、未知项',prereq:'建议了解 Python；允许离线记录，不要求调用真实模型',chapters:['业务与风险','评估规则','离线记录','结果表达']},
 {id:'log',title:'离线合成日志分析',career:'security',hours:1,standard:3,skill:'日志分析',product:'线索、替代解释、授权边界',prereq:'仅合成日志；不接触真实网络或账户',chapters:['分析范围','异常线索','替代解释','结论边界']},
 {id:'restore',title:'模拟恢复记录',career:'ops',hours:1,standard:3,skill:'Linux',product:'恢复步骤、回退条件、未验证项',prereq:'阅读建议未知可继续；不得执行生产环境操作',chapters:['故障背景','恢复方案','回退条件','复盘表达']}
];
export const fresh=()=>({schema:1,logged:false,onboard:false,stage:'S2',role:'student',version:1,profileVersion:1,planVersion:1,preferences:{intent:'方向未定',stage:'本科在读',interest:'',location:'未知',constraint:'未知'},budget:3,goal:null,backup:null,education:[],learningStages:null,claims:[],claimDraft:{title:'',text:'',contribution:'',type:'课程项目',skill:'SQL',aid:'无'},analysis:null,analysisStale:false,compare:[],favorites:[],decision:{reason:'',question:'',result:'仍未知'},tasks:[],taskDraft:null,scenario:null,reading:{},reviews:[],reports:[],resumes:[],jobs:[],events:[],presets:[],searchFilters:null,notifications:true,authorized:false,deleted:false,deletion:null,feedback:[],conversations:[{id:'conv-1',title:'职业规划讨论',messages:[],mode:'职业咨询'}],conversationId:'conv-1',aiReturn:'/app',aiDraft:'',aiScope:['职业原创知识'],proposal:null,adminSource:{purpose:false,semantic:false,status:'隔离',reason:'',version:1},adminContent:{standard:false,license:false,dependencies:false,cycle:false,status:'草稿',version:1},audit:[],deferred:false});
export const uid=(prefix)=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
export const cname=id=>careers.find(c=>c.id===id)?.name||'暂未选择';
export const confirmed=s=>s.claims.filter(c=>c.status==='已确认');
export const canRejectClaim=c=>['待确认','疑似重复','矛盾'].includes(c?.status);
export function rejectClaimCandidate(s,id){return {...s,claims:s.claims.map(c=>c.id===id&&canRejectClaim(c)?{...c,status:'已拒绝'}:c)};}
export const usedHours=s=>s.tasks.filter(t=>!['完成','跳过','取消','延期'].includes(t.status)).reduce((n,t)=>n+Number(t.hours),0);
export function checkStart(s,d){
 if(!d.purpose?.trim())return '请填写要回答的问题或实践目的。';
 if(d.association==='主计划'&&!s.goal)return '没有主目标，请选择独立探索，或先确认主目标。';
 if(!Number.isFinite(Number(d.hours))||Number(d.hours)<=0)return '预计投入须大于 0 小时。';
 if(!s.budget||Number(s.budget)<=0)return '总预算未定，请先设置预算，或仅保存草稿。';
 if(usedHours(s)+Number(d.hours)>Number(s.budget))return `总投入 ${usedHours(s)+Number(d.hours)} 小时超过每周预算 ${s.budget} 小时，请缩小范围或调整预算。`;
 if(d.unavailable)return '当前资源不可用，请替换原创离线材料或保存草稿。';
 return '';
}
export function makeTask(s,d){return {id:uid('task'),owner:'demo-owner',title:d.title,template:d.template||'external',career:d.career||null,purpose:d.purpose,hours:Number(d.hours),association:d.association||'独立探索',kind:d.kind||'原创模拟',mode:s.stage==='S2'&&d.template&&d.template!=='external'?'S2':'S1',status:'待开始',version:1,source:d.source||'/plan',...(d.courseVersion?{courseVersion:d.courseVersion}:{}),...(d.atlas?{atlas:{...d.atlas,steps:[...d.atlas.steps]}}:{}),standard:d.product||'实际行动记录、结果及限制',note:'',draft:'',contribution:'',aid:'无',attempts:[],check:'未检查',completed:false,claimStatus:'未形成候选',milestone:'业务理解',selfcheck:false,reflection:'',due:'',learningStage:d.learningStage||'',priority:d.priority||'未排序',placementReason:d.placementReason||'',dependsOn:[]};}
export function makeAnalysis(s){return {id:uid('analysis'),profileVersion:s.profileVersion,version:s.version,occupation:s.assessmentCareer||s.goal||'data',rule:'示例规则 R1',claims:confirmed(s).map(c=>({id:c.id,version:c.version})),claimSnapshots:confirmed(s).map(c=>({id:c.id,version:c.version,title:c.title,text:c.text,contribution:c.contribution,skill:c.skill})),reviewRefs:s.reviews.map(r=>({id:r.id,taskId:r.taskId,date:r.date,version:r.version||1})),date:new Date().toISOString()};}
export function addClaim(s,c){return {...s,claims:[...s.claims,{...c,id:uid('claim'),version:1,status:'待确认',origin:c.origin||'手填'}],analysisStale:!!s.analysis};}
export function invalidate(s){return {...s,analysisStale:true,proposal:null,scenario:s.scenario?{...s.scenario,stale:true}:null};}
export function scenarioState(name){let s=fresh();s.logged=true;s.onboard=true;
 if(name==='PT01')return s;
 s.preferences.interest='数据与 AI';s.claims=[{id:'claim-demo',title:'Python 课程练习（合成示例）',text:'使用课程样例整理表格；未提供独立核验。',contribution:'本人整理问题清单',type:'课程项目',skill:'Python',aid:'参考阅读',origin:'合成示例',version:1,status:name==='PT02'?'待确认':'已确认'}];
 if(name==='PT02')return s;
 s.goal='data';s.claims.push({id:'claim-sql',title:'SQL 报告（合成示例）',text:'使用合成表记录查询思路。',contribution:'本人编写查询说明',type:'课程项目',skill:'SQL',aid:'参考阅读',origin:'合成示例',version:1,status:'已确认'});
 s.preferences.constraint='地域待确认；不接受轮班（自述示例）';
 if(name==='PT03'){s.claims.push({...s.claims[1],id:'claim-dup',status:'疑似重复'},{...s.claims[0],id:'claim-conflict',status:'矛盾',text:'本人贡献范围待核对'});return s;}
 s.budget=name==='PT04'?8:3;
 const t=makeTask(s,{template:'quality',title:'数据质量小项目（合成示例）',purpose:'验证是否愿意处理数据质量问题',hours:2,career:'data',product:learning[0].product,source:'/careers?tab=比较'});t.id='task-demo';t.status='进行中';s.tasks=[t];
 if(name==='PT05')s.jobs=[{id:'job-a',title:'分析方向岗位研究 A（合成）',company:'合成组织 A',career:'data',location:'未知',form:'未知',text:'熟悉 SQL 或表格工具；具体条件未知。',status:'准备',source:'原创合成材料，不代表在招',date:'2026-10-16',taskId:t.id,note:''},{id:'job-b',title:'运维方向岗位研究 B（合成）',company:'合成组织 B',career:'ops',location:'未知',form:'未知',text:'值守要求待核对；薪酬未提供。',status:'收藏',source:'原创合成材料，不代表在招',date:'2026-10-16',taskId:t.id,note:''}];
 if(['PT06','PT07'].includes(name)){t.attempts=[{id:'attempt-v1',version:1,text:'只有问题清单，未写限制（合成示例）',contribution:'本人记录',aid:'参考阅读',result:'待修订',feedback:'示例文本反馈：请补充处理理由与限制说明。',date:'2026-10-16'}];t.check='待修订';}
 if(name==='PT07'){s.analysis=makeAnalysis(s);s.analysisStale=true;s.reports=[{id:'report-demo',title:'职业规划报告（合成旧快照）',version:1,profileVersion:1,planVersion:1,claimIds:s.claims.map(c=>c.id),body:'人工编辑示例：先保留未知，继续做小范围验证。',goal:'data',saved:true,sections:['目标与理由','材料与差距','行动与成果','引用与局限'],date:'2026-10-16',manual:true}];}
 return s;
}

