// No polling, provider calls or persistent private browser cache.
export function personalSignalKey(s){
  return JSON.stringify([s.goal,s.budget,s.stage,(s.claims||[]).map(c=>[c.id,c.version,c.status,c.taskId,c.status==='已确认'?[c.text,c.contribution,c.skill,c.withdrawnThrough]:null]),
    (s.education||[]).map(e=>[e.id,e.version,e.status]),(s.tasks||[]).map(t=>[t.id,t.version,t.status,t.completed,t.hours,t.dependsOn,t.attempts?.map(a=>[a.id,a.version,a.result]),t.claimStatus]),(s.reviews||[]).map(r=>[r.id,r.version,r.taskId])]);
}
export function createSuggestionsController({request,onChange}){
  let owner=null,key=null,loaded=null,loadedData=null,generation=0,controller=null,value={status:'idle',data:null,error:null},pending=null;
  const emit=patch=>{value={...value,...patch,owner};onChange(value);};
  function reset(next){controller?.abort();controller=null;generation++;owner=next;key=loaded=null;loadedData=null;pending=null;emit({status:'idle',data:null,error:null});}
  async function update(nextOwner,nextKey,ready,{force=false}={}){
    if(nextOwner!==owner)reset(nextOwner);
    key=nextKey;
    if(!owner)return;
    if(!ready){controller?.abort();controller=null;generation++;pending=null;emit({status:'waiting',data:null,error:null});return;}
    if(!force&&loaded===key){emit({status:'ready',data:loadedData,error:null});return;}
    if(!force&&pending===key)return;
    controller?.abort();controller=new AbortController();const current=++generation,actor=owner,basis=key;pending=basis;
    emit({status:'loading',data:null,error:null});
    try{
      const data=await request('/api/agent/suggestions',{signal:controller.signal});
      if(current!==generation||actor!==owner)return;
      if(data.providerCalled!==false||data.automaticModelCalls!==false||!Array.isArray(data.suggestions))throw Object.assign(new Error('INVALID_RESPONSE'),{code:'SERVICE_UNAVAILABLE'});
      loaded=basis;loadedData=data;emit({status:'ready',data,error:null});
    }catch(error){if(current===generation)emit({status:'error',data:null,error:error.code||'NETWORK_ERROR'});}
    finally{if(current===generation)pending=null;}
  }
  async function feedback(id,status){
    if(value.status!=='ready'||!value.data)return;
    const actor=owner,current=generation,basis=key,adviceKey=value.data.adviceKey;
    emit({status:'feedback',error:null});
    try{
      await request('/api/agent/suggestions/feedback',{data:{adviceKey,suggestionId:id,status}});
      if(current!==generation||actor!==owner)return;
      loadedData={...value.data,suggestions:value.data.suggestions.map(row=>row.id===id?{...row,status}:row)};emit({status:'ready',data:loadedData});
    }catch(error){if(current===generation){emit({status:'error',data:null,error:error.code||'NETWORK_ERROR'});if(error.code==='AI_CONTEXT_CHANGED')await update(actor,basis,true,{force:true});}}
  }
  return {update,feedback,current:()=>value,destroy:()=>reset(null)};
}
