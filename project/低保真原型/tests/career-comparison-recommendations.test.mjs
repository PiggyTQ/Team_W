import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveComparisonSelection,suggestComparisonPair} from '../src/career-comparison-recommendations.js';
import {careerContentIds,careerContent,comparisonDimensions,comparisonScan} from '../src/career-exploration-model.js';
import {careerComparison} from '../src/career-comparison.js';

test('work-related suggestions cover every career without personal-fit scores or private inputs',()=>{
 for(const goal of careerContentIds){const x=suggestComparisonPair({goal});assert.equal(x.ids[0],goal);assert.equal(x.ids.length,2);assert.notEqual(x.ids[0],x.ids[1]);assert.ok(x.ids.every(id=>careerContentIds.includes(id)));assert.equal(x.personalFit,false);assert.equal(x.method,'site_work_relationship');assert.ok(x.reason.zh&&x.reason.en);}
 assert.deepEqual(suggestComparisonPair({}).ids,['data','engineering']);
 assert.deepEqual(suggestComparisonPair({goal:'ops',currentCareer:'frontend'}).ids,['frontend','backend']);
 assert.deepEqual(suggestComparisonPair({selected:['testing'],goal:'ops',currentCareer:'frontend'}).ids,['testing','software']);
});

test('explicit URLs and saved choices take priority; absent, invalid and partial selections recover predictably',()=>{
 const selected=['ops','delivery','testing'];
 assert.deepEqual(resolveComparisonSelection({selected,goal:'data'}).ids,selected);
 assert.deepEqual(resolveComparisonSelection({set:'frontend,backend',selected,goal:'data'}).ids,['frontend','backend']);
 assert.deepEqual(resolveComparisonSelection({set:'',selected,goal:'data'}).ids,[]);
 assert.deepEqual(resolveComparisonSelection({set:'data',selected,goal:'ops'}).ids,['data']);
 assert.deepEqual(resolveComparisonSelection({selected:['frontend'],goal:'ops'}).ids,['frontend','backend']);
 for(const set of ['bad','data,data','data,ai,ops,testing']){const x=resolveComparisonSelection({set,selected});assert.equal(x.invalidSet,true);assert.deepEqual(x.ids,selected);}
 const state={selected:['invalid'],goal:'unknown'};const before=JSON.stringify(state);assert.deepEqual(resolveComparisonSelection(state).ids,['data','engineering']);assert.equal(JSON.stringify(state),before);
});

test('comparison highlights and dimension details keep the existing public career basis unchanged',()=>{
 for(const id of careerContentIds){const role=careerContent(id),projection=careerComparison(id);for(const [key]of comparisonDimensions)assert.deepEqual(comparisonScan(role,key),comparisonScan(projection,key));for(const key of ['problem','outputs','preparation'])assert.ok(role.compare[key].length>12);}
});
