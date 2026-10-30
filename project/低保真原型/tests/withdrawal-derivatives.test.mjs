import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh} from '../src/model.js';
import {reportReferencesUnavailable} from '../src/alignment-model.js';
import {resumeUnavailable} from '../src/completion-model.js';
test('withdrawing and reconfirming a statement does not revive reports or resumes containing its old text',()=>{
  const s={...fresh(),claims:[{id:'c',status:'已确认',version:4,withdrawnThrough:2,text:'新范围'}]};
  const oldReport={claimIds:['c'],claimRefs:[{id:'c',version:2}]},oldResume={claimIds:['c'],facts:[{id:'c',version:2,text:'撤回的旧范围'}]};
  assert.equal(reportReferencesUnavailable(s,oldReport),true);assert.equal(resumeUnavailable(s,oldResume),true);
  assert.equal(resumeUnavailable(s,{claimIds:['c']}),true,'legacy snapshots with no recorded version cannot bypass withdrawal');
  assert.equal(reportReferencesUnavailable(s,{claimRefs:[{id:'c',version:4}]}),false);assert.equal(resumeUnavailable(s,{claimIds:['c'],facts:[{id:'c',version:4}]}),false);
});
test('a normal version edit retains historical snapshots; a withdrawn current statement blocks all derivatives',()=>{
  const s={...fresh(),claims:[{id:'c',status:'已确认',version:3}]},record={claimIds:['c'],claimRefs:[{id:'c',version:2}]};
  assert.equal(reportReferencesUnavailable(s,record),false);assert.equal(resumeUnavailable(s,record),false);
  s.claims[0].status='已撤回';assert.equal(reportReferencesUnavailable(s,record),true);assert.equal(resumeUnavailable(s,record),true);
});
