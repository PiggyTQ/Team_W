import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,makeTask} from '../src/model.js';
import {completedPracticeResources,personalResources} from '../src/my-resources-model.js';
import {normalizeWorkspaceRoute} from '../src/route-model.js';
import {flowNavigation} from '../src/flow-navigation.js';

test('personal resources require completed platform practice; reading, drafts and external records stay separate',()=>{
 const s=fresh();s.reading={quality:{chapter:3,version:1}};
 const create=(id,patch={})=>({...makeTask(s,{title:id,template:'quality',hours:1}),id,...patch});
 s.tasks=[create('active',{status:'进行中'}),create('flag-only',{completed:true}),create('status-only',{status:'完成'}),create('done',{completed:true,status:'完成',attempts:[{text:'Deliverable v1'},{text:'Deliverable v2'}],contribution:'My actual work'}),create('external',{template:'external',mode:'recorded',completed:true,status:'完成'})];
 const before=structuredClone(s),items=completedPracticeResources(s);
 assert.deepEqual(items.map(item=>item.id),['done']);assert.equal(items[0].description,'Deliverable v2');assert.equal(items[0].to,'/work/done?tab=完成回执');assert.deepEqual(s,before);
 s.stage='S1';assert.equal(completedPracticeResources(s)[0].to,'/plan?tab=执行&practice=done&step=record');
});

test('source and career filters preserve actual uploaded and platform records without creating tasks',()=>{
 const s=fresh(),done={...makeTask(s,{title:'Platform',template:'quality',career:'data',hours:1}),completed:true,status:'完成'};s.tasks=[done];
 const uploads=[{id:'upload',title:'My finished work',completed:true,career:'ai'},{id:'draft',completed:false,career:'data'}];
 assert.equal(personalResources(s,uploads).length,2);assert.deepEqual(personalResources(s,uploads,{source:'upload'}).map(item=>item.id),['upload']);assert.equal(personalResources(s,uploads,{source:'practice',career:'ai'}).length,0);assert.equal(s.tasks.length,1);assert.equal(s.claims.length,0);
});

test('legacy resource tabs resolve to the center with their specific project and scope intact',()=>{
 for(const tab of ['路线与资源','短体验','综合项目']){
  const route=normalizeWorkspaceRoute('/learning?tab='+tab+'&unit=quality&range=标准范围#project'),url=new URL(route.to,'http://test');
  assert.equal(url.searchParams.get('tab'),'资源中心');assert.equal(url.searchParams.get('unit'),'quality');assert.equal(url.searchParams.get('range'),'标准范围');assert.equal(url.hash,'#project');assert.equal(route.invalidTab,false);assert.deepEqual(normalizeWorkspaceRoute(route.to),route);
 }
 const s=fresh();s.logged=true;assert.equal(flowNavigation(s,'/learning','我的资源'),null);
});
