const tabs={
 '/assessment':['准备总览','资料经历','原文确认','四维与差距','成果档案','当前简历'],
 '/careers':['职业方向','比较','企业与岗位','我的机会'],
 '/plan':['计划总览','执行','复盘'],
 '/learning':['路线与资源','短体验','综合项目'],
 '/work':['当前任务','笔记与阅读','尝试与反馈','贡献与表达','完成回执'],
 '/reports':['职业报告','岗位简历'],
 '/assistant':['咨询与方案','自然语言检索'],
 '/settings':['偏好与通知','资料与隐私'],
 '/career-map':['技能先修','职业关系'],
 '/admin/quality':['待处理反馈','质量与服务','权限审计'],
 '/admin/data':['来源用途','语义与条件','发布与撤回'],
 '/admin/content':['职业技能','关系先修','学习项目','发布历史']
};
const aliases={
 '/assessment':{'资料与经历':'资料经历','提取与确认':'原文确认','职业评估':'四维与差距','我的画像':'成果档案','我的简历':'当前简历'},
 '/plan':{'日程':'执行','本周日程':'执行'},
 '/career-map':{'职业地图':'职业关系'},
 '/reports':{'报告':'职业报告','简历':'岗位简历'}
};

// Keep object IDs, filters, return locations and hashes while repairing only tab.
export function normalizeWorkspaceRoute(value){
 const url=new URL(value,'http://prototype.local');
 const key=url.pathname.startsWith('/work/')?'/work':url.pathname.startsWith('/reports/')?'/reports':url.pathname;
 const folds={'/careers':{'薪酬参考':['企业与岗位','focus','salary']},'/plan':{'方案调整':['计划总览','adjust','1']},'/settings':{'资料授权':['资料与隐私','section','authorization'],'导出与删除':['资料与隐私','section','data'],'反馈状态':['偏好与通知','section','feedback'],'偏好与支持':['偏好与通知']}};
 const folded=folds[key]?.[url.searchParams.get('tab')];
 if(folded){url.searchParams.set('tab',folded[0]);if(folded[1])url.searchParams.set(folded[1],folded[2]);}
 const allowed=tabs[key],current=url.searchParams.get('tab');
 let invalidTab=false;
 if(allowed&&current){
  const alias=aliases[key]?.[current];
  if(alias){url.searchParams.set('tab',alias);if(key==='/plan'&&['日程','本周日程'].includes(current))url.searchParams.set('view','calendar');}
  else if(!allowed.includes(current)){url.searchParams.delete('tab');invalidTab=true;}
 }
 return {to:url.pathname+url.search+url.hash,invalidTab};
}

export const jobPreparationSource=id=>'/careers?tab=我的机会&job='+encodeURIComponent(id);
