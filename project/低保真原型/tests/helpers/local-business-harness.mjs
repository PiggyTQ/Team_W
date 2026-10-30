import http from 'node:http';
import fs from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createAuthServer} from '../../server/auth-server.mjs';
import {createAgentService} from '../../server/agent/service.mjs';
import {importCoursePack} from '../../server/course-library.mjs';

export async function localBusinessHarness(options={}){
  const dir=await fs.mkdtemp(path.join(tmpdir(),'career-business-ui-')),dist=await fs.realpath('dist');let apiPort;
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2','.glb':'model/gltf-binary','.mp3':'audio/mpeg'};
  const web=http.createServer(async(req,res)=>{
    if(req.url.startsWith('/api/')){const upstream=http.request({hostname:'127.0.0.1',port:apiPort,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end('{}');});req.pipe(upstream);return;}
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(/[\\\u0000]/.test(pathname))throw Error();
      let file=path.resolve(dist,'.'+pathname);if(!file.startsWith(dist+path.sep)&&file!==dist)throw Error();
      let stat;try{stat=await fs.stat(file);}catch{}
      if(!stat?.isFile()){if(path.extname(pathname)){res.writeHead(404);res.end();return;}file=path.join(dist,'index.html');}
      const actual=await fs.realpath(file);if(!actual.startsWith(dist+path.sep))throw Error();
      res.writeHead(200,{'Content-Type':mime[path.extname(actual)]||'application/octet-stream','Cache-Control':'no-store'});createReadStream(actual).pipe(res);
    }catch{res.writeHead(400);res.end();}
  });
  await new Promise(r=>web.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${web.address().port}`;
  const database=path.join(dir,'auth.sqlite'),knowledgeDatabase=existsSync('server/data/knowledge.sqlite')?'server/data/knowledge.sqlite':'.deploy-cache/knowledge-v2.sqlite';
  const api=await createAuthServer({database,knowledgeDatabase,origin:base,production:false,trustProxy:false,agentFactory:business=>createAgentService({business}),...options});
  const seed=new DatabaseSync(database);importCoursePack(seed,path.resolve('../资料收集/展示资料包_20261027'));seed.close();
  await new Promise(r=>api.listen(0,'127.0.0.1',r));apiPort=api.address().port;
  return {base,database,close:async()=>{await new Promise(r=>web.close(r));await new Promise(r=>api.close(r));const resolved=path.resolve(dir);if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('career-business-ui-'))await fs.rm(resolved,{recursive:true,force:true});}};
}
