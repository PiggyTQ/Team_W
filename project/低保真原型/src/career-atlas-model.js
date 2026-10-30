import {mapSkills} from './map-data.js';
import {careers,learning} from './model.js';
import {branchFor,branchesFor} from './atlas-branches.js';
import {roadmapFor,roadmapPhase} from './career-roadmaps.js';
export {branchFor,branchesFor};

export const workPhases=[
 {id:'understand',title:'理解问题',question:'这份数据，能回答什么？',description:'先看清问题、表格口径和未知条件。',nodes:['foundation']},
 {id:'choose',title:'选择工具',question:'同一个问题，可以怎么做？',description:'SQL 或表格工具任选一条，保留处理思路。',nodes:['sql','sheet']},
 {id:'deliver',title:'留下成果',question:'做过的判断，如何留下依据？',description:'问题清单、处理理由与限制说明，共同构成本例的交付。',nodes:['quality','limits']}
];
export function phaseForNode(id){return Math.max(0,workPhases.findIndex(p=>p.nodes.includes(id)));}
export function supportsForMaterial(material){
 if(!material||material.status!=='已确认')return [];
 return mapSkills.filter(node=>node.skill===material.skill).map(node=>node.id);
}
export function atlasRelation(career,kind){
 if(kind==='细分方向')return {available:true,type:'branches'};
 if(kind==='责任进阶')return {available:career==='data',type:'responsibility'};
 return {available:['data','ai'].includes(career),type:'bridge',neighbor:career==='data'?'ai':career==='ai'?'data':null};
}
export const demoAtlasMaterial={id:'atlas-demo-sql',title:'SQL 查询说明（合成示例）',skill:'SQL',status:'已确认',version:1,text:'用合成数据记录查询思路与问题清单。',contribution:'示例：编写查询与解释处理理由',origin:'原创合成示例'};

export function atlasView(params,goal){
 const career=careers.some(c=>c.id===params.get('career'))?params.get('career'):careers.some(c=>c.id===goal)?goal:'data';
 const skills=params.get('tab')!=='职业关系';
 const kind=['学习桥接','细分方向','责任进阶'].includes(params.get('relation'))?params.get('relation'):'学习桥接';
 const range=['基础','工具','产物'].includes(params.get('range'))?params.get('range'):'全部阶段';
 const tool=['sql','sheet'].includes(params.get('tool'))?params.get('tool'):params.get('node')==='skill:sheet'?'sheet':'sql';
 const roadmap=roadmapFor(career),visible=(roadmap?.nodes||mapSkills).filter(n=>range==='全部阶段'||range===n.stage),relation=atlasRelation(career,kind);
 let selected=params.get('node'),node=null,branch=null;
 if(skills&&career==='data'){
  if(!['dependency:or','dependency:and','dependency:base'].includes(selected)){
   node=visible.find(n=>'skill:'+n.id===selected)||visible[0];
   if(['sql','sheet'].includes(node.id)&&['sql','sheet'].includes(params.get('tool')))node=visible.find(n=>n.id===tool)||node;
   selected='skill:'+node.id;
  }
 }else if(skills){node=visible.find(n=>'skill:'+n.id===selected)||visible[0];selected='skill:'+node.id;}
 else if(relation.type==='branches'){
  branch=branchFor(career,selected?.replace(/^branch:/,''))||branchesFor(career)[0];selected='branch:'+branch.id;
 }else {if(!['career','relation',...(relation.neighbor?['neighbor']:[])].includes(selected))selected='relation';}
 return {career,skills,kind,range,tool,visible,selected,node,branch,relation,roadmap,phase:roadmap&&skills?roadmapPhase(node):selected==='dependency:or'?1:selected==='dependency:and'?2:phaseForNode(node?.id)};
}

export function atlasAction(view,source){
 const {career,skills,tool,selected,node,branch,relation,kind}=view,current=careers.find(c=>c.id===career);
 let title,question,product,steps,template='external',skill=current.skill,key;
 if(skills&&career==='data'){
  const n=node||mapSkills.find(x=>x.id===(selected==='dependency:and'?'quality':selected==='dependency:or'?tool:'foundation'));
  const toolName=tool==='sheet'?'表格工具':'SQL';
  title=n.title+'短验证';question=`用${toolName}处理合成数据，${n.purpose}`;
  product=`${n.standard}；问题清单、处理理由、描述统计与限制说明（共同交付）`;
  steps=['说明问题、表格口径与未知条件。',`使用${toolName}记录处理步骤，保留原值与理由。`,'逐项核对问题清单、处理理由、描述统计和限制，说明本人贡献。'];
  template='quality';skill=toolName;key=`work:${career}:${n.id}:${tool}`;
 }else if(skills){
  title=node.title+'小实践';question=node.purpose;product=node.standard+'、本人贡献与未验证项';
  steps=[...node.steps];key=`work:${career}:${node.id}`;
 }else if(branch){
  title=branch.title+'小实践';question=branch.question;product=branch.product;steps=branch.steps;template=branch.template;key=`branch:${career}:${branch.id}`;
 }else if(relation.type==='bridge'&&relation.available){
  title='数据分析与人工智能对照实践';question='同一个合成问题，数据分析与 AI 评估需要哪些不同依据？';
  product='同题两种处理方法、业务口径、输入输出与评估规则、差异与限制';
  steps=['为一个合成问题分别写出数据分析与 AI 评估方案。','对照业务口径、输入输出记录和评估规则。','说明共同基础、两侧需补与未知，不推断个人转岗能力。'];
  key='bridge:ai:data';skill='未知';
 }else if(relation.type==='responsibility'&&relation.available){
  title=selected==='career'?'按步骤记录实践':'说明取舍与限制实践';
  question=selected==='career'?'一次数据处理，可以怎样保留可回看的步骤？':'同一问题的两种处理选择，为什么采用其中一种？';
  product='处理步骤、方案对照、取舍理由、本人贡献与限制';
  steps=['用合成数据记录一次处理过程。','对照两种方法的代价、条件和限制。','区分实际完成与未知范围，不推断职级。'];
  key=`responsibility:${career}:${selected}`;
 }else return null;
 if(template==='external')skill='未知';
 const usesTool=atlasUsesTool(view);
 if(usesTool){
  const name=tool==='sheet'?'表格工具':'SQL';
  if(branch){question=`使用${name}：${question}`;steps=[steps[0],`使用${name}检查同一份合成数据，保留原值与处理理由。`,steps[2]];}
  skill=name;key=`practice:data-quality:${tool}`;
 }
 return {title,template,career,purpose:question,product,steps,hours:1,kind:'原创模拟实践',source,
  atlas:{key,version:1,career,node:selected,tool:usesTool?tool:null,...(usesTool?{caseId:'data-quality-v1'}:{}),branch:branch?.id||null,relation:skills?null:kind,skill,title,steps:[...steps]}};
}

export const atlasUsesTool=view=>view.career==='data'&&(view.skills||view.branch?.id==='quality');
export function atlasToolPatch(view,tool){
 return {tool,...(['skill:sql','skill:sheet'].includes(view.selected)?{node:'skill:'+tool}:{})};
}
export function atlasPracticeKey(atlas){
 if(!atlas)return null;
 const roadmap=roadmapFor(atlas.career);
 if(roadmap&&atlas.key===`career:${atlas.career}`)return `work:${atlas.career}:${roadmap.nodes[0].id}`;
 if(atlas.caseId==='data-quality-v1'||/^work:data:/.test(atlas.key)||/^branch:data:quality$/.test(atlas.key)){
  const tool=atlas.tool==='sheet'||/:sheet$/.test(atlas.key)?'sheet':'sql';return `practice:data-quality:${tool}`;
 }
 return atlas.key;
}

export function atlasSavedDraft(s,action){
 const key=atlasPracticeKey(action?.atlas);if(!key)return null;
 const candidates=[s.taskDraft,s.atlasDrafts?.[key]];
 return candidates.find(d=>atlasPracticeKey(d?.atlas)===key&&d.atlas.version===action.atlas.version)||null;
}
export function storeTaskDraft(s,draft){
 const drafts={...s.atlasDrafts};
 for(const d of [s.taskDraft,draft]){const key=atlasPracticeKey(d?.atlas);if(key)drafts[key]=d;}
 return {...s,taskDraft:draft,atlasDrafts:drafts};
}

export function atlasTasks(tasks,action){
 if(!action)return [];
 return tasks.filter(t=>!['取消','跳过','延期'].includes(t.status)&&
  (t.atlas?atlasPracticeKey(t.atlas)===atlasPracticeKey(action.atlas):atlasPracticeKey(legacyAtlasAction(t)?.atlas)===atlasPracticeKey(action.atlas)||t.source===action.source&&t.template===action.template&&t.purpose===action.purpose))
  .sort((a,b)=>Number(a.completed)-Number(b.completed));
}

export function atlasReturn(task){
 if(typeof task?.source!=='string')return null;
 try{const route=new URL(task.source,'http://local');return route.origin==='http://local'&&route.pathname==='/career-map'?route.pathname+route.search:null;}catch{return null;}
}

function legacyAtlasAction(task){
 const source=atlasReturn(task);if(!source)return null;
 const view=atlasView(new URL(source,'http://local').searchParams,task.career);
 const action=atlasAction(view,source);return action?.template===task.template?action:null;
}

export function atlasTaskSkill(task){
 if(task.atlas)return task.atlas.skill;
 const source=atlasReturn(task);if(!source)return null;
 const params=new URL(source,'http://local').searchParams;
 // Only an explicit tool selection can prefill a skill for an old map task.
 if(params.get('node')==='skill:sheet'||params.get('tool')==='sheet')return '表格工具';
 if(params.get('node')==='skill:sql'||params.get('tool')==='sql')return 'SQL';
 return '未知';
}

export function atlasReading(action,reading){
 if(!action||action.template==='external')return null;
 const item=learning.find(l=>l.id===action.template);if(!item)return null;
 const chapter=Math.max(0,Math.min(item.chapters.length-1,Number(reading[item.id]?.chapter)||0));
 return {template:item.id,chapter,atlasDraft:action};
}
