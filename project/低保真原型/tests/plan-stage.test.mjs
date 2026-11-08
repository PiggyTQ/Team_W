import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,makeTask} from '../src/model.js';
import {blankGoal,deletePeriodGoal,editableGoal,emptyStageRecords,goalEditorUrl,goalStats,operateStageTask,periodGoals,periodRange,readStageRecords,reviewSignature,savePeriodGoal,schedulePeriodGoal,stageStorageKey,stageTaskGroups,taskEditDraft,unscheduledGoals,updateGoalProgress} from '../src/plan-stage-model.js';

const today='2026-11-07';
const taskState=(mode='S1')=>{const s=fresh();s.budget=8;const t=makeTask(s,{title:'写下实际行动',purpose:'验证一个小问题',hours:2,template:mode==='S2'?'quality':'external'});t.id='one';s.tasks=[t];return s;};
test('natural periods include year boundaries and leap days',()=>{
 assert.deepEqual(periodRange('week','2027-01-01'),{start:'2026-12-28',end:'2027-01-03'});
 assert.deepEqual(periodRange('month','2028-02-20'),{start:'2028-02-01',end:'2028-02-29'});
 assert.deepEqual(periodRange('year',today),{start:'2026-01-01',end:'2026-12-31'});
 assert.throws(()=>periodRange('week','2026-02-31'));
});
test('goals save, validate dates, retain milestones and reject stale edits',()=>{
 const draft={...blankGoal('year',today),title:'年度作品',progress:25,milestoneText:'完成初稿\n完成初稿\n完成复盘'};
 const records=savePeriodGoal(emptyStageRecords(),'year',today,draft),goal=records.goals[0];
 assert.equal(goal.milestones.length,2);assert.equal(periodGoals(records,'week',today).length,0);assert.equal(periodGoals(records,'year',today).length,1);
 const next=savePeriodGoal(records,'year',today,{...goal,milestoneText:draft.milestoneText,progress:100});
 assert.equal(next.goals[0].milestones[0].id,goal.milestones[0].id);assert.deepEqual(goalStats(next.goals),{total:1,done:1,going:0,pending:0,progress:100});
 assert.throws(()=>savePeriodGoal(next,'year',today,{...goal,milestoneText:''}),/变化/);
 assert.throws(()=>savePeriodGoal(records,'week',today,{...blankGoal('week',today),title:'越界',due:'2027-01-01'}),/周期/);
 assert.throws(()=>savePeriodGoal(records,'month',today,{...blankGoal('month',today),title:'错误进度',progress:NaN}),/进度/);
 assert.deepEqual(readStageRecords(JSON.stringify(next)),next);assert.throws(()=>readStageRecords('{bad'));
 assert.throws(()=>readStageRecords(JSON.stringify({...next,goals:[goal,goal]})));
 assert.notEqual(stageStorageKey('a'),stageStorageKey('b'));
});
test('goal editor deletion only removes the selected period goal and its links',()=>{
 let records=emptyStageRecords();
 for(const period of ['week','month','year'])records=savePeriodGoal(records,period,today,{...blankGoal(period,today),title:period});
 const goal=records.goals[0],other=records.goals[1];
 records.taskMeta={one:{goalId:goal.id,time:'14:30',review:{decision:'通过'}},two:{goalId:other.id,time:'16:00'},empty:null};
 records.drafts={'week-goal':editableGoal(goal),'month-goal':editableGoal(other),'undated:one':{goalId:goal.id,title:'待保存行动',due:'2026-11-10'},unrelated:null};
 const next=deletePeriodGoal(records,'week',today,goal);
 assert.equal(next.goals.length,2);assert.equal(next.goals.some(g=>g.id===goal.id),false);assert.deepEqual(next.taskMeta.one,{goalId:'',time:'14:30',review:{decision:'通过'}});assert.deepEqual(next.taskMeta.two,records.taskMeta.two);assert.equal(next.taskMeta.empty,null);
 assert.equal(next.drafts['week-goal'],null);assert.deepEqual(next.drafts['month-goal'],records.drafts['month-goal']);assert.deepEqual(next.drafts['undated:one'],{goalId:'',title:'待保存行动',due:'2026-11-10'});assert.equal(records.goals.length,3);assert.equal(records.taskMeta.one.goalId,goal.id);
 assert.deepEqual(readStageRecords(JSON.stringify(next)),next);
});
test('goal deletion rejects stale versions, missing records and other periods',()=>{
 const records=savePeriodGoal(emptyStageRecords(),'week',today,{...blankGoal('week',today),title:'周目标'}),goal=records.goals[0];
 for(const [period,date,selection]of[['week',today,{...goal,version:0}],['week',today,{id:'missing',version:1}],['month',today,goal],['week','2026-11-20',goal]])assert.throws(()=>deletePeriodGoal(records,period,date,selection),/目标已变化/);
 assert.equal(records.goals.length,1);assert.equal(goalEditorUrl('month'),'/plan/goals?period=month');assert.equal(goalEditorUrl(),'/plan/goals');assert.equal(goalEditorUrl('invalid'),'/plan/goals');
});
test('new goals enter scheduling across all periods without copying the deadline or creating tasks',()=>{
 const s=taskState(),originalTasks=structuredClone(s.tasks);
 let records=emptyStageRecords();
 records.drafts['week-goal']={...blankGoal('week',today),title:'未提交草稿'};
 assert.equal(unscheduledGoals(records).length,0);
 for(const period of ['week','month','year']){
  const draft={...blankGoal(period,today),title:period+'目标',recommendationId:period+'-suggestion'};delete draft.progress;
  records=savePeriodGoal(records,period,today,draft);
 }
 const groups=stageTaskGroups(s,records,today);
 assert.equal(groups.undatedGoals.length,3);assert.equal(groups.undated.length,1);
 for(const goal of records.goals){assert.equal(goal.progress,0);assert.equal(goal.schedule,undefined);assert.ok(goal.due);assert.equal(goal.recommendationId,goal.period+'-suggestion');}
 assert.deepEqual(s.tasks,originalTasks);assert.equal(unscheduledGoals(readStageRecords(JSON.stringify(records))).length,3);
});
test('goal scheduling is explicit, preserves deadline, survives edits and can return to pending',()=>{
 let records=savePeriodGoal(emptyStageRecords(),'month',today,{...blankGoal('month',today),title:'目标',recommendationId:'monthly-one'});
 const goal=records.goals[0];
 records=schedulePeriodGoal(records,goal,{date:today,time:'14:30'});
 assert.equal(unscheduledGoals(records).length,0);assert.deepEqual(records.goals[0].schedule,{date:today,time:'14:30'});assert.equal(records.goals[0].due,goal.due);
 assert.throws(()=>schedulePeriodGoal(records,goal,{date:today,time:''}),/目标已变化/);
 records=savePeriodGoal(records,'month',today,{...editableGoal(records.goals[0]),title:'调整目标'});
 assert.deepEqual(records.goals[0].schedule,{date:today,time:'14:30'});assert.equal(records.goals[0].recommendationId,'monthly-one');
 assert.deepEqual(readStageRecords(JSON.stringify(records)),records);
 for(const draft of [{date:'2026-02-31',time:''},{date:today,time:'25:00'},{date:'',time:'14:30'}])assert.throws(()=>schedulePeriodGoal(records,records.goals[0],draft),/有效/);
 records=schedulePeriodGoal(records,records.goals[0],{date:'',time:''});assert.equal(unscheduledGoals(records).length,1);assert.equal(records.goals[0].due,goal.due);
 records=updateGoalProgress(records,goal.id,100);assert.equal(unscheduledGoals(records).length,0);
 const invalid={...records,goals:[{...records.goals[0],schedule:{date:'invalid',time:''}}]};assert.throws(()=>readStageRecords(JSON.stringify(invalid)),/排期无法读取/);
 records.drafts['schedule-goal:'+goal.id]={version:goal.version,date:today,time:''};
 records=deletePeriodGoal(records,'month',today,records.goals[0]);assert.equal(records.drafts['schedule-goal:'+goal.id],null);assert.equal(records.goals.length,0);
});
test('scheduled goals appear in actions alongside tasks and leave after completion or unscheduling',()=>{
 const s=taskState('S2'),tasks=structuredClone(s.tasks);
 let records=savePeriodGoal(emptyStageRecords(),'year',today,{...blankGoal('year',today),title:'年度计划',notes:'本人的目标',milestoneText:'形成初稿'});
 const goal=records.goals[0];
 let groups=stageTaskGroups(s,records,today);assert.equal(groups.actionGoals.length,0);assert.equal(groups.undatedGoals.length,1);
 records=schedulePeriodGoal(records,goal,{date:today,time:'09:00'});
 groups=stageTaskGroups(s,readStageRecords(JSON.stringify(records)),today);assert.equal(groups.actionGoals[0].id,goal.id);assert.equal(groups.undatedGoals.length,0);assert.deepEqual(groups.actions,tasks);
 records=updateGoalProgress(records,goal.id,40,records.goals[0].version);
 assert.equal(stageTaskGroups(s,records,today).actionGoals[0].progress,40);assert.equal(records.goals[0].milestones[0].done,false);assert.equal(records.goals[0].notes,goal.notes);assert.deepEqual(records.taskMeta,{});
 const priorVersion=records.goals[0].version;
 records=updateGoalProgress(records,goal.id,100,priorVersion);assert.equal(stageTaskGroups(s,records,today).actionGoals.length,0);assert.equal(stageTaskGroups(s,records,today).undatedGoals.length,0);assert.deepEqual(s.tasks,tasks,'Self-reported goal progress cannot complete tasks or create checks');
 assert.throws(()=>updateGoalProgress(records,goal.id,60,priorVersion),/目标已变化/);assert.throws(()=>updateGoalProgress(records,'missing',40),/目标已变化/);
 for(const progress of [-1,101,NaN])assert.throws(()=>updateGoalProgress(records,goal.id,progress),/进度/);
 records=updateGoalProgress(records,goal.id,20);assert.equal(stageTaskGroups(s,records,today).actionGoals.length,1);
 records=schedulePeriodGoal(records,records.goals[0],{date:'',time:''});groups=stageTaskGroups(s,records,today);assert.equal(groups.actionGoals.length,0);assert.equal(groups.undatedGoals.length,1);assert.deepEqual(s.tasks,tasks);
 records.drafts['action-goal:'+goal.id]={version:records.goals[0].version,progress:30};records=deletePeriodGoal(records,'year',today,records.goals[0]);assert.equal(records.drafts['action-goal:'+goal.id],null);
});
test('shared task groups include pending completed reviews and invalidate acknowledgements',()=>{
 const s=taskState(),t=s.tasks[0],records=emptyStageRecords();
 s.tasks.push({...t,id:'late',due:'2026-10-01'},{...t,id:'blocked',status:'受阻',due:'2027-01-01'},{...t,id:'done',status:'完成',completed:true},{...t,id:'stopped',status:'取消'});
 let groups=stageTaskGroups(s,records,today);assert.deepEqual([groups.actions.length,groups.undated.length,groups.review.length],[3,1,3]);
 const done=s.tasks.find(t=>t.id==='done');records.taskMeta.done={review:{signature:reviewSignature(done)}};
 assert.equal(stageTaskGroups(s,records,today).review.length,2);done.version++;assert.equal(stageTaskGroups(s,records,today).review.length,3);
 records.taskMeta.done={completedAt:'2026-11-07T10:00:00Z'};s.reviews=[{taskId:'done',date:'2026-11-07'}];assert.equal(stageTaskGroups(s,records,today).review.length,3,'Earlier date-only reviews cannot acknowledge a later completion');
});
test('scheduling preserves work and rejects stale plan/task versions',()=>{
 const s=taskState(),t=s.tasks[0];t.note='已有结果';t.attempts=[{id:'old',text:'原稿'}];
 const base={taskVersion:t.version,planVersion:s.planVersion},draft={...taskEditDraft(t),due:'2026-11-09'};
 const next=operateStageTask(s,t.id,'schedule',{base,draft});assert.equal(next.tasks[0].due,draft.due);assert.deepEqual(next.tasks[0].attempts,t.attempts);assert.equal(next.tasks[0].note,t.note);
 assert.throws(()=>operateStageTask(next,t.id,'schedule',{base,draft}),/版本/);assert.equal(s.tasks[0].due,'');
});
test('starting and completing respect dependencies, budget and actual work',()=>{
 const s=taskState(),id=s.tasks[0].id;
 assert.throws(()=>operateStageTask(s,id,'complete'),/实际结果/);
 s.tasks[0].dependsOn=['missing'];assert.throws(()=>operateStageTask(s,id,'start'),/依赖/);s.tasks[0].dependsOn=[];
 const next=operateStageTask(s,id,'record',{draft:{text:'实际做了一个小步骤',contribution:'本人整理',selfcheck:false}});
 assert.equal(operateStageTask(next,id,'complete').tasks[0].completed,true);
});
test('S2 completion needs submission, version self-check and standards confirmation',()=>{
 let s=taskState('S2'),id=s.tasks[0].id;
 assert.throws(()=>operateStageTask(s,id,'complete'),/完成条件/);
 s=operateStageTask(s,id,'record',{draft:{text:'实际产物',contribution:'本人完成',selfcheck:false}});s=operateStageTask(s,id,'submit');
 assert.equal(s.tasks[0].attempts.length,1);assert.equal(s.tasks[0].selfcheck,false);s=operateStageTask(s,id,'selfcheck');
 assert.throws(()=>operateStageTask(s,id,'complete'),/完成条件/);
 s.tasks[0].selfcheck=true;const done=operateStageTask(s,id,'complete');assert.equal(done.tasks[0].completed,true);assert.equal(done.tasks[0].attempts[0].text,'实际产物');assert.equal(s.tasks[0].completed,false);
});
