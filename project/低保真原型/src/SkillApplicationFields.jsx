import React from 'react';
export default function SkillApplicationFields({application,value,onChange,label,language}){
 let fields={};try{fields=JSON.parse(value||'{}');}catch{}
 if(!fields||typeof fields!=='object'||Array.isArray(fields))fields={};
 return <div className="aligned-application"><p>{label(application.material)}</p>{application.fields.map(f=><label key={f.id}>{label(f.label)}{f.options?<select aria-label={label(f.label)} value={fields[f.id]??''} onChange={e=>onChange(JSON.stringify({...fields,[f.id]:e.target.value}))}><option value="">—</option>{f.options.map(o=><option key={o.value} value={o.value}>{label(o.label)}</option>)}</select>:<input aria-label={label(f.label)} maxLength={32} value={fields[f.id]??''} onChange={e=>onChange(JSON.stringify({...fields,[f.id]:e.target.value}))}/>}</label>)}<p className="depth-scope">{language==='en'?'These fields check only the supplied scenario. Your reasoning and real operational judgment remain separately reviewed.':'这些字段只核对本题材料；开放解释与真实处置判断仍需另外复核。'}</p></div>;
}
