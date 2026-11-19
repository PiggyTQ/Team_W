import {useEffect,useRef,useState} from 'react';
import {listResourceProjects} from './resource-project-client.js';
import {readStageRecords,stageStorageKey} from './plan-stage-model.js';
import {normalizeReportPlanRecords} from './career-report-model.js';
import {apiRequest} from './auth-client.js';

const pending={uploads:[],planRecords:null,status:'loading',planError:false};
const localSkillCatalog=import.meta.env.VITE_AUTH_MODE==='server'?null:()=>import('./local-skill-tree.js');

export default function useCareerReportSources({enabled,live=false,ownerId,revision}){
 const scope=live?ownerId:'local',scopeRef=useRef(scope),request=useRef(0);
 scopeRef.current=scope;
 const [context,setContext]=useState(pending);
 async function reload(){
  const token=++request.current,owner=scope;let planRecords=null,planError=false;
  try{planRecords=normalizeReportPlanRecords(readStageRecords(localStorage.getItem(stageStorageKey(owner))));}catch{planError=true;}
  try{
   const journeyRead=live?apiRequest('/api/services/career-report-journey'):
    localSkillCatalog?.().then(module=>({getSkillTree:module.localSkillTree}));
   const [uploads,result]=await Promise.all([listResourceProjects({live,ownerId}),journeyRead?.catch(()=>null)]);
   if(scopeRef.current!==owner)throw Object.assign(new Error('ACCOUNT_CHANGED'),{code:'ACCOUNT_CHANGED'});
   const next={owner,uploads,planRecords,status:'ready',planError,...result};if(token===request.current)setContext(next);return next;
  }catch(error){if(scopeRef.current===owner&&token===request.current)setContext({owner,uploads:[],planRecords,status:'error',planError,error});throw error;}
 }
 useEffect(()=>{
  if(!enabled||live&&!ownerId)return;
  setContext(pending);
  reload().catch(()=>{});
  const refresh=()=>reload().catch(()=>{});
  window.addEventListener('focus',refresh);window.addEventListener('storage',refresh);
  return()=>{request.current++;window.removeEventListener('focus',refresh);window.removeEventListener('storage',refresh);};
 },[enabled,live,ownerId,revision]);
 return {...(context.owner===scope?context:pending),live,reload};
}
