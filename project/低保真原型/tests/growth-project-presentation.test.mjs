import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inputMaterialGroups,deliverableGuide,projectCheckGuide} from '../src/growth-project-presentation.js';
import {validatePracticeArtifact} from '../shared/practice-artifact.js';

test('input previews describe real records and parameters without changing the frozen inputs',()=>{
  const input={orders:Array.from({length:8},(_,i)=>({id:`A${i}`,cents:i*100})),rule:{threshold:0.1,for:3},version:2};
  const before=JSON.stringify(input),groups=inputMaterialGroups(input);
  assert.equal(groups[0].count,8);
  assert.equal(groups[0].shown,4);
  assert.deepEqual(groups[0].columns,['id','cents']);
  assert.equal(groups[0].rows[0][0],'A0');
  assert.equal(groups[1].kind,'fields');
  assert.deepEqual(groups[1].rows,[['threshold','0.1'],['for','3']]);
  assert.equal(groups[2].kind,'value');
  assert.equal(groups[2].value,'2');
  assert.equal(JSON.stringify(input),before);
  assert.deepEqual(inputMaterialGroups(null),[]);
  assert.equal(inputMaterialGroups({requests:[]},'en')[0].count,0);
});

test('complex and primitive inputs remain bounded and expose when a preview is incomplete',()=>{
  const columns=Object.fromEntries(Array.from({length:9},(_,i)=>['field'+i,i]));
  const group=inputMaterialGroups({records:[columns]})[0];
  assert.equal(group.columns.length,6);
  assert.equal(group.hiddenColumns,3);
  const primitives=inputMaterialGroups({values:[null,false,0,'']})[0];
  assert.deepEqual(primitives.rows,[['null'],['false'],['0'],['']]);
});

test('check explanations point to the correct deliverable and preserve execution boundaries',()=>{
  assert.equal(projectCheckGuide({id:'result-content'}).filename,'result.json');
  assert.equal(projectCheckGuide({id:'consumer:stage-2.json'},'en').filename,'stage-2.json');
  assert.equal(projectCheckGuide({id:'permission-configuration'}).filename,'config.json');
  assert.equal(projectCheckGuide({id:'bundle-format'}).filename,null);
  assert.match(deliverableGuide('solution.mjs','en').description,/does not execute/);
  assert.match(projectCheckGuide({id:'format:index.html'},'en').description,/Only HTML structure/);
  assert.match(deliverableGuide('stage-3.json','en').description,/not only the handoff/);
});

test('preview distinguishes missing fields from explicit null, false and zero',()=>{
  const input={actions:[{id:'missing'},{id:'null',edited:null},{id:'false',edited:false},{id:'zero',edited:0}]};
  const group=inputMaterialGroups(input,'en')[0];
  assert.deepEqual(group.columns,['id','edited']);
  assert.deepEqual(group.rows.map(row=>row[1]),['Not supplied','null','false','0']);
});

test('every current project can describe its required files and actual check results in both languages',async()=>{
  const root=new URL('../course-packs/growth/',import.meta.url);
  const catalog=JSON.parse(await readFile(new URL('catalog.json',root),'utf8'));
  for(const project of catalog.projects.filter(row=>!row.legacy)){
    const prefix=`${project.id}/${project.version}/`;
    const input=JSON.parse(await readFile(new URL(prefix+'input/fixture.json',root),'utf8'));
    const checks=validatePracticeArtifact(project,input,JSON.stringify({files:{'result.json':'{}'}}),()=>null);
    for(const language of ['zh','en']){
      for(const filename of project.requiredFiles){
        const guide=deliverableGuide(filename,language);
        assert.ok(guide.title&&guide.description,`${project.id}: ${filename}`);
      }
      for(const check of checks){
        const guide=projectCheckGuide(check,language);
        assert.ok(guide.title&&guide.description,`${project.id}: ${check.id}`);
        assert.ok(guide.filename===null||project.requiredFiles.includes(guide.filename),`${project.id}: ${guide.filename}`);
      }
      assert.ok(inputMaterialGroups(input,language).length>0,project.id);
    }
  }
});
