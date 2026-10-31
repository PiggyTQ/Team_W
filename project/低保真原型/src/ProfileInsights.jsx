import React,{useState,useId} from 'react';
import {profileInsights,profileArchive} from './profile-insights-model';
import './profile-insights.css';

function arcPath(index,radius=112) {
  const point=angle=>[160+radius*Math.cos(angle*Math.PI/180),160+radius*Math.sin(angle*Math.PI/180)];
  const a=point(-86+index*90),b=point(-4+index*90);
  return `M ${a.join(' ')} A ${radius} ${radius} 0 0 1 ${b.join(' ')}`;
}
export default function ProfileInsights({s,link,compact=false,onExpand}) {
  const data=profileInsights(s),[selected,setSelected]=useState('PS'),[filter,setFilter]=useState('all');
  const uid=useId(),detailId=uid+'-detail',d=data.dimensions.find(x=>x.id===selected),archive=profileArchive(s.claims,filter);
  return <div className="profile-insight">
    <section aria-labelledby={uid+'-title'}>
      <header className="profile-insight-heading"><div><h2 id={uid+'-title'}>四维信息记录</h2><p>查看工作条件、专业材料、本人贡献与复盘的记录状态。</p></div><span className="status-chip">资料 v{s.profileVersion}</span></header>
      <div className="profile-insight-layout">
        <figure className="profile-insight-ring">
          <svg viewBox="0 0 320 320" role="group" aria-labelledby={uid+'-chart-title '+uid+'-chart-desc'}>
            <title id={uid+'-chart-title'}>四维信息记录概览</title><desc id={uid+'-chart-desc'}>{data.dimensions.map(x=>`${x.title}：${x.has?'有记录':'待补充'}`).join('；')}。四段等长，不表示能力、占比或完成率。</desc>
            <circle cx="160" cy="160" r="85" className="profile-insight-inner-guide"/>
            {data.dimensions.map((x,i)=><g key={x.id} role="button" tabIndex="0" aria-label={x.title} aria-pressed={selected===x.id} aria-controls={detailId} className="profile-insight-sector" onClick={()=>setSelected(x.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(x.id);}}}>
              <path d={arcPath(i)} className="profile-insight-hit"/>
              {selected===x.id&&<path d={arcPath(i,128)} className="profile-insight-selection"/>}
              <path d={arcPath(i)} className={x.has?'profile-insight-arc recorded':'profile-insight-arc missing'}/>
              <text x={[266,266,54,54][i]} y={[58,272,272,58][i]} textAnchor="middle" className="profile-insight-sector-code" aria-hidden="true">{x.id}</text>
            </g>)}
            <text x="160" y="151" textAnchor="middle" className="profile-insight-ring-count">{data.recorded}<tspan className="profile-insight-ring-total"> / 4</tspan></text>
            <text x="160" y="181" textAnchor="middle" className="profile-insight-ring-label">有记录的维度</text>
          </svg>
          <figcaption><span><i className="recorded"/>有记录</span><span><i className="missing"/>待补充</span><small>四段等长 · 非能力评分</small></figcaption>
        </figure>
        <div className="profile-insight-reader">
          <div className="profile-insight-dimensions" role="group" aria-label="选择画像维度">
            {data.dimensions.map(x=><button key={x.id} type="button" aria-pressed={x.id===selected} aria-controls={detailId} onClick={()=>setSelected(x.id)}>
              <span className="profile-insight-dimension-name"><span className="profile-insight-code">{x.id}</span>{x.title}</span><span className="profile-insight-dimension-state">{x.has?<><span className="profile-insight-dot"/>{x.count} {x.unit}</>:<><span className="profile-insight-dash"/>待补充</>}</span>
            </button>)}
          </div>
          <section className="profile-insight-detail" id={detailId} aria-live="polite" aria-atomic="true" aria-labelledby={uid+'-dimension-title'}>
            <h3 id={uid+'-dimension-title'}>{d.title}<span>{d.has?'已有记录':'从这里开始'}</span></h3><p>{d.has?d.known:d.unknown}</p>
            {d.items.length>0&&<ul className="profile-insight-sources">{d.items.slice(0,2).map((x,i)=><li key={x.id||i}><span>{x.title}</span><small>{x.text}</small></li>)}{d.items.length>2&&<li>还有 {d.items.length-2} 项，可在来源页面回看。</li>}</ul>}
            <p className="profile-insight-limit">{d.limit}</p><div className="actions">{link(d.to,d.action+' →','button')}{selected==='PS'&&data.facts.length>0&&(compact?<button type="button" onClick={onExpand}>查看全部材料 ↓</button>:<a href="#profile-evidence">查看全部材料 ↓</a>)}</div>
          </section>
        </div>
      </div>
      <dl className="profile-insight-counts"><div><dt>本人确认经历</dt><dd>{data.facts.length}<span> 项</span></dd></div><div><dt>当前方向关联材料</dt><dd>{data.related.length}<span> 项 · {data.career.skill}</span></dd></div><div><dt>待核对候选</dt><dd>{data.pending.length}<span> 项</span></dd></div></dl>
    </section>
    {!compact&&<><section className="profile-insight-gaps" aria-labelledby={uid+'-gaps'}><header><h2 id={uid+'-gaps'}>优先补这几处</h2><p>对照方向：{data.career.name}。这里标出信息缺口；能力短板仍需实际任务与反馈核对。</p></header>
      {data.gaps.length?<ol>{data.gaps.map(g=><li key={g.id}><div><h3>{g.title}</h3><p>{g.detail}</p>{g.context&&<small>关联技能：{g.context} · 示例职业范围</small>}{g.count>0&&<small>{g.count} {g.unit}</small>}</div>{link(g.to,g.action+' →')}</li>)}</ol>:<div className="profile-insight-next"><h3>基础记录已串联，下一步看具体任务</h3><p>四类信息均有记录，仍不能据此判断胜任程度。可以对照职业任务，继续核对实际产物与尚未验证的部分。</p>{link('/assessment?tab=四维与差距','对照职业要求 →')}</div>}
    </section>
    <section className="profile-insight-archive" id="profile-evidence" aria-labelledby={uid+'-archive'}><header><div><h2 id={uid+'-archive'}>材料与成果档案</h2><p>画像的依据在这里。本人确认与实际核验分开。</p></div>{link('/assessment','补充经历 →')}</header>
      {s.claims.length>0&&<div className="profile-insight-filters" role="group" aria-label="筛选档案状态">{[['all','全部'],['confirmed','已确认'],['pending','待核对'],['excluded','未采用 / 已撤回']].map(([value,label])=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}<span>{profileArchive(s.claims,value).length}</span></button>)}</div>}
      <div aria-live="polite">{archive.length?<ul className="profile-insight-records">{archive.map(c=><li key={c.id}><div><h3>{c.title}</h3><p>{c.skill || '未标注技能'} · {c.taskId?'来源任务 '+c.taskId:c.origin || '手填 / 示例材料'}</p><p>本人贡献：{c.contribution || '待说明'}</p></div><div><span className="status-chip">{c.status}</span>{link('/assessment?tab=原文确认','查看原文与处置 →')}</div></li>)}</ul>:<div className="profile-insight-empty"><h3>{s.claims.length?'当前筛选没有材料':'用一段经历，开始积累自己的依据'}</h3><p>{s.claims.length?'可以切换状态查看其他记录。':'写下任务、产物和自己负责的部分；先核对原文，再把确认内容用于画像。'}</p>{s.claims.length?<button type="button" onClick={()=>setFilter('all')}>查看全部材料</button>:link('/assessment','记录经历或作品','button primary')}</div>}</div>
    </section></>}
  </div>;
}
