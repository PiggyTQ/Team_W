import {normalizeDiscussion} from './discussion-contract.js';

export const assistantTasks={
 'next-step':{path:'/assistant/next-step',intent:'plan',icon:'signpost',title:['梳理我的下一步','Work out my next step'],description:['从当前目标与已有行动里，确定下一件值得做的事。','Find a worthwhile next step from your current goal and actions.']},
 compare:{path:'/assistant/compare',intent:'direction',icon:'balance',title:['比较职业方向','Compare career directions'],description:['先看清两种工作的差异，再决定想深入了解哪一边。','Understand how the work differs before choosing what to explore.']},
 expression:{path:'/assistant/expression',intent:'expression',icon:'edit',title:['整理成果表达','Explain my achievements'],description:['围绕一份具体产物，讲清做法、结果和本人贡献。','Use one artifact to explain actions, results and your contribution.']}
};
export const assistantTaskPage=path=>Object.keys(assistantTasks).find(k=>assistantTasks[k].path===path)||null;
export const discussionRoute=conv=>(assistantTasks[conv?.discussion?.task?.page]?.path||'/assistant')+(conv?.id?'?discussion='+encodeURIComponent(conv.id):'');
export const hasTaskInput=t=>['goal','time','focus','purpose','note'].some(k=>!!t?.[k]?.trim());
export function taskInputDiscussion(d,patch){
 const task={...d.task,...patch},refs=d.refs.filter(r=>r.kind!=='statement');
 if(hasTaskInput(task))refs.push({kind:'statement',id:'task-input'});
 return normalizeDiscussion({...d,task,refs,externalBasis:undefined});
}
export function newTaskConversation(state,page){
 const config=assistantTasks[page];if(!config)throw new TypeError('Unknown assistant task');
 return {id:'conv-'+crypto.randomUUID(),title:config.title[0],mode:'职业咨询',messages:[],discussion:{intent:config.intent,career:state.goal||state.assessmentCareer||'data',refs:[],question:'',task:{page}}};
}
export function ensureAssistantConversation(state,page,id){
 const matches=c=>!c.archived&&(c.discussion?.task?.page||null)===page;
 if(id){const conv=state.conversations.find(c=>c.id===id&&matches(c));return conv?{state:{...state,conversationId:conv.id},conversation:conv}:{state,error:'NOT_FOUND'};}
 const conv=state.conversations.find(c=>c.id===state.conversationId&&matches(c))||[...state.conversations].reverse().find(matches);
 if(conv)return {state:{...state,conversationId:conv.id},conversation:conv};
 const item=page?newTaskConversation(state,page):{id:'conv-'+crypto.randomUUID(),title:'新的职业规划讨论',mode:'职业咨询',messages:[]};
 return {state:{...state,conversationId:item.id,conversations:[...state.conversations,item]},conversation:item};
}
export function chooseTaskObject(state,conversationId,object){
 const prior=state.conversations.find(c=>c.id===conversationId);if(!prior?.discussion?.task)return state;
 const page=prior.discussion.task.page;
 const existing=state.conversations.find(c=>!c.archived&&c.discussion?.task?.page===page&&c.discussion.task.object?.kind===object.kind&&c.discussion.task.object?.id===object.id);
 if(existing)return {...state,conversationId:existing.id};
 const item=newTaskConversation(state,page);item.discussion=taskInputDiscussion({...item.discussion,career:prior.discussion.career,task:{...prior.discussion.task,object,note:''}},{});
 return {...state,conversationId:item.id,conversations:[...state.conversations,item]};
}
export function chooseComparison(state,conversationId,left,right){
 const prior=state.conversations.find(c=>c.id===conversationId);if(prior?.discussion?.task?.page!=='compare')return state;
 const existing=state.conversations.find(c=>!c.archived&&c.discussion?.task?.page==='compare'&&(c.discussion.task.left||'')===left&&(c.discussion.task.right||'')===right);
 if(existing)return {...state,conversationId:existing.id};
 const blank=!prior.discussion.task.left&&!prior.discussion.task.right&&!prior.messages.length&&!prior.discussion.question;
 const item=blank?{...prior}:newTaskConversation(state,'compare');
 const refs=[...new Set([left,right].filter(Boolean))].map(id=>({kind:'career',id,part:'profile'}));
 item.discussion=taskInputDiscussion({...item.discussion,career:left||state.goal||'data',compareCareer:right&&right!==left?right:undefined,refs,task:{page:'compare',left,right,focus:prior.discussion.task.focus||'work'}},{});
 return {...state,conversationId:item.id,conversations:blank?state.conversations.map(c=>c.id===item.id?item:c):[...state.conversations,item]};
}
