import {useSyncExternalStore} from 'react';
// Public approval metadata only. Never persist this as an account fact or consent.
let digest=null;
const listeners=new Set();
export const getAgentKnowledgeDigest=()=>digest;
export function setAgentKnowledgeDigest(next){
  const value=typeof next==='string'&&/^[a-f0-9]{64}$/.test(next)?next:null;
  if(value===digest)return;digest=value;listeners.forEach(listener=>listener());
}
export const useAgentKnowledgeDigest=()=>useSyncExternalStore(listener=>{listeners.add(listener);return()=>listeners.delete(listener);},getAgentKnowledgeDigest,()=>null);
