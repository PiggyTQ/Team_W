import React from 'react';
import {iconPaths,resolveIcon} from './product-icon-paths';
import './product-icons.css';
const actions=new Set(['arrow','arrowUp','arrowBack','external','chevron','chevronDown','check','close','enter','plus','more']);
/** Decorative by default; the surrounding control retains its existing label. */
export default function ProductIcon({name='file',size=24,className='',decorative=true,label,accent=true,filled=false,...props}){
 const key=resolveIcon(name),utility=actions.has(key),small=Number(size)<24;
 return <svg {...props} className={`product-icon ${utility?'product-icon-action':''} ${className}`} data-product-icon={key} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={small?2.15:2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden={decorative?'true':undefined} role={decorative?undefined:'img'} aria-label={decorative?undefined:label} focusable="false">
  {accent&&!utility&&<g className="product-icon-accent" stroke="none"><ellipse cx="15.5" cy="14.5" rx="6.2" ry="6.5" fill="#cceff4"/><circle cx="17" cy="12" r="5.5" fill="#bdd7fa" opacity=".72"/></g>}
  <path className="product-icon-line" d={iconPaths[key]||iconPaths.file} fill={filled?'currentColor':'none'}/>
 </svg>;
}
