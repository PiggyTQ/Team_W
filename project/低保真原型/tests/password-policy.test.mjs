import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AUTH_POLICY,validateCredentials,passwordCharacterTypes} from '../src/auth-contract.js';
import {createAuthServer} from '../server/auth-server.mjs';
const data=password=>({email:'policy@example.com',password,agree:true,termsVersion:AUTH_POLICY.termsVersion});
test('new passwords require 8–128 code points and at least two of four character types',()=>{
  assert.equal(AUTH_POLICY.minPassword,8);
  for(const password of ['Abcdefgh','abcd1234','abcdefg!','ABCDEFG1','ABCDEFG!','1234567!'])assert.deepEqual(validateCredentials('register',data(password)),{},password);
  for(const password of ['Abc123!','abcdefgh','ABCDEFGH','12345678','!!!!!!!!','abcde   ','\t\nabcdefgh','芝识分子一起探索未来的职业方向和可能','a'.repeat(129)+'1'])assert.equal(validateCredentials('register',data(password)).password,'INVALID_PASSWORD_FORMAT',password);
  assert.deepEqual(validateCredentials('register',data('a'.repeat(127)+'1')),{});
  assert.equal(passwordCharacterTypes('a  \t\u200b'),1);
  assert.equal(passwordCharacterTypes('Aa1!'),4);
  assert.deepEqual(validateCredentials('login',data('aaaaaaaaaaaaaaa')),{});
  assert.deepEqual(validateCredentials('login',data('old')),{});
});
test('HTTP registration and password changes enforce the shared policy; eight-character credentials sign in',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'career-password-')),origin='http://password.test';
  const server=await createAuthServer({database:join(dir,'auth.sqlite'),origin});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+server.address().port,jar=new Map();let csrf='';
  async function request(action,payload){const response=await fetch(base+'/api/auth/'+action,{method:payload?'POST':'GET',headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(payload?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{})},...(payload?{body:JSON.stringify(payload)}:{})});for(const c of response.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');jar.set(k,v);}const body=await response.json();if(body.csrfToken)csrf=body.csrfToken;return {status:response.status,body};}
  await request('session');
  for(const password of ['Abc123!','abcdefgh','12345678','abcde   '])assert.equal((await request('register',data(password))).status,400);
  assert.equal((await request('register',data('Abcd1234'))).status,201);
  assert.equal((await request('change-password',{currentPassword:'Abcd1234',newPassword:'abcdefgh'})).status,400);
  assert.equal((await request('change-password',{currentPassword:'Abcd1234',newPassword:'abcd1234'})).status,200);
  await request('logout',{});
  assert.equal((await request('login',data('Abcd1234'))).status,401);
  assert.equal((await request('login',data('abcd1234'))).status,200);
});
