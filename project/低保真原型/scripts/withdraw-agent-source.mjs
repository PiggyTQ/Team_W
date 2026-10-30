// Explicit operator action on a reviewed knowledge file. No network or model use.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createReviewedKnowledge} from '../server/agent/knowledge.mjs';
import {fileURLToPath} from 'node:url';
export function withdrawSource(file,id,{now=()=>new Date().toISOString()}={}){
  const absolute=path.resolve(file),before=fs.readFileSync(absolute,'utf8'),pack=JSON.parse(before);
  const source=pack.sources?.find(s=>s.id===id);
  if(!source)throw new Error('SOURCE_NOT_FOUND');
  if(source.revoked===true)return {duplicate:true,version:pack.version};
  const previous=createReviewedKnowledge({loadPack:()=>pack}).snapshot();
  source.revoked=true;source.revokedAt=now();source.reviewStatus='withdrawn';
  pack.version=`${pack.version}-withdraw-${randomUUID().slice(0,8)}`;
  const next=createReviewedKnowledge({loadPack:()=>pack}).snapshot();
  if(next.chunks.some(c=>c.sourceId===id))throw new Error('WITHDRAWAL_VALIDATION_FAILED');
  const temp=`${absolute}.pending-${randomUUID()}`;
  fs.writeFileSync(temp,JSON.stringify(pack,null,2)+'\n',{flag:'wx',mode:0o600});
  try{
    if(fs.readFileSync(absolute,'utf8')!==before)throw new Error('KNOWLEDGE_VERSION_CONFLICT');
    fs.renameSync(temp,absolute);
  }finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  return {version:pack.version,sourceId:id,previousDigest:previous.digest,digest:next.digest,removedChunks:previous.chunks.length-next.chunks.length,fileSha256:createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [file,id,confirmation]=process.argv.slice(2);
  if(!file||!id||confirmation!=='WITHDRAW_SOURCE')throw new Error('Usage: withdraw-agent-source.mjs knowledge-file source-id WITHDRAW_SOURCE');
  console.log(JSON.stringify(withdrawSource(file,id)));
}
