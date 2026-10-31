export const resumeModules=[
 {id:'profile',title:'基本信息',hint:'姓名、联系渠道与作品链接',type:''},
 {id:'education',title:'教育背景',hint:'学校、专业与已提供的课程成绩',type:''},
 {id:'projects',title:'项目与科研',hint:'问题、本人贡献与实际产物',type:'课程项目'},
 {id:'work',title:'实习与工作',hint:'真实职责、工作内容与结果',type:'实习（本人记录）'},
 {id:'campus',title:'校园与社会实践',hint:'校园组织、志愿服务与协作',type:'校园经历'},
 {id:'skills',title:'专业技能',hint:'所选材料涉及的技能与支持范围',type:'技能记录'},
 {id:'honors',title:'荣誉与证书',hint:'具体奖项、资质和对应证明',type:'荣誉奖项'},
 {id:'summary',title:'个人简介',hint:'由本人陈述并确认的求职说明',type:'个人简介'}
];
const factSections=new Set(['projects','work','campus','skills','honors','summary']);
export function resumeFactSection(c,placements={}){
 if(factSections.has(placements[c.id]))return placements[c.id];
 if(/荣誉|奖项|证书|资质/.test(c.type||''))return 'honors';
 if(/实习|工作经历/.test(c.type||''))return 'work';
 if(/校园|志愿|社会实践/.test(c.type||''))return 'campus';
 if(/技能记录/.test(c.type||''))return 'skills';
 if(/个人简介|个人陈述/.test(c.type||''))return 'summary';
 return 'projects';
}
export function resumeSkills(facts){
 const map=new Map();for(const c of facts){const name=c.skill?.trim();if(!name||['未知','无','未提供','不适用'].includes(name)||resumeFactSection(c)==='summary')continue;map.set(name,{name,claimIds:[...(map.get(name)?.claimIds||[]),c.id]});}return [...map.values()];
}
export const confirmedResumeProfile=s=>s.resumeProfile?.status==='已确认'?s.resumeProfile:null;
export function saveResumeProfile(s,d){
 const prior=s.resumeProfile;if(prior&&prior.version!==d.version)throw Error('联系方式版本已变化，请重新打开。');
 if(!d.confirmed)throw Error('请本人核对联系资料后再确认。');
 const fields=Object.fromEntries(['name','email','phone','city','portfolio'].map(key=>[key,(d[key]||'').trim()]));
 if(!Object.values(fields).some(Boolean))throw Error('至少填写一项联系资料；未知字段可以留空。');
 if(fields.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))throw Error('请检查邮箱格式，或留空。');
 if(fields.portfolio&&!/^https?:\/\/[^\s]+$/i.test(fields.portfolio))throw Error('作品链接请使用完整的 http 或 https 地址，或留空。');
 const record={...fields,status:'已确认',version:(prior?.version||0)+1,withdrawnThrough:prior?.withdrawnThrough||0,history:prior?[...(prior.history||[]),{...prior,history:undefined}]:[],date:new Date().toISOString()};
 return {...s,resumeProfile:record,profileVersion:s.profileVersion+1};
}
export function withdrawResumeProfile(s){const p=s.resumeProfile;if(!p)return s;return {...s,resumeProfile:{...p,status:'已撤回',withdrawnThrough:p.version,version:p.version+1},profileVersion:s.profileVersion+1};}
export const profileSnapshotUnavailable=(s,p)=>!!p&&(!confirmedResumeProfile(s)||p.version<=(s.resumeProfile.withdrawnThrough||0));
