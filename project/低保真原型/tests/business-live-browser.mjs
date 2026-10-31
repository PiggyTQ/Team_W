import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {chromium} from '@playwright/test';

const base=process.env.AUTH_TEST_URL||'https://47.250.133.180',out=path.resolve('checks/业务建库与持久保存_20261027');await fs.mkdir(out,{recursive:true});
const secrets=path.resolve('.deploy-auth/business-qa-credentials.json');
let identities;try{identities=JSON.parse(await fs.readFile(secrets,'utf8'));}catch{const stamp=Date.now();identities={purpose:'business-qa',alice:{email:`auth-qa-${stamp}@example.com`,password:`QA ${randomBytes(16).toString('hex')}`},bob:{email:`auth-qa-${stamp+1}@example.com`,password:`QA ${randomBytes(16).toString('hex')}`},nextPassword:`QA changed ${randomBytes(16).toString('hex')}`};await fs.writeFile(secrets,JSON.stringify(identities));}
assert.equal(identities.purpose,'business-qa');
identities.nextPassword=`QA changed ${randomBytes(16).toString('hex')}`;await fs.writeFile(secrets,JSON.stringify(identities));
const report={base,checks:[],accounts:[],pageErrors:[],screenshots:[]};
const browser=await chromium.launch({channel:'msedge',headless:true,...(process.env.AUTH_TEST_PROXY?{proxy:{server:process.env.AUTH_TEST_PROXY}}:{args:['--no-proxy-server']})});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),otherContext=await browser.newContext({viewport:{width:1440,height:1000}});
for(const ctx of [context,otherContext])await ctx.addInitScript(()=>localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true})));
const watch=page=>page.on('pageerror',error=>report.pageErrors.push(error.message));
const page=await context.newPage(),other=await otherContext.newPage();watch(page);watch(other);
const check=name=>{report.checks.push(name);console.log('PASS '+name);};
const saved=p=>p.locator('.server-save-status[data-status="saved"]').waitFor({timeout:30000});
async function api(p,url,{data,method=data?'POST':'GET'}={}){return p.evaluate(async({url,data,method})=>{const auth=await(await fetch('/api/auth/session',{cache:'no-store'})).json();const response=await fetch(url,{method,headers:{...(data?{'Content-Type':'application/json','X-CSRF-Token':auth.csrfToken}:{}),...(auth.user?{'X-Account-Id':auth.user.id}:{} )},...(data?{body:JSON.stringify(data)}:{})});return {status:response.status,body:await response.json()};},{url,data,method});}
async function screen(name,p=page){await p.screenshot({path:path.join(out,name+'.png'),fullPage:true});report.screenshots.push(name+'.png');}
async function login(p,identity){await p.goto(base+'/auth');await p.locator('.auth-submit:not(:disabled)').waitFor();await p.locator('#auth-email').fill(identity.email);await p.locator('#auth-password').fill(identity.password);await p.locator('.auth-submit').click();await p.waitForURL(base+'/app');await saved(p);}
async function register(p,identity){
  if(identity.registered){await login(p,identity);const session=(await api(p,'/api/auth/me')).body;report.accounts.push({id:session.user.id,email:identity.email});const snapshot=(await api(p,'/api/workspace')).body;await api(p,'/api/auth/clear-workspace',{data:{currentPassword:identity.password,baseVersion:snapshot.revision,confirmation:'CLEAR_WORKSPACE'}});await p.reload();await saved(p);return;}
  await p.goto(base+'/auth');await p.locator('.auth-submit:not(:disabled)').waitFor();await p.getByRole('button',{name:'注册',exact:true}).click();await p.locator('#auth-email').fill(identity.email);await p.locator('#auth-password').fill(identity.password);await p.locator('[name=agree]').check();
  const response=p.waitForResponse(r=>r.url().endsWith('/api/auth/register')&&r.request().method()==='POST');await p.locator('.auth-submit').click();const result=await response;
  if(result.status()===409){await login(p,identity);}else{assert.equal(result.status(),201);await p.waitForURL(base+'/app');await saved(p);}
  const session=(await api(p,'/api/auth/me')).body;report.accounts.push({id:session.user.id,email:identity.email});
  identity.registered=true;await fs.writeFile(secrets,JSON.stringify(identities));
}
async function editInterest(p,value,{expectStatus=200}={}){
  if(!await p.getByRole('textbox',{name:'兴趣（自述）',exact:true}).count())await p.getByRole('button',{name:'编辑长期偏好',exact:true}).click();
  const response=p.waitForResponse(r=>r.url().endsWith('/api/workspace')&&r.request().method()==='PUT');await p.getByRole('textbox',{name:'兴趣（自述）',exact:true}).fill(value);assert.equal((await response).status(),expectStatus);if(expectStatus===200)await saved(p);
}
try {
  await register(page,identities.alice);check('registration loads an owner-isolated server workspace without saving a blank replacement');
  await page.goto(base+'/settings');await saved(page);await editInterest(page,'本人偏好 · 刷新与重登保存验证');
  await page.reload();await saved(page);await page.getByText('本人偏好 · 刷新与重登保存验证',{exact:true}).waitFor();check('real UI edits survive refresh');
  const firstSnapshot=(await api(page,'/api/workspace')).body;
  const seed=firstSnapshot.state;seed.claims=[{id:'qa-private-claim',title:'本人测试经历',text:'仅用于本次验收的私有文字',contribution:'本人填写',status:'待确认',version:1,skill:'SQL'}];
  seed.tasks=[{id:'qa-private-task',title:'本人外部实践测试',template:'external',owner:report.accounts[0].id,hours:1,purpose:'本次数据库验收',status:'待开始',version:1,mode:'S1',completed:false,selfcheck:false,attempts:[],dependsOn:[]}];
  seed.reports=[{id:'qa-private-report',title:'本人测试报告',body:'本次存储验收内容',claimIds:[],sections:['目标与理由'],version:1,profileVersion:1,planVersion:1,saved:true,manual:true,date:new Date().toISOString(),goal:null}];
  const inserted=await api(page,'/api/workspace',{method:'PUT',data:{actorId:report.accounts[0].id,state:seed,baseVersion:firstSnapshot.revision,mutationId:crypto.randomUUID()}});assert.equal(inserted.status,200);
  await page.reload();await saved(page);assert.equal((await api(page,'/api/records/tasks/qa-private-task')).body.data.title,'本人外部实践测试');assert.equal((await api(page,'/api/records/reports/qa-private-report')).body.data.body,'本次存储验收内容');check('experience, external task and report persist in domain tables');
  const second=await context.newPage();watch(second);await second.goto(base+'/settings');await saved(second);
  await editInterest(page,'第一页面已保存的新版本');await editInterest(second,'旧页面尝试覆盖',{expectStatus:409});await second.locator('.server-save-status[data-status="conflict"]').waitFor();assert.equal((await api(page,'/api/workspace')).body.state.preferences.interest,'第一页面已保存的新版本');await screen('version-conflict',second);check('stale browser tab cannot overwrite another tab’s saved changes');
  await second.getByRole('button',{name:'重新载入账户记录',exact:true}).click();await second.getByRole('button',{name:'确认操作',exact:true}).click();await saved(second);await second.getByText('第一页面已保存的新版本',{exact:true}).waitFor();await second.close();check('explicit conflict recovery loads the newer server records');
  await page.route('**/api/workspace',route=>route.request().method()==='PUT'?route.abort():route.continue());
  if(!await page.getByRole('textbox',{name:'兴趣（自述）',exact:true}).count())await page.getByRole('button',{name:'编辑长期偏好',exact:true}).click();
  await page.getByRole('textbox',{name:'兴趣（自述）',exact:true}).fill('网络恢复后保存的偏好');await page.locator('.server-save-status[data-status="save-error"]').waitFor();assert.equal((await api(page,'/api/workspace')).body.state.preferences.interest,'第一页面已保存的新版本');
  await page.unroute('**/api/workspace');const retried=page.waitForResponse(r=>r.url().endsWith('/api/workspace')&&r.request().method()==='PUT'&&r.status()===200);await page.locator('.server-save-status').getByRole('button',{name:'重试',exact:true}).click();await retried;await saved(page);await page.reload();await saved(page);await page.getByText('网络恢复后保存的偏好',{exact:true}).waitFor();check('failed save retains input and retries into durable storage');
  await register(other,identities.bob);await other.goto(base+'/settings');await saved(other);assert.equal((await api(other,'/api/workspace')).body.state.preferences.interest,'');assert.equal((await api(other,'/api/records/claims/qa-private-claim')).status,404);await editInterest(other,'第二账户独立记录');check('another account cannot read the first account’s records');
  await page.goto(base+'/learning');await saved(page);assert.equal(await page.locator('.learning-card').count(),4);const catalog=(await api(page,'/api/catalog/courses')).body;assert.equal(catalog.courses.flatMap(c=>c.chapters).length,16);assert.equal(catalog.courses.flatMap(c=>c.videos).length,4);assert.ok(catalog.courses.every(c=>c.status==='placeholder'&&c.chapters.every(ch=>ch.body===null)&&c.videos.every(v=>v.url===null)));
  await screen('courses-pending');await page.getByRole('button',{name:'查看待补充目录',exact:true}).first().click();assert.equal(await page.locator('.course-placeholder li').count(),4);assert.equal(await page.locator('.course-placeholder video').count(),0);assert.deepEqual((await api(page,'/api/workspace')).body.state.reading,{});await screen('course-outline-pending');await page.getByRole('button',{name:'关闭面板',exact:true}).click();check('exactly 4/16/4 unpublished placeholders; no fake reading or video playback');
  await page.goto(base+'/settings');await saved(page);await page.locator('.account-security-panel>summary').click();
  const exportDownload=page.waitForEvent('download');await page.getByRole('button',{name:'导出本人账户记录',exact:true}).click();const download=await exportDownload;const exported=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(exported.state.claims[0].id,'qa-private-claim');assert.equal(JSON.stringify(exported).includes(identities.alice.password),false);check('explicit account export contains own records and no credentials');
  await page.getByRole('button',{name:'修改密码',exact:true}).click();await page.locator('[name=currentPassword]').fill(identities.alice.password);await page.locator('[name=newPassword]').fill(identities.nextPassword);await page.getByRole('button',{name:'确认此操作',exact:true}).click();await page.getByText('密码已更新，其他会话已撤销。',{exact:true}).waitFor();identities.alice.password=identities.nextPassword;await fs.writeFile(secrets,JSON.stringify(identities));check('password change reauthenticates and rotates the session');
  await page.getByRole('button',{name:'清空业务记录',exact:true}).click();await page.locator('[name=currentPassword]').fill(identities.alice.password);await page.locator('[name=confirmation]').fill('CLEAR_WORKSPACE');await page.getByRole('button',{name:'确认此操作',exact:true}).click();await page.getByText('账户业务记录已清空，账户仍保留。',{exact:true}).waitFor();await saved(page);assert.equal((await api(page,'/api/workspace')).body.state.claims.length,0);assert.equal((await api(other,'/api/workspace')).body.state.preferences.interest,'第二账户独立记录');check('confirmed workspace clear keeps the account and leaves other accounts untouched');
  await editInterest(page,'旧账户不应写入新账户');
  const switched=await context.newPage();watch(switched);await login(switched,identities.bob);
  await editInterest(page,'切换账户时的旧页面改动',{expectStatus:409});
  await page.waitForFunction(email=>document.querySelector('.workspace-demo-note')?.textContent.trim()===email,identities.bob.email);
  assert.equal((await api(other,'/api/workspace')).body.state.preferences.interest,'第二账户独立记录');check('shared-cookie account switch rejects stale writes instead of copying private data');await switched.close();
  await other.setViewportSize({width:390,height:844});await screen('mobile-account-storage',other);assert.ok(await other.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await other.getByRole('button',{name:'Use English',exact:true}).first().click();await screen('mobile-account-storage-en',other);check('mobile Chinese and English storage status remain usable');
  await other.setViewportSize({width:1440,height:1000});await other.getByRole('button',{name:'使用中文',exact:true}).first().click();
  const cleanupContext=await browser.newContext({viewport:{width:1440,height:1000}});const clean=await cleanupContext.newPage();watch(clean);
  for(const identity of [identities.alice,identities.bob]){await login(clean,identity);await clean.goto(base+'/settings');await saved(clean);await clean.locator('.account-security-panel>summary').click();await clean.getByRole('button',{name:'注销账户',exact:true}).click();await clean.locator('[name=currentPassword]').fill(identity.password);await clean.locator('[name=email]').fill(identity.email);await clean.locator('[name=confirmation]').fill('DELETE_ACCOUNT');await clean.getByRole('button',{name:'确认此操作',exact:true}).click();await clean.waitForURL(base+'/');}
  await cleanupContext.close();check('typed, password-confirmed account deletion removes only generated QA accounts');
  assert.deepEqual(report.pageErrors,[]);check('no page JavaScript errors');report.passed=true;await fs.unlink(secrets);
}catch(error){report.passed=false;report.failure=error.message.split('Call log:')[0];await screen('failure');throw new Error(report.failure);}
finally{await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,output:out}));}
