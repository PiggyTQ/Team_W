import test from 'node:test';
import assert from 'node:assert/strict';
import {atlasView,atlasAction,atlasToolPatch,atlasTasks,atlasSavedDraft,storeTaskDraft} from '../src/career-atlas-model.js';
import {atlasCSV,atlasCase} from '../src/atlas-tool-content.js';
import {fresh,makeTask} from '../src/model.js';
import {purgePrivateMaterials} from '../src/alignment-model.js';
const view=q=>atlasView(new URLSearchParams(q),'data');
const action=q=>atlasAction(view(q),'/career-map?'+q);
test('switching tools preserves the foundation or delivery focus; a conflicting explicit URL resolves consistently',()=>{
 for(const id of ['foundation','quality','limits'])assert.deepEqual(atlasToolPatch(view('node=skill:'+id),'sheet'),{tool:'sheet'});
 assert.deepEqual(atlasToolPatch(view('node=skill:sql'),'sheet'),{tool:'sheet',node:'skill:sheet'});
 const v=view('node=skill:sheet&tool=sql');assert.equal(v.node.id,'sql');assert.equal(v.tool,'sql');
});
test('quality branch and work stages share the same tool, sample and task without duplicating the budget',()=>{
 const a=action('node=skill:sql'),b=action('tab=职业关系&relation=细分方向&node=branch:quality&tool=sql');
 assert.equal(a.atlas.key,b.atlas.key);assert.equal(b.atlas.tool,'sql');assert.equal(b.atlas.caseId,atlasCase.id);
 const sheet=action('tab=职业关系&relation=细分方向&node=branch:quality&tool=sheet');assert.equal(sheet.atlas.skill,'表格工具');assert.match(sheet.purpose,/表格工具/);
 const t=makeTask(fresh(),a);assert.equal(atlasTasks([t],b).length,1);assert.equal(atlasTasks([t],sheet).length,0);
 assert.equal(atlasTasks([{...t,atlas:{...t.atlas,caseId:undefined,key:'work:data:foundation:sql'}}],b).length,1);
});
test('saved draft edits survive stages and tools, and unrelated drafts are preserved',()=>{
 const sql={...action('node=skill:sql'),title:'本人修改的标题',hours:.5,purpose:'本人填写的疑问'},sheet={...action('node=skill:sheet'),title:'我的表格草稿'};
 const first=storeTaskDraft(fresh(),sql),second=storeTaskDraft(first,sheet);
 assert.equal(atlasSavedDraft(second,action('node=skill:limits')).title,sql.title);
 assert.equal(atlasSavedDraft(second,action('node=skill:sheet')).title,sheet.title);
 assert.equal(atlasSavedDraft(second,action('node=skill:limits')).hours,.5);assert.equal(second.tasks.length,0);
 const other=storeTaskDraft(second,{title:'其他页面的草稿'});assert.equal(other.taskDraft.title,'其他页面的草稿');assert.equal(atlasSavedDraft(other,sql).purpose,sql.purpose);
});
test('an old source version is never silently applied as a current draft',()=>{
 const current=action('node=skill:sql'),s=storeTaskDraft(fresh(),{...current,atlas:{...current.atlas,version:0}});assert.equal(atlasSavedDraft(s,current),null);
});
test('the downloadable data has the documented duplicate, one blank amount and a preserved zero',()=>{
 const rows=atlasCSV().trimEnd().split('\r\n').slice(1).map(r=>r.split(','));assert.equal(rows.length,6);
 assert.equal(rows.filter(r=>r[0]==='R002').length,2);assert.equal(rows.filter(r=>r[2]==='').length,1);assert.equal(rows.find(r=>r[0]==='R005')[2],'0');
});
test('private material deletion also removes newly archived map drafts',()=>{
 const s=storeTaskDraft(fresh(),{...action('node=skill:sql'),purpose:'private-draft-secret'});const deleted=purgePrivateMaterials(s);
 assert.ok(!JSON.stringify(deleted).includes('private-draft-secret'));assert.equal(atlasSavedDraft(deleted,s.taskDraft),null);
});
