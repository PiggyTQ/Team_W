import React from 'react';
import ProductIcon from './ProductIcon';
import {careerEvidenceExport} from './career-evidence-model';
import {useLanguage} from './i18n/render';
import messages from './i18n/career-evidence-ui.json';

export default function CareerReportEvidence({evidence,taskTitle,link}){
 const language=useLanguage(),labels=messages[language];
 const projectName=project=>project.source==='upload'?project.title:taskTitle(project.id,project.title);
 const downloadable=evidence.outcomes.length>0||evidence.passedSkills.length>0;
 const download=()=>{
  const output=careerEvidenceExport(evidence,labels,projectName,location.origin,language);
  const url=URL.createObjectURL(new Blob([output],{type:'text/plain;charset=utf-8'}));
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='avemly-career-growth.txt';anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <div className="report-growth-actions" data-i18n="off">
  {evidence.job&&link(evidence.job.to,<span translate="no">{evidence.job.title}</span>)}
  {downloadable&&<button type="button" onClick={download}><ProductIcon name="file" size={16}/>{labels.exportButton}</button>}
 </div>;
}
