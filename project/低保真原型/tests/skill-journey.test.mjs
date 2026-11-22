import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeJourney,journeyCareer,journeyMode,journeySelection,suggestedSkill,journeyRoute} from '../src/skill-journey-model.js';
import {getSkillTree} from '../server/skill-trees/index.mjs';
import {skillStudyKey,skillProgress} from '../src/skill-tree-model.js';
const params=value=>new URLSearchParams(value);

test('first visit has no invented direction; explicit routes, changed goals and existing records are respected',()=>{
 const empty=normalizeJourney(null);
 assert.equal(journeyCareer(params(''),{},empty),null);
 assert.equal(journeyCareer(params(''),{goal:'ai'},empty),'ai');
 const remembered=normalizeJourney({career:'data',goalSeen:'ai',views:{data:{mode:'study',skill:'sql-joins',branch:'metrics',step:'practice'}}});
 assert.equal(journeyCareer(params(''),{goal:'ai'},remembered),'data');
 assert.equal(journeyCareer(params(''),{goal:'frontend'},remembered),'frontend');
 assert.equal(journeyCareer(params('career=ops'),{goal:'ai'},remembered),'ops');
 assert.equal(journeyCareer(params('view=choose'),{goal:'ai'},remembered),null);
 assert.equal(journeyCareer(params(''),{skillStudy:{'testing:boundary:v1':{draft:'Recorded a boundary case'}}},empty),'testing');
});
test('return restores the exact skill and step, while overview and old deep links remain explicit',()=>{
 const tree=getSkillTree('data'),saved={mode:'study',branch:'metrics',skill:'sql-joins',step:'practice'};
 assert.equal(journeyMode(params(''),saved),'study');
 assert.equal(journeyMode(params('view=overview'),saved),'overview');
 assert.equal(journeyMode(params('node=skill:foundation')),'study');
 const restored=journeySelection(tree,params(''),{},saved,'study');
 assert.equal(restored.leaf.id,'sql-joins');assert.equal(restored.step,'practice');
 assert.equal(journeySelection(tree,params('skill=aggregation&step=check'),{},saved,'study').leaf.id,'aggregation');
 assert.equal(journeySelection(tree,params('node=skill:foundation'),{},saved,'study').leaf.id,'metric-definition');
 const url=new URL(journeyRoute('data',{mode:'study',skill:'sql-joins',step:'check',from:'report'}),'http://localhost');
 assert.equal(url.searchParams.get('from'),'report');assert.equal(url.searchParams.get('view'),'study');assert.equal(url.searchParams.get('step'),'check');
});
test('resume recommendations use actual unfinished work; reading and drafts never count as passing',()=>{
 const tree=getSkillTree('data'),leaf=tree.branches[0].leaves[1],key=skillStudyKey(tree.id,leaf);
 const study={[key]:{read:true,draft:'Checked the join cardinality'}};
 const before=JSON.stringify(study),suggestion=suggestedSkill(tree,study);
 assert.equal(suggestion.leaf.id,'sql-joins');assert.equal(suggestion.step,'practice');assert.equal(suggestion.resume,true);
 assert.equal(skillProgress(tree.id,tree.branches[0].leaves,study).done,0);
 assert.equal(JSON.stringify(study),before);
 study[key].assessment={passedAt:'2026-11-19T12:00:00.000Z'};
 assert.notEqual(suggestedSkill(tree,study,{skill:leaf.id,mode:'overview'}).leaf.id,leaf.id);
});
test('cursor cache retains each career independently and discards unknown directions and invalid modes',()=>{
 const memory=normalizeJourney({career:'unknown',views:{data:{mode:'study',skill:'sql-joins',step:'practice',camera:'whole'},ai:{mode:'overview'},ops:{mode:'destroy'},unknown:{mode:'study'}}});
 assert.equal(memory.career,null);assert.equal(memory.views.data.skill,'sql-joins');assert.equal(memory.views.data.camera,'whole');
 assert.equal(memory.views.ai.mode,'overview');assert.equal(memory.views.ops,undefined);assert.equal(memory.views.unknown,undefined);
});
