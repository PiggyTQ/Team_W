import React from 'react';
import {useLanguage,setLanguage} from './render';
export default function LanguageSwitch({floating=false}){
  const language=useLanguage();
  return <div className={'language-switch'+(floating?' language-switch-floating':'')} role="group" aria-label="Language / 语言" data-i18n="off"><button type="button" lang="zh-CN" aria-label="使用中文" aria-pressed={language==='zh'} onClick={()=>setLanguage('zh')}>中文</button><button type="button" lang="en" aria-label="Use English" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>EN</button></div>;
}
