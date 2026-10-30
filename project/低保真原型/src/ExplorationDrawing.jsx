import React,{useId} from 'react';
import {useLanguage} from './i18n/render';

// Illustrates the public exploration method, never an individual's results.
export default function ExplorationDrawing({stage=0,hero=false}){
 const en=useLanguage()==='en';
 const patternId=useId();
 const words=en?['Explore','Compare directions','Practical work','Career report','Question','Evidence','Next step','Unknown']:['探索','比较职业方向','实践产物','职业报告','问题','依据','下一步','未知'];
 return <svg className={'exploration-drawing'+(hero?' exploration-drawing-hero':'')} viewBox="0 0 720 470" role="img" aria-label={en?'An exploration question becomes evidence and a next step':'从探索问题到依据与下一步的过程图解'}>
  <defs><pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="#c7c7c7"/></pattern></defs>
  <rect width="720" height="470" fill={hero?'#e9e9e6':'#ececea'}/><rect width="720" height="470" fill={`url(#${patternId})`}/>
  <g fill="none" stroke="#adada8" strokeWidth="1.4"><circle cx="360" cy="240" r="170"/><path d="M0 240H720M360 0V470" strokeDasharray="3 9"/></g>
  <g className="drawing-paths" fill="none" stroke="#6a6a65" strokeWidth="2"><path d="M133 250H235Q260 250 260 225V143Q260 120 287 120H420"/><path d="M133 250H282Q310 250 310 280V343Q310 365 338 365H460"/><path d="M540 160V270Q540 290 565 290H607"/></g>
  {hero||stage===0?<>
   <g transform="translate(50 177) rotate(-7 90 65)"><rect x="5" y="7" width="180" height="130" fill="#d2d2cd"/><rect width="180" height="130" rx="3" fill="#fff" stroke="#b8b8b0"/><text x="20" y="35" fontSize="12" fill="#777">{words[0]} / 01</text><text x="20" y="75" fontSize="24" fill="#292929">{words[4]}</text><path d="M20 96H144M20 108H100" stroke="#b7b7b0"/></g>
   <g transform="translate(310 62) rotate(4 158 75)"><rect x="5" y="7" width="316" height="152" fill="#d4d4cf"/><rect width="316" height="152" rx="3" fill="#fff" stroke="#b8b8b0"/><text x="22" y="35" fontSize="13" fill="#666">01 / {words[1]}</text><path d="M22 52H294M158 65V130" stroke="#ddd"/><text x="24" y="92" fontSize="28" fill="#292929">A</text><text x="182" y="92" fontSize="28" fill="#292929">B</text><path d="M24 111H125M182 111H280M24 123H90M182 123H244" stroke="#aaa"/></g>
   <g transform="translate(371 286) rotate(-4 137 65)"><rect x="6" y="8" width="270" height="130" fill="#d1d1cc"/><rect width="270" height="130" rx="3" fill="#fff" stroke="#b8b8b0"/><rect x="20" y="24" width="47" height="47" rx="2" fill="#292929"/><path d="m32 47 9 9 16-21" stroke="white" strokeWidth="2" fill="none"/><text x="86" y="43" fontSize="13" fill="#777">{words[5]}</text><text x="86" y="71" fontSize="22" fill="#292929">{words[2]}</text><path d="M20 95H245M20 108H179" stroke="#bbb"/></g>
  </>:stage===1?<>
   <g transform="translate(115 70) rotate(-4 200 160)"><rect x="8" y="9" width="440" height="320" fill="#d2d2cc"/><rect width="440" height="320" rx="3" fill="white" stroke="#b8b8b0"/><text x="28" y="46" fontSize="22" fill="#292929">{words[5]} / {words[7]}</text><path d="M28 68H412M220 92V282" stroke="#ccc"/>{[112,174,236].map((y,i)=><g key={y}><rect x="28" y={y} width="24" height="24" fill={i===2?'#fff':'#ddd'} stroke="#aaa"/><path d={`M70 ${y+8}H190M70 ${y+20}H155M250 ${y+8}H400M250 ${y+20}H360`} stroke="#aaa"/>{i<2&&<path d={`m33 ${y+12} 5 5 10-12`} fill="none" stroke="#555"/>}</g>)}</g>
   <circle cx="582" cy="335" r="45" fill="#292929"/><text x="582" y="349" textAnchor="middle" fontSize="40" fill="white">?</text>
  </>:stage===2?<>
   <g transform="translate(100 75) rotate(-3 240 150)"><rect x="8" y="9" width="490" height="310" fill="#d2d2cc"/><rect width="490" height="310" rx="3" fill="white" stroke="#bbb"/><text x="26" y="46" fontSize="22" fill="#292929">{words[6]}</text><path d="M26 66H464" stroke="#ccc"/>{[104,166,228].map((y,i)=><g key={y}><rect x="28" y={y} width="26" height="26" fill="none" stroke="#999"/><text x="77" y={y+21} fontSize="17" fill="#555">{words[[4,2,6][i]]}</text><path d={`M240 ${y+12}H453`} stroke="#ccc"/></g>)}</g>
   <g transform="translate(478 294) rotate(7)"><rect width="155" height="104" rx="3" fill="#292929"/><path d="M25 34H125M25 54H100M25 74H117" stroke="#aaa"/></g>
  </>:<>
   <g transform="translate(165 38) rotate(-5 185 190)"><rect x="14" y="17" width="370" height="380" fill="#d2d2cc" stroke="#bbb"/><rect x="7" y="8" width="370" height="380" fill="#e3e3df" stroke="#bbb"/><rect width="370" height="380" rx="3" fill="white" stroke="#bbb"/><text x="28" y="42" fontSize="13" fill="#777">{words[0]} / 04</text><path d="M28 60H342" stroke="#ccc"/><text x="28" y="111" fontSize="34" fill="#292929">{words[3]}</text><path d="M28 142H342" stroke="#ccc"/>{[182,244,306].map((y,i)=><g key={y}><text x="28" y={y} fontSize="13" fill="#777">0{i+1} / {words[[5,2,6][i]]}</text><path d={`M28 ${y+17}H342M28 ${y+29}H260`} stroke="#bbb"/></g>)}</g>
  </>}
  <g fill="#777" fontSize="11"><text x="26" y="445">{en?'ILLUSTRATED EXPLORATION':'探索过程图解'}</text><text x="694" y="445" textAnchor="end">{en?'SAMPLE / NOT PERSONAL RESULTS':'合成示例 · 非本人成果'}</text></g>
 </svg>;
}
