import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceSearchResults as search} from '../src/workspace-search-model.js';
test('workspace search matches career tasks and tools, with explicit empty recovery',()=>{
 assert.ok(search({query:'SQL'}).some(r=>r.id==='data'));
 assert.deepEqual(search({query:'不存在的合成关键词XYZ'}),[]);
 const english=search({query:'data'},x=>x==='数据分析'?'Data analysis':x);
 assert.ok(english.some(r=>r.id==='data'));assert.ok(search({query:''}).every(r=>r.kind==='page'));
});
test('personal task search only returns current authenticated task records',()=>{
 const tasks=[{id:'t1',title:'质量练习',purpose:'检查缺失',standard:'问题清单',status:'进行中'},{id:'t2',title:'其他任务',purpose:'比较方案',status:'取消'}];
 assert.deepEqual(search({query:'缺失',scope:'本人任务',tasks,logged:false}),[]);
 const results=search({query:'缺失',scope:'本人任务',tasks,logged:true});assert.equal(results.length,1);assert.equal(results[0].task,tasks[0]);
 assert.equal(search({query:'其他',scope:'本人任务',tasks,logged:true})[0].description,'取消');
 assert.ok(search({query:'质量',tasks,logged:true}).every(r=>r.kind!=='task'));
});
