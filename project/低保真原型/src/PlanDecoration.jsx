import React from 'react';

export function PlanContextDecoration(){
 return <span className="plan-context-decoration" aria-hidden="true">
  <svg className="plan-context-motif" viewBox="0 0 500 318" preserveAspectRatio="xMaxYMid meet" focusable="false">
   <circle cx="404" cy="159" r="91" fill="#f0f6fb"/>
   <circle cx="404" cy="159" r="113" fill="none" stroke="#e0eaf3"/>
   <path d="M276 278c-8-28 4-49 35-59" fill="none" stroke="#dec476" strokeWidth="1.5" strokeDasharray="3 6" strokeLinecap="round"/>
   <path d="m305 216 7 2-3 7" fill="none" stroke="#dec476" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
   <path d="m322 51 3.5 8 8.5 1-6.5 6 1.5 8.5-7-4.5-7.5 4.5 1.5-8.5-6-6 8-1z" fill="#f1d98e"/>
   <g fill="#c5dbe9">
    <circle cx="301" cy="135" r="1.8"/><circle cx="311" cy="135" r="1.8"/><circle cx="321" cy="135" r="1.8"/>
    <circle cx="301" cy="145" r="1.8"/><circle cx="311" cy="145" r="1.8"/><circle cx="321" cy="145" r="1.8"/>
    <circle cx="301" cy="155" r="1.8"/><circle cx="311" cy="155" r="1.8"/><circle cx="321" cy="155" r="1.8"/>
   </g>
   <path d="M456 61h10m-5-5v10" fill="none" stroke="#c2d8e8" strokeWidth="1.5" strokeLinecap="round"/>
   <circle cx="456" cy="252" r="5" fill="#e6eff7"/>
   <path d="M-18 313a67 67 0 0 1 67-67m-67 82a82 82 0 0 1 82-82" fill="none" stroke="#edf3f8"/>
  </svg>
  <svg className="plan-context-motif" viewBox="0 0 500 318" preserveAspectRatio="xMaxYMid meet" focusable="false">
   <circle cx="404" cy="159" r="91" fill="#f0f6fb"/>
   <circle cx="404" cy="159" r="113" fill="none" stroke="#e0eaf3"/>
   <path d="M500 247a71 71 0 0 0-71 71h71z" fill="#fcf7e8"/>
   <path d="M276 278c-8-28 4-49 35-59" fill="none" stroke="#dec476" strokeWidth="1.5" strokeDasharray="3 6" strokeLinecap="round"/>
   <path d="m305 216 7 2-3 7" fill="none" stroke="#dec476" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
   <g fill="#c5dbe9">
    <circle cx="301" cy="135" r="1.8"/><circle cx="311" cy="135" r="1.8"/><circle cx="321" cy="135" r="1.8"/>
    <circle cx="301" cy="145" r="1.8"/><circle cx="311" cy="145" r="1.8"/><circle cx="321" cy="145" r="1.8"/>
    <circle cx="301" cy="155" r="1.8"/><circle cx="311" cy="155" r="1.8"/><circle cx="321" cy="155" r="1.8"/>
   </g>
   <rect x="319" y="56" width="11" height="11" rx="2" fill="#f1d98e" transform="rotate(15 324.5 61.5)"/>
   <path d="M453 56h10m-5-5v10" fill="none" stroke="#c2d8e8" strokeWidth="1.5" strokeLinecap="round"/>
   <circle cx="457" cy="253" r="4" fill="#d4e4ee"/>
   <circle cx="450" cy="276" r="2" fill="#e5ca7c"/>
  </svg>
 </span>;
}

export function PlanCardPattern({tone}){
 return <svg className={`plan-card-pattern plan-card-pattern-${tone}`} viewBox="0 0 280 48" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <circle cx="193" cy="-13" r="57" fill="var(--plan-pattern-fill)"/>
  <circle cx="280" cy="50" r="18" fill="var(--plan-pattern-fill)"/>
  <g fill="none" stroke="var(--plan-pattern-line)" strokeWidth="1">
   <circle cx="193" cy="-13" r="46"/><circle cx="193" cy="-13" r="35"/>
   <path d="m117 48 22-22m-12 22 18-18"/>
  </g>
  <g fill="var(--plan-pattern-dot)"><circle cx="174" cy="35" r="1.5"/><circle cx="182" cy="35" r="1.5"/><circle cx="190" cy="35" r="1.5"/></g>
 </svg>;
}
