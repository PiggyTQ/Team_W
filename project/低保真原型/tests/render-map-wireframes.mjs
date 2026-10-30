import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const project=fileURLToPath(new URL('..',import.meta.url));
const dir=path.resolve(project,'../设计参考与同步/设计稿');
const artifact=path.join(dir,'U06_个人职业推演地图_v40.html');
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const results=[],errors=[];
try{
 const p=await b.newPage({viewport:{width:1680,height:1200}});p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(artifact).href);await p.locator('.map-node').first().waitFor();
 const views=[['overview','01_地图全景'],['focus','02_逐层展开'],['evidence','03_作品关联'],['compare','04_双路径比较'],['plan','05_本周推演'],['mobile','06_手机节点详情'],['mobile-evidence','07_手机作品关联']];
 for(const [id,name]of views){
  await p.setViewportSize({width:id.startsWith('mobile')?430:1680,height:1200});
  await p.getByRole('navigation',{name:'查看线框状态'}).getByRole('button',{name:({overview:'地图全景',focus:'逐层展开',evidence:'作品关联',compare:'双路径比较',plan:'本周推演',mobile:'手机 · 节点详情','mobile-evidence':'手机 · 作品关联'})[id],exact:true}).click();
  await p.locator('#board').screenshot({path:path.join(dir,`U06_个人职业推演地图_v40_${name}.png`)});
  const overflow=await p.locator('#board').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,height:el.offsetHeight}));
  assert.ok(overflow.scroll<=overflow.width+1,id+' board overflow');
  results.push({name:id,status:'pass',...overflow});
 }
 await p.setViewportSize({width:1680,height:1200});await p.getByRole('button',{name:'逐层展开',exact:true}).click();
 await p.locator('[data-node="sheet"]').click();assert.equal(await p.locator('.inspector h2').innerText(),'表格工具');
 await p.getByRole('button',{name:'作品关联',exact:true}).click();
 await p.locator('[data-action="pending"]').click();assert.match(await p.locator('.inspector').innerText(),/还待确认/);
 await p.locator('.inspector [data-action="material"]').click();assert.match(await p.locator('.evidence-banner').innerText(),/数据质量报告/);
 const transfer=await p.evaluateHandle(()=>{const dt=new DataTransfer();dt.setData('text/plain','wireframe-material');return dt});
 await p.locator('.canvas').dispatchEvent('drop',{dataTransfer:transfer});assert.equal(await p.locator('.inspector h2').innerText(),'质量问题清单');
 await p.getByRole('button',{name:'本周推演',exact:true}).first().click();await p.getByLabel('每周可用',{exact:true}).fill('1');await p.getByLabel('每周可用',{exact:true}).press('Tab');assert.equal(await p.locator('[data-action="preflight"]').isDisabled(),true);
 await p.getByLabel('每周可用',{exact:true}).fill('3');await p.getByLabel('每周可用',{exact:true}).press('Tab');assert.equal(await p.locator('[data-action="preflight"]').isEnabled(),true);
 assert.equal(await p.evaluate(()=>localStorage.length),0);
 results.push({name:'状态切换、节点详情、未确认材料、拖放替代和预算预演',status:'pass'});
 for(const name of ['地图全景','逐层展开','双路径比较']){
  await p.getByRole('navigation',{name:'查看线框状态'}).getByRole('button',{name,exact:true}).click();
  const graph=(await p.locator('.canvas [data-node]').evaluateAll(nodes=>nodes.map(n=>n.dataset.node))).sort();
  await p.locator('.map-search [data-action="list"]').click();
  const list=(await p.locator('.canvas [data-node]').evaluateAll(nodes=>nodes.map(n=>n.dataset.node))).sort();assert.deepEqual(list,graph,name+' graph/list equivalence');
 }
 results.push({name:'三种桌面图/列表使用同一组节点',status:'pass'});
 await p.setViewportSize({width:390,height:844});await p.goto(pathToFileURL(artifact).href+'#mobile');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.locator('[data-node="sheet"]').focus();await p.locator('[data-node="sheet"]').press('Enter');assert.equal(await p.locator('.inspector h2').innerText(),'表格工具');
 results.push({name:'390手机布局与键盘节点选择',status:'pass'});
 for(const label of ['探索地图','我的材料','对比路径','本周推演']){await p.getByRole('navigation',{name:'地图探索模式'}).getByRole('button',{name:label,exact:true}).click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 results.push({name:'390手机四种模式无整页横向溢出',status:'pass'});
 assert.deepEqual(errors,[]);results.push({name:'脚本运行时错误',status:'pass'});
}finally{await b.close();await fs.mkdir(path.resolve(project,'检查记录/地图线框_v40'),{recursive:true});await fs.writeFile(path.resolve(project,'检查记录/地图线框_v40/线框检查.json'),JSON.stringify({results,errors},null,2));}
console.log(JSON.stringify(results,null,2));
