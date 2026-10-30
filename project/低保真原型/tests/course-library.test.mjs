import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm,cp,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createBusinessStore} from '../server/business-store.mjs';
import {importCoursePack} from '../server/course-library.mjs';
import {createAuthServer} from '../server/auth-server.mjs';
import {fresh,makeTask} from '../src/model.js';
import {submitTaskAttempt} from '../src/task-attempt-model.js';
import {AUTH_POLICY} from '../src/auth-contract.js';

const pack=resolve(process.env.COURSE_PACK_ROOT||'../资料收集/展示资料包_20261027');
function fixture(t){const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('alice'),('bob');");const store=createBusinessStore(db);t.after(()=>db.close());return {db,store};}
const save=(store,state,baseVersion=0)=>store.save('alice',{state,baseVersion,mutationId:randomUUID()});
const courseState=()=>{const s=fresh();s.tasks=[{...makeTask(s,{title:'课程实践',template:'quality',hours:2,purpose:'记录数据质量处理依据',courseVersion:1}),id:'course-task'}];return s;};

test('publish pack atomically and repeat import without changing account records or published version',t=>{
  const {db,store}=fixture(t),state=fresh();state.preferences.interest='保留我的原记录';save(store,state);
  assert.equal(importCoursePack(db,pack).imported,4);const before=store.read('alice');assert.equal(before.state.preferences.interest,state.preferences.interest);assert.equal(before.revision,1);
  const catalog=store.catalog();assert.equal(catalog.notice,'COURSE_LIBRARY_READY');assert.equal(catalog.courses.length,4);assert.equal(catalog.courses.flatMap(c=>c.chapters).length,16);
  for(const c of catalog.courses){assert.equal(c.status,'published');assert.equal(c.chapters.length,4);assert.ok(c.chapters.every(ch=>ch.body.length>400));assert.equal(c.videos[0].status,'external_reference');assert.equal(c.videos[0].playback_verified,false);assert.equal(c.videos[0].duration_seconds,null);assert.ok(c.assets.some(a=>a.role==='input'));assert.ok(c.assets.some(a=>a.role==='rubric'));assert.ok(c.assets.some(a=>a.role==='reference'));}
  assert.equal(importCoursePack(db,pack).unchanged,4);assert.equal(db.prepare("SELECT count(*) n FROM security_events WHERE code='COURSE_PACK_PUBLISHED'").get().n,1);assert.equal(store.read('alice').revision,1);
});
test('mid-publication failure rolls back all four courses, chapters, files and versions',t=>{
  const {db,store}=fixture(t);db.exec("CREATE TRIGGER publication_fault BEFORE UPDATE ON courses WHEN NEW.id='ai-eval' BEGIN SELECT RAISE(ABORT,'injected failure'); END;");
  assert.throws(()=>importCoursePack(db,pack),/injected failure/);assert.ok(store.catalog().courses.every(c=>c.status==='placeholder'&&c.chapters.every(ch=>ch.body===null)));assert.equal(db.prepare('SELECT count(*) n FROM course_versions').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM course_assets').get().n,0);
});
test('source file tampering is rejected before publication and version content is immutable',async t=>{
  const {db,store}=fixture(t),dir=await mkdtemp(join(tmpdir(),'career-course-pack-'));t.after(()=>rm(dir,{recursive:true,force:true}));await cp(pack,dir,{recursive:true});await writeFile(join(dir,'quality_数据质量小项目/chapters/01.md'),'tampered');
  assert.throws(()=>importCoursePack(db,dir),{code:'COURSE_FILE_HASH_MISMATCH'});assert.equal(store.catalog().courses[0].status,'placeholder');
  importCoursePack(db,pack);db.prepare("UPDATE course_versions SET pack_hash='different' WHERE course_id='quality'").run();assert.throws(()=>importCoursePack(db,pack),{code:'COURSE_VERSION_EXISTS'});
});
test('material bytes are pinned, typed as downloads and not addressable by a filesystem path',t=>{
  const {db,store}=fixture(t);importCoursePack(db,pack);const c=store.courseLibrary.course('quality',1),file=c.assets.find(a=>a.filename==='penguins_source.csv'),asset=store.courseLibrary.asset('quality',1,file.id);
  assert.equal(createHash('sha256').update(asset.body).digest('hex'),file.sha256);assert.equal(Buffer.from(asset.body).toString('utf8').split('\n').filter(Boolean).length,345);
  assert.throws(()=>store.courseLibrary.asset('quality',1,'../../auth.sqlite'),{code:'NOT_FOUND'});assert.throws(()=>store.courseLibrary.asset('log',1,file.id),{code:'NOT_FOUND'});assert.throws(()=>store.courseLibrary.course('quality',99),{code:'COURSE_VERSION_UNAVAILABLE'});
});
test('course reading state is owner-isolated and rejects invalid index/version or fake completion',t=>{
  const {db,store}=fixture(t);importCoursePack(db,pack);const s=fresh();s.reading={quality:{chapter:2,chapterId:'quality-chapter-3',version:1}};save(store,s);assert.equal(store.read('alice').state.reading.quality.chapter,2);assert.deepEqual(store.read('bob').state.reading,{});
  for(const position of [{chapter:4,version:1},{chapter:-1,version:1},{chapter:0.5,version:1},{chapter:0,version:1,chapterId:'log-chapter-1'},{chapter:0,version:1,completed:true}])assert.throws(()=>save(store,{...s,reading:{quality:position}},1),{code:'INVALID_READING_POSITION'});
  assert.throws(()=>save(store,{...s,reading:{quality:{chapter:0,version:99}}},1),{code:'COURSE_VERSION_UNAVAILABLE'});assert.equal(store.read('alice').revision,1);
});
test('practice pins course version and attempts, checks budget and guards self-reported completion',t=>{
  const {db,store}=fixture(t);importCoursePack(db,pack);let s=courseState();s.tasks[0].hours=4;assert.throws(()=>save(store,s),{code:'BUDGET_EXCEEDED'});assert.equal(store.read('alice').revision,0);
  s=courseState();save(store,s);s=store.read('alice').state;assert.equal(s.tasks[0].courseRef.id,'quality');assert.equal(s.tasks[0].courseRef.version,1);
  assert.throws(()=>save(store,{...s,tasks:[{...s.tasks[0],status:'完成',completed:true}]},1),{code:'COURSE_COMPLETION_INCOMPLETE'});
  s.tasks[0].draft='Q345按八个字段与Q001重复，记录处理理由；未知岛屿保留。';s.tasks[0].contribution='本人整理问题清单';s=submitTaskAttempt(s,'course-task');assert.equal(s.tasks[0].attempts[0].courseVersion,1);save(store,s,1);
  assert.equal(store.read('alice').state.tasks[0].attempts.length,1);
  s.tasks[0].attempts[0].result='自检记录';s.tasks[0].selfcheck=true;s.tasks[0].check='自检记录';s.tasks[0].status='完成';s.tasks[0].completed=true;save(store,s,2);assert.equal(store.read('alice').state.tasks[0].completed,true);
  const wrong=structuredClone(s);wrong.tasks[0].attempts[0].courseVersion=99;assert.throws(()=>save(store,wrong,3),{code:'INVALID_TASK_ATTEMPT'});
});
test('authenticated HTTP course downloads preserve bytes, protect owner binding and keep AI disabled',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'career-course-api-')),database=join(dir,'auth.sqlite'),origin='http://courses.test';const server=await createAuthServer({database,origin});
  const seed=new DatabaseSync(database);importCoursePack(seed,pack);seed.close();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});});const base='http://127.0.0.1:'+server.address().port;
  const jar=new Map();let csrf='';async function request(path,{data,method=data?'POST':'GET',headers={}}={}){const res=await fetch(base+path,{method,headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(data?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});for(const c of res.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');jar.set(k,v);}const bytes=Buffer.from(await res.arrayBuffer()),body=(res.headers.get('content-type')||'').includes('application/json')?JSON.parse(bytes):null;if(body?.csrfToken)csrf=body.csrfToken;return {res,body,bytes};}
  assert.equal((await request('/api/catalog/courses/quality')).res.status,401);await request('/api/auth/session');const reg=await request('/api/auth/register',{data:{email:'course-test@example.com',password:'Course integration secret phrase!',agree:true,termsVersion:AUTH_POLICY.termsVersion}});assert.equal(reg.res.status,201);
  const c=(await request('/api/catalog/courses/quality?version=1')).body.course,file=c.assets.find(a=>a.filename==='penguins_source.csv');
  const downloaded=await request(file.url);assert.equal(downloaded.res.status,200);assert.equal(createHash('sha256').update(downloaded.bytes).digest('hex'),file.sha256);assert.ok(downloaded.res.headers.get('content-disposition').includes('attachment'));assert.ok(downloaded.res.headers.get('content-type').includes('text/csv'));
  assert.equal((await request(file.url,{headers:{'X-Account-Id':'another-owner'}})).res.status,409);assert.equal((await request('/api/catalog/courses/quality/assets/1/000000000000000000000000')).res.status,404);assert.equal((await request('/api/catalog/courses/quality?version=99')).res.status,404);
  const caps=(await request('/api/system/capabilities')).body;assert.equal(caps.coursesPending,false);assert.equal(caps.publishedCourses,4);assert.equal(caps.ai,false);
  await request('/api/auth/logout',{data:{}});assert.equal((await request(file.url)).res.status,401);
});
