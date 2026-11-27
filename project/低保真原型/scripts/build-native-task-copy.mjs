import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {growthProject,registeredProject} from '../src/practice-registry.js';
import {careers,learning} from '../src/model.js';
import {getEnglishTranslations} from '../src/i18n/render.js';
import {getSkillTree} from '../server/skill-trees/index.mjs';

const output = new URL('../src/i18n/native-task-copy.json', import.meta.url);
const english = getEnglishTranslations();
const pair = value => {
  assert.ok(english[value], value);
  return {zh:value,en:english[value]};
};

const projects = {};
for (const unit of learning) {
  if(growthProject(unit.id)){const p=registeredProject(unit.id);projects[unit.id]={[p.version]:{title:p.title,purpose:p.brief,standard:{zh:p.outputs.zh.join('、'),en:p.outputs.en.join(', ')}}};continue;}
  const pack = new URL('../course-packs/practice-20261113/' + unit.id + '/project.json', import.meta.url);
  const {title,brief,outcome,version} = JSON.parse(await fs.readFile(pack,'utf8'));
  projects[unit.id] = {
    1:{title:pair(unit.title),purpose:pair(unit.product),standard:pair(unit.product)},
    [version]:{title,purpose:brief,standard:outcome}
  };
}
const skills = Object.fromEntries(careers.map(({id}) => [id,Object.fromEntries(
  getSkillTree(id).branches.flatMap(branch => branch.leaves.map(leaf => [leaf.id,{
    version:leaf.version,
    title:{zh:leaf.title[0],en:leaf.title[1]},
    purpose:{zh:leaf.exercise[0],en:leaf.exercise[1]}
  }]))
)]));
const json = JSON.stringify({projects,skills},null,2) + '\n';
if (process.argv.includes('--check')) {
  const existing = (await fs.readFile(output,'utf8')).replace(/\r\n/g,'\n');
  assert.equal(existing,json,'Run node scripts/build-native-task-copy.mjs to update native task translations.');
} else {
  await fs.writeFile(output,json);
}
