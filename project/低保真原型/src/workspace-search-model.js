import {careers,pages} from './model.js';
export function careerMatches(career,query='',translate=x=>x){
 const q=query.trim().toLocaleLowerCase();
 return !q||[career.name,career.task,career.skill,career.output,career.branch].some(value=>`${value||''} ${translate(value||'')}`.toLocaleLowerCase().includes(q));
}
export function workspaceSearchResults({query='',scope='职业知识',tasks=[],logged=false},translate=x=>x){
 const q=query.trim().toLocaleLowerCase();
 const matches=(...parts)=>!q||parts.some(x=>`${x||''} ${translate(x||'')}`.toLocaleLowerCase().includes(q));
 if(scope==='本人任务')return logged?tasks.filter(t=>matches(t.title,t.purpose,t.standard)).slice(0,6).map(t=>({id:t.id,title:t.title,description:t.status,kind:'task',task:t})):[];
 if(!q)return pages.filter(p=>['U03','U05','U04','U07','U08','U10'].includes(p[0])).map(([id,to,title])=>({id,to,title,description:'工作区页面',kind:'page'}));
 return careers.filter(c=>careerMatches(c,query,translate)).slice(0,6).map(c=>({id:c.id,title:c.name,description:c.task,kind:'career',to:`/careers?career=${c.id}&q=${encodeURIComponent(query.trim())}`}));
}
