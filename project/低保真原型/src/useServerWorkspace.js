import {useEffect,useRef,useState} from 'react';
import {apiRequest,SERVER_AUTH} from './auth-client';
import {createWorkspaceSync} from './workspace-sync';

export function useServerWorkspace(user,state,setState){
  const [sync,setSync]=useState({status:SERVER_AUTH?'idle':'local',revision:0,error:null});
  const [catalog,setCatalog]=useState(null),[catalogError,setCatalogError]=useState(null),[catalogEpoch,setCatalogEpoch]=useState(0),controller=useRef(null),setter=useRef(setState);setter.current=setState;
  if(!controller.current)controller.current=createWorkspaceSync({request:apiRequest,onSnapshot:value=>setter.current({...value,logged:true}),onStatus:setSync});
  useEffect(()=>{
    if(!SERVER_AUTH)return;
    const syncController=controller.current;syncController.connect(user?.id||null).catch(()=>{});
    let active=true;const request=new AbortController();setCatalog(null);setCatalogError(null);
    if(user)apiRequest('/api/catalog/courses',{signal:request.signal}).then(value=>{if(active)setCatalog(value);}).catch(error=>{if(active&&!request.signal.aborted)setCatalogError(error.code);});
    return()=>{active=false;request.abort();};
  },[user?.id,catalogEpoch]);
  useEffect(()=>{if(SERVER_AUTH&&user?.id&&state.logged)controller.current.enqueue(state);},[state,user?.id]);
  useEffect(()=>{
    if(!SERVER_AUTH)return;
    const before=event=>{if(controller.current.current().dirty){event.preventDefault();event.returnValue='';}};
    const hidden=()=>{if(document.visibilityState==='hidden')controller.current.flush().catch(()=>{});};
    window.addEventListener('beforeunload',before);document.addEventListener('visibilitychange',hidden);
    return()=>{window.removeEventListener('beforeunload',before);document.removeEventListener('visibilitychange',hidden);controller.current.destroy();};
  },[]);
  const command=async(type,payload={})=>{
    if(SERVER_AUTH&&user?.id&&state.logged)controller.current.enqueue(state);
    const mutationId=crypto.randomUUID();
    return controller.current.applyExternal(({revision})=>apiRequest('/api/commands',{data:{type,payload,baseVersion:revision,mutationId}}));
  };
  return {...sync,catalog,catalogError,command,retryCatalog:()=>setCatalogEpoch(x=>x+1),ready:['saved','pending','saving','save-error','conflict','expired'].includes(sync.status),flush:()=>{if(SERVER_AUTH&&user?.id&&state.logged)controller.current.enqueue(state);return controller.current.flush();},applyExternal:action=>controller.current.applyExternal(action),retry:()=>controller.current.retry(),reload:()=>controller.current.reload(),current:()=>controller.current.current()};
}
