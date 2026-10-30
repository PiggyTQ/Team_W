import React,{useSyncExternalStore} from 'react';
import catalog from './site-complete-en.json' with {type:'json'};
import reviewedCopy from './reviewed-en.json' with {type:'json'};
import agentCopy from './agent-en.json' with {type:'json'};
Object.assign(catalog,agentCopy,reviewedCopy);
export const LANGUAGE_KEY='career-prototype-language';
const initialLanguage=()=>{try{return globalThis.localStorage?.getItem(LANGUAGE_KEY)==='en'?'en':'zh';}catch{return 'zh';}};
let language=initialLanguage();
const listeners=new Set(),cache=new Map();
// Public catalog dictionaries are registered before response data is rendered.
export const getEnglishTranslations=()=>({...catalog});
export function registerPublicTranslations(entries){
  if(!entries||typeof entries!=='object'||Array.isArray(entries))return;
  for(const [key,value] of Object.entries(entries))if(typeof value==='string'&&!chinese.test(value)&&!Object.hasOwn(reviewedCopy,key))catalog[key]=value;
  cache.clear();
}
let protectedValues=[];
const chinese=/[\u3400-\u9fff]/;
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export const getLanguage=()=>language;
export const getFormattingLocale=()=>language==='en'?'en-US':'zh-CN';
const subscribe=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
export const useLanguage=()=>useSyncExternalStore(subscribe,getLanguage,()=> 'zh');

export function setLanguage(next){
  if(!['zh','en'].includes(next)||next===language)return;
  language=next;
  try{globalThis.localStorage?.setItem(LANGUAGE_KEY,next);}catch{/* Session preference still works without storage. */}
  applyDocumentLanguage();
  listeners.forEach(listener=>listener());
}
export function applyDocumentLanguage(){
  if(typeof document==='undefined')return;
  document.documentElement.lang=getFormattingLocale();
  document.title=language==='en'?'Career Growth — IT Career Planning (Demo)':'职业成长 · 大学生 IT 职业规划与求职准备（演示）';
}
applyDocumentLanguage();

// Only free-text fields are protected. IDs, statuses, enum values and model keys remain untouched.
const freeFields=new Set(['title','text','body','contribution','draft','standard','product','reason','question','result','interest','location','constraint','note','notes','purpose','difficulty','feedback','nextAdjustment','employer','company','raw','statement','description','answer','name','query','privateReflection','help','school','major','wording','placementReason','city','portfolio','courses','gpa','ranking','phone','email']);
const defaults=new Set(['未知','无','未提供','未填写','未命名','课程项目','职业规划讨论']);
export function protectUserContent(...objects){
  const collected=new Set();
  const walk=(value,key='')=>{
    if(typeof value==='string'){if(freeFields.has(key)&&value.length>1&&chinese.test(value)&&!defaults.has(value)&&!(key==='result'&&['未检查','自检记录','待修订','服务故障','未提交'].includes(value)))collected.add(value);return;}
    if(!value||typeof value!=='object')return;
    if(Array.isArray(value)){value.forEach(item=>walk(item,key));return;}
    Object.entries(value).forEach(([child,item])=>walk(item,child));
  };
  objects.forEach(value=>walk(value));
  protectedValues=[...collected].sort((a,b)=>b.length-a.length);
}

function translateCopy(value){
  if(/^已有 (\d+) 项记录，可复用并逐项确认。$/.test(value))return value.replace(/^已有 (\d+) 项记录，可复用并逐项确认。$/,'You have $1 records to reuse and confirm individually.');
  if(/^读到第(\d+)章 · 内容v(\d+)；阅读不是完成$/.test(value))return value.replace(/^读到第(\d+)章 · 内容v(\d+)；阅读不是完成$/,'Reading chapter $1 · Content v$2; reading does not mean completion');
  if(/^第\d+种成果，共\d+种$/.test(value))return value.replace(/^第(\d+)种成果，共(\d+)种$/,'Outcome $1 of $2');
 if(/^从.+开始 →$/.test(value))return 'Start with '+translateCopy(value.slice(1,-4))+' →';
 if(catalog[value]!==undefined)return catalog[value];
  const trimmed=value.trim();
  if(catalog[trimmed]!==undefined)return value.slice(0,value.indexOf(trimmed))+catalog[trimmed]+value.slice(value.indexOf(trimmed)+trimmed.length);
  let output=value.replace(phrasePattern,match=>catalog[match]);
  output=output.replace(/(\d(?:\.\d+)?)\s*小时/g,'$1 hours').replace(/(\d+)\s*项/g,'$1 items').replace(/(\d+)\s*条/g,'$1 records').replace(/(\d+)\s*份/g,'$1 copies');
  // Unknown sentences remain intact; never create Chinese/English word salad.
  if(chinese.test(output))return value;
  return output.replace(/：/g,': ').replace(/；/g,'; ').replace(/，/g,', ').replace(/。/g,'. ').replace(/（/g,' (').replace(/）/g,')').replace(/、/g,', ').replace(/？/g,'?');
}
export const displayPublicText=value=>language==='en'&&typeof value==='string'?translateCopy(value):value;
export function displayText(value){
  if(language!=='en'||typeof value!=='string'||!chinese.test(value))return value;
  if(protectedValues.includes(value))return value;
  const pieces=[];
  let remaining=value;
  // Preserve private text even inside labels such as "Purpose: <personal text>".
  const contained=protectedValues.filter(text=>remaining.includes(text));
  if(contained.length){
    const protectedPattern=new RegExp(contained.map(escape).join('|'),'g');let offset=0;
    for(const match of value.matchAll(protectedPattern)){pieces.push(translateCopy(value.slice(offset,match.index)),match[0]);offset=match.index+match[0].length;}
    pieces.push(translateCopy(value.slice(offset)));return pieces.join('');
  }
  if(cache.has(value))return cache.get(value);
  const output=translateCopy(value);if(cache.size>6000)cache.clear();cache.set(value,output);return output;
}

const childText=(children,publicCopy=false)=>{
 if(Array.isArray(children))return children.map(child=>childText(child,publicCopy));
 if(typeof children==='string')return publicCopy?displayPublicText(children):displayText(children);
 if(React.isValidElement(children)&&(typeof children.type==='string'||children.type===React.Fragment)){
 const p=children.props;if(p.translate==='no'||p['data-i18n']==='off'||['script','style'].includes(children.type))return children;
 const attrs={};for(const name of ['aria-label','aria-valuetext','title','placeholder','alt'])if(typeof p[name]==='string')attrs[name]=(publicCopy?displayPublicText:displayText)(p[name]);
 if(children.type==='textarea')return React.cloneElement(children,attrs);
 return React.cloneElement(children,attrs,...(Array.isArray(p.children)?p.children.map(child=>childText(child,publicCopy)):[childText(p.children,publicCopy)]));
 }
 return children;
};
const optionText=children=>Array.isArray(children)?children.map(optionText).join(''):typeof children==='string'||typeof children==='number'?String(children):'';
export function localizedElement(type,props,...children){
  const original=props||{};
  if(typeof type!=='string'&&type!==React.Fragment)return React.createElement(type,props,...children);
  if(original['data-i18n']==='off'||original.translate==='no'||type==='script'||type==='style')return React.createElement(type,props,...children);
  const next={...original};
  const publicCopy=original['data-i18n']==='public';
  if(type===React.Fragment)delete next['data-i18n'];
  // Translating an option's implicit text value must never change its Chinese business value.
  if(type==='option'&&next.value===undefined)next.value=optionText(children.length?children:original.children);
  for(const name of ['aria-label','aria-valuetext','title','placeholder','alt'])if(typeof next[name]==='string')next[name]=displayText(next[name]);
  if(type==='textarea')return React.createElement(type,next,...children);
  if(Object.hasOwn(next,'children'))next.children=childText(next.children,publicCopy);
  return React.createElement(type,next,...children.map(child=>childText(child,publicCopy)));
}

export function OriginalText({value,block=false}){
  return React.createElement(block?'div':'span',{lang:'zh-CN',translate:'no','data-i18n':'off',className:'original-source-text'},value);
}

const phraseKeys=Object.keys(catalog).filter(key=>key.length>=2&&key.length<=75&&!/[\n]/.test(key)).sort((a,b)=>b.length-a.length);
const phrasePattern=new RegExp(phraseKeys.map(escape).join('|'),'g');
