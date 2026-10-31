import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const out=new URL('../checks/AI业务闭环_20261028/production/',import.meta.url),root=fileURLToPath(new URL('../',import.meta.url)),workspace=path.resolve(root,'../..');
const encodedRoot=path.join(workspace,'project',encodeURIComponent('低保真原型'));
const initial=JSON.parse(await fs.readFile(new URL('browser-report.initial.json',out),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');let removed=0;
for(const name of initial.screenshots){
 if(!/^[a-z0-9-]+\.png$/.test(name))throw new Error('Invalid screenshot name');
 const url=new URL(name,out),old=path.resolve(url.pathname.replace(/^\/([A-Za-z]:)/,'$1')),current=fileURLToPath(url);
 if(!old.startsWith(encodedRoot+path.sep)||!current.startsWith(workspace+path.sep)||old===current)throw new Error('Path outside expected screenshot workspace');
 let data;try{data=await fs.readFile(old);}catch(e){if(e.code==='ENOENT')continue;throw e;}
 if(sha(data)!==sha(await fs.readFile(current)))throw new Error('Screenshot duplicate mismatch');
 await fs.unlink(old);removed++;
 let directory=path.dirname(old);while(directory===encodedRoot||directory.startsWith(encodedRoot+path.sep)){try{await fs.rmdir(directory);}catch{break;}directory=path.dirname(directory);}
}
console.log(JSON.stringify({verifiedDuplicateScreenshotsRemoved:removed,recursiveDelete:false}));
