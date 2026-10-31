import {createCipheriv,createDecipheriv,randomBytes,randomUUID,createHash} from 'node:crypto';
import {createReadStream,createWriteStream,constants} from 'node:fs';
import {open,appendFile,unlink,copyFile,stat} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
const keyBytes=key=>{if(!/^[a-fA-F0-9]{64}$/.test(key||''))throw Error('BACKUP_KEY_REQUIRED');return Buffer.from(key,'hex');};
export async function encryptBackup(input,output,key){
 const secret=keyBytes(key),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret,iv);let created=false;
 try{const f=await open(output,'wx',0o600);created=true;await f.write(Buffer.concat([Buffer.from('CGBK1'),iv]));await f.close();
 await pipeline(createReadStream(input),cipher,createWriteStream(output,{flags:'a',mode:0o600}));await appendFile(output,cipher.getAuthTag());
 const hash=createHash('sha256');for await(const block of createReadStream(output))hash.update(block);return {format:'CGBK1',bytes:(await stat(output)).size,sha256:hash.digest('hex')};
 }catch(e){if(created)await unlink(output).catch(()=>{});throw e;}
}
export async function decryptBackup(input,output,key){
 const secret=keyBytes(key),f=await open(input,'r');let header,tag,size;
 try{size=(await f.stat()).size;if(size<33)throw Error('INVALID_BACKUP');header=Buffer.alloc(17);tag=Buffer.alloc(16);await f.read(header,0,17,0);await f.read(tag,0,16,size-16);}finally{await f.close();}
 if(header.subarray(0,5).toString()!=='CGBK1')throw Error('INVALID_BACKUP');const cipher=createDecipheriv('aes-256-gcm',secret,header.subarray(5));cipher.setAuthTag(tag);
 const temp=output+'.verify-'+randomUUID();try{await pipeline(createReadStream(input,{start:17,end:size-17}),cipher,createWriteStream(temp,{flags:'wx',mode:0o600}));await copyFile(temp,output,constants.COPYFILE_EXCL);}finally{await unlink(temp).catch(()=>{});}
 return {authenticated:true};
}
