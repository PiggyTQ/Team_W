import React from 'react';
import ControlIcon from './ControlIcon';
export default function WorkspaceGuide({s,path,tab='',search=''}){
 if(!s.logged||path.startsWith('/admin/'))return null;
 return <span className="workspace-guide context-help"><button type="button" className="workspace-guide-trigger" aria-label="开始本页操作引导" onClick={e=>window.dispatchEvent(new CustomEvent('start-operation-guide',{detail:{path,tab,search,keyboard:e.detail===0}}))}><ControlIcon name="route" size={16}/><span>操作引导</span></button></span>;
}
