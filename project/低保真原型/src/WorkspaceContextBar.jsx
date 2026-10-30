import React from 'react';
import WorkspaceGuide from './WorkspaceGuide';

export default function WorkspaceContextBar({s,path,tab,search,page,admin,hideGuide=false,link}) {
 return <div className="workspace-contextbar"><div className="breadcrumbs">{link('/app',admin?'工作区':'我的职业规划')}<span>/</span><span>{page}</span>{tab&&<><span>/</span><span>{tab}</span></>}</div>{!hideGuide&&path!=='/app'&&!admin&&s.logged&&path!=='/onboarding'&&<WorkspaceGuide key={path+tab} s={s} path={path} tab={tab} search={search} link={link}/>}</div>;
}
