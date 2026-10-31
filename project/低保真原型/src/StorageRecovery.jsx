import React from 'react';
import {useLanguage} from './i18n/render';
import english from './i18n/storage-recovery-en.json';
import './storage-recovery.css';

const states={
  'write-error':{
    title:'本机记录尚未保存',
    detail:'浏览器未能保存当前记录。本次操作仅临时保留，关闭或刷新页面可能丢失；请重试保存或下载本次记录。'
  },
  invalid:{
    title:'原有本机记录格式异常',
    detail:'原有记录未被覆盖。当前使用临时空工作区；本次操作仅临时保留，关闭或刷新页面可能丢失。请先下载原始记录，再重试读取或确认替换。'
  },
  'read-error':{
    title:'暂时无法读取本机记录',
    detail:'浏览器未能读取原有记录，原记录未被覆盖。当前使用临时空工作区；本次操作仅临时保留，关闭或刷新页面可能丢失。可重试读取，或下载本次记录。'
  }
};

export default function StorageRecovery({status,hasOriginal=false,onRetry,onBackup,onBackupOriginal,onReplace}){
  const language=useLanguage(),content=states[status];
  if(!content)return null;
  const copy=value=>language==='en'?english[value]||value:value;
  const blocked=status!=='write-error';
  return <section className="storage-recovery" role="alert" aria-label={copy('本机记录保存与恢复')} data-i18n="off">
    <h2>{copy(content.title)}</h2>
    <p>{copy(content.detail)}</p>
    <div className="storage-recovery-actions">
      <button type="button" className="primary" onClick={onRetry}>{copy(blocked?'重试读取':'重试保存')}</button>
      <button type="button" onClick={onBackup}>{copy('下载本次记录')}</button>
      {blocked&&hasOriginal&&<button type="button" onClick={onBackupOriginal}>{copy('下载原始记录')}</button>}
      {blocked&&<button type="button" onClick={onReplace}>{copy('用本次记录替换')}</button>}
    </div>
    {blocked&&<p className="storage-recovery-note">{copy('重试读取会重新载入原有记录；本次临时操作请先下载保留。替换需另行确认，才会尝试覆盖本机记录。')}</p>}
  </section>;
}
