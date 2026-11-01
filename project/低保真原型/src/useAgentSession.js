import {useEffect,useRef,useState} from 'react';
import {apiRequest,SERVER_AUTH} from './auth-client';
import {authMessage} from './auth-contract';
import {createAgentSession,agentMode} from './agent-session';
import {agentMessageAvailable} from './agent-contract';
import {getAgentKnowledgeDigest,setAgentKnowledgeDigest} from './agent-knowledge-view';

export function useAgentSession({user,state,workspace,context,update,language}){
  const [capability,setCapability]=useState({owner:null,loading:false,enabled:false,error:null});
  const [status,setStatus]=useState({pending:false,error:null});
  const [capabilityEpoch,setCapabilityEpoch]=useState(0);
  const current=useRef(null),session=useRef(null),handoffContext=useRef(null);
  current.current={user,state,workspace,context:handoffContext.current||context,update,language};
  if(!session.current)session.current=createAgentSession({
    getCurrent:()=>{
      const value=current.current,sync=value.workspace.current();
      return {ownerId:sync.owner===value.user?.id?value.user?.id:null,state:value.state,workspaceRevision:sync.revision,context:value.context};
    },
    flush:()=>current.current.workspace.flush(),
    request:(input,{signal})=>apiRequest('/api/agent/respond',{data:input,signal}),
    onStatus:next=>{if(!next.pending)handoffContext.current=null;setStatus(next);},
    onResult:({userMessage,assistantMessage,conversationId,ownerId})=>{
      if(current.current.user?.id!==ownerId)return;
      if(assistantMessage.agentResponse?.meta?.knowledgeUsed&&assistantMessage.agentResponse.knowledgeDigest!==getAgentKnowledgeDigest())setCapabilityEpoch(value=>value+1);
      current.current.update(previous=>{
        if(!previous.logged||previous.conversationId!==conversationId||!agentMessageAvailable(previous,assistantMessage))return previous;
        try{if(agentMode(previous.conversations.find(c=>c.id===conversationId)?.mode||'职业咨询')!==assistantMessage.agentResponse.mode)return previous;}catch{return previous;}
        return {...previous,conversations:previous.conversations.map(c=>c.id===conversationId?{...c,messages:[...c.messages,userMessage,assistantMessage]}:c),
          aiDraft:previous.aiDraft===userMessage.text?'':previous.aiDraft,proposal:null};
      });
    }
  });
  useEffect(()=>{
    if(!SERVER_AUTH||!user?.id){setAgentKnowledgeDigest(null);setCapability({owner:null,loading:false,enabled:false,error:null});return;}
    const request=new AbortController(),owner=user.id;
    let sequence=0;
    setAgentKnowledgeDigest(null);
    setCapability({owner,loading:true,enabled:false,error:null});
    const refresh=()=>{
      if(document.visibilityState==='hidden')return;
      const currentSequence=++sequence;
      Promise.all([apiRequest('/api/system/capabilities',{signal:request.signal}),apiRequest('/api/agent/knowledge-status',{signal:request.signal})]).then(([result,knowledge])=>{
        if(!request.signal.aborted&&sequence===currentSequence&&current.current.user?.id===owner){setAgentKnowledgeDigest(knowledge.knowledgeDigest);setCapability({owner,loading:false,enabled:result.agent?.enabled===true,error:null});}
      }).catch(error=>{if(!request.signal.aborted&&sequence===currentSequence){setAgentKnowledgeDigest(null);setCapability({owner,loading:false,enabled:false,error:error.code});}});
    };
    const focus=()=>{setAgentKnowledgeDigest(null);refresh();};
    refresh();const interval=setInterval(refresh,60000);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
    return()=>{request.abort();clearInterval(interval);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
  },[user?.id,capabilityEpoch]);
  useEffect(()=>{session.current.revalidate?.();});
  useEffect(()=>()=>session.current.destroy(),[]);
  const enabled=capability.owner===user?.id&&capability.enabled&&workspace.ready;
  return {
    enabled,loading:capability.loading,pending:status.pending,
    error:status.error?authMessage(status.error,language):capability.error?authMessage(capability.error,language):'',
    draft:state.aiDraft,setDraft:value=>update({aiDraft:value}),
    // Preserve the request origin only for an explicit companion → workspace handoff.
    prepareHandoff:()=>{if(status.pending)handoffContext.current=current.current.context;},
    send:(message=state.aiDraft)=>{
      if(!enabled)return;
      // Quick prompts use the same recoverable draft as typed questions.
      if(message!==state.aiDraft)update({aiDraft:message});
      const mode=state.conversations.find(c=>c.id===state.conversationId)?.mode||'职业咨询';
      session.current.send({message,mode,context}).catch(()=>{});
    },cancel:()=>session.current.cancel(),reload:()=>setCapabilityEpoch(value=>value+1),
    report:async data=>{const owner=current.current.user?.id;await current.current.workspace.flush();if(!owner||current.current.user?.id!==owner)throw {code:'ACCOUNT_CHANGED'};return apiRequest('/api/agent/feedback',{data});}
  };
}
