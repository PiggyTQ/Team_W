import React from 'react';
import {useLanguage} from './i18n/render';
const scenes=[
 {height:500,labels:[[10,49,23,8,-6,'问题','Question'],[40,20,28,8,4,'比较职业方向','Compare directions'],[40,34,10,8,4,'A','A'],[58,35,10,8,4,'B','B'],[64,69,22,9,-5,'实践产物','Practical work']]},
 {height:562.8,labels:[[16,23,33,7,-6,'依据 / 未知','Evidence / Unknown'],[67,19,24,7,7,'本人贡献','My contribution'],[67,57,24,7,4,'已有支持','Existing support']]},
 {height:562.8,labels:[[20,26,34,7,-6,'下一步','Next step'],[26,39,29,7,-6,'问题','Question'],[27,55,29,7,-6,'实践产物','Practical work'],[28,70,29,7,-6,'下一步','Next step'],[75,25,16,13,10,'计划 · 实践','Plan · Practice']]},
 {height:500,labels:[[25,23,36,8,-5,'职业报告','Career report'],[80,25,9.5,12,-4,'选择理由','My reasons'],[81,48,10.5,12,3,'关键依据','Key evidence'],[82,70,8,14,-4,'下一步计划','Next step'],[26,40,32,7,-5,'依据','Evidence'],[27,55,32,7,-5,'实践产物','Practical work'],[28,70,32,7,-5,'下一步','Next step']]}
];
export default function DetailedJourneyArt({stage}){
 const en=useLanguage()==='en',scene=scenes[stage];
 return <div className={'detailed-journey-art detailed-journey-'+stage} aria-hidden="true" data-i18n="off"><svg className="journey-aligned-canvas" viewBox={`0 0 1000 ${scene.height}`} preserveAspectRatio="xMidYMid meet"><image href={'/illustrations/cheese-detail/journey-'+stage+'.png'} width="1000" height={scene.height}/>{scene.labels.map(([x,y,w,h,angle,zh,english],i)=><foreignObject key={i} x={x*10} y={y*scene.height/100} width={w*10} height={h*scene.height/100} transform={`rotate(${angle} ${x*10} ${y*scene.height/100})`}><div className={'journey-paper-label'+(stage===2&&i===4?' journey-label-blue':'')} data-label-index={i}>{en?english:zh}</div></foreignObject>)}</svg></div>;
}
