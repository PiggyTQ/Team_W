import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {chromium} from '@playwright/test';

const base=process.env.AUTH_TEST_URL||'https://47.250.133.180';
const out=path.resolve('checks/服务器登录部署_20261027');await fs.mkdir(out,{recursive:true});
const nonce=Date.now(),email=`auth-qa-${nonce}@example.com`,password=`  QA ${randomBytes(16).toString('hex')}  `;
const report={base,checks:[],accounts:[],screenshots:[],pageErrors:[]};
const browser=await chromium.launch({channel:'msedge',headless:true,...(process.env.AUTH_TEST_PROXY?{proxy:{server:process.env.AUTH_TEST_PROXY}}:{args:['--no-proxy-server']})});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(()=>{localStorage.setItem('career-prototype-operation-guide-v1',JSON.stringify({active:null,seen:[],enabled:false,neverPrompt:true}));});
const page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push(error.message));
const check=(name)=>{report.checks.push(name);console.log(`PASS ${name}`);};
const screenshot=async name=>{const filename=`${name}.png`;await page.screenshot({path:path.join(out,filename),fullPage:true});report.screenshots.push(filename);};
const logout=async()=>{
  await page.locator('.workspace-utilities summary').click();await page.getByRole('button',{name:'退出',exact:true}).click();
  await page.getByRole('button',{name:'确认操作',exact:true}).click();await page.waitForURL(base+'/');
  const session=await page.evaluate(async()=>{const response=await fetch('/api/auth/session',{cache:'no-store'});return response.json();});assert.equal(session.user,null);
};
const signIn=async()=>{await page.goto(base+'/auth');await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill(password);await page.locator('.auth-submit').click();await page.waitForURL(base+'/app');};
try {
  await page.goto(base+'/auth');await page.locator('.auth-form').waitFor();
  await page.waitForFunction(()=>document.querySelector('.auth-nook-canvas')?.dataset.modelLoaded==='true',null,{timeout:180000});
  check('HTTPS certificate accepted and original 3D model loads');
  await screenshot('desktop-login');
  await page.getByRole('button',{name:'注册',exact:true}).click();
  await page.locator('#auth-email').fill('invalid');await page.locator('#auth-password').fill('short');await page.locator('.auth-submit').click();
  await page.locator('#auth-email-error').waitFor();assert.equal(await page.locator('#auth-password').inputValue(),'short');check('invalid format stays on form and retains password');
  await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill(password);await page.locator('.auth-submit').click();await page.locator('#auth-agree-error').waitFor();check('registration requires explicit consent');
  await page.locator('[name=agree]').check();await screenshot('desktop-register');
  let registerRequests=0;
  await page.route('**/api/auth/register',async route=>{registerRequests++;await new Promise(resolve=>setTimeout(resolve,350));await route.continue();});
  const registrationResponse=page.waitForResponse(r=>r.url().endsWith('/api/auth/register')&&r.request().method()==='POST');
  await page.locator('.auth-submit').click();await page.waitForFunction(()=>document.querySelector('.auth-submit')?.disabled===true);
  assert.equal(await page.locator('.auth-page').getAttribute('data-secret'),'true');
  const registered=await (await registrationResponse).json();report.accounts.push({id:registered.user.id,email:registered.user.email});
  await page.waitForURL(base+'/app');assert.equal(registerRequests,1);check('real registration, single submit, privacy maintained during verification');
  await page.unroute('**/api/auth/register');
  const cookie=(await context.cookies()).find(c=>c.name==='__Host-cg_session');assert.ok(cookie?.secure&&cookie.httpOnly);check('session uses Secure HttpOnly cookie');
  const browserStorage=await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}));assert.equal(browserStorage.includes(password),false);assert.equal(browserStorage.includes(cookie.value),false);assert.equal(browserStorage.includes(email),false);check('credentials and session token absent from browser storage');
  await page.reload();await page.locator('.workspace-utilities').waitFor();assert.equal(await page.locator('dialog.auth-dialog[open]').count(),0);check('refresh restores server session');
  await logout();check('logout revokes the actual server session');
  await page.goto(base+'/auth');await page.locator('#auth-email').fill(email);
  await page.waitForFunction(()=>document.querySelector('.auth-nook-canvas')?.dataset.motionState==='reading',null,{timeout:180000});check('email input triggers reading motion');
  await page.locator('#auth-password').fill(password.trim());
  await page.waitForFunction(()=>Number(document.querySelector('.auth-nook-canvas')?.dataset.eyesClosed)>.98,null,{timeout:15000});check('password focus closes eyes');
  await page.getByRole('button',{name:'显示密码',exact:true}).click();assert.equal(await page.locator('.auth-page').getAttribute('data-secret'),'true');
  await page.getByRole('button',{name:'隐藏密码',exact:true}).click();check('show-password control preserves privacy');
  const wrongResponse=page.waitForResponse(r=>r.url().endsWith('/api/auth/login')&&r.status()===401);
  await page.locator('.auth-submit').click();await wrongResponse;
  await page.locator('#auth-error').waitFor();assert.match(await page.locator('#auth-error').innerText(),/邮箱或密码/);
  assert.equal(await page.locator('#auth-password').inputValue(),password.trim());
  await page.waitForFunction(()=>document.querySelector('.auth-nook-canvas')?.dataset.motionState==='auth-error',null,{timeout:15000});
  await screenshot('desktop-credentials-error');check('real credential mismatch retains input and triggers original error choreography');
  await page.locator('#auth-password').fill(password);
  await page.route('**/api/auth/login',route=>route.abort());await page.locator('.auth-submit').click();await page.getByText('网络连接失败或超时，输入已保留，请重试。',{exact:true}).waitFor();
  assert.equal(await page.locator('#auth-password').inputValue(),password);check('network failure is distinct from invalid credentials and retains input');await page.unroute('**/api/auth/login');
  await page.locator('.auth-submit').click();await page.waitForURL(base+'/app');check('retry with exact password including surrounding spaces succeeds');
  await logout();await page.goto(base+'/auth');await page.getByRole('button',{name:'忘记密码？',exact:true}).click();await page.locator('#auth-email').fill(email);await page.locator('.auth-submit').click();await page.getByText('找回密码邮件服务尚未配置，目前无法发送重置邮件。',{exact:true}).waitFor();check('recovery states that no email service is configured');
  for(const [width,height,lang] of [[390,844,'zh'],[390,844,'en'],[1440,1000,'en']]) {
    await page.setViewportSize({width,height});
    if(lang==='en')await page.getByRole('button',{name:'Use English',exact:true}).last().click();
    await page.locator('.auth-modes button').first().click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await screenshot(`${width}-${lang}-login`);
  }
  check('desktop/mobile Chinese and English have no horizontal page overflow');
  const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const reducedPage=await reduced.newPage();await reducedPage.goto(base+'/auth');await reducedPage.locator('.auth-form').waitFor();await reducedPage.locator('#auth-password').fill('reduced-motion-input');assert.equal(await reducedPage.locator('.auth-page').getAttribute('data-secret'),'true');await reduced.close();check('reduced-motion mode retains semantic password privacy');
  assert.deepEqual(report.pageErrors,[]);check('no JavaScript page errors');
  report.passed=true;
}catch(error){report.passed=false;report.failure=error.message.split('Call log:')[0];await screenshot('failure');throw new Error(report.failure);}
finally{await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,accounts:report.accounts.map(a=>a.email),output:out}));}
