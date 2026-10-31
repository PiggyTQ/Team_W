import React,{useRef,useState} from 'react';
import {LongTermBackground} from './ContinuityPanels';
import {OriginalText} from './i18n/render';
import './settings-focus.css';

const valueOrUnknown=value=>typeof value==='string'&&value.trim()?value:'未知';
function PreferenceValue({value,empty='未知'}){
  return value&&value.trim()&&value!=='未知'?<OriginalText value={value}/>:<span>{empty}</span>;
}

export default function SettingsPreferences({s,update,tell,link,live=false,onReceipt}){
  const [editing,setEditing]=useState(false),editButton=useRef(null);
  const p=s.preferences;
  const patch=(key,value)=>update({preferences:{...p,[key]:value}});
  const close=()=>{setEditing(false);editButton.current?.focus();};
  return <>
    <section className="settings-focus-preferences" aria-labelledby="settings-preferences-title">
      <header className="settings-focus-title">
        <div><h2 id="settings-preferences-title">长期偏好</h2><p>选填；先查看已有设置，需要时再编辑。</p></div>
        <button ref={editButton} className={editing?'':'primary'} type="button" aria-expanded={editing} aria-controls="settings-preferences-editor" onClick={()=>setEditing(!editing)}>{editing?'收起偏好编辑':'编辑长期偏好'}</button>
      </header>
      {editing?<div className="settings-focus-editor" id="settings-preferences-editor">
        <LongTermBackground s={s} update={update}/>
        <label className="field"><span>兴趣（自述）</span><input aria-label="兴趣（自述）" value={p.interest} onChange={e=>patch('interest',e.target.value)}/></label>
        <label className="field"><span>地域 / 时间 / 值守约束</span><textarea aria-label="地域 / 时间 / 值守约束" value={p.constraint} onChange={e=>patch('constraint',e.target.value)}/></label>
        <button type="button" onClick={close}>完成编辑并收起</button>
      </div>:<dl className="settings-focus-summary">
        <div><dt>长期探索意图</dt><dd>{valueOrUnknown(p.intent)}</dd></div>
        <div><dt>当前学习阶段</dt><dd>{valueOrUnknown(p.stage)}</dd></div>
        <div><dt>地域偏好</dt><dd><PreferenceValue value={p.location}/></dd></div>
        <div className="settings-focus-summary-wide"><dt>兴趣（自述）</dt><dd><PreferenceValue value={p.interest} empty="未填写"/></dd></div>
        <div className="settings-focus-summary-wide"><dt>地域 / 时间 / 值守约束</dt><dd><PreferenceValue value={p.constraint}/></dd></div>
      </dl>}
      <p className="settings-focus-save-note">{live?"修改自动保存至账户，保存结果见页面状态。计划和评估不会自动改变。":"修改随本机设置自动保存。计划和评估不会自动改变。"}</p>
      <div className="settings-focus-actions"><button type="button" onClick={()=>live?onReceipt?.():tell('偏好已保存；计划和能力不会自动改变，可到计划页预览影响。')}>查看保存回执</button>{link('/plan?tab=方案调整','预览对计划的影响')}</div>
    </section>
    <section className="settings-focus-notifications" aria-labelledby="settings-notifications-title">
      <div><h2 id="settings-notifications-title">站内复盘提醒</h2><p id="settings-notifications-description">只显示站内提醒，不发送邮件或外部消息。</p></div>
      <label className="check settings-focus-notification-switch"><input type="checkbox" className="preference-switch" role="switch" aria-label="开启站内复盘提醒" aria-describedby="settings-notifications-description" checked={s.notifications} onChange={e=>update({notifications:e.target.checked})}/><span>{s.notifications?'已开启':'已关闭'}</span></label>
    </section>
  </>;
}
