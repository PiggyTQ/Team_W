import test from 'node:test';
import assert from 'node:assert/strict';
import {KEY,fresh,scenarioState,makeAnalysis} from '../src/model.js';
import {loadPrototypeState,savePrototypeState,normalizePrototypeState} from '../src/storage-recovery-model.js';
import {saveEducation,withdrawEducation} from '../src/completion-model.js';
import {saveResumeProfile} from '../src/resume-content-model.js';
import {storeResumeImport} from '../src/resume-import-model.js';
import {freezeReport} from '../src/alignment-model.js';
import {saveReviewRecord} from '../src/action-cycle-model.js';
import {submitTaskAttempt} from '../src/task-attempt-model.js';
import {saveJobEvent} from '../src/site-quality-model.js';

function memory(raw=null){
  const values=new Map(raw===null?[]:[[KEY,raw]]),writes=[];
  return {values,writes,getItem:key=>values.get(key)??null,setItem(key,value){writes.push([key,value]);values.set(key,value);},removeItem(){throw Error('Reading must not delete records');},clear(){throw Error('Reading must not clear storage');}};
}
const load=value=>loadPrototypeState(memory(JSON.stringify(value)));

test('首次读取返回独立空状态，读取不写入本机',()=>{
  const storage=memory(),a=loadPrototypeState(storage),b=loadPrototypeState(storage);
  assert.equal(a.status,'ready');assert.equal(a.raw,null);assert.deepEqual(a.state,fresh());
  a.state.claims.push({id:'temporary'});assert.equal(b.state.claims.length,0);assert.equal(storage.writes.length,0);
});
test('七个现有演示场景兼容加载，保留本人字段与记录',()=>{
  for(const scene of ['PT01','PT02','PT03','PT04','PT05','PT06','PT07']){
    const original=scenarioState(scene),raw=JSON.stringify(original),storage=memory(raw),result=loadPrototypeState(storage);
    assert.equal(result.status,'ready',scene);assert.equal(result.raw,raw);assert.equal(result.state.claims.length,original.claims.length);
    assert.equal(result.state.goal,original.goal);assert.equal(result.state.logged,true);assert.equal(storage.writes.length,0);
    for(const record of original.claims)assert.equal(result.state.claims.find(c=>c.id===record.id).text,record.text);
  }
});
test('旧 schema-1 缺新增字段时补齐默认值，不生成示例本人事实',()=>{
  const old={schema:1,logged:true,preferences:{interest:'本人输入保持原文'},claimDraft:{text:'早期原文'},tasks:[{id:'legacy-task',title:'原任务',hours:1,status:'待开始'}]};
  const before=structuredClone(old),result=load(old);
  assert.equal(result.status,'ready');assert.equal(result.state.preferences.interest,old.preferences.interest);
  assert.equal(result.state.claimDraft.text,old.claimDraft.text);assert.deepEqual(result.state.tasks[0].attempts,[]);
  assert.deepEqual(result.state.tasks[0].dependsOn,[]);assert.deepEqual(result.state.education,[]);
  assert.equal(result.state.analysis,null);assert.equal(result.state.claims.length,0);assert.deepEqual(old,before);
});
test('JSON 损坏、错误 schema 及非对象记录保留原字节，禁止自动清空或覆盖',()=>{
  for(const raw of ['{ broken ','','null','[]','42','{"schema":2}','{"schema":1,"claims":null}']){
    const storage=memory(raw),result=loadPrototypeState(storage);
    assert.equal(result.status,'invalid');assert.equal(result.raw,raw);assert.deepEqual(result.state,fresh());
    assert.equal(result.state.logged,false);assert.equal(storage.getItem(KEY),raw);assert.equal(storage.writes.length,0);
  }
});
test('核心集合和条目破坏被拒绝，不以过滤数据掩盖损坏',()=>{
  const keys=['claims','tasks','reviews','reports','resumes','jobs','events','feedback','education','presets','audit','conversations'];
  for(const key of keys){
    for(const corrupt of [null,{},'bad',[null],[42],[{}],[{id:[]}]]){
      const s={...fresh(),[key]:corrupt};assert.equal(load(s).status,'invalid',key+' '+JSON.stringify(corrupt));
    }
  }
  assert.equal(load({...fresh(),claims:[{id:'same'},{id:'same'}]}).status,'invalid');
});
test('嵌套提交、讨论、引用及表单的错误类型被拒绝',()=>{
  const changes=[
    s=>s.tasks[0].attempts=null,s=>s.tasks[0].attempts=[null],s=>s.tasks[0].dependsOn={},
    s=>s.conversations[0].messages=[null],s=>s.conversations[0].messages=[{text:[]}],s=>s.conversations[0].messages=[{text:'x',scope:{}}],
    s=>s.claims[0].contribution={},s=>s.claimDraft.guidedParts={action:3},s=>s.preferences=null,
    s=>s.analysis={claimSnapshots:[null]},s=>s.reports=[{id:'r',claimRefs:[null]}],s=>s.resumes=[{id:'r',facts:[null]}],s=>s.resumes=[{id:'r',tailoring:{rows:{0:null}}}],
    s=>s.resumeStudioDraft={claimIds:{}},s=>s.resumeStudioDraft={tailoring:{rows:{0:{claimIds:null}}}},
    s=>s.reading={quality:null},s=>s.reviewDrafts={task:null}
  ];
  for(const change of changes){const s=scenarioState('PT05');change(s);assert.equal(load(s).status,'invalid',change.toString());}
});
test('读取方法及存储 getter 抛错时返回持久恢复状态',()=>{
  for(const storage of [undefined,{}, {getItem(){throw Error('denied');}}, {get getItem(){throw Error('getter denied');}}]){
    const result=loadPrototypeState(storage);assert.equal(result.status,'read-error');assert.equal(result.raw,null);assert.equal(result.state.logged,false);
  }
});
test('存储恢复后可重读原记录，读取失败本身不触发写入',()=>{
  const original=scenarioState('PT05'),storage=memory(JSON.stringify(original));let blocked=true;
  const adapter={getItem:key=>{if(blocked)throw Error('denied');return storage.getItem(key);},setItem:storage.setItem.bind(storage)};
  assert.equal(loadPrototypeState(adapter).status,'read-error');blocked=false;
  assert.equal(loadPrototypeState(adapter).state.tasks[0].id,'task-demo');assert.equal(storage.writes.length,0);
});
test('写入失败不清空旧记录；再次明确重试可成功',()=>{
  const storage=memory('original'),current=scenarioState('PT05');let blocked=true;
  const adapter={setItem(key,value){if(blocked)throw Error('QuotaExceededError');storage.setItem(key,value);}};
  assert.deepEqual(savePrototypeState(adapter,current),{status:'write-error'});assert.equal(storage.getItem(KEY),'original');
  blocked=false;assert.deepEqual(savePrototypeState(adapter,current),{status:'saved'});assert.deepEqual(JSON.parse(storage.getItem(KEY)),current);
});
test('非法状态与不可序列化状态不写坏存储，setItem getter 也在保护内',()=>{
  const states=[{...fresh(),claims:[null]},{...fresh(),budget:NaN},{...fresh(),tasks:[{id:'t',hours:Infinity}]},{...fresh(),preferences:null}];
  const circular=fresh();circular.extension=circular;states.push(circular);
  for(const state of states){const storage=memory('old');assert.equal(savePrototypeState(storage,state).status,'write-error');assert.equal(storage.getItem(KEY),'old');assert.equal(storage.writes.length,0);}
  assert.equal(savePrototypeState({get setItem(){throw Error('denied');}},fresh()).status,'write-error');
});
test('真实模型生成的教育修订、报告、PDF原稿、复盘与事件可连续保存恢复',()=>{
  let s=scenarioState('PT05');
  s=saveEducation(s,{school:'本人学校',confirmed:true});
  s=saveEducation(s,{...s.education[0],major:'本人专业',confirmed:true});
  s=withdrawEducation(s,s.education[0].id);
  s=saveResumeProfile(s,{name:'本人姓名',confirmed:true});
  s=storeResumeImport(s,{title:'本次原稿',text:'本人原稿',segments:[]});
  s.tasks[0].draft='实际产物';s=submitTaskAttempt(s,s.tasks[0].id);
  s=saveReviewRecord(s,s.tasks[0].id,{type:'原创模拟实践',result:'本人结果',feedback:'',reason:'本人分析',next:'本人下一做法'}).state;
  s=saveJobEvent(s,{jobId:s.jobs[0].id,type:'投递',date:'2026-10-22'});
  s.analysis=makeAnalysis(s);s.reports=[freezeReport(s,'本次报告','目标与理由：待继续验证')];
  s.resumes=[{id:'resume',title:'保存简历',claimIds:s.claims.map(c=>c.id),facts:s.claims.map(c=>({...c})),educationFacts:s.education.map(e=>({...e,history:undefined})),profileSnapshot:{...s.resumeProfile,history:undefined},tailoring:{rows:{0:{claimIds:[s.claims[0].id],claimRefs:{[s.claims[0].id]:s.claims[0].version},wording:'本人表达',confirmed:true}}},placements:{[s.claims[0].id]:'projects'}}];
  const storage=memory();assert.equal(savePrototypeState(storage,s).status,'saved');
  const restored=loadPrototypeState(storage);assert.equal(restored.status,'ready');assert.equal(restored.state.education[0].status,'已撤回');
  assert.equal(restored.state.reviews[0].reason,'本人分析');assert.equal(restored.state.events.length,1);assert.equal(restored.state.resumeImports[0].text,'本人原稿');
});
test('恢复不存在的当前讨论指针，保留现有消息与其它扩展数据',()=>{
  const s=fresh();s.conversationId='deleted';s.conversations[0].messages=[{id:'m',role:'user',text:'本人问题',scope:['职业原创知识']}];s.futureExtension={key:'保留'};
  const result=normalizePrototypeState(s);assert.equal(result.conversationId,'conv-1');assert.equal(result.conversations[0].messages[0].text,'本人问题');assert.deepEqual(result.futureExtension,s.futureExtension);
});
