import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWorkspaceRoute,jobPreparationSource} from '../src/route-model.js';
import {careerMatches,workspaceSearchResults} from '../src/workspace-search-model.js';
import {careers} from '../src/model.js';

test('可见页签别名修复后保留材料返回位置与具体对象',()=>{
 const route=normalizeWorkspaceRoute('/assessment?tab=职业评估&mapReturn=%2Fcareer-map%3Fnode%3Dskill%3Asql&claim=claim-1#section');
 const url=new URL(route.to,'http://test');assert.equal(url.searchParams.get('tab'),'四维与差距');assert.equal(url.searchParams.get('claim'),'claim-1');assert.equal(url.searchParams.get('mapReturn'),'/career-map?node=skill:sql');assert.equal(url.hash,'#section');assert.equal(route.invalidTab,false);
 for(const[alias,raw]of Object.entries({'资料与经历':'资料经历','提取与确认':'原文确认','我的画像':'成果档案'}))assert.equal(new URL(normalizeWorkspaceRoute('/assessment?tab='+alias).to,'http://test').searchParams.get('tab'),raw);
});
test('日程别名进入实际日程，失效页签恢复默认且保持对象',()=>{
 const calendar=new URL(normalizeWorkspaceRoute('/plan?tab=日程&task=task-1').to,'http://test');assert.equal(calendar.searchParams.get('tab'),'执行');assert.equal(calendar.searchParams.get('view'),'calendar');assert.equal(calendar.searchParams.get('task'),'task-1');
 for(const path of ['/careers','/assessment','/plan','/learning','/work/task-1','/reports/report-1','/assistant','/settings','/admin/data']){const r=normalizeWorkspaceRoute(path+'?tab=失效&job=job-b');assert.equal(r.invalidTab,true);assert.equal(new URL(r.to,'http://test').searchParams.get('job'),'job-b');assert.equal(new URL(r.to,'http://test').searchParams.has('tab'),false);}
});
test('规范化幂等，已知页签和未参与的地址不被重定向',()=>{
 for(const route of ['/plan?tab=执行&view=calendar','/career-map?tab=职业关系&career=ops&node=branch:ops','/reports/report-demo','/auth?intent=%2Fcareers','/careers?tab=比较']){const r=normalizeWorkspaceRoute(route);assert.equal(r.invalidTab,false);assert.deepEqual(normalizeWorkspaceRoute(r.to),r);}
});
test('目标编辑二级页与旧制定链接保持可刷新且规范化幂等',()=>{
 for(const period of ['week','month','year']){const route=normalizeWorkspaceRoute('/plan?goalForm='+period+'&goalView=week&tab=执行');assert.equal(route.to,'/plan/goals?period='+period);assert.equal(route.invalidTab,false);assert.deepEqual(normalizeWorkspaceRoute(route.to),route);}
 assert.equal(normalizeWorkspaceRoute('/plan/goals?period=invalid').to,'/plan/goals?period=week');assert.equal(normalizeWorkspaceRoute('/plan/goals').to,'/plan/goals');assert.equal(normalizeWorkspaceRoute('/plan/goals?period=year&tab=复盘').to,'/plan/goals?period=year');
});
test('旧待排期地址迁移到独立排期页并保留对象与返回位置',()=>{
 for(const [key,id]of [['goal','period-goal-1'],['task','task-1']]){
  const route=normalizeWorkspaceRoute(`/plan?goalView=undated&tab=执行&${key}=${id}&return=%2Fplan%3FgoalView%3Dactions#schedule`),url=new URL(route.to,'http://test');
  assert.equal(url.pathname,'/plan/schedule');assert.equal(url.searchParams.get(key),id);assert.equal(url.searchParams.get('return'),'/plan?goalView=actions');assert.equal(url.hash,'#schedule');assert.equal(url.searchParams.has('goalView'),false);assert.equal(url.searchParams.has('tab'),false);assert.equal(route.invalidTab,false);assert.deepEqual(normalizeWorkspaceRoute(route.to),route);
 }
 assert.equal(normalizeWorkspaceRoute('/plan?goalView=undated').to,'/plan/schedule');
 assert.equal(normalizeWorkspaceRoute('/plan?goalView=actions').to,'/plan?goalView=actions');
});
test('独立排期页保持目标或任务定位并确定非空目标优先级',()=>{
 for(const key of ['goal','task']){
  const id='计划 / A&B+中文',route=normalizeWorkspaceRoute('/plan/schedule?'+key+'='+encodeURIComponent(id)+'&tab=复盘&goalView=week'),url=new URL(route.to,'http://test');
  assert.equal(url.pathname,'/plan/schedule');assert.equal(url.searchParams.get(key),id);assert.equal(url.searchParams.has(key==='goal'?'task':'goal'),false);assert.equal(url.searchParams.has('tab'),false);assert.equal(url.searchParams.has('goalView'),false);assert.equal(route.invalidTab,false);assert.deepEqual(normalizeWorkspaceRoute(route.to),route);
 }
 const both=new URL(normalizeWorkspaceRoute('/plan/schedule?task=task-1&goal=goal-1').to,'http://test');assert.equal(both.searchParams.get('goal'),'goal-1');assert.equal(both.searchParams.has('task'),false);
 const emptyGoal=normalizeWorkspaceRoute('/plan/schedule?goal=&task=task-1'),emptyUrl=new URL(emptyGoal.to,'http://test');assert.equal(emptyUrl.searchParams.has('goal'),false);assert.equal(emptyUrl.searchParams.get('task'),'task-1');assert.deepEqual(normalizeWorkspaceRoute(emptyGoal.to),emptyGoal);
 assert.deepEqual(normalizeWorkspaceRoute('/plan/schedule'),{to:'/plan/schedule',invalidTab:false});
});
test('具体岗位任务来源可安全还原同一岗位',()=>{const id='岗位 b&分支';assert.equal(new URL(jobPreparationSource(id),'http://test').searchParams.get('job'),id);});
test('全局搜索和列表对中英文、大小写及前后空格采用同一规则',()=>{
 const translate=text=>({'数据分析':'Data analysis','数据工程':'Data engineering','后端开发':'Back-end development','设计数据接口，说明校验、错误与权限边界。':'Design data interfaces'}[text]||text);
 for(const query of [' DATA ','sql','SQL','数据','问题清单']){const list=careers.filter(c=>careerMatches(c,query,translate)).map(c=>c.id).slice(0,6),global=workspaceSearchResults({query,logged:true},translate).map(c=>c.id);assert.deepEqual(global,list);}
 assert.ok(careers.some(c=>careerMatches(c,' DATA ',translate)));
});
