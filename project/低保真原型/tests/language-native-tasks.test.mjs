import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import {registeredProject,growthProject} from '../src/practice-registry.js';
import {makeTask,fresh,learning,careers} from '../src/model.js';
import {matchesTaskTitle,taskCopy} from '../src/native-task-copy.js';
import {protectUserContent,setLanguage} from '../src/i18n/render.js';
import {getSkillTree} from '../server/skill-trees/index.mjs';
import skillTreeCopy from '../src/i18n/skill-tree-ui.json' with {type:'json'};
import fs from 'node:fs';

test('published native task copy stays aligned with bilingual projects and skills', () => {
  execFileSync(process.execPath,['scripts/build-native-task-copy.mjs','--check']);
});

test('v2 project fields follow the language switch on an existing saved record', () => {
  for (const {id} of learning) {
    const path = new URL('../course-packs/practice-20261113/' + id + '/project.json',import.meta.url);
    const p=growthProject(id)?registeredProject(id):null;
    const {version,title,brief,outcome} = p?{...p,outcome:{zh:p.outputs.zh.join('、'),en:p.outputs.en.join(', ')}}:JSON.parse(fs.readFileSync(path,'utf8'));
    const task = makeTask(fresh(),{
      template:id,courseVersion:version,title:title.zh,purpose:brief.zh,product:outcome.zh,hours:2
    });
    const original = structuredClone(task);
    protectUserContent({tasks:[task]});
    try {
      for (const language of ['en','zh']) {
        setLanguage(language);
        assert.deepEqual(['title','purpose','standard'].map(field=>taskCopy(task,field)),
          [title[language],brief[language],outcome[language]]);
      }
      assert.ok(matchesTaskTitle(task,title.en.toUpperCase()));
      assert.ok(matchesTaskTitle(task,title.zh));
      assert.deepEqual(task,original);
    } finally {
      setLanguage('zh');
      protectUserContent();
    }
  }
});

test('legacy defaults, edited fields and personal records remain distinct', () => {
  const [unit] = learning;
  const original = {template:unit.id,title:unit.title,purpose:unit.product,standard:unit.product};
  assert.equal(taskCopy(original,'title','en'),'Data quality mini-project');
  const edited = {...original, title:'我修改过的行动标题'};
  assert.equal(taskCopy(edited,'title','en'),edited.title);
  assert.notEqual(taskCopy(edited,'purpose','en'),edited.purpose);
  assert.ok(!matchesTaskTitle(edited,unit.title));
  const external = {...original,template:'external',source:'/plan'};
  assert.equal(taskCopy(external,'title','en'),unit.title);
  assert.equal(taskCopy(external,'purpose','en'),unit.product);
});

test('existing skill practice records can switch from either stored language', () => {
  for (const {id:career} of careers) {
    const branch = getSkillTree(career).branches[0];
    const leaf = branch.leaves[0];
    const source = '/career-map?' + new URLSearchParams({career,branch:branch.id,skill:leaf.id,step:'practice'});
    const task = {template:'external',career,source,title:leaf.title[1],purpose:leaf.exercise[1],standard:skillTreeCopy.en.planOutput};
    assert.equal(taskCopy(task,'title','zh'),leaf.title[0]);
    assert.equal(taskCopy(task,'purpose','zh'),leaf.exercise[0]);
    assert.equal(taskCopy(task,'standard','zh'),skillTreeCopy.zh.planOutput);
    assert.equal(taskCopy({...task,source:'/plan'},'title','zh'),leaf.title[1]);
  }
});
