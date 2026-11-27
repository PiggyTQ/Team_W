import React from 'react';
import './career-workspace.css';

// Every exploration mode shares one header and one content alignment boundary.
export default function CareerWorkspace({heading,navigation,children}){
 return <div className="career-workspace">
  <div className={'career-workspace-heading'+(!heading?' without-heading':'')}>
   {heading&&<div className="career-workspace-title">{heading}</div>}
   <div className="career-workspace-modes">{navigation}</div>
  </div>
  <div className="career-workspace-content">{children}</div>
 </div>;
}
