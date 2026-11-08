import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const origin=process.env.CAREER_PREVIEW_ORIGIN||'http://127.0.0.1:5184';
const browser=await chromium.launch({channel:process.env.CAREER_BROWSER_CHANNEL||'msedge',headless:true});
try{
 async function fixture({sessionOwner='alice',switchAfterListing=false}={}){
  const page=await browser.newPage();let owner=sessionOwner;const requests=[];
  await page.exposeFunction('switchResourceOwner',()=>{owner='bob';});
  await page.route('**/api/**',async route=>{
   const request=route.request(),url=new URL(request.url());requests.push({path:url.pathname,query:url.search,method:request.method(),data:request.postDataJSON()});
   if(url.pathname==='/api/auth/session'){await route.fulfill({json:{user:{id:owner},csrfToken:'resource-test-csrf'}});return;}
   if(url.pathname.startsWith('/api/resource-projects')){
    const expected=url.searchParams.get('ownerId'),actor=request.postDataJSON()?.actorId;
    if(expected&&expected!==owner||actor&&actor!==owner){await route.fulfill({status:409,json:{code:'ACCOUNT_CHANGED'}});return;}
    if(url.pathname==='/api/resource-projects'&&request.method()==='GET'){
     const snapshot={ownerId:owner,items:[{id:'known-project',file:{name:'project.txt'}}]};
     if(switchAfterListing)owner='bob';await route.fulfill({json:snapshot});return;
    }
    await route.fulfill({json:{project:{id:'unexpected-success'}}});return;
   }
   await route.fulfill({status:404,json:{code:'NOT_FOUND'}});
  });
  await page.goto(origin);return {page,requests};
 }
 {
  const {page,requests}=await fixture({sessionOwner:'bob'});
  const code=await page.evaluate(async()=>{const {uploadResourceProject}=await import('/src/resource-project-client.js');try{await uploadResourceProject({title:'旧账户项目',description:'旧账户完成的文件',completed:true},new File(['old-owner'],'project.txt'),{live:true,ownerId:'alice'});return 'SAVED';}catch(error){return error.code;}});
  assert.equal(code,'ACCOUNT_CHANGED');assert.equal(requests.some(item=>item.path==='/api/resource-projects'&&item.method==='POST'),false);await page.close();
 }
 {
  const {page,requests}=await fixture();
  const code=await page.evaluate(async()=>{
   const OriginalFileReader=window.FileReader;
   window.FileReader=class extends OriginalFileReader{readAsDataURL(file){const loaded=this.onload;this.onload=async event=>{await window.switchResourceOwner();loaded.call(this,event);};super.readAsDataURL(file);}};
   const {uploadResourceProject}=await import('/src/resource-project-client.js');try{await uploadResourceProject({title:'读取期间切换',description:'文件读取期间切换账户',completed:true},new File(['old-owner'],'project.txt'),{live:true,ownerId:'alice'});return 'SAVED';}catch(error){return error.code;}finally{window.FileReader=OriginalFileReader;}
  });
  assert.equal(code,'ACCOUNT_CHANGED');const post=requests.find(item=>item.path==='/api/resource-projects'&&item.method==='POST');assert.equal(post.data.actorId,'alice');assert.match(post.query,/ownerId=alice/);await page.close();
 }
 {
  const {page,requests}=await fixture({switchAfterListing:true});
  const code=await page.evaluate(async()=>{const {downloadResourceProject}=await import('/src/resource-project-client.js');try{await downloadResourceProject('known-project',{live:true});return 'DOWNLOADED';}catch(error){return error.code;}});
  assert.equal(code,'ACCOUNT_CHANGED');assert.match(requests.find(item=>item.path.endsWith('/file')).query,/ownerId=alice/);await page.close();
 }
 console.log('PASS resource client: owner bound before initial session read, upload FileReader race rejected, download metadata owner retained across binary request.');
}finally{await browser.close();}
