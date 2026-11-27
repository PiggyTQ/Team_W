import data from './skill-teaching/data-ai.json' with {type:'json'};
import security from './skill-teaching/security-ops.json' with {type:'json'};
import web from './skill-teaching/web-software.json' with {type:'json'};
import testing from './skill-teaching/testing-delivery.json' with {type:'json'};

export const skillTeaching={...data,...security,...web,...testing};
// A stored classroom answer applies only to the exact question revision.
export function teachingRevision(packet){
 let hash=2166136261;
 for(const char of JSON.stringify(packet.check))hash=Math.imul(hash^char.charCodeAt(0),16777619);
 return (hash>>>0).toString(36);
}
export function teachingFeedback(packet,state={}){
 if(!state.teachingChecked||state.teachingRevision!==teachingRevision(packet))return null;
 const option=packet.check.options.find(o=>o.id===state.teachingChoice);
 return option?{correct:option.id===packet.check.correct,feedback:option.feedback}:null;
}
