import React from 'react';
import {careers} from './model';
import {validCompareIds} from './site-quality-model';

export default function HomeCareerCompare({s,update,link}){
 const selected=validCompareIds(s.compare),ready=selected.length>=2;
 const toggle=id=>{
  if(selected.includes(id))update({compare:selected.filter(value=>value!==id)});
  else if(selected.length<3)update({compare:[...selected,id]});
 };
 const status=selected.length===0?'选择2–3个方向后，可查看比较。':selected.length===1?'已选1个方向，再选1个即可比较。':selected.length===3?'已选3个方向；取消一项后可更换。':'已选2个方向，可查看比较或再选1个。';
 return <section className="home-next home-action-panel home-compare" aria-labelledby="home-next-title">
  <div className="home-section-title"><h2 id="home-next-title">职业方向比较</h2>{link('/careers','查看职业详情 →')}</div>
  <p className="home-action-description">对比工作内容、所需技能和典型产物。</p>
  <fieldset className="home-compare-options" aria-describedby="home-compare-status">
   <legend className="sr-only">选择2–3个职业方向</legend>
   {careers.map(c=>{const checked=selected.includes(c.id),disabled=!checked&&selected.length>=3;return <label className={'home-compare-option'+(checked?' is-selected':'')+(disabled?' is-disabled':'')} key={c.id}><input type="checkbox" checked={checked} disabled={disabled} onChange={()=>toggle(c.id)}/><span>{c.name}</span></label>;})}
  </fieldset>
  <p id="home-compare-status" className="home-compare-status" role="status">{status}</p>
  <div className="home-compare-footer"><div className="actions">{ready?link('/careers?tab=比较','查看方向比较 →','button primary'):<button type="button" className="primary" disabled aria-describedby="home-compare-status">查看方向比较 →</button>}</div>
  <nav className="home-other-actions" aria-label="其他职业准备操作">{link('/assessment?tab=四维与差距','核对职业准备')}{link('/assessment?tab=资料经历','添加经历')}</nav></div>
 </section>;
}
