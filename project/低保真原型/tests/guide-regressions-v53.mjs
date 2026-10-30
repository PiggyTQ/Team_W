import fs from 'node:fs/promises';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
let failed=false;
for(const [name,file]of [['关键链路','operation-guide-v51.mjs'],['手机英文与焦点','operation-access-v51.mjs']]){
 const dir='检查记录/登录引导_v53/回归/'+name,temp=new URL('.v53-'+file,import.meta.url);await fs.mkdir(dir+'/实际截图',{recursive:true});
 const code=(await fs.readFile(new URL(file,import.meta.url),'utf8')).replaceAll('检查记录/功能按键逐步引导_v51',dir);await fs.writeFile(temp,code);
 try{let log='';const status=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[fileURLToPath(temp)]);child.stdout.on('data',d=>{log+=d;process.stdout.write(d);});child.stderr.on('data',d=>{log+=d;process.stderr.write(d);});child.on('error',reject);child.on('exit',resolve);});await fs.writeFile(dir+'/执行记录.txt',log);if(status!==0)failed=true;}finally{await fs.unlink(temp);}
}
if(failed)process.exitCode=1;
