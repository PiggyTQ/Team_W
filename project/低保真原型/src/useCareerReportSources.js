import {useEffect,useRef,useState} from 'react';
import {listResourceProjects} from './resource-project-client.js';
import {readStageRecords,stageStorageKey} from './plan-stage-model.js';
import {normalizeReportPlanRecords} from './career-report-model.js';

export default function useCareerReportSources({enabled,live=false,ownerId}){
 const scope=live?ownerId:'local',scopeRef=useRef(scope),request=useRef(0);
 scopeRef.current=scope;
 const [context,setContext]=useState({uploads:[],planRecords:null,status:'loading',planError:false});
 async function reload(){
  const token=++request.current,owner=scope;let planRecords=null,planError=false;
  try{planRecords=normalizeReportPlanRecords(readStageRecords(localStorage.getItem(stageStorageKey(owner))));}catch{planError=true;}
  try{
   const uploads=await listResourceProjects({live,ownerId});
   if(scopeRef.current!==owner)throw Object.assign(new Error('ACCOUNT_CHANGED'),{code:'ACCOUNT_CHANGED'});
   const next={uploads,planRecords,status:'ready',planError};if(token===request.current)setContext(next);return next;
  }catch(error){if(scopeRef.current===owner&&token===request.current)setContext({uploads:[],planRecords,status:'error',planError,error});throw error;}
 }
 useEffect(()=>{
  if(!enabled||live&&!ownerId)return;
  setContext({uploads:[],planRecords:null,status:'loading',planError:false});
  reload().catch(()=>{});
  const refresh=()=>reload().catch(()=>{});
  window.addEventListener('focus',refresh);window.addEventListener('storage',refresh);
  return()=>{request.current++;window.removeEventListener('focus',refresh);window.removeEventListener('storage',refresh);};
 },[enabled,live,ownerId]);
 return {...context,reload};
}
