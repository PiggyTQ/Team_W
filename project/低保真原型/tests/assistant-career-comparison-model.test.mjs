import test from 'node:test';
import assert from 'node:assert/strict';
import {careerComparison} from '../src/career-comparison.js';
import {discussionCareerProfile,hasDetailedComparison,comparisonMode,sameCasePracticeRoute} from '../src/assistant-career-comparison-model.js';

test('display uses the selected public snapshot, retains its version and never mutates it',()=>{
 const snapshot={...careerComparison('ai','career-detail-20261024'),daily:'LEGACY_PUBLIC_SNAPSHOT'};
 const items=[{ref:{kind:'career',id:'ai',part:'profile',stamp:'source-id'},publicContent:snapshot}];
 const before=structuredClone(items),view=discussionCareerProfile(items,'ai','en');
 assert.equal(view.daily,'LEGACY_PUBLIC_SNAPSHOT');assert.equal(view.provenance.version,'career-detail-20261024');
 assert.deepEqual(items,before);assert.notEqual(view,snapshot);
 assert.equal(hasDetailedComparison(view,'work'),false);
 assert.equal(hasDetailedComparison(view,'outputs'),false);
 assert.equal(hasDetailedComparison(view,'starting'),false);
});
test('private selected material cannot substitute for a missing public career profile',()=>{
 assert.equal(discussionCareerProfile([{ref:{kind:'claim',id:'ai'},selectedContent:{text:'PRIVATE'}}],'ai'),null);
 assert.equal(discussionCareerProfile([{ref:{kind:'career',id:'ai',part:'profile'},selectedContent:careerComparison('ai')}],'ai'),null);
 assert.equal(discussionCareerProfile([{ref:{kind:'career',id:'ai',part:'profile'},publicContent:careerComparison('security')}],'ai'),null);
 assert.equal(discussionCareerProfile([],'security'),null);
});
test('current public fields are localized without replacing the source or version',()=>{
 const original=careerComparison('ai'),items=[{ref:{kind:'career',id:'ai',part:'profile'},publicContent:original}];
 const view=discussionCareerProfile(items,'ai','en');
 assert.equal(view.id,'ai');assert.equal(view.provenance.version,original.provenance.version);
 assert.notEqual(view.case.question,original.case.question);
 assert.ok(['work','outputs','starting'].every(mode=>hasDetailedComparison(view,mode)));
 assert.equal(original.practice.steps.length,view.practice.steps.length);
});
test('focus stays compatible with stored task values and practice returns to the same case',()=>{
 for(const mode of ['work','outputs','starting'])assert.equal(comparisonMode(mode),mode);
 assert.equal(comparisonMode(undefined),'work');assert.equal(comparisonMode('old-invalid'),'work');
 assert.equal(sameCasePracticeRoute('ai'),'/careers?career=ai&section=practice');
 assert.notEqual(sameCasePracticeRoute('ai'),careerComparison('ai').practice.route);
});
