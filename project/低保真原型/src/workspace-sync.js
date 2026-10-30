const transient=new Set(['logged','role','adminSource','adminContent','audit','scenario']);
export function workspacePayload(state){return Object.fromEntries(Object.entries(state).filter(([key])=>!transient.has(key)));}
export function createWorkspaceSync({request,onSnapshot,onStatus=()=>{},delay=600,schedule=setTimeout,cancel=clearTimeout}) {
  let owner=null,revision=0,ready=false,latest=null,saved=null,failed=null,inFlight=null,timer=null,generation=0,controller=null,recovery=null,status='idle',externalRun=null,externalRecovery=null;
  const notify=(next,error)=>{status=next;onStatus({status:next,revision,error:error?.code||null});};
  const dirty=()=>Boolean(failed||latest!==saved);
  const stop=()=>{if(timer)cancel(timer);timer=null;controller?.abort();controller=null;generation++;};
  async function connect(nextOwner,{discard=false}={}) {
    const previousOwner=owner;if(previousOwner&&dirty())recovery={owner:previousOwner,latest,revision};
    stop();owner=nextOwner;ready=false;failed=null;inFlight=null;latest=saved=null;externalRecovery=null;
    if(!owner){notify('idle');return;}
    if(recovery&&recovery.owner!==owner)recovery=null;
    const current=generation;controller=new AbortController();notify('loading');
    try {
      const result=await request('/api/workspace',{signal:controller.signal});
      if(current!==generation)return;
      revision=result.revision;saved=JSON.stringify(workspacePayload(result.state));latest=saved;ready=true;
      if(!discard&&recovery?.owner===owner&&recovery.latest){
        latest=recovery.latest;onSnapshot(JSON.parse(latest));
        if(recovery.revision!==revision){failed={conflict:true};notify('conflict',{code:'VERSION_CONFLICT'});return;}
      }else onSnapshot(result.state);
      recovery=null;notify(dirty()?'pending':'saved');if(dirty())timer=schedule(()=>flush().catch(()=>{}),delay);
    }catch(error){if(current===generation)notify('load-error',error);throw error;}
  }
  function enqueue(state) {
    if(!ready||!owner)return;
    latest=JSON.stringify(workspacePayload(state));
    if(latest===saved&&!failed){notify('saved');return;}
    if(failed&&!failed.external&&!failed.conflict&&latest!==failed.body&&!['NETWORK_ERROR','SERVICE_UNAVAILABLE','SESSION_EXPIRED','RATE_LIMITED'].includes(failed.errorCode))failed=null;
    if(failed)return;
    notify('pending');if(timer)cancel(timer);if(!externalRun)timer=schedule(()=>flush().catch(()=>{}),delay);
  }
  async function flush() {
    if(timer)cancel(timer);timer=null;
    if(externalRun){await externalRun;return flush();}
    if(inFlight){await inFlight;if(dirty()&&!failed)return flush();return;}
    if(!ready||!owner||!dirty())return;
    if(failed?.conflict)throw Object.assign(new Error('VERSION_CONFLICT'),{code:'VERSION_CONFLICT'});
    if(failed?.external)throw Object.assign(new Error(failed.errorCode),{code:failed.errorCode});
    const current=generation,actor=owner;
    const job=failed||{body:latest,mutationId:crypto.randomUUID(),baseVersion:revision};
    notify('saving');
    const run=async()=>{
      try {
        const result=await request('/api/workspace',{method:'PUT',data:{actorId:actor,state:JSON.parse(job.body),baseVersion:job.baseVersion,mutationId:job.mutationId}});
        if(current!==generation||actor!==owner)return;
        revision=result.revision;saved=job.body;failed=null;notify(latest===saved?'saved':'pending');
      }catch(error){
        if(current===generation&&actor===owner){failed={...job,errorCode:error.code,...(error.code==='VERSION_CONFLICT'?{conflict:true}:{})};notify(error.code==='VERSION_CONFLICT'?'conflict':['SESSION_EXPIRED','ACCOUNT_CHANGED'].includes(error.code)?'expired':'save-error',error);}
        throw error;
      }
    };
    inFlight=run();try{await inFlight;}finally{if(current===generation)inFlight=null;}
    if(current===generation&&dirty()&&!failed)return flush();
  }
  async function applyExternal(action){
    if(externalRun)throw Object.assign(new Error('AI_BUSY'),{code:'AI_BUSY'});
    await flush();
    if(externalRun||externalRecovery)throw Object.assign(new Error('AI_BUSY'),{code:'AI_BUSY'});
    if(!ready||!owner||failed)throw Object.assign(new Error('VERSION_CONFLICT'),{code:'VERSION_CONFLICT'});
    externalRecovery={action,actor:owner,current:generation,base:JSON.parse(latest),baseVersion:revision,receipt:null};
    return resumeExternal();
  }
  async function resumeExternal(){
    if(externalRun)throw Object.assign(new Error('AI_BUSY'),{code:'AI_BUSY'});
    const job=externalRecovery;
    if(!job||job.actor!==owner||job.current!==generation)throw Object.assign(new Error('ACCOUNT_CHANGED'),{code:'ACCOUNT_CHANGED'});
    const {actor,current,base,baseVersion}=job;
    failed=null;notify('saving');
    const run=async()=>{
      const receipt=job.receipt||await job.action({owner:actor,revision:baseVersion});
      job.receipt=receipt;
      const remote=await request('/api/workspace');
      if(current!==generation||actor!==owner)throw Object.assign(new Error('ACCOUNT_CHANGED'),{code:'ACCOUNT_CHANGED'});
      const local=JSON.parse(latest),changed=Object.keys(local).filter(key=>JSON.stringify(local[key])!==JSON.stringify(base[key]));
      const remoteChanged=Object.keys(remote.state).filter(key=>JSON.stringify(remote.state[key])!==JSON.stringify(base[key]));
      const dependentGroups=[['tasks','planVersion','budget','goal'],['claims','education','profileVersion','analysis','analysisHistory','assessmentCareer','goal']];
      if(changed.some(key=>remoteChanged.includes(key))||dependentGroups.some(group=>changed.some(key=>group.includes(key))&&remoteChanged.some(key=>group.includes(key)))){failed={conflict:true};notify('conflict',{code:'VERSION_CONFLICT'});throw Object.assign(new Error('VERSION_CONFLICT'),{code:'VERSION_CONFLICT',receipt});}
      const merged={...remote.state};for(const key of changed)merged[key]=local[key];
      revision=remote.revision;saved=JSON.stringify(workspacePayload(remote.state));latest=JSON.stringify(workspacePayload(merged));
      externalRecovery=null;onSnapshot(merged);notify(dirty()?'pending':'saved');return receipt;
    };
    externalRun=run();
    try{return await externalRun;}catch(error){
      if(current===generation&&actor===owner){
        if(['NETWORK_ERROR','SERVICE_UNAVAILABLE','SESSION_EXPIRED','RATE_LIMITED'].includes(error.code)||job.receipt&&!failed?.conflict){failed={external:true,errorCode:error.code||'SERVICE_UNAVAILABLE'};notify(error.code==='SESSION_EXPIRED'?'expired':'save-error',error);}
        else {externalRecovery=null;if(error.code==='VERSION_CONFLICT'){failed={conflict:true};notify('conflict',error);}else if(!failed)notify(dirty()?'pending':'saved');}
      }
      throw error;
    }finally{externalRun=null;if(current===generation&&dirty()&&!failed)timer=schedule(()=>flush().catch(()=>{}),delay);}
  }
  const retry=()=>failed?.external?resumeExternal():status==='load-error'?connect(owner):flush();
  const reload=()=>{recovery=null;latest=saved;failed=null;return connect(owner,{discard:true});};
  const current=()=>({owner,revision,dirty:dirty(),status,state:latest?JSON.parse(latest):null});
  const disconnect=()=>connect(null);
  const destroy=()=>{stop();owner=null;ready=false;};
  return {connect,enqueue,flush,applyExternal,retry,reload,current,disconnect,destroy};
}
