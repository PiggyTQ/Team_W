import React,{useEffect,useState} from 'react';

export default function ResumeSourceGroup({search,children}){
 const requested=()=>['profile','education'].includes(new URLSearchParams(search).get('resumeSection'))||location.hash==='#resume-contact-source';
 const [expanded,setExpanded]=useState(()=>matchMedia('(min-width:721px)').matches||requested());
 useEffect(()=>{if(requested())setExpanded(true);},[search]);
 useEffect(()=>{const media=matchMedia('(min-width:721px)'),wide=()=>{if(media.matches)setExpanded(true);};media.addEventListener('change',wide);return()=>media.removeEventListener('change',wide);},[]);
 return <details className="assessment-source-group" open={expanded} onToggle={event=>setExpanded(event.currentTarget.open)}><summary>联系资料与教育（可选）</summary><div className="assessment-profile-sources">{children}</div></details>;
}
