import {readSkillWork} from './skill-learning-model.js';
import {careers} from './model.js';
import {chooseSkillLeaf,skillStudyKey,skillTreeRoute,skillRecord} from './skill-tree-model.js';

const known=id=>careers.some(item=>item.id===id);
const modes=new Set(['overview','study']);
export function normalizeJourney(value) {
  const result={career:known(value?.career)?value.career:null,goalSeen:known(value?.goalSeen)?value.goalSeen:null,views:{}};
  for(const item of careers){
    const entry=value?.views?.[item.id];
    if(!entry||!modes.has(entry.mode))continue;
    result.views[item.id]={mode:entry.mode,branch:typeof entry.branch==='string'?entry.branch:'',
      skill:typeof entry.skill==='string'?entry.skill:'',step:['practice','check'].includes(entry.step)?entry.step:'learn',camera:entry.camera==='whole'?'whole':'branch'};
  }
  return result;
}
export function journeyCareer(params,state,memory) {
  if(params.get('view')==='choose')return null;
  const explicit=params.get('career');
  if(known(explicit))return explicit;
  if(known(state.goal)&&state.goal!==memory.goalSeen)return state.goal;
  const started=Object.entries(state.skillStudy||{}).filter(([key,row])=>known(key.split(':')[0])&&(row.read||row.draft?.trim()||row.assessment));
  started.sort((a,b)=>(b[1].assessment?.checkedAt||'').localeCompare(a[1].assessment?.checkedAt||''));
  return [memory.career,state.goal,state.assessmentCareer,started[0]?.[0].split(':')[0]].find(known)||null;
}
export function journeyMode(params,saved) {
  if(params.get('view')==='overview')return 'overview';
  if(params.get('view')==='study'||['skill','branch','node','tool'].some(key=>params.has(key)))return 'study';
  return saved?.mode==='study'?'study':'overview';
}
export function journeyRoute(career,{mode='overview',...options}={}) {
  const route=skillTreeRoute(career,options),url=new URL(route,'http://localhost');
  url.searchParams.set('view',mode);
  return url.pathname+url.search;
}
export function journeySelection(tree,params,study,saved,mode) {
  const effective=new URLSearchParams(params);
  if(mode==='study'&&!['skill','branch','node','tool'].some(key=>params.has(key))){
    const last=saved?.skill?saved:suggestedSkill(tree,study);
    effective.set('skill',last.skill||last.leaf.id);effective.set('branch',last.branch?.id||last.branch);effective.set('step',last.step);
  }
  return chooseSkillLeaf(tree,effective,study);
}
export function suggestedSkill(tree,study,saved) {
  const leaves=tree.branches.flatMap(branch=>branch.leaves);
  const remembered=leaves.find(leaf=>leaf.id===saved?.skill&&!skillRecord(study,tree.id,leaf)?.assessment?.passedAt);
  const started=leaves.filter(leaf=>{const row=skillRecord(study,tree.id,leaf);return !row?.assessment?.passedAt&&(row?.read||row?.draft?.trim()||row?.assessment);});
  started.sort((a,b)=>(skillRecord(study,tree.id,b)?.assessment?.checkedAt||'').localeCompare(skillRecord(study,tree.id,a)?.assessment?.checkedAt||''));
  const leaf=remembered||started[0]||leaves.find(leaf=>!skillRecord(study,tree.id,leaf)?.assessment?.passedAt)||leaves[0];
  const record=skillRecord(study,tree.id,leaf);
  return {leaf,branch:tree.branches.find(branch=>branch.leaves.includes(leaf)),
    step:remembered?saved.step:record?.assessment&&!record.assessment.passedAt?'check':record?.read||readSkillWork(record?.draft).artifact.trim()?'practice':'learn',
    resume:!!remembered||!!skillRecord(study,tree.id,leaf)};
}
