import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAuthServer} from '../server/auth-server.mjs';
import {AUTH_POLICY,validateCredentials,normalizeEmail,safeAuthTarget} from '../src/auth-contract.js';

test('shared email, password, consent and return-address contract',()=>{
  assert.equal(normalizeEmail('  Test+note@Example.COM '),'test+note@example.com');
  for(const email of ['a..b@example.com','.a@example.com','a@localhost','a@-host.com','a@host..com'])assert.equal(validateCredentials('recover',{email}).email,'INVALID_EMAIL');
  const data={email:'a+b@example.com',password:'芝识分子探索2026!',agree:true,termsVersion:AUTH_POLICY.termsVersion};
  assert.deepEqual(validateCredentials('register',data),{});
  assert.ok(validateCredentials('register',{...data,password:'short'}).password);
  assert.ok(validateCredentials('register',{...data,agree:'true'}).agree);
  assert.deepEqual(validateCredentials('login',{email:data.email,password:'old-pass'}),{});
  for(const target of ['https://evil.test','//evil.test','/\\evil.test','/auth','/admin/data','/\n/evil'])assert.equal(safeAuthTarget(target),'/app');
  assert.equal(safeAuthTarget('/careers?tab=compare'),'/careers?tab=compare');
});

test('real account lifecycle, transport, CSRF, exact matching, rotation and revocation',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'career-auth-'));
  let clock=Date.now();
  const server=await createAuthServer({database:join(dir,'auth.sqlite'),origin:'https://career.test',production:true,trustProxy:true,now:()=>clock});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${server.address().port}`;
  const jar=new Map();let csrf='';
  async function request(path,{data,headers={},jarOverride}={}) {
    const response=await fetch(base+'/api/auth/'+path,{method:data?'POST':'GET',headers:{'X-Forwarded-Proto':'https',Origin:'https://career.test',Cookie:jarOverride??[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...(data?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});
    for(const line of response.headers.getSetCookie()){const [name,value]=line.split(';')[0].split('=');jar.set(name,value);assert.match(line,/HttpOnly/);assert.match(line,/Secure/);}
    const body=await response.json();if(body.csrfToken)csrf=body.csrfToken;
    return {response,body};
  }
  assert.equal((await request('session',{headers:{'X-Forwarded-Proto':'http'}})).response.status,403);
  assert.equal((await request('me')).response.status,401);
  assert.equal((await request('session')).body.user,null);
  const data={email:'  Person@Example.COM ',password:'  My unique passphrase 2026!  ',agree:true,termsVersion:AUTH_POLICY.termsVersion};
  assert.equal((await request('register',{data,headers:{Origin:'https://evil.test'}})).response.status,403);
  assert.equal((await request('register',{data,headers:{'X-CSRF-Token':'bad'}})).response.status,403);
  assert.equal((await request('register',{data:{...data,password:'short'}})).response.status,400);
  const registered=await request('register',{data});assert.equal(registered.response.status,201);assert.equal(registered.body.user.email,'person@example.com');
  assert.equal((await request('me')).body.user.id,registered.body.user.id);
  const firstToken=jar.get('__Host-cg_session');
  assert.equal((await request('register',{data})).response.status,409);
  const wrong=await request('login',{data:{...data,password:data.password.trim()}});assert.equal(wrong.body.code,'INVALID_CREDENTIALS');
  const unknown=await request('login',{data:{...data,email:'unknown@example.com'}});assert.equal(unknown.body.code,wrong.body.code);
  assert.equal((await request('login',{data})).response.status,200);
  assert.notEqual(jar.get('__Host-cg_session'),firstToken);
  assert.equal((await request('me',{jarOverride:`__Host-cg_session=${firstToken}`})).response.status,401);
  const activeToken=jar.get('__Host-cg_session');
  await request('logout',{data:{}});
  assert.equal((await request('me',{jarOverride:`__Host-cg_session=${activeToken}`})).response.status,401);
  assert.equal((await request('login',{data})).response.status,200);
  clock+=31*60000;
  assert.equal((await request('me')).response.status,401);
  assert.equal((await request('recover',{data:{email:'person@example.com'}})).body.code,'RECOVERY_UNAVAILABLE');
  const disk=await readFile(join(dir,'auth.sqlite-wal'));
  assert.equal(disk.includes(Buffer.from(data.password)),false);
  assert.equal(disk.includes(Buffer.from(activeToken)),false);
  for(let i=0;i<11;i++){const result=await request('login',{data:{email:'rate@example.com',password:'wrong'}});if(i===10)assert.equal(result.response.status,429);}
});
