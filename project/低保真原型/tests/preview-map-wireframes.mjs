import http from 'node:http';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const dir=fileURLToPath(new URL('../../设计参考与同步/设计稿/',import.meta.url));
const prefix='U06_个人职业推演地图_v40';
const server=http.createServer(async(req,res)=>{
 try{
  const requested=decodeURIComponent(new URL(req.url,'http://127.0.0.1:5191').pathname).slice(1)||prefix+'.html';
  if(!requested.startsWith(prefix)||requested!==path.basename(requested)||!/^.+\.(html|png)$/.test(requested)){res.writeHead(404).end();return}
  const data=await fs.readFile(path.join(dir,requested));res.writeHead(200,{'Content-Type':requested.endsWith('.png')?'image/png':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404).end('Not found')}
});
server.listen(5191,'127.0.0.1',()=>console.log('Map wireframe preview: http://127.0.0.1:5191/'));
