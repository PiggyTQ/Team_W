// Original self-contained reference for cross-registration-service; public teaching solution.
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
    case 'cross-registration-service':
      return {contract:x.contract.version,accepted:x.calls.filter(c=>Object.keys(c.body).includes(x.contract.field)).map(c=>c.id),feedback:x.calls.filter(c=>!Object.keys(c.body).includes(x.contract.field)).map(c=>({id:c.id,to:'backend',issue:'field_mismatch'})),revision:x.revision,registrationCount:1};

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("cross-registration-service",input);
