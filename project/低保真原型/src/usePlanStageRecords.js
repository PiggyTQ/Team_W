import {useEffect,useRef,useState} from 'react';
import {emptyStageRecords,readStageRecords,stageStorageKey} from './plan-stage-model.js';

export default function usePlanStageRecords(scope){
 const key=stageStorageKey(scope),initial=useRef();
 if(!initial.current){try{initial.current={records:readStageRecords(localStorage.getItem(key)),status:'saved'};}catch{initial.current={records:emptyStageRecords(),status:'unreadable'};}}
 const [records,setRecords]=useState(initial.current.records),[storageStatus,setStorageStatus]=useState(initial.current.status),current=useRef(records),blocked=useRef(initial.current.status==='unreadable');current.current=records;
 useEffect(()=>{const changed=e=>{if(e.key!==key)return;try{const next=readStageRecords(e.newValue);current.current=next;setRecords(next);blocked.current=false;setStorageStatus('saved');}catch{blocked.current=true;setStorageStatus('unreadable');}};window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);},[key]);
 const store=change=>{
  const next=typeof change==='function'?change(current.current):change;
  current.current=next;setRecords(next);
  if(blocked.current){setStorageStatus('unreadable');return false;}
  try{localStorage.setItem(key,JSON.stringify(next));setStorageStatus('saved');return true;}catch{setStorageStatus('temporary');return false;}
 };
 return{records,store,storageStatus};
}
