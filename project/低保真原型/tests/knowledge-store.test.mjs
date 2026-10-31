import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createKnowledgeStore} from '../server/knowledge-store.mjs';
import {createAuthServer} from '../server/auth-server.mjs';
import {fresh} from '../src/model.js';
import {AUTH_POLICY} from '../src/auth-contract.js';

const database=existsSync('server/data/knowledge.sqlite')?'server/data/knowledge.sqlite':'.deploy-cache/knowledge-v2.sqlite';
test('existing source catalog imports complete counts without upgrading review flags',()=>{
  const k=createKnowledgeStore(database);assert.ok(k);
  try{const s=k.summary();assert.equal(s.counts.profiles,89);assert.equal(s.counts.skills,228);assert.equal(s.counts.jobs,3515);assert.equal(s.counts.mentions,20574);assert.equal(s.counts.relations,45);assert.equal(s.counts.conditions,2172);assert.equal(s.metadata.humanReviewed,false);assert.equal(s.metadata.liveRecruitment,false);assert.equal(s.metadata.sourceManifest.length,9);}finally{k.close();}
});
test('all ten career identifiers resolve to full profiles, directions, levels and citations',()=>{
  const k=createKnowledgeStore(database);
  try{for(const career of ['data','ai','security','ops','frontend','backend','engineering','testing','software','delivery']){const r=k.get('/api/catalog/profiles/'+career,new URLSearchParams());assert.equal(r.profile.career,career);assert.equal(r.profile.human_approved,false);assert.equal(r.profile.public_display_allowed,false);assert.ok(r.children.length>=4);assert.ok(r.skills.length);assert.ok(r.sources.length);assert.ok(r.relations.length);assert.ok(r.action.deliverables.length);}}finally{k.close();}
});
test('jobs support pagination, real fields, domestic/international separation and literal query escaping',()=>{
  const k=createKnowledgeStore(database),query=s=>k.get('/api/catalog/jobs',new URLSearchParams(s));
  try{const a=query('market=CN&limit=15'),b=query('market=CN&limit=15&page=2');assert.equal(a.total,2859);assert.equal(a.items.length,15);assert.ok(!a.items.some(j=>b.items.some(r=>r.id===j.id)));assert.equal(query('market=international_reference').total,656);assert.ok(query('career=data&q=SQL').items.every(j=>j.career==='data'));assert.ok(query('q=%25').total<1000);assert.ok(query('q=%25').total>0);assert.equal(query('q='+encodeURIComponent("' OR 1=1 --")).total,0);assert.equal(query('limit=999').items.length,50);assert.equal(query('page=99999').items.length,0);}finally{k.close();}
});
test('job details retain all per-job condition candidates and redacted display text',()=>{
  const k=createKnowledgeStore(database);
  try{const j=k.get('/api/catalog/jobs/job_002f982180f5cd7f1a7d75f2',new URLSearchParams()).job;assert.ok(j.conditions.length>1);assert.ok(j.conditions.every(c=>c.job_id===j.id));assert.ok(j.skills.length);assert.ok(j.sourceUrl.startsWith('https:'));assert.notEqual(j.originalFlags.publicDisplayAllowed,true);assert.throws(()=>k.get('/api/catalog/jobs/missing',new URLSearchParams()),{code:'NOT_FOUND'});}finally{k.close();}
});
test('rule assessment uses confirmed declared skill references; unknowns never become scores',()=>{
  const k=createKnowledgeStore(database),s=fresh();s.claims=[{id:'ok',version:2,status:'已确认',title:'查询',text:'本人整理查询',skill:'SQL'},{id:'draft',version:1,status:'待确认',text:'Python',skill:'Statistics'}];
  try{const a=k.assess(s,'data');assert.equal(a.claims.length,1);assert.equal(a.skillRows.find(r=>r.name==='SQL').claimRefs[0].id,'ok');assert.equal(a.skillRows.find(r=>r.name==='Statistics').claimRefs.length,0);assert.ok(a.skillRows.every(r=>r.verified===false));assert.equal(a.score,undefined);s.claims[0].status='已撤回';assert.equal(k.assess(s,'data').claims.length,0);}finally{k.close();}
});
test('server report compiles only current confirmed personal facts and identifies source',()=>{
  const k=createKnowledgeStore(database),s=fresh();s.goal='data';s.claims=[{id:'fact',version:3,title:'本人作品',text:'真实输入',contribution:'我的贡献',skill:'SQL',status:'已确认'},{id:'withdrawn',text:'NEVER_EXPORT_THIS',status:'已撤回'}];
  try{const r=k.report(s);assert.ok(r.text.includes('真实输入'));assert.ok(r.text.includes('fact@v3'));assert.ok(!r.text.includes('NEVER_EXPORT_THIS'));assert.ok(r.text.includes('未调用 AI'));assert.ok(r.text.includes('DATA_ANALYST.base.2.0'));s.goal=null;assert.ok(k.report(s).text.includes('目标：尚未选择'));assert.ok(!k.report(s).text.includes('目标：数据分析'));}finally{k.close();}
});
test('catalog/services require session, CSRF and revision, and derive only the logged-in owner',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'career-catalog-')),origin='http://catalog.test';
  const server=await createAuthServer({database:join(dir,'accounts.sqlite'),knowledgeDatabase:database,origin});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+server.address().port;
  function client(){let csrf='';const cookies=new Map();return {async request(path,data,headers={}){const response=await fetch(base+path,{method:data?'POST':'GET',headers:{Origin:origin,Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),...(data?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});for(const c of response.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');cookies.set(k,v);}const body=await response.json();if(body.csrfToken)csrf=body.csrfToken;return {status:response.status,body};}};}
  const a=client(),b=client();assert.equal((await a.request('/api/catalog/summary')).status,401);
  for(const [c,email]of [[a,'catalog-a@example.com'],[b,'catalog-b@example.com']]){await c.request('/api/auth/session');assert.equal((await c.request('/api/auth/register',{email,password:'Catalog test secret phrase!',agree:true,termsVersion:AUTH_POLICY.termsVersion})).status,201);}
  assert.equal((await a.request('/api/catalog/summary')).body.counts.jobs,3515);
  assert.equal((await a.request('/api/services/assessment',{baseVersion:0},{'X-CSRF-Token':'wrong'})).status,403);
  assert.equal((await a.request('/api/services/assessment',{baseVersion:999})).status,409);
  const r=await b.request('/api/services/assessment',{baseVersion:0,userId:'someone-else',state:{claims:[{id:'injected',status:'已确认',skill:'SQL'}]}});assert.equal(r.status,200);assert.equal(r.body.analysis.claims.length,0);
  assert.equal((await a.request('/api/services/report',{baseVersion:0})).status,200);
  const capabilities=(await a.request('/api/system/capabilities')).body;assert.equal(capabilities.ai,false);assert.equal(capabilities.evidenceComparison,true);assert.equal(capabilities.coursesPending,true);
});
