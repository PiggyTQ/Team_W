import NavigationIcon from './NavigationIcon';
import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {pages,cname} from './model';
import {displayText} from './i18n/render';
import SidebarCompanion from './SidebarCompanion';

const groups=[['工作台',['U03']],['准备与行动',['U04','U07','U08','U10']],['探索与工具',['U05','U06','U11']]];
export function SidebarSymbol({type='toggle',collapsed=false,size=20}){
 const path=type==='switch'?'M4 7h14m-4-4 4 4-4 4M20 17H6m4-4-4 4 4 4':`M4 3h16v18H4ZM10 3v18 ${collapsed?'M14 8l3 3-3 3':'M16 8l-3 3 3 3'}`;
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path}/></svg>;
}

export default function WorkspaceSidebar({s,page,admin,mobile,collapsed,toggle,go,open,Icon:unusedIcon,navIcons,ai,route}){
 const Icon=NavigationIcon;
 const [tip,setTip]=useState(null),timer=useRef(null),sidebar=useRef(null);
 const hide=()=>{clearTimeout(timer.current);setTip(null);};
 const show=(element,text,immediate=false)=>{
  clearTimeout(timer.current);if(!collapsed||!matchMedia('(min-width:721px)').matches)return;
  const rect=element.getBoundingClientRect(),edge=element.closest('aside')?.getBoundingClientRect().right||rect.right,value={text,left:Math.max(edge,rect.right)+12,top:Math.max(8,Math.min(innerHeight-50,rect.top+rect.height/2-18))};
  if(immediate)setTip(value);else timer.current=setTimeout(()=>setTip(value),120);
 };
 const hint=text=>({onMouseEnter:e=>show(e.currentTarget,text),onMouseLeave:hide,onFocus:e=>show(e.currentTarget,text,true),onBlur:hide,onKeyDown:e=>{if(e.key==='Escape')hide();}});
 useEffect(()=>{hide();},[collapsed,mobile,page]);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   const nav=sidebar.current?.querySelector('.sidebar-links'),active=nav?.querySelector('[aria-current=page]');
   if(!nav||!active||!nav.clientHeight)return;
   const area=nav.getBoundingClientRect(),item=active.getBoundingClientRect();
   if(item.bottom>area.bottom)nav.scrollTop+=item.bottom-area.bottom+8;
   else if(item.top<area.top)nav.scrollTop-=area.top-item.top+8;
  });
  return()=>cancelAnimationFrame(frame);
 },[page,collapsed,mobile]);
 useEffect(()=>{const dismiss=()=>hide();document.addEventListener('scroll',dismiss,true);window.addEventListener('resize',dismiss);return()=>{clearTimeout(timer.current);document.removeEventListener('scroll',dismiss,true);window.removeEventListener('resize',dismiss);};},[]);
 const item=([key,to,title])=><a key={key} href={to} aria-label={displayText(title)} aria-current={page===key?'page':undefined} {...hint(title)} onClick={e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.altKey||e.shiftKey)return;e.preventDefault();hide();go(to);}}><span className="sidebar-nav-icon" data-nav-icon={key}><Icon name={navIcons[key]||({B01:'shield',B02:'search',B03:'book'}[key])} size={20}/></span><span className="sidebar-item-label">{title}</span></a>;
 return <><aside ref={sidebar} id="workspace-sidebar" className={`sidebar ${mobile?'visible':''}`} data-collapsed={collapsed?'true':'false'}>
  <div className="sidebar-toolbar"><span className="sidebar-item-label">{admin?'导航':'工作空间'}</span><button className="sidebar-toggle" type="button" onClick={e=>{hide();toggle(e);}} aria-expanded={!collapsed} aria-controls="sidebar-destinations" aria-label={displayText(collapsed?'展开侧栏':'收起侧栏')} title={displayText(collapsed?'展开侧栏（Ctrl / Cmd + \\）':'收起侧栏（Ctrl / Cmd + \\）')}><SidebarSymbol collapsed={collapsed}/></button></div>
  <div className="workspace-identity"><span className="identity-avatar"><Icon name={admin?'shield':'user'} size={23}/></span><div>{admin?'管理工作区':'我的职业规划'}<small>{admin?'按职责审核与处理':'探索、行动、成长'}</small></div></div>
  <nav className="sidebar-links" id="sidebar-destinations" aria-label={displayText(admin?'管理职责导航':'工作区主导航')}>
   {admin?<div className="nav-group"><span className="nav-label">管理职责</span>{pages.filter(p=>p[0].startsWith('B')).map(item)}</div>:groups.map(([name,ids])=><div className="nav-group" key={name}>{name!=='工作台'&&<span className="nav-label">{name}</span>}{ids.map(id=>item(pages.find(p=>p[0]===id)))}</div>)}
  </nav>
  <div className="sidebar-bottom">{!admin&&<SidebarCompanion collapsed={collapsed} page={page} route={route} ai={ai} go={go}/>} {s.goal&&!admin&&<div className="sidebar-goal"><span className="caption">当前探索目标</span><p>{cname(s.goal)}</p></div>}{!admin&&<div className="nav-group sidebar-account">{item(pages.find(p=>p[0]==='U12'))}</div>}<button type="button" className="sidebar-switch" aria-label={displayText('切换工作区')} {...hint('切换工作区')} onClick={()=>{hide();open('workspaceSwitch');}}><span className="sidebar-nav-icon" data-nav-icon="switch"><SidebarSymbol type="switch"/></span><span className="sidebar-item-label">切换工作区</span></button><span className="caption">任务从计划或学习进入。<br/>当前为 {s.stage} 本地模拟。</span></div>
 </aside>{tip&&createPortal(<div className="sidebar-tooltip" role="tooltip" style={{left:tip.left,top:tip.top}}>{tip.text}</div>,document.body)}</>;
}
