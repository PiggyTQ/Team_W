import {readFileSync} from 'node:fs';
import {createReviewedKnowledge} from './knowledge.mjs';
export const defaultKnowledgeFile=new URL('../../knowledge/authored-guidance-v1.json',import.meta.url);
export function loadGuidance(file=defaultKnowledgeFile){
  try{const pack=JSON.parse(readFileSync(file,'utf8'));if(!pack||!Array.isArray(pack.sources)||!Array.isArray(pack.chunks)||!Array.isArray(pack.standards))throw new Error();return pack;}
  catch{throw Object.assign(new Error('KNOWLEDGE_UNAVAILABLE'),{code:'KNOWLEDGE_UNAVAILABLE',status:503});}
}
export function reviewedLibrary(file=defaultKnowledgeFile){return createReviewedKnowledge({loadPack:typeof file==='function'?file:()=>loadGuidance(file)});}
