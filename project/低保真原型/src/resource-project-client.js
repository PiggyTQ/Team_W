import {apiRequest} from './auth-client.js';
import {normalizeResourceProject,resourceProjectError,RESOURCE_PROJECT_MAX_COUNT,RESOURCE_PROJECT_TOTAL_BYTES} from './resource-project-model.js';
export {RESOURCE_PROJECT_MAX_BYTES,RESOURCE_PROJECT_ACCEPT,resourceProjectErrorMessage} from './resource-project-model.js';

const databaseName='career-resource-projects-v1',storeName='projects';
function openDatabase(){return new Promise((resolve,reject)=>{
 if(!globalThis.indexedDB){reject(resourceProjectError('RESOURCE_PROJECT_STORAGE_UNAVAILABLE'));return;}
 const request=indexedDB.open(databaseName,1);
 request.onupgradeneeded=()=>request.result.createObjectStore(storeName,{keyPath:'id'});
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(resourceProjectError('RESOURCE_PROJECT_STORAGE_UNAVAILABLE'));
 request.onblocked=()=>reject(resourceProjectError('RESOURCE_PROJECT_STORAGE_UNAVAILABLE'));
});}
async function localTransaction(mode,work){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const transaction=db.transaction(storeName,mode),store=transaction.objectStore(storeName);let result;
  const fail=error=>{db.close();reject(error?.code?error:resourceProjectError(error?.name==='QuotaExceededError'?'RESOURCE_PROJECT_STORAGE_FULL':'RESOURCE_PROJECT_STORAGE_UNAVAILABLE'));};
  transaction.oncomplete=()=>{db.close();resolve(result);};transaction.onerror=()=>fail(transaction.error);transaction.onabort=()=>fail(transaction.error);
  try{work(store,value=>{result=value;},error=>{transaction.abort();fail(error);});}catch(error){transaction.abort();fail(error);}
 });
}
const withoutBlob=record=>{const {blob,...metadata}=record;return metadata;};
const resourcePath=(suffix='',ownerId)=>'/api/resource-projects'+suffix+(ownerId?'?ownerId='+encodeURIComponent(ownerId):'');
export async function listResourceProjects({live=false,ownerId}={}){
 if(live)return (await apiRequest(resourcePath('',ownerId))).items;
 return localTransaction('readonly',(store,done)=>{const request=store.getAll();request.onsuccess=()=>done(request.result.map(withoutBlob).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));});
}
export async function uploadResourceProject(input,file,{live=false,ownerId}={}){
 const project=normalizeResourceProject(input,file);
 if(live){
  const {user}=await apiRequest('/api/auth/session');if(!user)throw resourceProjectError('SESSION_EXPIRED');
  if(ownerId&&user.id!==ownerId)throw resourceProjectError('ACCOUNT_CHANGED');
  const encoded=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(resourceProjectError('RESOURCE_PROJECT_FILE_REQUIRED'));reader.readAsDataURL(file);});
  return (await apiRequest(resourcePath('',ownerId||user.id),{data:{...project,actorId:ownerId||user.id,file:{...project.file,base64:encoded}}})).project;
 }
 const record={...project,id:crypto.randomUUID(),createdAt:new Date().toISOString(),blob:file.slice(0,file.size,project.file.type)};
 return localTransaction('readwrite',(store,done,fail)=>{const request=store.getAll();request.onsuccess=()=>{
  if(request.result.length>=RESOURCE_PROJECT_MAX_COUNT||request.result.reduce((sum,item)=>sum+item.file.size,0)+file.size>RESOURCE_PROJECT_TOTAL_BYTES){fail(resourceProjectError('RESOURCE_PROJECT_QUOTA'));return;}
  store.add(record);done(withoutBlob(record));
 };});
}
export async function downloadResourceProject(id,{live=false,ownerId}={}){
 if(live){const snapshot=await apiRequest(resourcePath('',ownerId)),project=snapshot.items.find(item=>item.id===id);if(!project)throw resourceProjectError('RESOURCE_PROJECT_NOT_FOUND');const {blob}=await apiRequest(resourcePath('/'+encodeURIComponent(id)+'/file',ownerId||snapshot.ownerId),{binary:true});return {blob,filename:project.file.name};}
 return localTransaction('readonly',(store,done,fail)=>{const request=store.get(id);request.onsuccess=()=>request.result?done({blob:request.result.blob,filename:request.result.file.name}):fail(resourceProjectError('RESOURCE_PROJECT_NOT_FOUND'));});
}
export async function deleteResourceProject(id,{live=false,ownerId}={}){
 if(live)return apiRequest(resourcePath('/'+encodeURIComponent(id),ownerId),{method:'DELETE',data:{}});
 return localTransaction('readwrite',(store,done,fail)=>{const request=store.get(id);request.onsuccess=()=>{if(!request.result){fail(resourceProjectError('RESOURCE_PROJECT_NOT_FOUND'));return;}store.delete(id);done({deleted:true});};});
}
export async function clearResourceProjects({live=false}={}){
 if(live)throw resourceProjectError('RESOURCE_PROJECT_INVALID');
 return localTransaction('readwrite',(store,done)=>{store.clear();done({deleted:true});});
}
