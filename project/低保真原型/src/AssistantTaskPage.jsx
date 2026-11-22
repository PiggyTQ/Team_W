import React from 'react';
import AssistantWorkspace from './AssistantWorkspace';
import DiscussionWorkbench from './DiscussionWorkbench';
import {chooseTaskObject,chooseComparison,discussionRoute} from './assistant-task-model';
import './assistant-task-pages.css';

export default function AssistantTaskPage(props){
 const {state:s,conv,update,navigate,liveAgent}=props;
 const select=next=>{liveAgent.cancel();update(next);const c=next.conversations.find(c=>c.id===next.conversationId);navigate(discussionRoute(c));};
 return <AssistantWorkspace {...props} s={s} aiContent={()=><DiscussionWorkbench {...props}
  onTaskObject={object=>select(chooseTaskObject(s,conv.id,object))}
  onTaskPair={(left,right)=>select(chooseComparison(s,conv.id,left,right))}/>}/>;
}
