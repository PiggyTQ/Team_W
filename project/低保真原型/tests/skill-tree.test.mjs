import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {careers, fresh, makeTask} from '../src/model.js';
import {normalizePrototypeState} from '../src/storage-recovery-model.js';
import {chooseSkillLeaf, legacySkillLink, skillProgress, skillStudyKey} from '../src/skill-tree-model.js';
import {atlasPracticeKey, atlasReturn, atlasSavedDraft, atlasTasks, storeTaskDraft} from '../src/atlas-history.js';
import {createBusinessStore} from '../server/business-store.mjs';
import {createBusinessCommands} from '../server/business-commands.mjs';
import {getSkillTree, gradeSkillCheck} from '../server/skill-trees/index.mjs';

function answersFor(career, leaf, pass = true) {
  return Object.fromEntries(leaf.questions.map(question => [
    question.id,
    question.options.find(option => {
      const trial = Object.fromEntries(leaf.questions.map(row => [row.id, row.options[0].id]));
      trial[question.id] = option.id;
      return gradeSkillCheck(career,leaf.id,leaf.version,trial).questions.find(row => row.id===question.id).correct === pass;
    }).id
  ]));
}

test('all career trees have four distinct source-backed branches and 123 independently gradable leaves', () => {
  const titles = new Set(), urls = new Set(), prompts = new Set();
  for (const career of careers) {
    const tree = getSkillTree(career.id);
    assert.equal(tree.id, career.id);
    assert.equal(tree.branches.length, 4);
    assert.ok(tree.frameworks.length >= 2);
    for (const branch of tree.branches) {
      assert.ok(branch.leaves.length === 3 || branch.leaves.length === 4);
      for (const leaf of branch.leaves) {
        assert.ok(leaf.sources.length && leaf.lesson[1] && leaf.exercise[1]);
        titles.add(career.id + ':' + leaf.title[0]);
        leaf.sources.forEach(source => urls.add(source.url));
        leaf.questions.forEach(question => prompts.add(question.prompt[0]));
        assert.doesNotMatch(JSON.stringify(leaf), /"checks"|"explanation"|"correct"|"original"/);
        assert.equal(gradeSkillCheck(career.id,leaf.id,leaf.version,answersFor(career.id,leaf)).passed, true);
        assert.equal(gradeSkillCheck(career.id,leaf.id,leaf.version,answersFor(career.id,leaf,false)).correct, 0);
      }
    }
  }
  assert.equal(titles.size, 123);
  assert.equal(prompts.size, 246);
  assert.ok(urls.size >= 40);
  assert.equal(getSkillTree('missing'),undefined);
  assert.equal(getSkillTree('testing').assessment.publisher,'ISTQB');
});

test('legacy nodes and saved tasks open the related new branch without changing an older record', () => {
  const data = getSkillTree('data');
  assert.equal(chooseSkillLeaf(data, new URLSearchParams('node=skill:sql'), {}).leaf.id,'sql-joins');
  assert.equal(chooseSkillLeaf(data, new URLSearchParams('node=branch:quality'), {}).branch.id,'quality');
  assert.equal(chooseSkillLeaf(data, new URLSearchParams('node=skill:sheet'), {}).leaf.id,'pivot-tables');
  assert.equal(chooseSkillLeaf(data, new URLSearchParams('tool=sheet'), {}).leaf.id,'pivot-tables');
  assert.match(legacySkillLink('ai','Python'),/skill=python-data/);
  assert.match(legacySkillLink('backend','Java'),/skill=service-structure/);
  const security = getSkillTree('security');
  assert.equal(chooseSkillLeaf(security,new URLSearchParams('branch=operations'),{}).branch.id,'detection');
  assert.equal(chooseSkillLeaf(security,new URLSearchParams('node=skill:logs'),{}).leaf.id,'event-logs');
  const source = '/career-map?career=data&node=skill:sheet';
  const draft = {title:'Previous practice',purpose:'Compare figures',hours:1,template:'quality',source,
    atlas:{key:'work:data:sheet:sheet',career:'data',tool:'sheet',version:1,steps:['Compare rows']}};
  const state = storeTaskDraft(fresh(),draft);
  assert.equal(atlasPracticeKey(draft.atlas),'practice:data-quality:sheet');
  assert.deepEqual(atlasSavedDraft(state,draft),draft);
  const historical = {id:'old',source,template:'quality',status:'进行中',career:'data'};
  assert.deepEqual(atlasTasks([historical],draft),[historical]);
  assert.equal(atlasReturn(historical),source);
  assert.equal(atlasReturn({source:'//other.example/career-map'}),null);
  const task = makeTask(state,draft);
  assert.equal(task.mode,'S2');
  assert.deepEqual(task.atlas,draft.atlas);
  assert.deepEqual(normalizePrototypeState({...state,mapNodeStatus:{'data:sheet':'已学习'}}).taskDraft,draft);
  assert.deepEqual(skillProgress('data',data.branches[0].leaves,undefined),{done:0,total:3,percent:0});
});

test('only server-graded checks award versioned progress; retry, conflicts, private drafts and clearing behave correctly', t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES ('a'),('b');");
  let time = Date.UTC(2026,10,13);
  const now = () => time;
  const business = createBusinessStore(db,{now});
  const commands = createBusinessCommands({db,business,now});
  const get = (user = 'a') => business.read(user);
  const save = (state,user = 'a') => business.save(user,{state,baseVersion:get(user).revision,mutationId:randomUUID()});
  const leaf = getSkillTree('data').branches[0].leaves[0];
  const branch = getSkillTree('data').branches[0];
  const key = skillStudyKey('data',leaf);
  const input = (fields = {}) => ({type:'skill.check',baseVersion:get().revision,mutationId:randomUUID(),payload:{
    career:'data',skill:leaf.id,version:leaf.version,answers:answersFor('data',leaf),...fields
  }});
  const original = get().state;
  save({...original,skillStudy:{[key]:{read:true,draft:'Private trial notes'}},mapNodeStatus:{'data:foundation':'已学习'}});
  assert.equal(skillProgress('data',branch.leaves,get().state.skillStudy).percent,0);
  assert.throws(() => commands.execute('a',input({version:2})),{code:'SKILL_CHECK_VERSION',status:409});
  assert.throws(() => commands.execute('a',input({answers:{q1:'choice-1',q3:'choice-2'}})),{code:'SKILL_CHECK_INVALID'});
  assert.throws(() => commands.execute('a',input({career:'not-a-career'})),{code:'NOT_FOUND'});

  const failed = commands.execute('a',input({answers:answersFor('data',leaf,false)}));
  assert.equal(failed.refs.grade.passed,false);
  assert.equal(get().state.skillStudy[key].assessment.passedAt,null);
  assert.throws(() => save({...get().state,skillStudy:{[key]:{assessment:{...failed.refs.assessment,passedAt:new Date(now()).toISOString()}}}}),
    {code:'SERVER_RECORD_PROTECTED'});
  time += 1000;
  const good = input();
  const receipt = commands.execute('a',good);
  assert.equal(receipt.refs.grade.passed,true);
  assert.equal(receipt.refs.assessment.attempts,2);
  assert.equal(skillProgress('data',branch.leaves,get().state.skillStudy).percent,33);
  assert.equal(commands.execute('a',good).duplicate,true);
  assert.throws(() => commands.execute('b',{...good,baseVersion:99}),{code:'VERSION_CONFLICT'});
  assert.throws(() => commands.get('b',receipt.id),{code:'NOT_FOUND'});
  assert.equal(get('b').state.skillStudy,undefined);
  assert.throws(() => save({...get('b').state,skillStudy:{[key]:get().state.skillStudy[key]}},'b'),{code:'SERVER_RECORD_PROTECTED'});
  assert.doesNotMatch(JSON.stringify(receipt),/Private trial notes/);
  assert.equal(get().state.skillStudy[key].draft,'Private trial notes');

  time += 1000;
  const repeat = commands.execute('a',input({answers:answersFor('data',leaf,false)}));
  assert.equal(repeat.refs.assessment.attempts,3);
  assert.equal(repeat.refs.assessment.passedAt,receipt.refs.assessment.passedAt);
  assert.equal(skillProgress('data',branch.leaves,get().state.skillStudy).percent,33);
  assert.throws(() => save({...get().state,skillStudy:{}}),{code:'SERVER_RECORD_PROTECTED'});
  assert.throws(() => save({...get().state,skillStudy:{[key]:{draft:'A'.repeat(1801)}}}),{code:'INVALID_WORKSPACE'});
  assert.equal(business.clear('a',get().revision).state.skillStudy,undefined);
});

