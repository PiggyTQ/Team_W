import React from 'react';
import {careers} from './model';
import {useLanguage} from './i18n/render';
import {careerContent} from './career-exploration-model';
import ProductIcon from './ProductIcon';
export default function CareerCompareBasket({s,toggleCompare,link,returnTo}){
 const en=useLanguage()==='en',tx=(z,e)=>en?e:z,ids=s.compare.filter(id=>careers.some(c=>c.id===id));
 return <div className="career-selection-bar" aria-label={tx('已选比较方向','Selected careers')}><strong>{tx('比较篮','Compare')} {ids.length}/3</strong><div>{ids.map(id=><span key={id}>{careerContent(id,en?'en':'zh').name}<button type="button" onClick={()=>toggleCompare(id)} aria-label={tx('移除','Remove ')+careerContent(id,en?'en':'zh').name}><ProductIcon name="close" size={14}/></button></span>)}</div>{link('/careers?tab='+encodeURIComponent('比较'),tx('打开已选比较','Open comparison'),ids.length>=2?'button primary':'')}{returnTo&&link(returnTo,tx('返回职业列表','Back to career list'))}</div>;
}
