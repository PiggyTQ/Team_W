// Bounded admission: avoid immediately rejecting a small simultaneous class login.
export function createConcurrencyGate({capacity=2,maxQueued=20,waitMs=10000}={}){
  let active=0,closed=false;const queue=[];
  const failure=()=>Object.assign(new Error('SERVICE_UNAVAILABLE'),{code:'SERVICE_UNAVAILABLE',status:503,retryAfter:2});
  function release(){active--;drain();}
  function drain(){while(!closed&&active<capacity&&queue.length){const job=queue.shift();clearTimeout(job.timer);active++;job.resolve(release);}}
  async function acquire(){
    if(closed)throw failure();
    if(active<capacity){active++;return release;}
    if(queue.length>=maxQueued)throw failure();
    return new Promise((resolve,reject)=>{const job={resolve,reject};job.timer=setTimeout(()=>{const i=queue.indexOf(job);if(i>=0)queue.splice(i,1);reject(failure());},waitMs);queue.push(job);});
  }
  function close(){closed=true;for(const job of queue.splice(0)){clearTimeout(job.timer);job.reject(failure());}}
  return {acquire,snapshot:()=>({active,queued:queue.length,capacity,maxQueued}),close};
}
