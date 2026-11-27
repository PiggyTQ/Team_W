import React from 'react';
import ProductIcon from './ProductIcon';
import {useLanguage} from './i18n/render';
import {officialCareerSources} from './official-career-sources';

export default function OfficialCareerSources(){
 const en=useLanguage()==='en',tx=(z,e)=>en?e:z,label=p=>en?p[1]:p[0];
 return <details className="jobs-external-source jobs-official-directory" aria-label={tx('国内企业与校招官网','Official domestic employer and campus sites')} data-i18n="off">
  <summary className="jobs-official-toggle"><ProductIcon name="external" size={24}/><span><strong>{tx('国内企业官网与校招入口','Official domestic employer and campus sites')}</strong><small>{tx('腾讯、华为、百度、字节跳动 · 展开查看官网，本站尚未同步岗位','Tencent, Huawei, Baidu, ByteDance · open official links; jobs are not synced here')}</small></span><ProductIcon name="arrow" size={20}/></summary>
  <div className="jobs-official-intro"><p>{tx('本站尚未接入实时推荐。以下是官方入口，当前职位与申请条件以原站为准；下方本站样本可用于练习阅读。','Live job recommendations are not connected. These official sites provide current roles and eligibility. The site samples below are for reading practice.')}</p></div>
  <nav className="jobs-official-links" aria-label={tx('企业官方招聘入口','Official employer recruitment links')}>{officialCareerSources.map(s=><a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"><span><strong>{label(s.title)}</strong><small>{label(s.description)}</small></span><ProductIcon name="external" size={18}/></a>)}</nav>
  <footer><small>{tx('入口核对：2026-11-27 · 不是岗位更新时间','Entry links checked: 2026-11-27 · not a job-update date')}</small><a href="https://www.zhipin.com/" target="_blank" rel="noopener noreferrer">{tx('也可前往 BOSS 直聘官网','Also visit BOSS Zhipin')}<ProductIcon name="external" size={15}/></a></footer>
 </details>;
}
