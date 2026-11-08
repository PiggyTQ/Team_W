import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyExecution,expectedCapability,learningTaskRoute,localDay} from '../src/daily-execution-model.js';

const today='2026-11-08';
const task=(id,extra={})=>({id,title:id,status:'待开始',completed:false,due:today,priority:'中',hours:1,...extra});

test('今日任务只收录有效安排中的未完成任务，逾期带入但未来和未排期保留在原计划',()=>{
 const state={tasks:[
  task('today'),task('overdue',{due:'2026-11-07',status:'受阻'}),
  task('active',{status:'进行中'}),task('tomorrow',{due:'2026-11-09'}),
  task('undated',{due:''}),task('missing-date',{due:undefined}),
  task('done',{status:'完成',completed:true}),task('inconsistent-completed',{completed:true}),
  ...['延期','跳过','取消'].map(status=>task(status,{status}))
 ]};
 const before=structuredClone(state),result=dailyExecution(state,today);
 assert.deepEqual(result.tasks.map(row=>row.id),['overdue','active','today']);
 assert.equal(result.overdue,1);
 assert.equal(result.hours,3);
 assert.equal(result.unknownHours,0);
 assert.deepEqual(state,before);
});

test('排序以优先级为先，同级先到期，再继续进行中的任务，其余保持原顺序',()=>{
 const state={tasks:[
  task('unsorted',{priority:'未排序',due:'2026-01-01'}),
  task('low',{priority:'低',due:'2026-01-01'}),
  task('middle',{priority:'中',due:'2026-01-01'}),
  task('high-pending',{priority:'高'}),
  task('high-active',{priority:'高',status:'进行中'}),
  task('high-blocked',{priority:'高',status:'受阻'}),
  task('high-earlier',{priority:'高',due:'2026-11-07'}),
  task('high-last',{priority:'高'}),
  task('missing-priority',{priority:undefined,due:'2026-01-01'})
 ]};
 state.tasks.forEach(Object.freeze);Object.freeze(state.tasks);Object.freeze(state);
 assert.deepEqual(dailyExecution(state,today).tasks.map(row=>row.id),[
  'high-earlier','high-active','high-pending','high-blocked','high-last',
  'middle','low','unsorted','missing-priority'
 ]);
});

test('非法日期不作为逾期任务，闰日按真实日历校验',()=>{
 const invalid=['2026-02-29','2026-11-31','2026-13-01','2026-00-01','2026-11-00','2026-1-01','2026-11-08T00:00:00Z','not-a-date',null,42];
 const state={tasks:[...invalid.map((due,index)=>task('invalid-'+index,{due})),task('leap',{due:'2024-02-29'})]};
 const result=dailyExecution(state,today);
 assert.deepEqual(result.tasks.map(row=>row.id),['leap']);
 assert.equal(result.overdue,1);
});

test('预计投入仅合计已知非负小时，缺失或无效时间单独计数',()=>{
 const state={tasks:[
  task('fraction',{hours:0.5}),task('two',{hours:2}),task('zero',{hours:0}),
  ...[null,undefined,'',-1,NaN,Infinity,'unknown'].map((hours,index)=>task('unknown-'+index,{hours})),
  task('future',{due:'2026-11-09',hours:10}),task('finished',{status:'完成',completed:true,hours:10})
 ]};
 const result=dailyExecution(state,today);
 assert.equal(result.hours,2.5);
 assert.equal(result.unknownHours,7);
 assert.equal(result.tasks.length,10);
});

test('没有今日有效任务时返回空清单与零合计',()=>{
 for(const state of [{tasks:[]},{tasks:[task('future',{due:'2026-11-09'}),task('undated',{due:''})]}]){
  assert.deepEqual(dailyExecution(state,today),{tasks:[],hours:0,unknownHours:0,overdue:0});
 }
});

test('能力收获沿用任务的明确技能，其次课程内容，未关联课程不依据职业猜测',()=>{
 assert.equal(expectedCapability(task('atlas',{template:'quality',atlas:{skill:'  Python  '},skill:'SQL'})),'Python');
 assert.equal(expectedCapability(task('skill',{template:'quality',atlas:{skill:' '},skill:'  JavaScript  '})),'JavaScript');
 assert.match(expectedCapability(task('quality',{template:'quality'})),/SQL/);
 assert.match(expectedCapability(task('ai',{template:'ai-eval'})),/Python/);
 assert.equal(expectedCapability(task('external',{template:'external',career:'data',purpose:'  练习编程基础  '})),'练习编程基础');
 assert.equal(expectedCapability(task('unknown',{template:'missing',career:'ai',purpose:' ',skill:''})),'待明确能力目标');
});

test('去完成链接保留同一任务与明确课程映射，特殊字符可往返解码',()=>{
 const original=task('task/学习 + #1',{template:'quality'}),before=structuredClone(original);
 const route=new URL(learningTaskRoute(original),'http://localhost');
 assert.equal(route.pathname,'/learning');
 assert.equal(route.searchParams.get('task'),original.id);
 assert.equal(route.searchParams.get('unit'),'quality');
 assert.equal(decodeURIComponent(route.hash.slice(1)),'learning-task-'+original.id);
 assert.deepEqual(original,before);
 for(const template of ['external','missing',undefined]){
  const external=new URL(learningTaskRoute(task('outside',{template,career:'data'})),'http://localhost');
  assert.equal(external.searchParams.get('task'),'outside');
  assert.equal(external.searchParams.has('unit'),false);
  assert.equal(external.hash,'#learning-task-outside');
 }
});

test('今日日期取本地日历而非 UTC 字符串切片，跨月跨年正确补零',()=>{
 assert.equal(localDay(new Date(2026,0,2,0,5)),'2026-01-02');
 assert.equal(localDay(new Date(2026,11,31,23,59)),'2026-12-31');
 assert.equal(localDay(new Date(2027,0,1,0,1)),'2027-01-01');
});
