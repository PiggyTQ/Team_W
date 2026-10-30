import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,makeTask,usedHours,canRejectClaim,rejectClaimCandidate} from '../src/model.js';
import {dependencyBlock} from '../src/completion-model.js';
import {submitTaskAttempt} from '../src/task-attempt-model.js';
import {flowNavigation} from '../src/flow-navigation.js';

const action=(s,id,patch={})=>({...makeTask(s,{title:id,purpose:'核对实际行动',hours:2,template:'quality'}),id,draft:'本次产物',...patch});
test('完成后提交不能重新占用已分配预算或撤销后续行动的依赖依据',()=>{
  const s=fresh();s.budget=2;
  const done=action(s,'done',{status:'完成',completed:true,attempts:[{id:'saved',version:1,text:'已完成成果'}]});
  const next=action(s,'next',{status:'进行中',dependsOn:['done']});s.tasks=[done,next];
  const before=structuredClone(s);
  assert.equal(usedHours(s),2);assert.equal(dependencyBlock(s,next),false);
  assert.throws(()=>submitTaskAttempt(s,'done'),/已完成.*预算预检/);
  assert.deepEqual(s,before);assert.equal(usedHours(s),2);assert.equal(dependencyBlock(s,next),false);
});
test('暂停、依赖未完成、空产物和已失效对象均保留原任务',()=>{
  const s=fresh();s.tasks=[action(s,'a'),action(s,'b',{dependsOn:['a']}),action(s,'stopped',{status:'延期'}),action(s,'empty',{draft:' '})];
  const before=structuredClone(s);
  assert.throws(()=>submitTaskAttempt(s,'b'),/依赖/);assert.throws(()=>submitTaskAttempt(s,'stopped'),/暂停/);
  assert.throws(()=>submitTaskAttempt(s,'empty'),/当前产物/);assert.throws(()=>submitTaskAttempt(s,'missing'),/不存在/);
  assert.deepEqual(s,before);
});
test('未完成任务修订保留已提交版本并重置本次检查',()=>{
  const s=fresh(),old={id:'v1',version:1,text:'原版本',result:'待修订'};
  const t=action(s,'a',{attempts:[old],selfcheck:true,check:'待修订'});s.tasks=[t];
  const next=submitTaskAttempt(s,t.id),saved=next.tasks[0];
  assert.equal(saved.attempts.length,2);assert.deepEqual(saved.attempts[0],old);assert.equal(saved.attempts[1].version,2);
  assert.equal(saved.attempts[1].text,'本次产物');assert.equal(saved.attempts[1].result,'未检查');
  assert.equal(saved.status,'进行中');assert.equal(saved.completed,false);assert.equal(saved.selfcheck,false);
  assert.equal(saved.version,t.version+1);assert.equal(t.attempts.length,1);assert.equal(next.budget,s.budget);
});
test('损坏的任务对象编码回到计划，不抛异常或切换其他对象',()=>{
  const s=fresh();s.logged=true;s.tasks=[action(s,'other',{status:'进行中'})];
  for(const path of ['/work/%','/work/%E0%A4%A']){
    const flow=flowNavigation(s,path);assert.equal(flow.next.to,'/plan?tab=执行');assert.match(flow.hint,/选择有效任务/);
  }
  const id='任务 1';s.tasks.push(action(s,id));
  const flow=flowNavigation(s,'/work/'+encodeURIComponent(id));assert.equal(flow.next.to,`/work/${encodeURIComponent(id)}?tab=尝试与反馈`);
});
test('拒绝只处理待核对候选，已确认材料保留正式撤回链路',()=>{
  const s=fresh();s.claims=['待确认','疑似重复','矛盾','已确认','已撤回','已关联重复','已拒绝'].map((status,id)=>({id:String(id),status,version:2,text:'材料原文'}));
  const before=structuredClone(s);
  for(const [index,claim] of s.claims.entries()){
    assert.equal(canRejectClaim(claim),index<3);
    const next=rejectClaimCandidate(s,claim.id);
    assert.equal(next.claims[index].status,index<3?'已拒绝':claim.status);
    assert.equal(next.claims[index].version,claim.version);
    assert.equal(next.profileVersion,s.profileVersion);assert.equal(next.analysisStale,s.analysisStale);
    assert.equal(next.claims.filter(c=>c.status==='已确认').length,1);
  }
  assert.deepEqual(s,before);
});
