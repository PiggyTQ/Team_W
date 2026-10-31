import test from 'node:test';
import assert from 'node:assert/strict';
import {createSuggestionsController,personalSignalKey} from '../src/personal-suggestions-controller.js';
const response=()=>({providerCalled:false,automaticModelCalls:false,adviceKey:'basis',suggestions:[{id:'one',status:'new'}]});
test('suggestions wait for persistence, deduplicate ordinary drafts and preserve feedback across draft saves',async()=>{
 let calls=0;const c=createSuggestionsController({request:async()=>{calls++;return response();},onChange:()=>{}});
 const s={goal:'data',claims:[],tasks:[],claimDraft:{text:'draft'}};const key=personalSignalKey(s);
 assert.equal(key,personalSignalKey({...s,claimDraft:{text:'typing'},reading:{a:2},conversations:[{messages:['private']}]}));
 await c.update('a',key,false);assert.equal(calls,0);await c.update('a',key,true);assert.equal(calls,1);
 await c.feedback('one','dismissed');assert.equal(calls,2);await c.update('a',key,false);assert.equal(c.current().data,null);
 await c.update('a',key,true);assert.equal(calls,2);assert.equal(c.current().data.suggestions[0].status,'dismissed');
 await c.update('a',personalSignalKey({...s,goal:'front'}),true);assert.equal(calls,3);c.destroy();
});
test('account switch and a newer save discard late responses even if transport ignores abort',async()=>{
 const jobs=[];const c=createSuggestionsController({request:()=>new Promise(r=>jobs.push(r)),onChange:()=>{}});
 const a=c.update('a','v1',true),b=c.update('b','v1',true);jobs[1]({...response(),adviceKey:'b'});await b;jobs[0]({...response(),adviceKey:'a'});await a;
 assert.equal(c.current().owner,'b');assert.equal(c.current().data.adviceKey,'b');c.destroy();assert.equal(c.current().data,null);
});
test('stale feedback forces a fresh basis and a failed read requires an explicit retry',async()=>{
 let calls=0;const c=createSuggestionsController({request:async(path)=>{calls++;if(path.endsWith('feedback'))throw {code:'AI_CONTEXT_CHANGED'};return response();},onChange:()=>{}});
 await c.update('a','key',true);await c.feedback('one','not_relevant');assert.equal(calls,3);assert.equal(c.current().status,'ready');
});
