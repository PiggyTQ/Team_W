import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceSync,workspacePayload} from '../src/workspace-sync.js';
import {fresh} from '../src/model.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function setup(request){const snapshots=[],statuses=[];const sync=createWorkspaceSync({request,onSnapshot:value=>snapshots.push(value),onStatus:value=>statuses.push(value),schedule:()=>1,cancel:()=>{}});return {sync,snapshots,statuses};}
test('loading never writes a blank workspace; writes are serialized and include latest edits',async()=>{
  const loading=deferred(),saving=deferred(),requests=[];let writes=0;
  const {sync}=setup(async(path,options)=>{if(!options?.data)return loading.promise;requests.push(options.data);return ++writes===1?saving.promise:{revision:3};});
  const connected=sync.connect('alice');sync.enqueue({...fresh(),budget:9});assert.equal(writes,0);
  loading.resolve({state:fresh(),revision:1});await connected;
  sync.enqueue({...fresh(),budget:4});const flushed=sync.flush();sync.enqueue({...fresh(),budget:5});saving.resolve({revision:2});await flushed;
  assert.equal(requests.length,2);assert.equal(requests[0].baseVersion,1);assert.equal(requests[1].baseVersion,2);assert.equal(requests[1].state.budget,5);assert.equal(sync.current().dirty,false);sync.destroy();
});
test('ambiguous network failure retries the same idempotency key before newer edits',async()=>{
  const bodies=[];let fail=true;const {sync}=setup(async(path,options)=>{if(!options?.data)return {state:fresh(),revision:0};bodies.push(options.data);if(fail){fail=false;throw Object.assign(Error(),{code:'NETWORK_ERROR'});}return {revision:bodies.length-1};});
  await sync.connect('alice');sync.enqueue({...fresh(),budget:4});await assert.rejects(sync.flush());sync.enqueue({...fresh(),budget:6});await sync.retry();
  assert.equal(bodies[0].mutationId,bodies[1].mutationId);assert.equal(bodies[0].state.budget,bodies[1].state.budget);assert.equal(bodies[2].state.budget,6);assert.equal(sync.current().dirty,false);sync.destroy();
});
test('version conflict preserves local data and never silently overwrites server changes',async()=>{
  let reads=0;const {sync,snapshots}=setup(async(path,options)=>{if(!options?.data)return {state:{...fresh(),budget:++reads===1?3:8},revision:reads};throw Object.assign(Error(),{code:'VERSION_CONFLICT'});});
  await sync.connect('alice');sync.enqueue({...fresh(),budget:4});await assert.rejects(sync.flush());assert.equal(sync.current().state.budget,4);assert.equal(sync.current().status,'conflict');await assert.rejects(sync.retry());await sync.reload();assert.equal(snapshots.at(-1).budget,8);assert.equal(sync.current().dirty,false);sync.destroy();
});
test('late responses cannot replace another account; expired same-account drafts stay in memory',async()=>{
  const old=deferred();const {sync,snapshots}=setup(async(path,options)=>options?.data?{revision:1}:snapshots.length?{state:fresh(),revision:0}:old.promise);
  const first=sync.connect('alice');await sync.disconnect();const second=sync.connect('bob');old.resolve({state:{...fresh(),budget:7},revision:0});await Promise.all([first,second]);assert.equal(sync.current().owner,'bob');sync.destroy();
  const live=setup(async()=>({state:fresh(),revision:0}));await live.sync.connect('alice');live.sync.enqueue({...fresh(),budget:6});await live.sync.disconnect();await live.sync.connect('alice');assert.equal(live.snapshots.at(-1).budget,6);await live.sync.disconnect();await live.sync.connect('bob');assert.equal(live.snapshots.at(-1).budget,3);live.sync.destroy();
  assert.equal(Object.hasOwn(workspacePayload({...fresh(),role:'admin',logged:true}),'role'),false);
});

test('server action merges an unrelated newly typed draft and serializes autosave after receipt',async()=>{
  let remote=fresh(),revision=1;const waiting=deferred(),bodies=[];
  const {sync,snapshots}=setup(async(path,options)=>{if(!options?.data)return {state:structuredClone(remote),revision};bodies.push(options.data);remote=options.data.state;revision++;return {revision};});
  await sync.connect('alice');const action=sync.applyExternal(async()=>{await waiting.promise;remote={...remote,tasks:[{id:'server-action'}],planVersion:2};revision=2;return {id:'receipt'};});
  await new Promise(resolve=>setImmediate(resolve));sync.enqueue({...fresh(),aiDraft:'typed while confirming'});waiting.resolve();assert.equal((await action).id,'receipt');assert.equal(snapshots.at(-1).aiDraft,'typed while confirming');assert.equal(snapshots.at(-1).tasks[0].id,'server-action');await sync.flush();assert.equal(bodies.length,1);assert.equal(bodies[0].baseVersion,2);assert.equal(bodies[0].state.tasks.length,1);
});

test('editing plan during a server action preserves local changes as conflict',async()=>{
  let reads=0;const waiting=deferred();const {sync}=setup(async()=>({state:{...fresh(),planVersion:++reads},revision:reads}));await sync.connect('alice');const pending=sync.applyExternal(async()=>{await waiting.promise;return {id:'receipt'};});await new Promise(resolve=>setImmediate(resolve));sync.enqueue({...fresh(),budget:9});waiting.resolve();await assert.rejects(pending,{code:'VERSION_CONFLICT'});assert.equal(sync.current().state.budget,9);assert.equal(sync.current().status,'conflict');
});

test('lost command response pauses autosave and retries the exact original action before newer drafts',async()=>{
  let remote=fresh(),revision=1,calls=0,writes=0;const inputs=[];
  const {sync}=setup(async(path,options)=>{if(!options?.data)return {state:structuredClone(remote),revision};writes++;return {revision:++revision};});
  await sync.connect('alice');
  const action=async input=>{inputs.push(input);calls++;if(calls===1){remote={...remote,tasks:[{id:'once'}],planVersion:2};revision=2;throw Object.assign(Error(),{code:'NETWORK_ERROR'});}return {id:'same-receipt'};};
  await assert.rejects(sync.applyExternal(action),{code:'NETWORK_ERROR'});assert.equal(sync.current().status,'save-error');
  sync.enqueue({...fresh(),aiDraft:'typed after timeout'});await assert.rejects(sync.flush(),{code:'NETWORK_ERROR'});assert.equal(writes,0);
  await sync.retry();assert.deepEqual(inputs,[{owner:'alice',revision:1},{owner:'alice',revision:1}]);assert.equal(sync.current().state.tasks.length,1);assert.equal(sync.current().state.aiDraft,'typed after timeout');
});

test('lost snapshot response re-fetches after known receipt without executing command twice',async()=>{
  let reads=0,calls=0;const {sync}=setup(async()=>{if(++reads===2)throw Object.assign(Error(),{code:'NETWORK_ERROR'});return {state:{...fresh(),planVersion:reads===1?1:2},revision:reads===1?1:2};});
  await sync.connect('alice');await assert.rejects(sync.applyExternal(async()=>{calls++;return {id:'receipt'};}),{code:'NETWORK_ERROR'});
  await sync.retry();assert.equal(calls,1);assert.equal(sync.current().revision,2);assert.equal(sync.current().status,'saved');
});

test('claim edit concurrent with assessment conflicts rather than overwriting the new statement',async()=>{
  const wait=deferred();let remote=fresh();const {sync}=setup(async()=>({state:remote,revision:1}));await sync.connect('alice');
  const pending=sync.applyExternal(async()=>{await wait.promise;remote={...remote,analysis:{id:'server-result'}};return {id:'receipt'};});
  await new Promise(resolve=>setImmediate(resolve));sync.enqueue({...fresh(),claims:[{id:'local-claim'}]});wait.resolve();await assert.rejects(pending,{code:'VERSION_CONFLICT'});assert.equal(sync.current().state.claims[0].id,'local-claim');
});

test('simultaneous confirm clicks cannot replace the recoverable command after its first flush',async()=>{
  const wait=deferred();let firstCalls=0,secondCalls=0;const {sync}=setup(async()=>({state:fresh(),revision:1}));await sync.connect('alice');
  const first=sync.applyExternal(async()=>{firstCalls++;if(firstCalls===1){await wait.promise;throw Object.assign(Error(),{code:'NETWORK_ERROR'});}return {id:'original-receipt'};});
  const second=sync.applyExternal(async()=>{secondCalls++;return {id:'wrong-receipt'};});
  await assert.rejects(second,{code:'AI_BUSY'});const failed=assert.rejects(first,{code:'NETWORK_ERROR'});wait.resolve();await failed;
  assert.equal((await sync.retry()).id,'original-receipt');assert.equal(firstCalls,2);assert.equal(secondCalls,0);
});
