import React from 'react';
import {useLanguage} from './i18n/render';
import {authMessage} from './auth-contract';
import './server-save.css';

export default function ServerSaveStatus({sync,onDownload,onReload}) {
  const en=useLanguage()==='en',failed=['save-error','conflict','expired','load-error'].includes(sync.status);
  const label=en?{idle:'Checking account storage…',loading:'Loading your records…',saved:'Saved to your account',pending:'Changes waiting to save…',saving:'Saving to your account…'}:{idle:'正在连接账户存储…',loading:'正在读取你的记录…',saved:'已保存至账户',pending:'改动待保存…',saving:'正在保存至账户…'};
  return <section className={`server-save-status ${failed?'server-save-error':''}`} role={failed?'alert':'status'} aria-live="polite" data-status={sync.status} data-i18n="off">
    <span>{failed?authMessage(sync.error||'SERVICE_UNAVAILABLE',en?'en':'zh'):label[sync.status]}</span>
    {failed&&<div><button type="button" onClick={()=>sync.retry().catch(()=>{})}>{en?'Retry':'重试'}</button><button type="button" onClick={onDownload}>{en?'Download this page’s records':'下载本页记录'}</button>{['conflict','load-error'].includes(sync.status)&&<button type="button" onClick={onReload}>{en?'Reload account records':'重新载入账户记录'}</button>}</div>}
  </section>;
}
