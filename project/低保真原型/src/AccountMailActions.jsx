import React,{useState,useEffect} from 'react';
import {apiRequest} from './auth-client';
import {useLanguage} from './i18n/render';
export function readMailLink(){const match=globalThis.location?.hash.match(/^#(reset|verify)=([a-f0-9]{64})$/);return match?{purpose:match[1],token:match[2]}:null;}
export default function AccountMailActions({user}){
 const language=useLanguage(),en=language==='en',[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[cap,setCap]=useState(null);
 useEffect(()=>{let active=true;apiRequest('/api/system/capabilities').then(x=>{if(active)setCap(x);}).catch(()=>{});return()=>{active=false;};},[user?.id]);
 if(!cap?.emailVerification&&!cap?.adminRoles?.length)return null;
 return <section data-i18n="off">{cap.adminRoles?.length>0&&<p><a href="/admin/data">{en?'Open content administration':'进入内容管理'}</a></p>}{cap.emailVerification&&<><h3>{en?'Email ownership':'邮箱归属验证'}</h3><p>{user.emailVerified?(en?'Email verified.':'邮箱已验证。'):(en?'Your email is not verified.':'邮箱尚未验证。')}</p>{!user.emailVerified&&<button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{await apiRequest('/api/auth/request-verification',{data:{}});setMessage(en?'Request accepted. Check your inbox; delivery may take a moment.':'请求已受理，请稍后检查邮箱。');}catch{setMessage(en?'Unable to request verification. Try again later.':'暂时无法申请验证，请稍后重试。');}finally{setBusy(false);}}}>{en?'Send verification email':'发送验证邮件'}</button>}<p role="status">{message}</p></>}</section>;
}
export function MailTokenForm({onBack,link}){
 const language=useLanguage(),en=language==='en',[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[done,setDone]=useState(false);
 useEffect(()=>{if(link)history.replaceState(null,'',location.pathname+location.search);},[link]);
 if(!link)return null;
 return <main className="auth-page" data-i18n="off"><section className="workbench-panel"><h1>{link.purpose==='reset'?(en?'Reset password':'重置密码'):(en?'Verify email':'验证邮箱')}</h1>{!done&&<form onSubmit={async e=>{e.preventDefault();const password=new FormData(e.currentTarget).get('password');setBusy(true);try{await apiRequest('/api/auth/session');await apiRequest(link.purpose==='reset'?'/api/auth/reset-password':'/api/auth/verify-email',{data:{token:link.token,...(link.purpose==='reset'?{newPassword:password}:{})}});if(link.purpose==='reset')window.dispatchEvent(new Event('account-session-changed'));setDone(true);setMessage(en?'Completed. Sign in again to continue.':'已完成，请重新登录后继续。');}catch(error){setMessage(error.code==='INVALID_PASSWORD_FORMAT'?(en?'Use 8–128 characters and at least two character types.':'密码须为 8–128 个字符，包含至少两类字符。'):(en?'The link is unavailable or expired. Request a new email.':'链接不可用或已过期，请重新申请邮件。'));}finally{setBusy(false);}}}>{link.purpose==='reset'&&<label>{en?'New password':'新密码'}<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}/></label>}<button disabled={busy} type="submit">{en?'Confirm':'确认操作'}</button></form>}<p role="status">{message}</p><button onClick={onBack}>{en?'Return to sign in':'返回登录'}</button></section></main>;
}
