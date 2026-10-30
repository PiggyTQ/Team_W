import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {chromium} from '@playwright/test';
import {KEY,scenarioState} from '../src/model.js';
import {OPERATION_GUIDE_KEY} from '../src/operation-guide-model.js';

// This uses the shipped engine and models in a separate browser context. The
// enlarged, matched poses expose subpixel surface gaps that a page thumbnail
// conceals. Magenta holes are measured from rendered pixels, not PNG file size.
const base=process.env.CHEESE_PREVIEW_URL||'http://127.0.0.1:5187';
const out=path.resolve('检查记录/芝识分子表面修复_20261025');
const oldFile=path.join(out,'before-source/cheese-original-web.glb');
const newFile=path.resolve('public/mascot/cheese-original-web.glb');
await fs.mkdir(out,{recursive:true});
const errors=[],checks=[],renders=[];
const report={base,checks,errors,renders};

function pixels(png){
  assert.equal(png.subarray(1,4).toString(),'PNG');
  let width,height,channels;const parts=[];
  for(let cursor=8;cursor<png.length;){
    const length=png.readUInt32BE(cursor),type=png.subarray(cursor+4,cursor+8).toString(),data=png.subarray(cursor+8,cursor+8+length);
    if(type==='IHDR'){
      width=data.readUInt32BE(0);height=data.readUInt32BE(4);
      assert.equal(data[8],8);channels=data[9]===6?4:data[9]===2?3:0;
      assert.ok(channels);assert.equal(data[12],0);
    }
    if(type==='IDAT')parts.push(data);cursor+=length+12;
  }
  const raw=inflateSync(Buffer.concat(parts)),stride=width*channels,data=Buffer.alloc(stride*height);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++)for(let x=0;x<stride;x++){
    const filter=raw[y*(stride+1)],left=x>=channels?data[y*stride+x-channels]:0,up=y?data[(y-1)*stride+x]:0,upperLeft=y&&x>=channels?data[(y-1)*stride+x-channels]:0;
    const prediction=filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):filter===4?paeth(left,up,upperLeft):NaN;
    assert.ok(Number.isFinite(prediction));data[y*stride+x]=(raw[y*(stride+1)+1+x]+prediction)&255;
  }
  return {width,height,channels,data};
}

function magentaHoles(png){
  const {width,height,channels,data}=pixels(png),size=width*height,mask=new Uint8Array(size),visited=new Uint8Array(size),queue=new Int32Array(size);
  for(let i=0;i<size;i++)mask[i]=Number(data[i*channels]>210&&data[i*channels+1]<80&&data[i*channels+2]>170);
  const components=[];
  for(let start=0;start<size;start++){
    if(!mask[start]||visited[start])continue;
    let head=0,tail=0,minX=width,maxX=0,minY=height,maxY=0,border=false;
    queue[tail++]=start;visited[start]=1;
    while(head<tail){
      const index=queue[head++],x=index%width,y=Math.floor(index/width);
      minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);
      if(!x||!y||x===width-1||y===height-1)border=true;
      for(const next of [x?index-1:-1,x<width-1?index+1:-1,y?index-width:-1,y<height-1?index+width:-1]){
        if(next>=0&&mask[next]&&!visited[next]){visited[next]=1;queue[tail++]=next;}
      }
    }
    if(!border)components.push({area:tail,minX,maxX,minY,maxY,width:maxX-minX+1,height:maxY-minY+1});
  }
  const small=components.filter(component=>component.area<=64&&component.width<=18&&component.height<=18);
  return {width,height,enclosedComponents:components.length,smallInteriorSpeckles:small.length,smallInteriorPixels:small.reduce((sum,item)=>sum+item.area,0),largeGaps:components.filter(component=>!small.includes(component)),smallComponents:small.slice(0,30)};
}

async function geometry(file){
  const raw=await fs.readFile(file);assert.equal(raw.subarray(0,4).toString(),'glTF');
  let document,binary;
  for(let cursor=12;cursor<raw.length;){
    const size=raw.readUInt32LE(cursor),kind=raw.readUInt32LE(cursor+4),data=raw.subarray(cursor+8,cursor+8+size);
    if(kind===0x4e4f534a)document=JSON.parse(data.toString());if(kind===0x004e4942)binary=data;cursor+=size+8;
  }
  const sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},counts={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
  function accessor(index){
    const attr=document.accessors[index],view=document.bufferViews[attr.bufferView],count=counts[attr.type],bytes=sizes[attr.componentType],stride=view.byteStride||bytes*count,offset=(view.byteOffset||0)+(attr.byteOffset||0);
    const values=[];
    for(let i=0;i<attr.count;i++)for(let c=0;c<count;c++){
      const position=offset+i*stride+c*bytes;
      const value=attr.componentType===5126?binary.readFloatLE(position):attr.componentType===5125?binary.readUInt32LE(position):attr.componentType===5123?binary.readUInt16LE(position):binary.readUInt8(position);
      values.push(value);
    }
    return values;
  }
  const unique=new Map(),edges=new Map(),domains=new Set(),meshParts=new Map((document.nodes||[]).filter(node=>node.mesh!==undefined).map(node=>[node.mesh,node.extras?.cheese_part||0]));let vertices=0,triangles=0;
  for(const [meshIndex,mesh]of document.meshes.entries())for(const primitive of mesh.primitives){
    const positions=accessor(primitive.attributes.POSITION),indices=primitive.indices===undefined?Array.from({length:positions.length/3},(_,i)=>i):accessor(primitive.indices),ids=[];
    const partAttribute=primitive.attributes._CHEESE_PART??primitive.attributes._cheese_part,parts=partAttribute===undefined?null:accessor(partAttribute);
    vertices+=positions.length/3;
    for(let i=0;i<positions.length;i+=3){
      // An independently capped hand and its body may touch at rest. Their
      // coincident contact coordinates belong to separate closed surfaces.
      const part=parts?.[i/3]??meshParts.get(meshIndex)??0;domains.add(part);
      const key=`${positions[i]}|${positions[i+1]}|${positions[i+2]}|${part}`;
      if(!unique.has(key))unique.set(key,unique.size);ids.push(unique.get(key));
    }
    for(let i=0;i<indices.length;i+=3){
      const triangle=indices.slice(i,i+3).map(index=>ids[index]);if(new Set(triangle).size<3)continue;triangles++;
      for(let edge=0;edge<3;edge++){
        const a=triangle[edge],b=triangle[(edge+1)%3],key=a<b?`${a},${b}`:`${b},${a}`;
        edges.set(key,(edges.get(key)||0)+1);
      }
    }
  }
  return {file,sha256:createHash('sha256').update(raw).digest('hex'),bytes:raw.length,vertices,uniqueSpatialVertices:unique.size,topologyDomains:[...domains].sort((a,b)=>a-b),triangles,openEdges:[...edges.values()].filter(count=>count===1).length,nonManifoldEdges:[...edges.values()].filter(count=>count>2).length};
}

async function check(name,run){
  const start=Date.now();
  try{await run();checks.push({name,status:'pass',durationMs:Date.now()-start});console.log('PASS',name);}
  catch(error){checks.push({name,status:'fail',durationMs:Date.now()-start,error:error.stack});console.error('FAIL',name,error.message);}
}

const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
report.browser=browser.version();
try{
  report.sourceHashes=Object.fromEntries(await Promise.all(['src/login-cheese-engine.js','src/login-cheese-motion.js','src/login-cheese-surface.js','src/login-cheese-arms.js','src/login-cheese-eyelids.js','src/login-cheese-book.js'].map(async file=>[file,createHash('sha256').update(await fs.readFile(file)).digest('hex')])));
  await check('closed-surface-topology',async()=>{
    report.geometry={before:await geometry(oldFile),after:await geometry(newFile)};
    assert.ok(report.geometry.before.openEdges>1000,'baseline must reproduce broken exported topology');
    assert.equal(report.geometry.after.openEdges,0,'repaired spatially welded surface must contain no open boundary edges');
    assert.equal(report.geometry.after.nonManifoldEdges,0,'closed part contact domains must not produce non-manifold edges');
  });

  await check('twelve-morph-seams-stay-sealed',async()=>{
    const audit=JSON.parse(await fs.readFile(path.join(out,'pose-seam-audit-cheese-original-web.json'),'utf8'));
    assert.equal(audit.vertices,report.geometry.after.vertices,'morph audit must describe the final installed mesh');
    assert.equal(Object.keys(audit.poses).length,12);
    assert.equal(audit.masksAfter.inconsistentCopies,0);
    for(const [pose,value]of Object.entries(audit.poses)){
      assert.equal(value.separatedCopies,0,`${pose}: duplicated spatial vertices must move together`);
      assert.equal(value.maximumGap,0,`${pose}: deformations must not reopen a material or UV seam`);
    }
    report.poseAudit=audit;
  });

  for(const version of ['before','after'])await check(`enlarged-surface-pixels-${version}`,async()=>{
    const context=await browser.newContext({viewport:{width:1000,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
    try{
      const model=await fs.readFile(version==='before'?oldFile:newFile);
      await context.route('**/mascot/cheese-original-web.glb*',route=>route.fulfill({body:model,contentType:'model/gltf-binary'}));
      if(version==='before')await context.route('**/src/login-cheese-motion.js*',async route=>{
        const response=await route.fetch(),transformed=await response.text(),original=await fs.readFile(path.join(out,'before-source/login-cheese-motion.js'),'utf8');
        // Retain Vite's browser-resolvable dependency URLs while exercising the
        // exact pre-fix renderer/morph implementation saved before this task.
        const source=transformed.slice(0,transformed.indexOf('const MODEL'))+original.slice(original.indexOf('const MODEL'));
        await route.fulfill({response,body:source});
      });
      await context.route('**/surface-verification',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;background:#fffaf0"><div id="surface-host" style="width:900px;height:900px;background:#ff00ff"></div></body></html>'}));
      const page=await context.newPage();page.on('pageerror',error=>errors.push({version,message:error.message}));
      await page.goto(base+'/surface-verification');
      await page.evaluate(async()=>{
        const {createLoginCheeseScene}=await import('/src/login-cheese-motion.js');
        window.surfaceScene=createLoginCheeseScene(document.querySelector('#surface-host'),{instant:true},error=>{throw error;});
      });
      await page.waitForFunction(()=>document.querySelector('#surface-host').dataset.modelLoaded==='true',{timeout:45000});
      await page.waitForTimeout(2300);
      const poses=[['idle',{activity:'idle'}],['reading',{focus:'email'}],['privacy',{focus:'password',secret:true}],['recoil',{reaction:1,reactionActive:true}],['dance',{activity:'dance'}]];
      for(const [pose,state]of poses){
        await page.evaluate(state=>window.surfaceScene.update({instant:true,secret:false,focus:null,error:false,greeting:false,reaction:0,reactionActive:false,activity:'idle',...state}),state);
        await page.waitForTimeout(90);
        const host=page.locator('#surface-host'),snapshot=await host.evaluate(element=>({...element.dataset}));
        assert.equal(snapshot.motionState,pose==='privacy'?'privacy':pose);
        const magenta=await host.screenshot({path:path.join(out,`${version}-${pose}-magenta.png`)}),holes=magentaHoles(magenta);
        await host.evaluate(element=>element.style.background='#fffaf0');
        await host.screenshot({path:path.join(out,`${version}-${pose}-normal.png`)});
        await host.evaluate(element=>element.style.background='#ff00ff');
        renders.push({version,pose,holes,snapshot});
      }
      await page.evaluate(()=>window.surfaceScene.dispose());
    }finally{await context.close();}
  });

  await check('rendered-surface-interior-speckles-reduced',async()=>{
    let before=0,after=0;
    for(const pose of ['idle','reading','privacy','recoil','dance']){
      const old=renders.find(item=>item.version==='before'&&item.pose===pose),current=renders.find(item=>item.version==='after'&&item.pose===pose);
      assert.ok(old&&current,`matched ${pose} renders must exist`);
      before+=old.holes.smallInteriorPixels;after+=current.holes.smallInteriorPixels;
      assert.ok(current.holes.smallInteriorPixels<=Math.max(4,old.holes.smallInteriorPixels*.25),`${pose}: small interior magenta pixels must fall by at least 75%`);
    }
    report.renderedInteriorPixels={before,after,reduction:before?1-after/before:0};
    assert.ok(before>20,'high contrast baseline must expose the reported holes');
    assert.ok(after<=before*.1,'small interior magenta pixels must fall by at least 90% across poses');
  });

  await check('readable-before-after-comparison',async()=>{
    const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
    try{
      const before=(await fs.readFile(path.join(out,'before-reading-normal.png'))).toString('base64'),after=(await fs.readFile(path.join(out,'after-reading-normal.png'))).toString('base64');
      const page=await context.newPage();
      await page.setContent(`<!doctype html><html lang="zh"><style>body{margin:0;background:#f8f3e8;font-family:Arial,"Microsoft YaHei",sans-serif;color:#243947}main{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:26px 32px}figure{margin:0}figcaption{font-size:21px;font-weight:600;margin-bottom:8px}img{display:block;width:598px;height:598px;object-fit:contain;background:#fffaf0}p{font-size:14px;line-height:1.5;margin:7px 0 0}</style><main><figure><figcaption>修复前 · 原始网页模型</figcaption><img src="data:image/png;base64,${before}"><p>表面存在密集的背景穿透点</p></figure><figure><figcaption>修复后 · 表面与阅读动作</figcaption><img src="data:image/png;base64,${after}"><p>封闭漏面并重建粘连处，保留角色特征和交互动作</p></figure></main></html>`);
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()));});
      await page.screenshot({path:path.join(out,'surface-before-after-reading.png')});
    }finally{await context.close();}
  });

  for(const width of [1280,390])await check(`login-active-animation-layout-${width}`,async()=>{
    const context=await browser.newContext({viewport:{width,height:width===390?844:900},deviceScaleFactor:1});
    try{
      const state=scenarioState('PT01');state.logged=false;state.onboard=true;
      await context.addInitScript(({KEY,state,guideKey})=>{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(guideKey,JSON.stringify({enabled:false,neverPrompt:true,seen:['home','explore'],active:null}));},{KEY,state,guideKey:OPERATION_GUIDE_KEY});
      const page=await context.newPage();page.on('pageerror',error=>errors.push({width,message:error.message}));
      await page.goto(base+'/auth',{waitUntil:'networkidle'});
      await page.locator('.auth-nook-scene[data-renderer="ready"]').waitFor({timeout:45000});
      const host=page.locator('.auth-nook-canvas');
      await page.locator('#auth-email').fill('surface@example.com');
      await page.waitForFunction(()=>document.querySelector('.auth-nook-canvas')?.dataset.motionState==='reading'&&Number(document.querySelector('.auth-nook-canvas').dataset.bookOpen)>.9);
      const a=await host.screenshot();await page.waitForTimeout(260);const b=await host.screenshot();
      assert.ok(!a.equals(b),'active reading must continue rendering movement after the surface repair');
      await page.locator('#auth-password').fill('surface-demo');
      await page.waitForFunction(()=>{
        const host=document.querySelector('.auth-nook-canvas');
        return Number(host?.dataset.eyesClosed)>.95&&Number(host?.dataset.bookOpen)<.03&&JSON.parse(host?.dataset.poseSnapshot||'{}').cover>.9;
      });
      assert.equal(await page.locator('#auth-password').inputValue(),'surface-demo');
      assert.ok(await page.locator('.auth-submit').isVisible());
      const metric=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
      assert.ok(metric.scroll<=metric.width+1,'login must fit the viewport without horizontal overflow');
      await page.screenshot({path:path.join(out,`repaired-login-${width}.png`)});
    }finally{await context.close();}
  });
}finally{
  report.completedAt=new Date().toISOString();report.failed=checks.filter(item=>item.status==='fail').length;
  await fs.writeFile(path.join(out,'surface-verification.json'),JSON.stringify(report,null,2));
  await browser.close();
}
console.log(JSON.stringify({checks:checks.length,failed:report.failed,pageErrors:errors.length,evidence:out}));
if(report.failed||errors.length)process.exitCode=1;
