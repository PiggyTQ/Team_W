import {AUTH_POLICY} from './auth-contract.js';
import {registerPublicTranslations} from './i18n/render.js';
export const SERVER_AUTH=import.meta.env.VITE_AUTH_MODE==='server';
let csrfToken='';
let accountId=null;
export async function apiRequest(path,{data,signal,method=data?'POST':'GET',csrfRetried=false,binary=false}={}) {
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  const abort=()=>controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)controller.abort();
  try {
    const requestActor=accountId;
    const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{...(accountId?{'X-Account-Id':accountId}:{}),...(data?{'Content-Type':'application/json','X-CSRF-Token':csrfToken}:{} )},...(data?{body:JSON.stringify(data)}:{})});
    let result;try{result=binary&&response.ok?{blob:await response.blob()}:await response.json();}catch{throw Object.assign(new Error('SERVICE_UNAVAILABLE'),{code:'SERVICE_UNAVAILABLE'});}
    if(!response.ok){
      if(result.code==='CSRF_REJECTED'&&data&&!csrfRetried){await apiRequest('/api/auth/session',{signal});if(requestActor&&requestActor!==accountId)throw Object.assign(new Error('ACCOUNT_CHANGED'),{code:'ACCOUNT_CHANGED'});return apiRequest(path,{data,signal,method,csrfRetried:true});}
      throw Object.assign(new Error(result.code),{code:result.code,status:response.status,fields:result.fields,currentVersion:result.currentVersion});
    }
    if(requestActor&&requestActor!==accountId&&!path.startsWith('/api/auth/'))throw Object.assign(new Error('ACCOUNT_CHANGED'),{code:'ACCOUNT_CHANGED'});
    if(result.csrfToken)csrfToken=result.csrfToken;
    if(Object.hasOwn(result,'user'))accountId=result.user?.id||null;
    if(path==='/api/auth/logout'||result.deleted===true)accountId=null;
    if((path.startsWith('/api/catalog/')&&method==='GET'||path==='/api/services/assessment'||path==='/api/commands')&&!binary)registerPublicTranslations(result.publicTranslations);
    return result;
  }catch(error){if(error.code==='ACCOUNT_CHANGED'&&typeof window!=='undefined')window.dispatchEvent(new Event('account-session-changed'));if(error.code)throw error;throw Object.assign(new Error('NETWORK_ERROR'),{code:'NETWORK_ERROR',cancelled:Boolean(signal?.aborted)});}
  finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}
export const authRequest=(action,options)=>apiRequest(`/api/auth/${action}`,options);
export function credentialsFromForm(form,mode) {
  const values=new FormData(form);
  return {email:values.get('email'),...(mode!=='recover'?{password:values.get('password')}:{}),...(mode==='register'?{agree:values.get('agree')==='on',termsVersion:AUTH_POLICY.termsVersion}:{})};
}
