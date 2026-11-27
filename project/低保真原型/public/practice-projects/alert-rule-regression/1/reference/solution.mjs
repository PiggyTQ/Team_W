// Original self-contained reference for alert-rule-regression; public teaching solution.
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
    case 'alert-rule-regression': {
      if (!(x.rule.threshold>0&&x.rule.threshold<1&&Number.isInteger(x.rule.for)&&x.rule.for>=1&&x.rule.minRequests>0)) return {error:'invalid_rule'};
      if(x.counters)x.windows=x.counters.map((current,i)=>{
        const previous=x.counters[i-1];
        const delta=key=>previous&&Number.isFinite(current[key])&&Number.isFinite(previous[key])?current[key]>=previous[key]?current[key]-previous[key]:current[key]:null;
        return {minute:current.minute,requests:delta('requestsTotal'),errors:delta('errorsTotal')};
      });
      let streak=0;
      return x.windows.map(w=>{const valid=Number.isFinite(w.errors)&&Number.isFinite(w.requests)&&w.requests>=x.rule.minRequests&&w.errors>=0&&w.errors<=w.requests;streak=valid&&w.errors/w.requests>x.rule.threshold?streak+1:0;return {minute:w.minute,rate:valid?w.errors/w.requests:null,firing:streak>=x.rule.for,label:x.rule.label};});
    }

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("alert-rule-regression",input);
