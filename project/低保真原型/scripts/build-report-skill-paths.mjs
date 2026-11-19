import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {careers} from '../src/model.js';
import {getSkillTree} from '../server/skill-trees/index.mjs';

const catalog=Object.fromEntries(careers.map(({id})=>{
  const tree=getSkillTree(id);
  return [id,{
    frameworks:tree.frameworks,
    branches:tree.branches.map(({id,title,purpose,leaves})=>({
      id,title,purpose,leaves:leaves.map(({id,version,title,lesson})=>({id,version,title,lesson}))
    }))
  }];
}));
const file=new URL('../src/i18n/report-skill-paths.json',import.meta.url);
const json=JSON.stringify(catalog,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal((await fs.readFile(file,'utf8')).replace(/\r\n/g,'\n'),json);
else await fs.writeFile(file,json);
