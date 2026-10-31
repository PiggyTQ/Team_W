import AccountMailActions from './AccountMailActions';
import React,{useEffect,useState} from 'react';
import {authRequest,apiRequest} from './auth-client';
import {authMessage,validateCredentials,AUTH_POLICY} from './auth-contract';
import {useLanguage} from './i18n/render';
import './server-save.css';

export default function AccountSecurityPanel({user,sync,onDeleted,download,onNotice}) {
  const en=useLanguage()==='en';
  const [mode,setMode]=useState(''),[sessions,setSessions]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const text=(zh,english)=>en?english:zh;
  const loadSessions=()=>authRequest('sessions').then(value=>setSessions(value.sessions)).catch(value=>setError(value.code));
  useEffect(()=>{loadSessions();},[]);
  const submit=async event=>{
    event.preventDefault();if(busy)return;
    const form=event.currentTarget,values=new FormData(form);setBusy(true);setError('');setNotice('');
    try {
      await sync.flush();
      const data={currentPassword:values.get('currentPassword')};
      if(mode==='change-password'){data.newPassword=values.get('newPassword');const fields=validateCredentials('register',{email:user.email,password:data.newPassword,agree:true,termsVersion:AUTH_POLICY.termsVersion});if(fields.password)throw {code:fields.password};}
      if(mode==='delete-account'){data.email=values.get('email');data.confirmation=values.get('confirmation');}
      if(mode==='clear-workspace'){data.baseVersion=sync.current().revision;data.confirmation=values.get('confirmation');}
      await authRequest(mode,{data});form.reset();
      if(mode==='delete-account'){onDeleted();return;}
      if(mode==='clear-workspace')await sync.reload();
      const message=text(mode==='change-password'?'密码已更新，其他会话已撤销。':mode==='revoke-others'?'其他设备会话已撤销。':'账户业务记录已清空，账户仍保留。',mode==='change-password'?'Password updated. Other sessions were revoked.':mode==='revoke-others'?'Other sessions were revoked.':'Workspace records cleared. Your account remains.');
      if(mode==='clear-workspace')onNotice?.(message);else setNotice(message);
      setMode('');loadSessions();
    }catch(value){setError(value.code||'SERVICE_UNAVAILABLE');}finally{setBusy(false);}
  };
  const exportAll=async()=>{setBusy(true);setError('');try{await sync.flush();const result=await apiRequest('/api/workspace/export');download('职业成长_本人账户记录.json',JSON.stringify(result,null,2),'application/json');}catch(value){setError(value.code||'SERVICE_UNAVAILABLE');}finally{setBusy(false);}};
  return <details className="account-security-panel" data-i18n="off"><summary>{text('账户安全与服务器数据','Account security and server data')}</summary>
    <AccountMailActions user={user}/>
    <p>{user?.email}</p><p>{text('资料、经历、计划和报告已按账户保存。课程资料已接入；邮箱和 AI 可用范围以当前服务状态为准。','Your records are stored by account. Course materials are connected. Email and AI availability follows the current service configuration.')}</p>
    <p>{text('导出包含本人已保存的私人记录，请自行保管。删除会清除在线数据；同机权限保护的数据库备份最多保留 14 天。','An export includes your saved private records. Keep it secure. Deletion removes live data; server-protected database backups expire within 14 days.')}</p>
    <div className="account-form-actions"><button disabled={busy} onClick={exportAll}>{text('导出本人账户记录','Export my account records')}</button>{[['change-password','修改密码','Change password'],['revoke-others','退出其他设备','Sign out other devices'],['clear-workspace','清空业务记录','Clear workspace'],['delete-account','注销账户','Delete account']].map(([value,zh,english])=><button key={value} disabled={busy} onClick={()=>{setMode(mode===value?'':value);setError('');setNotice('');}}>{text(zh,english)}</button>)}</div>
    {!!sessions.length&&<details><summary>{text('有效账户会话','Active account sessions')}（{sessions.length}）</summary><ul>{sessions.map(item=><li key={item.id}>{text(item.current?'当前会话':'其他会话',item.current?'Current session':'Other session')} · {text('最近操作','Last active')} {new Date(item.lastSeen).toLocaleString(en?'en-US':'zh-CN')}</li>)}</ul></details>}
    {mode&&<form key={mode} onSubmit={submit}>
      <p>{text(mode==='delete-account'?'此操作将注销真实账户并删除在线业务记录，无法撤销。':mode==='clear-workspace'?'此操作将删除该账户全部在线业务记录，保留登录账户。':'请使用当前密码验证是本人操作。',mode==='delete-account'?'This permanently deletes your account and live records.':mode==='clear-workspace'?'This deletes all live workspace records and keeps your account.':'Verify this action with your current password.')}</p>
      <label>{text('当前密码','Current password')}<input name="currentPassword" type="password" autoComplete="current-password" required disabled={busy}/></label>
      {mode==='change-password'&&<label>{text('新密码（8–128 个字符，至少两类字符）','New password (8–128 characters, at least two character types)')}<input name="newPassword" type="password" autoComplete="new-password" required disabled={busy}/></label>}
      {mode==='delete-account'&&<label>{text('再次填写当前账户邮箱','Enter your account email again')}<input name="email" type="email" autoComplete="email" required disabled={busy}/></label>}
      {['clear-workspace','delete-account'].includes(mode)&&<label>{text(mode==='clear-workspace'?'输入 CLEAR_WORKSPACE 确认清空':'输入 DELETE_ACCOUNT 确认注销',mode==='clear-workspace'?'Type CLEAR_WORKSPACE to confirm':'Type DELETE_ACCOUNT to confirm')}<input name="confirmation" required autoComplete="off" disabled={busy}/></label>}
      <div className="account-form-actions"><button className="primary" disabled={busy} type="submit">{busy?text('正在处理…','Processing…'):text('确认此操作','Confirm action')}</button><button type="button" disabled={busy} onClick={()=>setMode('')}>{text('取消','Cancel')}</button></div>
    </form>}
    {error&&<p role="alert" className="error">{authMessage(error,en?'en':'zh')}</p>}{notice&&<p role="status">{notice}</p>}
  </details>;
}
