import ProductIcon from './ProductIcon';
import React from 'react';
const paths={info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v6M12 7h.01',search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',arrow:'M4 12h16m-6-6 6 6-6 6',check:'m5 12 4 4L19 6',file:'M5 3h9l5 5v13H5ZM14 3v6h5M8 13h8M8 17h6',close:'m6 6 12 12M6 18 18 6',chevron:'m8 10 4 4 4-4',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v6l4 2',route:'M4 6h16M4 12h11M4 18h7',enter:'M19 5v9H5m5-5-5 5 5 5'};
export function NavigationControlIcon({name='arrow',size=18}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.file}/></svg>;}

export default function ControlIcon({legacy=false,name='arrow',...props}){return legacy?<NavigationControlIcon name={name} {...props}/>:<ProductIcon name={name==='chevron'?'chevronDown':name} {...props}/>;}
