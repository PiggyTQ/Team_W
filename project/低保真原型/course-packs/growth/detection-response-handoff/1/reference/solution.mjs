// Original self-contained reference for detection-response-handoff; public teaching solution.
// Original deliberately defective and repaired teaching subjects, not captured production traces.
export const discountSubject=(cents,version)=>{
 const threshold=version==='bug-1'?Math.round(cents/100)*100:cents;
 return threshold>=8000?cents-800:cents;
};
export function testSubject(test){
 switch(test.action){
  case 'read-object':return test.version==='bug-1'?200:!test.user?401:test.owner!==test.user?403:200;
  case 'failed-form':return test.version==='bug-1'?'cleared':test.input;
  case 'register':return typeof test.email==='string'&&test.email.includes('@')?201:422;
  default:throw Error('Unknown teaching test action');
 }
}

function runScenario(id,input){const x=structuredClone(input);switch(id){
    case 'detection-response-handoff': {
      const suspicious=x.events.filter(e=>e.kind==='login-success'&&x.events.filter(f=>f.user===e.user&&f.kind==='login-failure'&&e.minute-f.minute>=0&&e.minute-f.minute<=5).length>=3&&!x.approvedDevices.includes(e.device));
      return {hits:suspicious.map(e=>e.id),falsePositives:suspicious.filter(e=>!x.labels.includes(e.id)).map(e=>e.id),misses:x.labels.filter(id=>!suspicious.some(e=>e.id===id)),action:'request_session_review'};
    }

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("detection-response-handoff",input);
