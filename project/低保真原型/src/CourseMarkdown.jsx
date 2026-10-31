import React from 'react';
import {useLanguage,displayPublicText} from './i18n/render';

// Deliberately small Markdown subset for the collected text. HTML is always escaped by React.
export default function CourseMarkdown({text='',resolveLink}){
  useLanguage();
  text=displayPublicText(text);
  const inline=(value,key='p')=>String(value).split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g).map((part,i)=>{
    const id=key+i;if(part.startsWith('`'))return <code key={id}>{part.slice(1,-1)}</code>;
    if(part.startsWith('**'))return <strong key={id}>{part.slice(2,-2)}</strong>;
    const match=part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);if(match){
      let url;try{const u=new URL(match[2]);if(['https:','http:'].includes(u.protocol))url=u.href;}catch{}
      if(url)return <a key={id} href={url} target="_blank" rel="noreferrer">{match[1]}</a>;
      const action=resolveLink?.(match[2]);return action?<button key={id} type="button" className="course-inline-link" onClick={action}>{match[1]}</button>:<span key={id}>{match[1]}</span>;
    }
    return part;
  });
  const lines=String(text).replaceAll('\r','').split('\n'),out=[];
  for(let i=0;i<lines.length;){
    const value=lines[i];if(!value.trim()){i++;continue;}
    if(value.startsWith('```')){const id=i,code=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))code.push(lines[i++]);i++;out.push(<pre key={id}><code>{code.join('\n')}</code></pre>);continue;}
    const heading=value.match(/^(#{1,6})\s+(.+)/);if(heading){const Tag='h'+Math.min(6,heading[1].length+2);out.push(<Tag key={i}>{inline(heading[2],String(i))}</Tag>);i++;continue;}
    if(/^\|.*\|\s*$/.test(value)&&/^\|[\s:|-]+\|\s*$/.test(lines[i+1]||'')){
      const id=i,split=s=>s.trim().slice(1,-1).split('|').map(x=>x.trim()),header=split(value),rows=[];i+=2;
      while(i<lines.length&&/^\|.*\|\s*$/.test(lines[i]))rows.push(split(lines[i++]));
      out.push(<div className="table-wrap" key={id}><table><thead><tr>{header.map((h,j)=><th key={j}>{inline(h,id+'h'+j)}</th>)}</tr></thead><tbody>{rows.map((r,j)=><tr key={j}>{header.map((_,k)=><td key={k}>{inline(r[k]||'',id+'r'+j+k)}</td>)}</tr>)}</tbody></table></div>);continue;
    }
    if(/^\s*(?:[-*]|\d+\.)\s+/.test(value)){
      const id=i,ordered=/^\s*\d+\./.test(value),items=[];
      while(i<lines.length&&(ordered?/^\s*\d+\.\s+/:/^\s*[-*]\s+/).test(lines[i]))items.push(lines[i++].replace(/^\s*(?:[-*]|\d+\.)\s+/,''));
      const Tag=ordered?'ol':'ul';out.push(<Tag key={id}>{items.map((v,j)=><li key={j}>{inline(v.replace(/^\[ \]\s*/,''),id+'l'+j)}</li>)}</Tag>);continue;
    }
    const id=i,p=[value];i++;while(i<lines.length&&lines[i].trim()&&!/^(?:#|```|\||[-*]\s|\d+\.\s)/.test(lines[i]))p.push(lines[i++]);
    out.push(<p key={id}>{inline(p.join('\n'),String(id))}</p>);
  }
  return <div className="course-markdown" data-i18n="off">{out}</div>;
}
