import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const specs=[['atlas-flow-check.mjs','地图支线_v42','成果闭环回归'],['atlas-final-check.mjs','地图支线_v42','恢复与可访问回归'],['flow-navigation-check.mjs','统一流程导航','通用导航回归']];
let failed=false;
for(const [name,old,target]of specs){
 const temp=new URL('.v43-'+name,import.meta.url),dir='检查记录/地图交互复核_v43/'+target;
 const source=(await fs.readFile(new URL(name,import.meta.url),'utf8')).replaceAll('检查记录/'+old,dir).replaceAll('127.0.0.1:5174','127.0.0.1:5184').replaceAll('headless:true}','headless:true,args:["--no-proxy-server"]}').replaceAll('先带缺项复盘','先整理已有探索记录');
 await fs.mkdir(dir,{recursive:true});await fs.writeFile(temp,source);
 try{let output='';const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[fileURLToPath(temp)]);child.stdout.on('data',d=>{process.stdout.write(d);output+=d;});child.stderr.on('data',d=>{process.stderr.write(d);output+=d;});child.on('error',reject);child.on('exit',resolve);});await fs.writeFile(dir+'/执行记录.txt',output);if(code!==0)failed=true;}finally{await fs.unlink(temp);}
}
if(failed)process.exitCode=1;
