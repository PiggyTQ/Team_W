import ProductIcon from './ProductIcon';
import React,{useRef,useState} from 'react';
import {atlasCase,atlasCSV,atlasToolContent} from './atlas-tool-content';

export default function AtlasTools({tool,expanded,onExpand,onSelect,onRule,onDetails,selected}){
 const content=atlasToolContent[tool],code=useRef(null),trigger=useRef(null),[notice,setNotice]=useState('');
 const collapse=()=>{onExpand();requestAnimationFrame(()=>trigger.current?.focus());};
 const copy=async()=>{
  try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(content.snippet);setNotice('示例已复制，可以粘贴到自己的练习工具。');}
  catch{code.current?.focus();code.current?.select();setNotice('当前浏览器未允许复制，已选中示例，请手动复制。');}
 };
 const download=()=>{const blob=new Blob(['\ufeff'+atlasCSV()],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=atlasCase.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('合成练习数据已下载，SQL 与表格使用同一份数据。');};
 return <>
  <nav className="atlas-tool-choice" aria-label="工具与交付规则">
   <button ref={trigger} className="atlas-tool-trigger" aria-expanded={expanded} aria-controls="atlas-tool-guide" onClick={onExpand}>本次工具<ProductIcon name="chevronDown" size={14} style={{transform:expanded?"rotate(180deg)":undefined}}/></button>
   {Object.entries(atlasToolContent).map(([id,item])=><button key={id} aria-pressed={tool===id} onClick={()=>{setNotice('');onSelect(id);}}>{item.name}</button>)}
   <button className="atlas-rule-start" aria-pressed={selected==='dependency:or'} onClick={()=>onRule('or')}>工具任选规则</button><button aria-pressed={selected==='dependency:and'} onClick={()=>onRule('and')}>共同交付规则</button>
   <p className="atlas-tool-purpose">已选择：{content.name}。用于本次练习，会带入实践草稿；这里可查看操作方法和样例。</p>
  </nav>
  {expanded&&<section id="atlas-tool-guide" className="atlas-tool-guide" aria-label="所选工具的练习说明"><header><h2>{content.title}</h2><button onClick={collapse} aria-label="收起工具练习说明">收起说明</button></header><p>{content.description}</p><ol>{content.steps.map(step=><li key={step}>{step}</li>)}</ol><div className="atlas-tool-example"><div><h3>同一份合成数据</h3><p>6 行记录：R002 重复，R003 的金额空白；R005 的金额 0 保留为原值。</p><div className="table-wrap"><table><thead><tr>{atlasCase.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{atlasCase.rows.map((row,i)=><tr key={i}>{row.map((value,j)=><td key={j}>{value||'（空白）'}</td>)}</tr>)}</tbody></table></div><button onClick={download}>下载练习数据 CSV</button></div><div><label className="field"><span>{content.label}</span><textarea ref={code} readOnly spellCheck={false} aria-label={content.label} value={content.snippet}/></label><button onClick={copy}>{content.copyLabel}</button><button onClick={onDetails}>查看所选工具节点</button><p>在自己的工具里练习，完成后到实践任务记录产物、贡献和限制。</p></div></div><p role="status" className="atlas-tool-notice">{notice}</p></section>}
 </>;
}
